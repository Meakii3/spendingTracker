'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const { db, getSetting, setSetting, UPLOADS_DIR } = require('./src/db');
const {
  hashPassword, verifyPassword, createToken,
  setAuthCookie, clearAuthCookie, requireAuth, requireAdmin,
  generateApiToken, hashApiToken,
} = require('./src/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const ALLOWED_UPLOAD_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = ALLOWED_UPLOAD_TYPES[file.mimetype] || '.bin';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, Boolean(ALLOWED_UPLOAD_TYPES[file.mimetype])),
});

const EXPENSE_CATEGORIES = ['food', 'groceries', 'transport', 'bills', 'health', 'shopping', 'entertainment', 'education', 'family', 'other'];
const PAYMENT_CATEGORIES = ['materials', 'labor', 'subcontractor', 'transport', 'permits', 'equipment', 'other'];

function bad(res, msg) { return res.status(400).json({ error: msg }); }

function parseAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

// ---------- Auth ----------

app.get('/api/bootstrap', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  res.json({ needsSetup: userCount === 0, currency: getSetting('currency') });
});

app.post('/api/setup', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return res.status(403).json({ error: 'already_configured' });
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) return bad(res, 'invalid_input');
  const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(String(name).trim(), String(email).trim(), hashPassword(password), 'admin');
  setAuthCookie(res, createToken(info.lastInsertRowid));
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim());
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    return res.status(401).json({ error: 'bad_credentials' });
  }
  setAuthCookie(res, createToken(user.id));
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user, currency: getSetting('currency') });
});

// ---------- Settings ----------

app.put('/api/settings', requireAuth, requireAdmin, (req, res) => {
  const { currency } = req.body || {};
  if (currency) {
    const code = String(currency).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return bad(res, 'invalid_currency');
    setSetting('currency', code);
  }
  res.json({ currency: getSetting('currency') });
});

// ---------- Users (admin) ----------

app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
  res.json({ items: db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all() });
});

app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || password.length < 6) return bad(res, 'invalid_input');
  const r = role === 'admin' ? 'admin' : 'member';
  try {
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(String(name).trim(), String(email).trim(), hashPassword(password), r);
  } catch (e) {
    return bad(res, 'email_taken');
  }
  res.json({ ok: true });
});

