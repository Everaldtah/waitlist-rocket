'use strict';

/**
 * Waitlist Rocket — Viral waitlist platform with referral mechanics.
 *
 * Pre-launch startups need to build email lists fast.
 * Waitlist Rocket lets founders create a waitlist in minutes
 * with built-in referral mechanics: each subscriber gets a unique
 * referral link — refer 3 friends, jump 100 spots in the queue.
 * Proven to increase waitlist size 3-5x vs plain email forms.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const path = require('path');

const waitlistRoutes = require('./routes/waitlist');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/', apiLimiter);

// ── Database ──────────────────────────────────────────────────────────────────
const db = new Database(process.env.DATABASE_PATH || 'waitlist.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id              TEXT PRIMARY KEY,
    slug            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    reward_text     TEXT NOT NULL DEFAULT 'Move up the waitlist!',
    referrals_needed INTEGER NOT NULL DEFAULT 3,
    spots_per_referral INTEGER NOT NULL DEFAULT 50,
    is_open         INTEGER NOT NULL DEFAULT 1,
    total_spots     INTEGER,
    admin_email     TEXT NOT NULL,
    admin_key       TEXT UNIQUE NOT NULL,
    public_key      TEXT UNIQUE NOT NULL,
    custom_css      TEXT,
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscribers (
    id            TEXT PRIMARY KEY,
    campaign_id   TEXT NOT NULL REFERENCES campaigns(id),
    email         TEXT NOT NULL,
    name          TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by   TEXT REFERENCES subscribers(id),
    referral_count INTEGER NOT NULL DEFAULT 0,
    position      INTEGER NOT NULL,
    confirmed     INTEGER NOT NULL DEFAULT 0,
    confirm_token TEXT,
    ip_hash       TEXT,
    created_at    TEXT NOT NULL,
    UNIQUE(campaign_id, email)
  );

  CREATE TABLE IF NOT EXISTS referral_events (
    id            TEXT PRIMARY KEY,
    campaign_id   TEXT NOT NULL,
    referrer_id   TEXT NOT NULL REFERENCES subscribers(id),
    referred_id   TEXT NOT NULL REFERENCES subscribers(id),
    created_at    TEXT NOT NULL
  );
`);

app.set('db', db);

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'waitlist-rocket',
    version: '1.0.0',
    status: 'ok',
  });
});

// Serve embedded signup widget (for iframe embedding)
app.get('/widget/:slug', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE slug = ? AND is_open = 1').get(req.params.slug);
  if (!campaign) return res.status(404).send('<h3>Waitlist not found</h3>');

  const count = db.prepare('SELECT COUNT(*) as c FROM subscribers WHERE campaign_id = ?').get(campaign.id).c;

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${campaign.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f8fafc; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: white; border-radius: 16px; padding: 32px;
            max-width: 440px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    h1 { font-size: 1.5rem; color: #0f172a; margin-bottom: 8px; }
    p { color: #64748b; margin-bottom: 20px; line-height: 1.5; }
    .count { font-size: 0.85rem; color: #6366f1; font-weight: 600; margin-bottom: 16px; }
    input { width: 100%; padding: 12px 16px; border: 1.5px solid #e2e8f0;
            border-radius: 8px; font-size: 1rem; margin-bottom: 10px;
            outline: none; transition: border-color .2s; }
    input:focus { border-color: #6366f1; }
    button { width: 100%; padding: 12px; background: #6366f1; color: white;
             border: none; border-radius: 8px; font-size: 1rem;
             font-weight: 600; cursor: pointer; transition: background .2s; }
    button:hover { background: #4f46e5; }
    #result { margin-top: 16px; display: none; }
    .success { background: #f0fdf4; border: 1px solid #bbf7d0;
               border-radius: 8px; padding: 16px; }
    .success h3 { color: #16a34a; margin-bottom: 8px; }
    .referral-link { background: #f1f5f9; padding: 10px; border-radius: 6px;
                     font-size: .85rem; word-break: break-all; margin-top: 8px; }
    .copy-btn { margin-top: 8px; background: #0f172a; }
    ${campaign.custom_css || ''}
  </style>
</head>
<body>
  <div class="card">
    <h1>${campaign.name}</h1>
    <p>${campaign.description || 'Join the waitlist to get early access.'}</p>
    <div class="count">🚀 ${count.toLocaleString()} people already on the waitlist</div>
    <form id="form">
      <input type="text" name="name" placeholder="Your name (optional)">
      <input type="email" name="email" placeholder="Your email address" required>
      <input type="hidden" name="ref" id="refCode" value="">
      <button type="submit" id="btn">Join the Waitlist →</button>
    </form>
    <div id="result"></div>
  </div>
  <script>
    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref')) document.getElementById('refCode').value = params.get('ref');

    document.getElementById('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btn');
      btn.textContent = 'Joining...'; btn.disabled = true;
      const fd = new FormData(e.target);
      const payload = { email: fd.get('email'), name: fd.get('name') || null };
      if (fd.get('ref')) payload.ref = fd.get('ref');
      try {
        const res = await fetch('/api/waitlist/${campaign.slug}/join', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        const result = document.getElementById('result');
        if (res.ok) {
          result.style.display = 'block';
          result.innerHTML = '<div class="success">'
            + '<h3>🎉 You\\'re on the list!</h3>'
            + '<p>You are <strong>#' + data.position + '</strong> on the waitlist.</p>'
            + '<p>${campaign.reward_text}</p>'
            + '<div class="referral-link">🔗 ' + data.referral_link + '</div>'
            + '<button class="copy-btn" onclick="navigator.clipboard.writeText(\\'' + data.referral_link + '\\')">Copy Your Referral Link</button>'
            + '</div>';
          e.target.style.display = 'none';
        } else {
          btn.textContent = data.error || 'Error — try again';
          btn.disabled = false;
        }
      } catch(err) {
        btn.textContent = 'Error — try again'; btn.disabled = false;
      }
    });
  </script>
</body>
</html>`);
});

app.use('/api/waitlist', waitlistRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`Waitlist Rocket running on http://localhost:${PORT}`));
module.exports = app;
