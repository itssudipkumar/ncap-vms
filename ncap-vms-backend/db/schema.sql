-- ============================================================
-- NCAP VMS — Database Schema
-- Run this entire file in Supabase SQL Editor
-- Supabase Dashboard > SQL Editor > New Query > Paste > Run
-- ============================================================

-- ===== USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(20) UNIQUE NOT NULL,   -- e.g. STF-042
  name        VARCHAR(100) NOT NULL,
  passcode    VARCHAR(255) NOT NULL,          -- bcrypt hashed
  role        VARCHAR(10) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== VISITORS TABLE =====
CREATE TABLE IF NOT EXISTS visitors (
  id               SERIAL PRIMARY KEY,
  rego             VARCHAR(15) NOT NULL,
  name             VARCHAR(100) NOT NULL,
  company          VARCHAR(100) NOT NULL,
  dept             VARCHAR(150) NOT NULL,
  entry_timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_timestamp   TIMESTAMPTZ,
  created_by       VARCHAR(20) NOT NULL REFERENCES users(user_id),
  session_date     DATE NOT NULL,             -- session start date (06:30 boundary)
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== FEATURES TABLE =====
CREATE TABLE IF NOT EXISTS features (
  key         VARCHAR(50) PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  label       VARCHAR(100) NOT NULL,
  description VARCHAR(200)
);

-- ===== AUDIT LOG TABLE =====
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(20),
  action      VARCHAR(50) NOT NULL,           -- e.g. 'visitor_added', 'exit_recorded'
  target_id   INTEGER,                        -- visitor id if applicable
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_visitors_session_date ON visitors(session_date);
CREATE INDEX IF NOT EXISTS idx_visitors_entry        ON visitors(entry_timestamp);
CREATE INDEX IF NOT EXISTS idx_visitors_rego         ON visitors(rego);
CREATE INDEX IF NOT EXISTS idx_visitors_status       ON visitors(exit_timestamp) WHERE exit_timestamp IS NULL;

-- ============================================================
-- SEED: Default users
-- Passcodes are bcrypt hashed — these match:
--   ADM-001 = 1234   STF-042 = 5678   STF-039 = 9012
-- Generate new hashes: node -e "const b=require('bcryptjs');console.log(b.hashSync('1234',10))"
-- ============================================================
INSERT INTO users (user_id, name, passcode, role) VALUES
  ('ADM-001', 'R. Matsuda', '$2a$10$rBnGzmr.bDm3p6KKMuXnXeHBpvwenXHrx.WdHoXqsHrNBFjYpOOLy', 'admin'),
  ('STF-042', 'J. Barker',  '$2a$10$9HqY3bDcVyN2mKLpzQXXnOzqfL6vVQs8oJxKQGpvRMLX3F2lZjCsS', 'staff'),
  ('STF-039', 'P. Kumar',   '$2a$10$DkBzHXqNpWYCpNJHq3M7OeyZ8TjbKWlq7PuJ5RWJ4XW6xHnQzUvDu', 'staff')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- SEED: Feature flags
-- ============================================================
INSERT INTO features (key, enabled, label, description) VALUES
  ('csvExport',    true,  'CSV Export',    'Staff can export visitor data as CSV'),
  ('pdfExport',    true,  'PDF Reports',   'Staff can download PDF reports'),
  ('editVisitor',  true,  'Edit Visitor',  'Staff can edit entries within current session'),
  ('search',       true,  'Search',        'Search bar visible to staff'),
  ('deleteRecord', false, 'Delete Records','Permanently remove visitor entries')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- HELPER: Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER visitors_updated_at
  BEFORE UPDATE ON visitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
