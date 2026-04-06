'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const router = express.Router();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip + 'salt_wr').digest('hex').slice(0, 16);
}

function generateReferralCode(length = 8) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length).toUpperCase();
}

// POST /api/waitlist/:slug/join
router.post('/:slug/join', (req, res) => {
  const db = req.app.get('db');
  const { email, name, ref } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE slug = ? AND is_open = 1').get(req.params.slug);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found or closed' });

  // Duplicate check
  const existing = db.prepare('SELECT * FROM subscribers WHERE campaign_id = ? AND email = ?').get(campaign.id, email.toLowerCase().trim());
  if (existing) {
    return res.json({
      already_joined: true,
      position: existing.position,
      referral_link: `${BASE_URL}/widget/${campaign.slug}?ref=${existing.referral_code}`,
      referral_count: existing.referral_count,
    });
  }

  // Resolve referrer
  let referrer = null;
  if (ref) {
    referrer = db.prepare('SELECT * FROM subscribers WHERE referral_code = ? AND campaign_id = ?').get(ref, campaign.id);
  }

  const ipHash = hashIp(req.ip || '');
  const now = new Date().toISOString();
  const subId = uuidv4();

  // Base position = current count + 1
  const currentCount = db.prepare('SELECT COUNT(*) as c FROM subscribers WHERE campaign_id = ?').get(campaign.id).c;
  let position = currentCount + 1;

  // If referred, jump ahead
  if (referrer) {
    const jumpAmount = campaign.spots_per_referral || 50;
    position = Math.max(1, referrer.position - jumpAmount);
  }

  // Generate unique referral code
  let code;
  do { code = generateReferralCode(); } while (
    db.prepare('SELECT id FROM subscribers WHERE referral_code = ?').get(code)
  );

  const insertSub = db.prepare(
    'INSERT INTO subscribers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  insertSub.run(
    subId, campaign.id, email.toLowerCase().trim(),
    name || null, code, referrer ? referrer.id : null,
    0, position, 0, null, ipHash, now
  );

  // Update referrer's count and squeeze the queue
  if (referrer) {
    db.prepare('UPDATE subscribers SET referral_count = referral_count + 1 WHERE id = ?').run(referrer.id);

    // Log referral event
    db.prepare('INSERT INTO referral_events VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), campaign.id, referrer.id, subId, now
    );

    // Check if referrer hit reward threshold
    const updatedReferrer = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(referrer.id);
    // Could trigger reward email here
  }

  return res.status(201).json({
    subscriber_id: subId,
    position,
    referral_code: code,
    referral_link: `${BASE_URL}/widget/${campaign.slug}?ref=${code}`,
    total_on_waitlist: currentCount + 1,
    reward_text: campaign.reward_text,
    referred_by: referrer ? true : false,
  });
});

// GET /api/waitlist/:slug/position?email=...
router.get('/:slug/position', (req, res) => {
  const db = req.app.get('db');
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email required' });

  const campaign = db.prepare('SELECT id, slug, name FROM campaigns WHERE slug = ?').get(req.params.slug);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const sub = db.prepare('SELECT * FROM subscribers WHERE campaign_id = ? AND email = ?').get(campaign.id, email.toLowerCase().trim());
  if (!sub) return res.status(404).json({ error: 'Email not found on this waitlist' });

  const total = db.prepare('SELECT COUNT(*) as c FROM subscribers WHERE campaign_id = ?').get(campaign.id).c;

  return res.json({
    email: sub.email,
    position: sub.position,
    total_on_waitlist: total,
    referral_count: sub.referral_count,
    referral_link: `${BASE_URL}/widget/${campaign.slug}?ref=${sub.referral_code}`,
    percentile: Math.round(((total - sub.position) / total) * 100),
  });
});

// GET /api/waitlist/:slug/stats — public stats
router.get('/:slug/stats', (req, res) => {
  const db = req.app.get('db');
  const campaign = db.prepare('SELECT id, name, description, reward_text, referrals_needed FROM campaigns WHERE slug = ?').get(req.params.slug);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const total = db.prepare('SELECT COUNT(*) as c FROM subscribers WHERE campaign_id = ?').get(campaign.id).c;
  const referred = db.prepare('SELECT COUNT(*) as c FROM subscribers WHERE campaign_id = ? AND referred_by IS NOT NULL').get(campaign.id).c;
  const referralRate = total > 0 ? Math.round((referred / total) * 100) : 0;

  return res.json({
    name: campaign.name,
    total_subscribers: total,
    referred_subscribers: referred,
    referral_rate_pct: referralRate,
    reward_text: campaign.reward_text,
    referrals_needed: campaign.referrals_needed,
  });
});

module.exports = router;
