# Spending Tracker | متتبع المصاريف

A bilingual (English / العربية) mobile-friendly web app for tracking:

- **Daily personal expenses** — food, transport, bills, and more, each user sees only their own.
- **Interior fitout & construction projects** — budgets, payments for materials, workers/labor, subcontractors, transport, permits, and equipment, with per-project cost breakdowns and remaining-budget meters.
- **Suppliers & workers directory** — who was paid and how much in total.
- **Receipt photos** — attach a photo of the invoice/receipt to any expense or payment (uploads are login-protected).

Built for team use: an admin manages members, currency, and projects; members log their own expenses and record project payments.

## Requirements

- Node.js **22.13+** (uses the built-in `node:sqlite` — no native modules to compile).

## Run it

```bash
npm install
npm start
```

Open http://localhost:3000. On first run the app asks you to create the **admin account**. After that, add team members from **Settings → Team members**.

## Configuration (optional environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address — set `127.0.0.1` when running behind a reverse proxy (Caddy/Nginx) |
| `DATA_DIR` | `./data` | Where the SQLite database, session secret, and uploaded receipts live |
| `APP_SECRET` | auto-generated | Session-signing secret (set explicitly when deploying) |

Behind an HTTPS reverse proxy the session cookie is automatically marked `Secure`. External bots/agents can authenticate with `Authorization: Bearer` tokens created in **Settings → Bot & API access** — see [API.md](API.md).

The default currency is **AED**; change it in **Settings → Currency** (any 3-letter code: USD, IQD, SAR, ...).

## Backups

Everything lives in the `data/` directory (`tracker.db` + `uploads/`). Copy that directory to back up; restore it to move to a new server.

## Language & theme

Toggle English/العربية from the button in the header (full right-to-left layout in Arabic). Light and dark themes follow the device setting automatically.

## Roles

| Action | Member | Admin |
|---|---|---|
| Log own personal expenses | ✅ | ✅ |
| Add projects, payments, suppliers/workers | ✅ | ✅ |
| Delete own payments | ✅ | ✅ |
| Delete any record / delete projects | ❌ | ✅ |
| Manage team members & currency | ❌ | ✅ |
