'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const router = express.Router();

function requireAdmin(req, res, next) {
  const db = req.app.get('db');
  const adminKey = req.headers['x-admin-key'] || req.query.admin_key;
  if (!adminKey) return res.status(401).json({ error: 'Admin key required' });
  const campaign = db.prepare('SELECT * FROM campaigns WHERE admin_key = ?').get(adminKey);
  if (!campaign) return res.status(401).json({ error: 'Invalid admin key' });
  req.campaign = campaign;
  next();
}

// POST /api/admin/campaigns — create a new waitlist campaign
router.post('/campaigns', (req, res) => {
  const db = req.app.get('db');
  const {
    name, slug, description, admin_email,
    reward_text, referrals_needed, spots_per_referral,
    total_spots, custom_css,
  } = req.body;

  if (!name || !slug || !admin_email) {
    return res.status(400).json({ error: 'name, slug, and admin_email are required' });
  }

  // Validate slug
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'slug must be lowercase alphanumeric with hyphens only' });
  }

  const existing = db.prepare('SELECT id FROM campaigns WHERE slug = ?').get(slug);
  if (existing) return res.status(409).json({ error: 'Slug already taken' });

  const id = uuidv4();
  const adminKey = 'adm_' + crypto.randomBytes(24).toString('hex');
  const publicKey = 'pub_' + crypto.randomBytes(16).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO campaigns VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, slug, name, description || null,
    reward_text || 'Move up the waitlist!',
    referrals_needed || 3,
    spots_per_referral || 50,
    1,
    total_spots || null,
    admin_email,
    adminKey,
    publicKey,
    custom_css || null,
    now,
  );

  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  return res.status(201).json({
    campaign_id: id,
    slug,
    admin_key: adminKey,
    public_key: publicKey,
    widget_url: `${BASE_URL}/widget/${slug}`,
    embed_code: `<iframe src="${BASE_URL}/widget/${slug}" width="100%" height="500" frameborder="0"></iframe>`,
    api_join_url: `${BASE_URL}/api/waitlist/${slug}/join`,
  });
});

// GET /api/admin/campaigns/me — get campaign details
router.get('/campaigns/me', requireAdmin, (req, res) => {
  const { admin_key, ...safe } = req.campaign;
  const db = req.app.get('db');
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN referred_by IS NOT NULL THEN 1 ELSE 0 END) as referred,
      SUM(referral_count) as total_referrals
    FROM subscribers WHERE campaign_id = ?
  `).get(req.campaign.id);

  res.json({ ...safe, stats });
});

// GET /api/admin/subscribers — list all subscribers
router.get('/subscribers', requireAdmin, (req, res) => {
  const db = req.app.get('db');
  const { limit = 50, offset = 0, sort = 'position' } = req.query;

  const allowedSorts = ['position', 'created_at', 'referral_count'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'position';

  const rows = db.prepare(`
    SELECT id, email, name, referral_code, referral_count, position, created_at
    FROM subscribers
    WHERE campaign_id = ?
    ORDER BY ${sortCol} ${sort === 'referral_count' ? 'DESC' : 'ASC'}
    LIMIT ? OFFSET ?
  `).all(req.campaign.id, parseInt(limit), parseInt(offset));

  const total = db.prepare('SELECT COUNT(*) as c FROM subscribers WHERE campaign_id = ?').get(req.campaign.id).c;

  res.json({ total, subscribers: rows });
});

// GET /api/admin/subscribers/export — CSV export
router.get('/subscribers/export', requireAdmin, (req, res) => {
  const db = req.app.get('db');
  const rows = db.prepare(`
    SELECT position, email, name, referral_count, referral_code, created_at
    FROM subscribers WHERE campaign_id = ?
    ORDER BY position ASC
  `).all(req.campaign.id);

  const header = 'position,email,name,referral_count,referral_code,joined_at\n';
  const csv = rows.map(r =>
    `${r.position},${r.email},"${r.name || ''}",${r.referral_count},${r.referral_code},${r.created_at}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${req.campaign.slug}-waitlist.csv"`);
  res.send(header + csv);
});

// PATCH /api/admin/campaigns/me — update campaign settings
router.patch('/campaigns/me', requireAdmin, (req, res) => {
  const db = req.app.get('db');
  const { description, reward_text, is_open, referrals_needed, spots_per_referral } = req.body;

  const updates = [];
  const params = [];

  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (reward_text) { updates.push('reward_text = ?'); params.push(reward_text); }
  if (is_open !== undefined) { updates.push('is_open = ?'); params.push(is_open ? 1 : 0); }
  if (referrals_needed) { updates.push('referrals_needed = ?'); params.push(referrals_needed); }
  if (spots_per_referral) { updates.push('spots_per_referral = ?'); params.push(spots_per_referral); }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.campaign.id);
  db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ message: 'Updated' });
});

// POST /api/admin/subscribers/:id/move — manually adjust position
router.post('/subscribers/:id/move', requireAdmin, (req, res) => {
  const db = req.app.get('db');
  const { position } = req.body;
  if (!position || position < 1) return res.status(400).json({ error: 'Valid position required' });

  const result = db.prepare(
    'UPDATE subscribers SET position = ? WHERE id = ? AND campaign_id = ?'
  ).run(parseInt(position), req.params.id, req.campaign.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Subscriber not found' });
  res.json({ message: 'Position updated', new_position: position });
});

// DELETE /api/admin/subscribers/:id — remove a subscriber
router.delete('/subscribers/:id', requireAdmin, (req, res) => {
  const db = req.app.get('db');
  const result = db.prepare(
    'DELETE FROM subscribers WHERE id = ? AND campaign_id = ?'
  ).run(req.params.id, req.campaign.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Subscriber not found' });
  res.json({ message: 'Removed' });
});

// GET /api/admin/analytics — growth analytics
router.get('/analytics', requireAdmin, (req, res) => {
  const db = req.app.get('db');
  const cid = req.campaign.id;

  const daily = db.prepare(`
    SELECT DATE(created_at) as day, COUNT(*) as new_subs
    FROM subscribers WHERE campaign_id = ?
    GROUP BY DATE(created_at)
    ORDER BY day DESC LIMIT 30
  `).all(cid);

  const topReferrers = db.prepare(`
    SELECT email, name, referral_count, position
    FROM subscribers WHERE campaign_id = ? AND referral_count > 0
    ORDER BY referral_count DESC LIMIT 10
  `).all(cid);

  const conversionByHour = db.prepare(`
    SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
    FROM subscribers WHERE campaign_id = ?
    GROUP BY hour ORDER BY hour
  `).all(cid);

  res.json({ daily_growth: daily, top_referrers: topReferrers, signups_by_hour: conversionByHour });
});

module.exports = router;
