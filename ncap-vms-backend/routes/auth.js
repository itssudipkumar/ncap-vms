// routes/auth.js — Login endpoint
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const router = express.Router();

// POST /api/auth/login
// Body: { userId: "STF-042", passcode: "5678" }
router.post('/login', async (req, res) => {
  const { userId, passcode } = req.body;

  if (!userId || !passcode) {
    return res.status(400).json({ error: 'User ID and passcode required' });
  }

  try {
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE user_id = $1 AND is_active = true',
      [userId.trim().toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare passcode
    const match = await bcrypt.compare(String(passcode), user.passcode);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign JWT
    const token = jwt.sign(
      { userId: user.user_id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    // Log login
    await pool.query(
      'INSERT INTO audit_log (user_id, action, detail) VALUES ($1, $2, $3)',
      [user.user_id, 'login', `Login from ${req.ip}`]
    );

    res.json({
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        role: user.role,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me — verify token + return current user
router.get('/me', require('../middleware/auth').requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
