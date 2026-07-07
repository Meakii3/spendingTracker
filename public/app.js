'use strict';

const EXPENSE_CATEGORIES = ['food', 'groceries', 'transport', 'bills', 'health', 'shopping', 'entertainment', 'education', 'family', 'other'];
const PAYMENT_CATEGORIES = ['materials', 'labor', 'subcontractor', 'transport', 'permits', 'equipment', 'other'];
const PAYEE_TYPES = ['supplier', 'worker', 'subcontractor', 'other'];

const state = { user: null, currency: 'AED', needsSetup: false, expenseMonth: null };

const $app = document.getElementById('app');

// ---------- helpers ----------

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmt(amount) {
  const locale = document.documentElement.lang === 'ar' ? 'ar' : 'en';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: state.currency,
      maximumFractionDigits: 2, trailingZeroDisplay: 'stripIfInteger',
    }).format(amount || 0);
  } catch {
    return `${(amount || 0).toLocaleString(locale)} ${state.currency}`;
  }
}

function fmtDate(iso) {
  if (!iso) return t('none');
  const locale = document.documentElement.lang === 'ar' ? 'ar' : 'en-GB';
  return new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function today() { return new Date().toISOString().slice(0, 10); }
function thisMonth() { return new Date().toISOString().slice(0, 7); }

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.includes('/api/login') && !path.includes('/api/bootstrap')) {
    state.user = null;
    render();
    throw new Error('unauthorized');
  }
  if (!res.ok) throw new Error(data.error || 'error_generic');
  return data;
}