app.delete('/api/users/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return bad(res, 'cannot_delete_self');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ---------- API tokens (for the Telegram agent / bots) ----------

app.get('/api/tokens', requireAuth, (req, res) => {
  const items = db.prepare(
    'SELECT id, name, created_at, last_used_at FROM api_tokens WHERE user_id = ? ORDER BY id DESC'
  ).all(req.user.id);
  res.json({ items });
});

app.post('/api/tokens', requireAuth, (req, res) => {
  const name = String((req.body || {}).name || '').trim();
  if (!name) return bad(res, 'invalid_input');
  const token = generateApiToken();
  db.prepare('INSERT INTO api_tokens (user_id, name, token_hash) VALUES (?, ?, ?)')
    .run(req.user.id, name.slice(0, 60), hashApiToken(token));
  res.json({ token });
});

app.delete('/api/tokens/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT user_id FROM api_tokens WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  db.prepare('DELETE FROM api_tokens WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Personal expenses ----------

app.get('/api/expenses', requireAuth, (req, res) => {
  const month = typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
    ? req.query.month
    : new Date().toISOString().slice(0, 7);
  const items = db.prepare(
    `SELECT * FROM expenses WHERE user_id = ? AND expense_date LIKE ? ORDER BY expense_date DESC, id DESC`
  ).all(req.user.id, `${month}%`);
  const byCategory = db.prepare(
    `SELECT category, SUM(amount) AS total FROM expenses
     WHERE user_id = ? AND expense_date LIKE ? GROUP BY category ORDER BY total DESC`
  ).all(req.user.id, `${month}%`);
  const total = byCategory.reduce((s, r) => s + r.total, 0);
  res.json({ month, items, byCategory, total });
});

app.post('/api/expenses', requireAuth, upload.single('receipt'), (req, res) => {
  const amount = parseAmount(req.body.amount);
  const date = parseDate(req.body.expense_date);
  const category = EXPENSE_CATEGORIES.includes(req.body.category) ? req.body.category : null;
  if (!amount || !date || !category) return bad(res, 'invalid_input');
  const receipt = req.file ? `/uploads/${req.file.filename}` : null;
  db.prepare(
    'INSERT INTO expenses (user_id, amount, category, note, expense_date, receipt_path) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, amount, category, String(req.body.note || '').slice(0, 500), date, receipt);
  res.json({ ok: true });
});

app.delete('/api/expenses/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT user_id FROM expenses WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (row.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Payees (suppliers / workers) ----------

app.get('/api/payees', requireAuth, (req, res) => {
  const items = db.prepare(
    `SELECT p.*, COALESCE(t.total, 0) AS total_paid, COALESCE(t.cnt, 0) AS payment_count
     FROM payees p
     LEFT JOIN (SELECT payee_id, SUM(amount) AS total, COUNT(*) AS cnt FROM payments GROUP BY payee_id) t
       ON t.payee_id = p.id
     ORDER BY p.name COLLATE NOCASE`
  ).all();
  res.json({ items });
});

app.post('/api/payees', requireAuth, (req, res) => {
  const { name, type, phone, note } = req.body || {};
  if (!name || !String(name).trim()) return bad(res, 'invalid_input');
  const t = ['supplier', 'worker', 'subcontractor', 'other'].includes(type) ? type : 'supplier';
  db.prepare('INSERT INTO payees (name, type, phone, note) VALUES (?, ?, ?, ?)')
    .run(String(name).trim(), t, String(phone || '').slice(0, 40), String(note || '').slice(0, 500));
  res.json({ ok: true });
});

app.delete('/api/payees/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM payees WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Projects ----------

const PROJECT_SPENT_JOIN = `
  LEFT JOIN (SELECT project_id, SUM(amount) AS spent FROM payments GROUP BY project_id) s
    ON s.project_id = pr.id
  LEFT JOIN (SELECT project_id, SUM(amount) AS received FROM client_payments GROUP BY project_id) rc
    ON rc.project_id = pr.id`;
const PROJECT_TOTALS = `COALESCE(s.spent, 0) AS spent, COALESCE(rc.received, 0) AS received`;

app.get('/api/projects', requireAuth, (req, res) => {
  const items = db.prepare(
    `SELECT pr.*, ${PROJECT_TOTALS} FROM projects pr ${PROJECT_SPENT_JOIN}
     ORDER BY CASE pr.status WHEN 'active' THEN 0 WHEN 'on_hold' THEN 1 ELSE 2 END, pr.id DESC`
  ).all();
  res.json({ items });
});

app.post('/api/projects', requireAuth, (req, res) => {
  const { name, client_name, type, budget, status, start_date, note } = req.body || {};
  if (!name || !String(name).trim()) return bad(res, 'invalid_input');
  const t = ['fitout', 'construction', 'other'].includes(type) ? type : 'fitout';
  const st = ['active', 'on_hold', 'completed'].includes(status) ? status : 'active';
  const b = Number(budget);
  const cv = Number((req.body || {}).contract_value);
  db.prepare(
    'INSERT INTO projects (name, client_name, type, budget, contract_value, status, start_date, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(String(name).trim(), String(client_name || '').trim(), t,
        Number.isFinite(b) && b >= 0 ? b : 0,
        Number.isFinite(cv) && cv >= 0 ? cv : 0,
        st, parseDate(start_date), String(note || '').slice(0, 1000));
  res.json({ ok: true });
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'not_found' });
  const body = req.body || {};
  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  if (!name) return bad(res, 'invalid_input');
  const type = ['fitout', 'construction', 'other'].includes(body.type) ? body.type : existing.type;
  const status = ['active', 'on_hold', 'completed'].includes(body.status) ? body.status : existing.status;
  const b = Number(body.budget);
  const budget = body.budget !== undefined && Number.isFinite(b) && b >= 0 ? b : existing.budget;
  const cv = Number(body.contract_value);
  const contractValue = body.contract_value !== undefined && Number.isFinite(cv) && cv >= 0 ? cv : existing.contract_value;
  db.prepare(
    `UPDATE projects SET name = ?, client_name = ?, type = ?, budget = ?, contract_value = ?, status = ?, start_date = ?, note = ? WHERE id = ?`
  ).run(name,
        body.client_name !== undefined ? String(body.client_name).trim() : existing.client_name,
        type, budget, contractValue, status,
        body.start_date !== undefined ? parseDate(body.start_date) : existing.start_date,
        body.note !== undefined ? String(body.note).slice(0, 1000) : existing.note,
        id);
  res.json({ ok: true });
});

app.delete('/api/projects/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

app.get('/api/projects/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const project = db.prepare(
    `SELECT pr.*, ${PROJECT_TOTALS} FROM projects pr ${PROJECT_SPENT_JOIN} WHERE pr.id = ?`
  ).get(id);
  if (!project) return res.status(404).json({ error: 'not_found' });
  const clientPayments = db.prepare(
    `SELECT cp.*, u.name AS created_by_name
     FROM client_payments cp LEFT JOIN users u ON u.id = cp.created_by
     WHERE cp.project_id = ? ORDER BY cp.payment_date DESC, cp.id DESC`
  ).all(id);
  const payments = db.prepare(
    `SELECT pm.*, pe.name AS payee_name, u.name AS created_by_name
     FROM payments pm
     LEFT JOIN payees pe ON pe.id = pm.payee_id
     LEFT JOIN users u ON u.id = pm.created_by
     WHERE pm.project_id = ? ORDER BY pm.payment_date DESC, pm.id DESC`
  ).all(id);
  const byCategory = db.prepare(
    `SELECT category, SUM(amount) AS total FROM payments WHERE project_id = ? GROUP BY category ORDER BY total DESC`
  ).all(id);
  res.json({ project, payments, byCategory, clientPayments });
});

// ---------- Client (owner) payments received against the contract ----------

app.post('/api/projects/:id/client-payments', requireAuth, upload.single('receipt'), (req, res) => {
  const projectId = Number(req.params.id);
  if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)) {
    return res.status(404).json({ error: 'not_found' });
  }
  const amount = parseAmount(req.body.amount);
  const date = parseDate(req.body.payment_date);
  if (!amount || !date) return bad(res, 'invalid_input');
  const receipt = req.file ? `/uploads/${req.file.filename}` : null;
  db.prepare(
    `INSERT INTO client_payments (project_id, amount, payment_date, note, receipt_path, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(projectId, amount, date, String(req.body.note || '').slice(0, 500), receipt, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/client-payments/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT created_by FROM client_payments WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (row.created_by !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  db.prepare('DELETE FROM client_payments WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Project payments ----------

app.post('/api/projects/:id/payments', requireAuth, upload.single('receipt'), (req, res) => {
  const projectId = Number(req.params.id);
  if (!db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId)) {
    return res.status(404).json({ error: 'not_found' });
  }
  const amount = parseAmount(req.body.amount);
  const date = parseDate(req.body.payment_date);
  const category = PAYMENT_CATEGORIES.includes(req.body.category) ? req.body.category : null;
  if (!amount || !date || !category) return bad(res, 'invalid_input');
  const payeeId = req.body.payee_id ? Number(req.body.payee_id) : null;
  if (payeeId && !db.prepare('SELECT id FROM payees WHERE id = ?').get(payeeId)) {
    return bad(res, 'invalid_payee');
  }
  const receipt = req.file ? `/uploads/${req.file.filename}` : null;
  db.prepare(
    `INSERT INTO payments (project_id, payee_id, category, amount, payment_date, note, receipt_path, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(projectId, payeeId, category, amount, date, String(req.body.note || '').slice(0, 500), receipt, req.user.id);
  res.json({ ok: true });
});

app.delete('/api/payments/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT created_by FROM payments WHERE id = ?').get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: 'not_found' });
  if (row.created_by !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' });
  }
  db.prepare('DELETE FROM payments WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- Dashboard ----------

app.get('/api/dashboard', requireAuth, (req, res) => {
  const month = new Date().toISOString().slice(0, 7);
  const byCategory = db.prepare(
    `SELECT category, SUM(amount) AS total FROM expenses
     WHERE user_id = ? AND expense_date LIKE ? GROUP BY category ORDER BY total DESC`
  ).all(req.user.id, `${month}%`);
  const personalTotal = byCategory.reduce((s, r) => s + r.total, 0);

  const projects = db.prepare(
    `SELECT pr.id, pr.name, pr.type, pr.status, pr.budget, COALESCE(s.spent, 0) AS spent
     FROM projects pr ${PROJECT_SPENT_JOIN}
     WHERE pr.status != 'completed'
     ORDER BY spent DESC LIMIT 6`
  ).all();
  const totals = db.prepare(
    `SELECT COUNT(*) AS activeCount, COALESCE(SUM(pr.budget), 0) AS totalBudget, COALESCE(SUM(s.spent), 0) AS totalSpent
     FROM projects pr ${PROJECT_SPENT_JOIN} WHERE pr.status = 'active'`
  ).get();

  res.json({ month, personal: { total: personalTotal, byCategory }, projects, totals });
});

// ---------- Uploads (auth-protected) & static ----------

app.use('/uploads', requireAuth, express.static(UPLOADS_DIR, { fallthrough: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'upload_failed' });
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => {
  console.log(`Spending Tracker running on http://localhost:${PORT}`);
});
