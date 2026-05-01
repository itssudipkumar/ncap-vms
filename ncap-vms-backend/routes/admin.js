// routes/admin.js — User management + feature toggles (admin only)
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth, requireAdmin);

// ============================================================
// USERS
// ============================================================

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, name, role, is_active, created_at FROM users ORDER BY role DESC, name ASC'
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users — create user
router.post('/users', async (req, res) => {
  const { userId, name, passcode, role } = req.body;

  if (!userId || !name || !passcode || !role) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (!['admin', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (String(passcode).length !== 4 || !/^\d{4}$/.test(String(passcode))) {
    return res.status(400).json({ error: 'Passcode must be 4 digits' });
  }

  try {
    const hashed = await bcrypt.hash(String(passcode), 10);
    const result = await pool.query(
      'INSERT INTO users (user_id, name, passcode, role) VALUES ($1, $2, $3, $4) RETURNING id, user_id, name, role, is_active',
      [userId.trim().toUpperCase(), name.trim(), hashed, role]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'User ID already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/users/:userId — update user (reset passcode, change role)
router.patch('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { passcode, role, name, isActive } = req.body;

  try {
    const updates = [];
    const params = [];
    let i = 1;

    if (passcode !== undefined) {
      if (!/^\d{4}$/.test(String(passcode))) return res.status(400).json({ error: 'Passcode must be 4 digits' });
      updates.push(`passcode = $${i++}`);
      params.push(await bcrypt.hash(String(passcode), 10));
    }
    if (role) { updates.push(`role = $${i++}`); params.push(role); }
    if (name) { updates.push(`name = $${i++}`); params.push(name.trim()); }
    if (isActive !== undefined) { updates.push(`is_active = $${i++}`); params.push(isActive); }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    params.push(userId.toUpperCase());
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = $${i} RETURNING id, user_id, name, role, is_active`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:userId — deactivate user
router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.userId) {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }
  try {
    await pool.query('UPDATE users SET is_active = false WHERE user_id = $1', [userId.toUpperCase()]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// FEATURE FLAGS
// ============================================================

// GET /api/admin/features
router.get('/features', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM features ORDER BY key');
    res.json({ features: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/features/:key — toggle feature
router.patch('/features/:key', async (req, res) => {
  const { key } = req.params;
  const { enabled } = req.body;
  try {
    const result = await pool.query(
      'UPDATE features SET enabled = $1 WHERE key = $2 RETURNING *',
      [enabled, key]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Feature not found' });
    res.json({ feature: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// AUDIT LOG
// ============================================================

// GET /api/admin/audit — view audit log
router.get('/audit', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200'
    );
    res.json({ log: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
