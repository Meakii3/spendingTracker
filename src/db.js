'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'tracker.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount       REAL NOT NULL CHECK (amount > 0),
  category     TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  expense_date TEXT NOT NULL,
  receipt_path TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);

CREATE TABLE IF NOT EXISTS payees (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL,
  type  TEXT NOT NULL DEFAULT 'supplier' CHECK (type IN ('supplier','worker','subcontractor','other')),
  phone TEXT NOT NULL DEFAULT '',
  note  TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  client_name TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'fitout' CHECK (type IN ('fitout','construction','other')),
  budget      REAL NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed')),
  start_date  TEXT,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payee_id     INTEGER REFERENCES payees(id) ON DELETE SET NULL,
  category     TEXT NOT NULL DEFAULT 'materials'
               CHECK (category IN ('materials','labor','subcontractor','transport','permits','equipment','other')),
  amount       REAL NOT NULL CHECK (amount > 0),
  payment_date TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  receipt_path TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id, payment_date);

CREATE TABLE IF NOT EXISTS client_payments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount       REAL NOT NULL CHECK (amount > 0),
  payment_date TEXT NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  receipt_path TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_client_payments_project ON client_payments(project_id, payment_date);

CREATE TABLE IF NOT EXISTS api_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);
`);

// Migrations for databases created before these columns existed
const projectCols = db.prepare(`SELECT name FROM pragma_table_info('projects')`).all().map(r => r.name);
if (!projectCols.includes('contract_value')) {
  db.exec(`ALTER TABLE projects ADD COLUMN contract_value REAL NOT NULL DEFAULT 0`);
}

db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'AED')`).run();

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
}

module.exports = { db, getSetting, setSetting, DATA_DIR, UPLOADS_DIR };