function jsonPost(path, body, method = 'POST') {
  return api(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ---------- shared UI pieces ----------

const ICONS = {
  logo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10.5 9-7.5 9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>`,
  receipt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5Z"/><path d="M9 7.5h6M9 11h6"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16"/><path d="M15 9h4a1 1 0 0 1 1 1v11"/><path d="M2 21h20"/><path d="M7.5 8h1M7.5 12h1M7.5 16h1M11 8h1M11 12h1M11 16h1"/></svg>`,
  people: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16.5 4.9a3.5 3.5 0 0 1 0 6.2"/><path d="M18.5 15.5c1.9.8 3 2.3 3 4.5"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.98 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.98a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.26.63.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z"/></svg>`,
};

function topbar() {
  return `
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">${ICONS.logo}</div>
        <div>
          <h1>${t('app_name')}</h1>
          <div class="sub">${t('tagline')}</div>
        </div>
      </div>
      <button class="lang-toggle" onclick="toggleLang()">${document.documentElement.lang === 'ar' ? 'English' : 'العربية'}</button>
    </div>`;
}

function bottomNav(active) {
  const tabs = [
    ['dashboard', 'home', 'nav_dashboard'],
    ['expenses', 'receipt', 'nav_expenses'],
    ['projects', 'building', 'nav_projects'],
    ['payees', 'people', 'nav_payees'],
    ['settings', 'gear', 'nav_settings'],
  ];
  return `
    <nav class="bottom-nav">
      ${tabs.map(([route, icon, key]) => `
        <button class="${active === route ? 'active' : ''}" onclick="location.hash='#/${route}'">
          ${ICONS[icon]}${t(key)}
        </button>`).join('')}
    </nav>`;
}

function barRows(rows, labelFor, maxOverride) {
  if (!rows.length) return `<div class="empty">${t('no_data_yet')}</div>`;
  const max = maxOverride || Math.max(...rows.map(r => r.total));
  return rows.map(r => `
    <div class="bar-row">
      <div class="bar-head">
        <span class="bar-label">${esc(labelFor(r))}</span>
        <span class="bar-value">${fmt(r.total)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(2, (r.total / max) * 100)}%"></div></div>
    </div>`).join('');
}

function budgetMeter(budget, spent) {
  if (!budget) return '';
  const pct = (spent / budget) * 100;
  const over = spent > budget;
  return `
    <div class="bar-track"><div class="bar-fill ${over ? 'over' : ''}" style="width:${Math.min(100, pct)}%"></div></div>
    <div class="meter-note">
      <span>${Math.round(pct)}% ${t('budget_used')}</span>
      ${over
        ? `<span class="over-flag">⚠ ${t('over_budget')}: ${fmt(spent - budget)}</span>`
        : `<span class="remaining-flag">${t('remaining')}: ${fmt(budget - spent)}</span>`}
    </div>`;
}

function contractMeter(contract, received) {
  if (!contract) return '';
  const pct = (received / contract) * 100;
  const remaining = Math.max(0, contract - received);
  return `
    <div class="bar-track"><div class="bar-fill good" style="width:${Math.min(100, pct)}%"></div></div>
    <div class="meter-note">
      <span>${Math.round(pct)}% ${t('of_contract')}</span>
      <span class="${remaining ? '' : 'remaining-flag'}">${t('remaining_contract')}: ${fmt(remaining)}</span>
    </div>`;
}

function openModal(innerHtml) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.id = 'modal';
  wrap.innerHTML = `<div class="modal">${innerHtml}</div>`;
  wrap.addEventListener('click', e => { if (e.target === wrap) closeModal(); });
  document.body.appendChild(wrap);
}

function closeModal() { document.getElementById('modal')?.remove(); }

function field(label, inputHtml) {
  return `<label class="field"><span class="field-label">${label}</span>${inputHtml}</label>`;
}

function selectHtml(name, options, selected) {
  return `<select name="${name}">${options.map(([v, l]) =>
    `<option value="${v}" ${v === selected ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}

async function submitForm(formEl, url, { multipart = false, method = 'POST' } = {}) {
  const errEl = formEl.querySelector('.form-error');
  errEl.textContent = '';
  try {
    if (multipart) {
      await api(url, { method, body: new FormData(formEl) });
    } else {
      const body = Object.fromEntries(new FormData(formEl).entries());
      await jsonPost(url, body, method);
    }
    closeModal();
    render();
  } catch (e) {
    errEl.textContent = t(e.message) === e.message ? t('error_generic') : t(e.message);
  }
}

async function confirmDelete(url) {
  if (!confirm(t('confirm_delete'))) return;
  try { await api(url, { method: 'DELETE' }); render(); }
  catch { alert(t('error_generic')); }
}

// ---------- auth views ----------

function renderLogin() {
  $app.innerHTML = `
    <div class="auth-wrap">
      <div class="logo"><div class="brand-mark">${ICONS.logo}</div><h1>${t('app_name')}</h1><p>${t('tagline')}</p></div>
      <div class="card">
        <form id="login-form">
          <div class="form-error"></div>
          ${field(t('email'), `<input type="email" name="email" required autocomplete="email">`)}
          ${field(t('password'), `<input type="password" name="password" required autocomplete="current-password">`)}
          <button class="btn" type="submit">${t('sign_in')}</button>
        </form>
      </div>
      <div style="text-align:center"><button class="lang-toggle" onclick="toggleLang()">${document.documentElement.lang === 'ar' ? 'English' : 'العربية'}</button></div>
    </div>`;
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = e.target.querySelector('.form-error');
    try {
      const body = Object.fromEntries(new FormData(e.target).entries());
      await jsonPost('/api/login', body);
      await loadSession();
      render();
    } catch { errEl.textContent = t('bad_credentials'); }
  });
}

function renderSetup() {
  $app.innerHTML = `
    <div class="auth-wrap">
      <div class="logo"><div class="brand-mark">${ICONS.logo}</div><h1>${t('app_name')}</h1></div>
      <div class="card">
        <h2>${t('first_run_title')}</h2>
        <p class="hint">${t('first_run_hint')}</p>
        <form id="setup-form">
          <div class="form-error"></div>
          ${field(t('name'), `<input name="name" required>`)}
          ${field(t('email'), `<input type="email" name="email" required>`)}
          ${field(t('password'), `<input type="password" name="password" required minlength="6">`)}
          <button class="btn" type="submit">${t('create_account')}</button>
        </form>
      </div>
      <div style="text-align:center"><button class="lang-toggle" onclick="toggleLang()">${document.documentElement.lang === 'ar' ? 'English' : 'العربية'}</button></div>
    </div>`;
  document.getElementById('setup-form').addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = e.target.querySelector('.form-error');
    try {
      const body = Object.fromEntries(new FormData(e.target).entries());
      await jsonPost('/api/setup', body);
      state.needsSetup = false;
      await loadSession();
      render();
    } catch (err) { errEl.textContent = t(err.message) === err.message ? t('error_generic') : t(err.message); }
  });
}

// ---------- dashboard ----------

async function renderDashboard() {
  const d = await api('/api/dashboard');
  $app.innerHTML = `
    ${topbar()}
    <div class="tile-row">
      <div class="stat-tile">
        <div class="label">${t('my_spending')} · ${t('this_month')}</div>
        <div class="value">${fmt(d.personal.total)}</div>
      </div>
      <div class="stat-tile">
        <div class="label">${t('active_projects')}</div>
        <div class="value">${d.totals.activeCount}</div>
        <div class="delta">${t('total_spent')}: ${fmt(d.totals.totalSpent)}</div>
      </div>
    </div>
    <div class="card">
      <h2>${t('my_spending')} — ${t('by_category')}</h2>
      ${barRows(d.personal.byCategory, r => t('cat_' + r.category))}
    </div>
    <div class="card">
      <h2>${t('active_projects')}</h2>
      ${d.projects.length ? d.projects.map(p => `
        <div class="list-item clickable" onclick="location.hash='#/project/${p.id}'">
          <div class="li-main">
            <div class="li-title">${esc(p.name)}</div>
            <div class="li-sub">${t('type_' + p.type)} · ${t('spent')}: ${fmt(p.spent)}${p.budget ? ' / ' + fmt(p.budget) : ''}</div>
            ${p.budget ? budgetMeter(p.budget, p.spent) : ''}
          </div>
        </div>`).join('') : `<div class="empty">${t('no_projects')}</div>`}
    </div>
    ${bottomNav('dashboard')}`;
}

// ---------- personal expenses ----------

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function renderExpenses() {
  const month = state.expenseMonth || thisMonth();
  const d = await api(`/api/expenses?month=${month}`);
  const monthLabel = new Date(month + '-01T00:00:00')
    .toLocaleDateString(document.documentElement.lang === 'ar' ? 'ar' : 'en', { month: 'long', year: 'numeric' });
  $app.innerHTML = `
    ${topbar()}
    <div class="month-nav">
      <button onclick="changeMonth(-1)">‹</button>
      <span class="month-label">${monthLabel}</span>
      <button onclick="changeMonth(1)">›</button>
    </div>
    <div class="tile-row">
      <div class="stat-tile">
        <div class="label">${t('month_total')}</div>
        <div class="value">${fmt(d.total)}</div>
      </div>
      <div class="stat-tile">
        <div class="label">${t('by_category')}</div>
        <div class="value">${d.byCategory.length}</div>
      </div>
    </div>
    <div class="fab-row"><button class="btn" onclick="openExpenseModal()">＋ ${t('add_expense')}</button></div>
    <div class="card">
      <h2>${t('by_category')}</h2>
      ${barRows(d.byCategory, r => t('cat_' + r.category))}
    </div>
    <div class="card">
      ${d.items.length ? d.items.map(x => `
        <div class="list-item">
          <div class="li-main">
            <div class="li-title">${t('cat_' + x.category)}</div>
            <div class="li-sub">${fmtDate(x.expense_date)}${x.note ? ' · ' + esc(x.note) : ''}
              ${x.receipt_path ? ` · <a class="receipt-link" href="${esc(x.receipt_path)}" target="_blank">📎 ${t('view_receipt')}</a>` : ''}</div>
          </div>
          <div class="li-amount">${fmt(x.amount)}</div>
          <button class="btn danger-text" onclick="confirmDelete('/api/expenses/${x.id}')">✕</button>
        </div>`).join('') : `<div class="empty">${t('no_expenses')}</div>`}
    </div>
    ${bottomNav('expenses')}`;
}

function changeMonth(delta) {
  state.expenseMonth = shiftMonth(state.expenseMonth || thisMonth(), delta);
  render();
}

function openExpenseModal() {
  openModal(`
    <h3>${t('add_expense')}</h3>
    <form id="modal-form" enctype="multipart/form-data">
      <div class="form-error"></div>
      <div class="form-grid-2">
        ${field(t('amount'), `<input type="number" name="amount" step="0.01" min="0.01" required inputmode="decimal">`)}
        ${field(t('date'), `<input type="date" name="expense_date" value="${today()}" required>`)}
      </div>
      ${field(t('category'), selectHtml('category', EXPENSE_CATEGORIES.map(c => [c, t('cat_' + c)]), 'food'))}
      ${field(`${t('note')} (${t('optional')})`, `<input name="note" maxlength="500">`)}
      ${field(`${t('receipt')} (${t('optional')})`, `<input type="file" name="receipt" accept="image/*,application/pdf" capture="environment">`)}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">${t('cancel')}</button>
        <button type="submit" class="btn">${t('save')}</button>
      </div>
    </form>`);
  document.getElementById('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm(e.target, '/api/expenses', { multipart: true });
  });
}

// ---------- projects ----------

async function renderProjects() {
  const d = await api('/api/projects');
  $app.innerHTML = `
    ${topbar()}
    <div class="fab-row"><button class="btn" onclick="openProjectModal()">＋ ${t('add_project')}</button></div>
    <div class="card">
      ${d.items.length ? d.items.map(p => `
        <div class="list-item clickable" onclick="location.hash='#/project/${p.id}'">
          <div class="li-main">
            <div class="li-title">${esc(p.name)}</div>
            <div class="li-sub">
              <span class="chip status-${p.status}">${t('status_' + p.status)}</span>
              ${t('type_' + p.type)}${p.client_name ? ' · ' + esc(p.client_name) : ''}
            </div>
            ${p.budget ? budgetMeter(p.budget, p.spent) : ''}
          </div>
          <div class="li-amount">${fmt(p.spent)}</div>
        </div>`).join('') : `<div class="empty">${t('no_projects')}</div>`}
    </div>
    ${bottomNav('projects')}`;
}

function projectFormFields(p = {}) {
  return `
    ${field(t('project_name'), `<input name="name" required value="${esc(p.name || '')}">`)}
    ${field(t('client'), `<input name="client_name" value="${esc(p.client_name || '')}">`)}
    <div class="form-grid-2">
      ${field(t('project_type'), selectHtml('type', [['fitout', t('type_fitout')], ['construction', t('type_construction')], ['other', t('type_other')]], p.type || 'fitout'))}
      ${field(t('status'), selectHtml('status', [['active', t('status_active')], ['on_hold', t('status_on_hold')], ['completed', t('status_completed')]], p.status || 'active'))}
    </div>
    <div class="form-grid-2">
      ${field(t('contract_value'), `<input type="number" name="contract_value" step="0.01" min="0" inputmode="decimal" value="${p.contract_value ?? ''}">`)}
      ${field(t('budget'), `<input type="number" name="budget" step="0.01" min="0" inputmode="decimal" value="${p.budget ?? ''}">`)}
    </div>
    ${field(t('start_date'), `<input type="date" name="start_date" value="${esc(p.start_date || today())}">`)}
    ${field(`${t('note')} (${t('optional')})`, `<textarea name="note" rows="2" maxlength="1000">${esc(p.note || '')}</textarea>`)}`;
}

function openProjectModal(project) {
  const isEdit = Boolean(project);
  openModal(`
    <h3>${isEdit ? t('edit_project') : t('add_project')}</h3>
    <form id="modal-form">
      <div class="form-error"></div>
      ${projectFormFields(project || {})}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">${t('cancel')}</button>
        <button type="submit" class="btn">${t('save')}</button>
      </div>
    </form>`);
  document.getElementById('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm(e.target, isEdit ? `/api/projects/${project.id}` : '/api/projects', { method: isEdit ? 'PUT' : 'POST' });
  });
}

let currentProject = null;

async function renderProjectDetail(id) {
  const d = await api(`/api/projects/${id}`);
  currentProject = d.project;
  const p = d.project;
  $app.innerHTML = `
    ${topbar()}
    <div class="fab-row">
      <button class="btn secondary small" onclick="location.hash='#/projects'">← ${t('back')}</button>
      <button class="btn secondary small" onclick="openProjectModal(currentProject)">✎ ${t('edit_project')}</button>
      ${state.user.role === 'admin' ? `<button class="btn danger-text" onclick="confirmDeleteProject(${p.id})">${t('delete')}</button>` : ''}
    </div>
    <div class="card">
      <div class="li-title" style="font-size:1.15rem">${esc(p.name)}</div>
      <div class="li-sub" style="margin:4px 0 12px">
        <span class="chip status-${p.status}">${t('status_' + p.status)}</span>
        ${t('type_' + p.type)}${p.client_name ? ' · ' + esc(p.client_name) : ''} · ${fmtDate(p.start_date)}
      </div>
      <div class="tile-row" style="margin-bottom:0">
        <div class="stat-tile"><div class="label">${t('spent')}</div><div class="value">${fmt(p.spent)}</div></div>
        <div class="stat-tile"><div class="label">${t('budget')}</div><div class="value">${p.budget ? fmt(p.budget) : t('none')}</div></div>
      </div>
      ${p.budget ? `<div style="margin-top:12px">${budgetMeter(p.budget, p.spent)}</div>` : ''}
      ${p.note ? `<p class="hint" style="margin-top:10px">${esc(p.note)}</p>` : ''}
    </div>
    <div class="card">
      <div class="section-head">
        <h2>${t('client_payments')}</h2>
        <button class="btn small" onclick="openClientPaymentModal(${p.id})">＋ ${t('add_client_payment')}</button>
      </div>
      <div class="tile-row" style="margin-bottom:0">
        <div class="stat-tile"><div class="label">${t('contract_value')}</div><div class="value">${p.contract_value ? fmt(p.contract_value) : t('none')}</div></div>
        <div class="stat-tile"><div class="label">${t('received')}</div><div class="value">${fmt(p.received)}</div></div>
      </div>
      ${p.contract_value ? `<div style="margin-top:12px">${contractMeter(p.contract_value, p.received)}</div>` : ''}
      <div style="margin-top:8px">
      ${d.clientPayments.length ? d.clientPayments.map(x => `
        <div class="list-item">
          <div class="li-main">
            <div class="li-title">${t('received_payment')}</div>
            <div class="li-sub">${fmtDate(x.payment_date)}${x.note ? ' · ' + esc(x.note) : ''}${x.created_by_name ? ` · ${t('added_by')} ${esc(x.created_by_name)}` : ''}
              ${x.receipt_path ? ` · <a class="receipt-link" href="${esc(x.receipt_path)}" target="_blank">📎 ${t('view_receipt')}</a>` : ''}</div>
          </div>
          <div class="li-amount received-amount">${fmt(x.amount)}</div>
          <button class="btn danger-text" onclick="confirmDelete('/api/client-payments/${x.id}')">✕</button>
        </div>`).join('') : `<div class="empty">${t('no_client_payments')}</div>`}
      </div>
    </div>
    <div class="card">
      <h2>${t('cost_breakdown')}</h2>
      ${barRows(d.byCategory, r => t('pcat_' + r.category))}
    </div>
    <div class="fab-row"><button class="btn" onclick="openPaymentModal(${p.id})">＋ ${t('add_payment')}</button></div>
    <div class="card">
      <h2>${t('payments')}</h2>
      ${d.payments.length ? d.payments.map(x => `
        <div class="list-item">
          <div class="li-main">
            <div class="li-title">${t('pcat_' + x.category)}${x.payee_name ? ' — ' + esc(x.payee_name) : ''}</div>
            <div class="li-sub">${fmtDate(x.payment_date)}${x.note ? ' · ' + esc(x.note) : ''}${x.created_by_name ? ` · ${t('added_by')} ${esc(x.created_by_name)}` : ''}
              ${x.receipt_path ? ` · <a class="receipt-link" href="${esc(x.receipt_path)}" target="_blank">📎 ${t('view_receipt')}</a>` : ''}</div>
          </div>
          <div class="li-amount">${fmt(x.amount)}</div>
          <button class="btn danger-text" onclick="confirmDelete('/api/payments/${x.id}')">✕</button>
        </div>`).join('') : `<div class="empty">${t('no_payments')}</div>`}
    </div>
    ${bottomNav('projects')}`;
}

async function confirmDeleteProject(id) {
  if (!confirm(t('confirm_delete'))) return;
  try { await api(`/api/projects/${id}`, { method: 'DELETE' }); location.hash = '#/projects'; }
  catch { alert(t('error_generic')); }
}

function openClientPaymentModal(projectId) {
  openModal(`
    <h3>${t('add_client_payment')}</h3>
    <form id="modal-form" enctype="multipart/form-data">
      <div class="form-error"></div>
      <div class="form-grid-2">
        ${field(t('amount'), `<input type="number" name="amount" step="0.01" min="0.01" required inputmode="decimal">`)}
        ${field(t('date'), `<input type="date" name="payment_date" value="${today()}" required>`)}
      </div>
      ${field(`${t('note')} (${t('optional')})`, `<input name="note" maxlength="500">`)}
      ${field(`${t('receipt')} (${t('optional')})`, `<input type="file" name="receipt" accept="image/*,application/pdf" capture="environment">`)}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">${t('cancel')}</button>
        <button type="submit" class="btn">${t('save')}</button>
      </div>
    </form>`);
  document.getElementById('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm(e.target, `/api/projects/${projectId}/client-payments`, { multipart: true });
  });
}

async function openPaymentModal(projectId) {
  const payees = (await api('/api/payees')).items;
  openModal(`
    <h3>${t('add_payment')}</h3>
    <form id="modal-form" enctype="multipart/form-data">
      <div class="form-error"></div>
      <div class="form-grid-2">
        ${field(t('amount'), `<input type="number" name="amount" step="0.01" min="0.01" required inputmode="decimal">`)}
        ${field(t('date'), `<input type="date" name="payment_date" value="${today()}" required>`)}
      </div>
      ${field(t('category'), selectHtml('category', PAYMENT_CATEGORIES.map(c => [c, t('pcat_' + c)]), 'materials'))}
      ${field(`${t('payee')} (${t('optional')})`, selectHtml('payee_id', [['', t('none')], ...payees.map(pe => [String(pe.id), `${pe.name} (${t('ptype_' + pe.type)})`])], ''))}
      ${field(`${t('note')} (${t('optional')})`, `<input name="note" maxlength="500">`)}
      ${field(`${t('receipt')} (${t('optional')})`, `<input type="file" name="receipt" accept="image/*,application/pdf" capture="environment">`)}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">${t('cancel')}</button>
        <button type="submit" class="btn">${t('save')}</button>
      </div>
    </form>`);
  document.getElementById('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm(e.target, `/api/projects/${projectId}/payments`, { multipart: true });
  });
}

// ---------- payees ----------

async function renderPayees() {
  const d = await api('/api/payees');
  $app.innerHTML = `
    ${topbar()}
    <div class="fab-row"><button class="btn" onclick="openPayeeModal()">＋ ${t('add_payee')}</button></div>
    <div class="card">
      ${d.items.length ? d.items.map(pe => `
        <div class="list-item">
          <div class="li-main">
            <div class="li-title">${esc(pe.name)}</div>
            <div class="li-sub"><span class="chip">${t('ptype_' + pe.type)}</span>${pe.phone ? esc(pe.phone) + ' · ' : ''}${t('total_paid')}: ${fmt(pe.total_paid)}</div>
          </div>
          <button class="btn danger-text" onclick="confirmDelete('/api/payees/${pe.id}')">✕</button>
        </div>`).join('') : `<div class="empty">${t('no_payees')}</div>`}
    </div>
    ${bottomNav('payees')}`;
}

function openPayeeModal() {
  openModal(`
    <h3>${t('add_payee')}</h3>
    <form id="modal-form">
      <div class="form-error"></div>
      ${field(t('name'), `<input name="name" required>`)}
      <div class="form-grid-2">
        ${field(t('payee_type'), selectHtml('type', PAYEE_TYPES.map(v => [v, t('ptype_' + v)]), 'supplier'))}
        ${field(`${t('phone')} (${t('optional')})`, `<input name="phone" inputmode="tel" maxlength="40">`)}
      </div>
      ${field(`${t('note')} (${t('optional')})`, `<input name="note" maxlength="500">`)}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">${t('cancel')}</button>
        <button type="submit" class="btn">${t('save')}</button>
      </div>
    </form>`);
  document.getElementById('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm(e.target, '/api/payees');
  });
}

// ---------- settings ----------

async function renderSettings() {
  const isAdmin = state.user.role === 'admin';
  let usersHtml = '';
  if (isAdmin) {
    const d = await api('/api/users');
    usersHtml = `
      <div class="card">
        <div class="section-head">
          <h2>${t('users')}</h2>
          <button class="btn small" onclick="openUserModal()">＋ ${t('add_user')}</button>
        </div>
        ${d.items.map(u => `
          <div class="list-item">
            <div class="li-main">
              <div class="li-title">${esc(u.name)}</div>
              <div class="li-sub"><span class="chip">${t('role_' + u.role)}</span>${esc(u.email)}</div>
            </div>
            ${u.id !== state.user.id ? `<button class="btn danger-text" onclick="confirmDelete('/api/users/${u.id}')">✕</button>` : ''}
          </div>`).join('')}
      </div>`;
  }
  $app.innerHTML = `
    ${topbar()}
    <div class="card">
      <h2>${t('language')}</h2>
      <button class="btn secondary" onclick="toggleLang()">${document.documentElement.lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}</button>
    </div>
    ${isAdmin ? `
    <div class="card">
      <h2>${t('currency')}</h2>
      <form id="currency-form">
        <div class="form-error"></div>
        ${field(t('currency'), `<input name="currency" value="${esc(state.currency)}" maxlength="3" minlength="3" required style="text-transform:uppercase">`)}
        <p class="hint">${t('currency_hint')}</p>
        <button class="btn" type="submit">${t('save')}</button>
      </form>
    </div>` : ''}
    ${usersHtml}
    <div class="card">
      <div class="list-item">
        <div class="li-main">
          <div class="li-title">${esc(state.user.name)}</div>
          <div class="li-sub">${esc(state.user.email)} · ${t('role_' + state.user.role)}</div>
        </div>
        <button class="btn small secondary" onclick="doLogout()">${t('logout')}</button>
      </div>
    </div>
    ${bottomNav('settings')}`;

  document.getElementById('currency-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl = e.target.querySelector('.form-error');
    try {
      const d = await jsonPost('/api/settings', Object.fromEntries(new FormData(e.target).entries()), 'PUT');
      state.currency = d.currency;
      render();
    } catch { errEl.textContent = t('error_generic'); }
  });
}

function openUserModal() {
  openModal(`
    <h3>${t('add_user')}</h3>
    <form id="modal-form">
      <div class="form-error"></div>
      ${field(t('name'), `<input name="name" required>`)}
      ${field(t('email'), `<input type="email" name="email" required>`)}
      ${field(t('password'), `<input type="password" name="password" required minlength="6">`)}
      ${field(t('role'), selectHtml('role', [['member', t('role_member')], ['admin', t('role_admin')]], 'member'))}
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="closeModal()">${t('cancel')}</button>
        <button type="submit" class="btn">${t('save')}</button>
      </div>
    </form>`);
  document.getElementById('modal-form').addEventListener('submit', e => {
    e.preventDefault();
    submitForm(e.target, '/api/users');
  });
}

async function doLogout() {
  await api('/api/logout', { method: 'POST' });
  state.user = null;
  render();
}

// ---------- router & boot ----------

function toggleLang() {
  setLang(document.documentElement.lang === 'ar' ? 'en' : 'ar');
  render();
}

async function loadSession() {
  try {
    const d = await api('/api/me');
    state.user = d.user;
    state.currency = d.currency;
  } catch { state.user = null; }
}

async function render() {
  closeModal();
  if (state.needsSetup) return renderSetup();
  if (!state.user) return renderLogin();
  const hash = location.hash || '#/dashboard';
  const projectMatch = hash.match(/^#\/project\/(\d+)$/);
  try {
    if (projectMatch) return await renderProjectDetail(Number(projectMatch[1]));
    if (hash.startsWith('#/expenses')) return await renderExpenses();
    if (hash.startsWith('#/projects')) return await renderProjects();
    if (hash.startsWith('#/payees')) return await renderPayees();
    if (hash.startsWith('#/settings')) return await renderSettings();
    return await renderDashboard();
  } catch (e) {
    if (e.message !== 'unauthorized') {
      $app.innerHTML = `${topbar()}<div class="card"><div class="empty">${t('error_generic')}</div></div>${bottomNav('dashboard')}`;
    }
  }
}

window.addEventListener('hashchange', render);

(async function boot() {
  const b = await api('/api/bootstrap');
  state.needsSetup = b.needsSetup;
  state.currency = b.currency || 'AED';
  if (!b.needsSetup) await loadSession();
  render();
})();
