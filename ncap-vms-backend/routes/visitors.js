// routes/visitors.js — Visitor CRUD endpoints
const express = require('express');
const pool    = require('../db/pool');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

// All visitor routes require login
router.use(requireAuth);

// ============================================================
// HELPER — session date boundary (06:30 rule)
// ============================================================
function getSessionDate(date = new Date()) {
  const d = new Date(date);
  // If before 06:30, session date = yesterday
  if (d.getHours() < 6 || (d.getHours() === 6 && d.getMinutes() < 30)) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function isCurrentSession(entryTimestamp) {
  const sessionDate = getSessionDate();
  return getSessionDate(new Date(entryTimestamp)) === sessionDate;
}

// ============================================================
// GET /api/visitors — list visitors
// Query params: ?session=today|YYYY-MM-DD&status=onsite|offsite
// ============================================================
router.get('/', async (req, res) => {
  try {
    let { session, status, search } = req.query;

    let where = ['v.is_deleted = false'];
    let params = [];
    let i = 1;

    // Session filter
    if (session === 'today' || !session) {
      const sd = getSessionDate();
      where.push(`v.session_date = $${i++}`);
      params.push(sd);
    } else if (session !== 'all') {
      where.push(`v.session_date = $${i++}`);
      params.push(session);
    }

    // Status filter
    if (status === 'onsite') {
      where.push('v.exit_timestamp IS NULL');
    } else if (status === 'offsite') {
      where.push('v.exit_timestamp IS NOT NULL');
    }

    // Search
    if (search) {
      where.push(`(
        v.rego ILIKE $${i} OR
        v.name ILIKE $${i} OR
        v.company ILIKE $${i} OR
        v.dept ILIKE $${i}
      )`);
      params.push(`%${search}%`);
      i++;
    }

    const sql = `
      SELECT
        v.id,
        v.rego,
        v.name,
        v.company,
        v.dept,
        v.entry_timestamp,
        v.exit_timestamp,
        v.created_by,
        v.session_date,
        u.name AS created_by_name
      FROM visitors v
      LEFT JOIN users u ON u.user_id = v.created_by
      WHERE ${where.join(' AND ')}
      ORDER BY v.entry_timestamp ASC
    `;

    const result = await pool.query(sql, params);
    res.json({ visitors: result.rows });

  } catch (err) {
    console.error('GET /visitors error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// POST /api/visitors — add new visitor
// ============================================================
router.post('/', async (req, res) => {
  const { rego, name, company, dept } = req.body;

  if (!rego || !name || !company || !dept) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    const now         = new Date();
    const sessionDate = getSessionDate(now);

    const result = await pool.query(`
      INSERT INTO visitors (rego, name, company, dept, entry_timestamp, created_by, session_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      rego.trim().toUpperCase(),
      name.trim(),
      company.trim(),
      dept.trim(),
      now.toISOString(),
      req.user.userId,
      sessionDate
    ]);

    // Audit
    await pool.query(
      'INSERT INTO audit_log (user_id, action, target_id, detail) VALUES ($1, $2, $3, $4)',
      [req.user.userId, 'visitor_added', result.rows[0].id, `${rego} — ${name}`]
    );

    res.status(201).json({ visitor: result.rows[0] });

  } catch (err) {
    console.error('POST /visitors error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// PATCH /api/visitors/:id — edit visitor details
// ============================================================
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { rego, name, company, dept } = req.body;

  try {
    // Fetch existing record
    const existing = await pool.query(
      'SELECT * FROM visitors WHERE id = $1 AND is_deleted = false',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = existing.rows[0];

    // Staff can only edit current session records
    if (req.user.role !== 'admin' && !isCurrentSession(visitor.entry_timestamp)) {
      return res.status(403).json({ error: 'Cannot edit records from past sessions' });
    }

    const result = await pool.query(`
      UPDATE visitors SET
        rego    = COALESCE($1, rego),
        name    = COALESCE($2, name),
        company = COALESCE($3, company),
        dept    = COALESCE($4, dept)
      WHERE id = $5
      RETURNING *
    `, [
      rego    ? rego.trim().toUpperCase()  : null,
      name    ? name.trim()                : null,
      company ? company.trim()             : null,
      dept    ? dept.trim()                : null,
      id
    ]);

    // Audit
    await pool.query(
      'INSERT INTO audit_log (user_id, action, target_id, detail) VALUES ($1, $2, $3, $4)',
      [req.user.userId, 'visitor_edited', id, `Edited ${visitor.name}`]
    );

    res.json({ visitor: result.rows[0] });

  } catch (err) {
    console.error('PATCH /visitors/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// POST /api/visitors/:id/exit — record exit
// ============================================================
router.post('/:id/exit', async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await pool.query(
      'SELECT * FROM visitors WHERE id = $1 AND is_deleted = false',
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    if (existing.rows[0].exit_timestamp) {
      return res.status(400).json({ error: 'Exit already recorded' });
    }

    const result = await pool.query(
      'UPDATE visitors SET exit_timestamp = $1 WHERE id = $2 RETURNING *',
      [new Date().toISOString(), id]
    );

    // Audit
    await pool.query(
      'INSERT INTO audit_log (user_id, action, target_id, detail) VALUES ($1, $2, $3, $4)',
      [req.user.userId, 'exit_recorded', id, `${existing.rows[0].name} exited`]
    );

    res.json({ visitor: result.rows[0] });

  } catch (err) {
    console.error('POST /visitors/:id/exit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// DELETE /api/visitors/:id — soft delete (admin only)
// ============================================================
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      'UPDATE visitors SET is_deleted = true WHERE id = $1',
      [id]
    );

    await pool.query(
      'INSERT INTO audit_log (user_id, action, target_id) VALUES ($1, $2, $3)',
      [req.user.userId, 'visitor_deleted', id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error('DELETE /visitors/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// GET /api/visitors/sessions — list all session dates with counts
// ============================================================
router.get('/sessions/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        session_date,
        COUNT(*)                                            AS total,
        COUNT(*) FILTER (WHERE exit_timestamp IS NULL)     AS on_site,
        COUNT(*) FILTER (WHERE exit_timestamp IS NOT NULL) AS off_site
      FROM visitors
      WHERE is_deleted = false
      GROUP BY session_date
      ORDER BY session_date DESC
    `);
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('GET /sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
