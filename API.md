# Spending Tracker — Agent / Bot API Guide

Paste this document into the instructions of your AI agent (e.g. a Telegram
bot) so it can record expenses and payments in the Spending Tracker app.

## Setup

- **Base URL**: `http://YOUR-SERVER:3000` (replace with your server address).
- **Authentication**: every request needs a header
  `Authorization: Bearer <TOKEN>`.
- Each person creates their own token in the app under **Settings → Bot & API
  access**. The token determines whose account the record belongs to, so an
  agent serving a group chat should hold one token per person and pick the
  token matching whoever sent the message:

```
Tokens:
- Person A (e.g. Meakii): st_xxxxxxxx...
- Person B (partner):     st_yyyyyyyy...
```

- Amounts are plain numbers (no currency symbol). Dates are `YYYY-MM-DD`.
  If the user doesn't say a date, use today. Successful writes return
  `{"ok":true}`; errors return `{"error":"..."}` with a 4xx status.

## 1. Personal daily expenses

“I paid 45 for lunch” → add a personal expense for the sender.

```bash
curl -X POST $BASE/api/expenses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 45, "category": "food", "expense_date": "2026-07-07", "note": "lunch"}'
```

Categories (choose the closest): `food`, `groceries`, `transport`, `bills`,
`health`, `shopping`, `entertainment`, `education`, `family`, `other`.

Read back a month (omit `month` for the current one):

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/expenses?month=2026-07"
# → { items: [...], byCategory: [...], total: 165.5 }
```

## 2. Projects

List projects (to find the project id by name):

```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/projects
# → { items: [ { id, name, type, status, budget, contract_value, spent, received, ... } ] }
```

Full status of one project — spent, received from owner, expenditure list,
per-category breakdown:

```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/projects/1
```

Create a project:

```bash
curl -X POST $BASE/api/projects \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "ELA cafe", "client_name": "Faisal", "type": "fitout",
       "budget": 150000, "contract_value": 170000, "start_date": "2026-07-07"}'
```

`type`: `fitout` | `construction` | `other`.

## 3. Project expenditures (المنصرفات — money going OUT)

“We paid 18,500 for gypsum and paint on the ELA cafe project” →

```bash
curl -X POST $BASE/api/projects/1/payments \
  -H "Authorization: Bearer $TOKEN" \
  -F amount=18500 -F category=materials -F payment_date=2026-07-07 \
  -F note="gypsum + paint" -F payee_id=1
```

Categories: `materials`, `labor`, `subcontractor`, `transport`, `permits`,
`equipment`, `other`. `payee_id` and `note` are optional. To attach a receipt
photo add `-F receipt=@photo.jpg` (jpeg/png/webp/heic/pdf, max 10 MB).
JSON body also works when there is no file.

## 4. Payments received from the owner (الدفعات المستلمة — money coming IN)

“The owner transferred the second installment, 50,000” →

```bash
curl -X POST $BASE/api/projects/1/client-payments \
  -H "Authorization: Bearer $TOKEN" \
  -F amount=50000 -F payment_date=2026-07-07 -F note="second installment"
```

Never confuse this with expenditures: received = owner pays us; expenditure =
we pay suppliers/workers.

## 5. Suppliers & workers (payees)

```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/payees          # list (find payee_id by name)
curl -X POST $BASE/api/payees \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "Abu Ahmed", "type": "worker", "phone": "0501234567"}'
```

`type`: `supplier` | `worker` | `subcontractor` | `other`.

## 6. Summary questions

“How much did I spend this month?” / “How are the projects doing?” →

```bash
curl -H "Authorization: Bearer $TOKEN" $BASE/api/dashboard
# → { personal: { total, byCategory }, projects: [...], totals: { activeCount, totalBudget, totalSpent } }
```

## Agent behaviour tips

- Resolve project and payee names to ids by listing them first; match
  loosely (users type partial names, Arabic or English).
- Confirm what was recorded in one short line, e.g.
  “✅ Recorded 18,500 materials expenditure on ELA cafe (paid to Abu Ahmed).”
- If the amount, project, or direction (in vs out) is unclear — ask, don't guess.
- A `401` response means the token is wrong/revoked; tell the user to create
  a new one in Settings → Bot & API access.
