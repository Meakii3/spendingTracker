'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { db, DATA_DIR } = require('./db');

const SECRET_FILE = path.join(DATA_DIR, 'secret.key');

function loadSecret() {
  if (process.env.APP_SECRET) return process.env.APP_SECRET;
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(SECRET_FILE, 'utf8').trim();
}

const SECRET = loadSecret();
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// --- Password hashing (scrypt, no native deps) ---

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// --- Signed session tokens in an httpOnly cookie ---

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function createToken(userId) {
  const payload = `${userId}.${Date.now() + TOKEN_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts;
  const payload = `${uid}.${exp}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  return Number(uid);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return out;
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(TOKEN_TTL_MS / 1000)}; SameSite=Lax`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
}

// --- API tokens (for bots / external agents) ---

function generateApiToken() {
  return 'st_' + crypto.randomBytes(24).toString('hex');
}

function hashApiToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function userFromBearer(header) {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token.startsWith('st_')) return null;
  const row = db.prepare(
    `SELECT u.id, u.name, u.email, u.role, t.id AS token_id
     FROM api_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ?`
  ).get(hashApiToken(token));
  if (!row) return null;
  db.prepare(`UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?`).run(row.token_id);
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

// --- Express middleware ---

function requireAuth(req, res, next) {
  let user = userFromBearer(req.headers.authorization);
  if (!user) {
    const userId = verifyToken(parseCookies(req).token);
    if (userId) user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(userId) || null;
  }
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

module.exports = {
  hashPassword, verifyPassword,
  createToken, verifyToken, parseCookies,
  setAuthCookie, clearAuthCookie,
  generateApiToken, hashApiToken,
  requireAuth, requireAdmin,
};
