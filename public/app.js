const $ = s => document.querySelector(s);
let token = localStorage.getItem('ichigo_token');
let currentUser = JSON.parse(localStorage.getItem('ichigo_user') || 'null');
let cart = [];
let lastOrder = null;

const money = n => '₱' + Number(n || 0).toFixed(2);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

async function api(url, opts = {}) {
  const r = await fetch('/api' + url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(opts.headers || {})
    }
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || 'Something went wrong');
  return d;
}

const post = (url, data, method = 'POST') => api(url, { method, body: JSON.stringify(data) });

const NAV_ICONS = {
  'Overview': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  'Products': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
  'Inventory': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  'Orders': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  'Dispatch': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  'Staff': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  'Customers': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'Reports': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  'Payments': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`,
  'POS': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  'Active Queue': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  'Order History': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  'Delivery Board': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  'My Deliveries': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  'Earnings': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  'Menu': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>`,
  'Cart': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  'My Orders': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>`,
  'Reviews': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  'Profile': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'Settings': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

function navLabelWithIcon(label) {
  const ico = NAV_ICONS[label] || '';
  const totalQty = cart.reduce((s, x) => s + Number(x.quantity || 1), 0);
  const badge = label === 'Cart' && totalQty > 0
    ? ` <span class="role-chip" style="margin-left:auto;padding:2px 7px;">${totalQty}</span>`
    : '';
  return `${ico}<span>${esc(label)}</span>${badge}`;
}

function refreshNavLabels() {
  document.querySelectorAll('#portalNav .nav-btn').forEach(btn => {
    const pageName = btn.dataset.page;
    const isAct = btn.classList.contains('active');
    btn.innerHTML = navLabelWithIcon(pageName);
    btn.classList.toggle('active', isAct);
  });
}

function highlightNav(pageName) {
  document.querySelectorAll('#portalNav .nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pageName);
  });
  refreshNavLabels();
}

function showLoginScreen() {
  $('#appView').hidden = true;
  $('#authView').hidden = false;
  $('#logoutBtn').hidden = true;
  $('#roleChip').hidden = true;
  $('#welcome').textContent = '';
  setAuthTab('login');

  const authBox = $('#authView');
  if (authBox && !document.getElementById('ichigoLoginHero')) {
    const hero = document.createElement('div');
    hero.id = 'ichigoLoginHero';
    hero.style.cssText = 'text-align:center;margin-bottom:14px;';
    hero.innerHTML = `
      <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:800;font-size:2.3rem;line-height:1.05;color:#fbbf24;text-shadow:0 4px 18px rgba(245,158,11,0.35);">Ichigo</div>
      <div style="font-size:0.86rem;letter-spacing:0.06em;color:#fde68a;margin-top:4px;">Milk Tea • Good Vibes • Great Taste ♡</div>
    `;
    authBox.prepend(hero);
  }
}
function setAuthTab(tabName, keepMessage = false) {
  const isLogin = tabName !== 'register';
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === (isLogin ? 'login' : 'register')));
  $('#loginForm').hidden = !isLogin;
  $('#registerForm').hidden = isLogin;
  $('#loginForm').style.display = isLogin ? '' : 'none';
  $('#registerForm').style.display = isLogin ? 'none' : '';
  if (!keepMessage) $('#authMessage').textContent = '';
}

document.querySelectorAll('.tab').forEach(b => {
  b.onclick = () => setAuthTab(b.dataset.tab || 'login');
});

function updateLoginRoleButton() {
  const input = $('#loginRoleInput');
  const submitBtn = $('#loginForm button[type="submit"]');
  if (!input || !submitBtn) return;
  const role = (input.value || '').trim();
  submitBtn.textContent = role
    ? 'Sign in to ' + role.charAt(0).toUpperCase() + role.slice(1)
    : 'Sign in to ICHIGO';
}

function setLoginRole(nextRole) {
  const input = $('#loginRoleInput');
  if (input) input.value = nextRole;
  document.querySelectorAll('.role-pick').forEach(x => {
    x.classList.toggle('active', x.dataset.role === nextRole);
  });
  updateLoginRoleButton();
}
function setRegisterRole(role) {
  const cleanRole = (role || 'customer').toLowerCase();
  const input = $('#registerRoleInput');
  const submitBtn = $('#registerForm button[type="submit"]');
  const notice = $('#staffRoleNotice');
  if (input) input.value = cleanRole;
  document.querySelectorAll('.reg-role-pick').forEach(x => {
    x.classList.toggle('active', x.dataset.role === cleanRole);
  });
  if (submitBtn) {
    submitBtn.textContent =
      'Register ' + cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1) + ' account';
  }
  if (notice) {
    notice.innerHTML = '';
    notice.style.display = 'none';
  }
}

document.addEventListener('click', e => {
  const loginBtn = e.target.closest('.role-pick');
  if (loginBtn) {
    const input = $('#loginRoleInput');
    const currentVal = input ? (input.value || '') : '';
    const nextRole = currentVal === loginBtn.dataset.role ? '' : (loginBtn.dataset.role || '');
    setLoginRole(nextRole);
    return;
  }

  const regBtn = e.target.closest('.reg-role-pick');
  if (regBtn) {
    setRegisterRole(regBtn.dataset.role || 'customer');
  }
});

updateLoginRoleButton();
setRegisterRole('customer');

$('#registerForm').onsubmit = async e => {
  e.preventDefault();
  const dataObj = Object.fromEntries(new FormData(e.target));
  const selectedRole = (dataObj.role || 'customer').toLowerCase();
  if (selectedRole !== 'customer') {
    $('#authMessage').textContent = 'Admin, cashier and rider accounts must be created by an administrator in the Staff tab.';
    return;
  }
  dataObj.role = 'customer';
  try {
    const d = await post('/register', dataObj);
    e.target.reset();
    setRegisterRole('customer');
    setAuthTab('login', true);
    const loginEmail = $('#loginForm input[name="email"]');
    const loginPass = $('#loginForm input[name="password"]');
    if (loginEmail && dataObj.email) loginEmail.value = dataObj.email;
    if (loginPass) loginPass.value = '';
    setLoginRole('customer');
    $('#authMessage').textContent = (d.message || 'Account created!') + ' Please log in now.';
    if (loginPass) loginPass.focus();
  } catch (err) {
    $('#authMessage').textContent = err.message;
  }
};

$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.target));
  if (!payload.role) delete payload.role;
  try {
    const d = await post('/login', payload);
    token = d.token;
    currentUser = d.user;
    localStorage.setItem('ichigo_token', token);
    localStorage.setItem('ichigo_user', JSON.stringify(currentUser));
    showApp();
  } catch (err) {
    $('#authMessage').textContent = err.message;
  }
};

function logoutNow() {
  localStorage.removeItem('ichigo_token');
  localStorage.removeItem('ichigo_user');
  token = null;
  currentUser = null;
  cart = [];
  lastOrder = null;
  showLoginScreen();
}

$('#logoutBtn').onclick = logoutNow;

const pageSets = {
  admin: ['Overview', 'Products', 'Inventory', 'Orders', 'Dispatch', 'Staff', 'Customers', 'Reports', 'Settings', 'Payments'],
  cashier: ['POS', 'Active Queue', 'Order History', 'Products'],
  customer: ['Menu', 'Cart', 'My Orders', 'Reviews', 'Profile', 'Settings'],
  rider: ['Delivery Board', 'My Deliveries', 'Earnings']
};

function setCustomerNav(pageName) {
  highlightNav(pageName);
  renderPage(pageName);
}

function showApp() {
  if (!currentUser || !token) {
    showLoginScreen();
    return;
  }
  const role = pageSets[currentUser.role] ? currentUser.role : 'customer';
  const navItems = pageSets[role];
  $('#authView').hidden = true;
  $('#appView').hidden = false;
  $('#logoutBtn').hidden = false;
  $('#roleChip').hidden = false;
  $('#welcome').textContent = 'Hello, ' + currentUser.name;
  $('#roleChip').textContent = role.toUpperCase();
  const titles = {
    admin: ['Admin Portal', 'Manage your milk tea business.'],
    cashier: ['Cashier / POS', 'Counter sales, checkout and fulfillment.'],
    customer: ['ICHIGO', 'Fresh Milk Tea in Catarman! Order your favorite drinks now.'],
    rider: ['Rider Portal', 'Manage your delivery assignments.']
  };
  $('#portalTitle').textContent = titles[role][0];
  $('#portalSubtitle').textContent = titles[role][1];
  $('#portalLabel').textContent = 'ICHIGO ' + role.toUpperCase();
  $('#portalNav').innerHTML = navItems.map((t, i) => `<button class="nav-btn${i === 0 ? ' active' : ''}" data-page="${esc(t)}">${navLabelWithIcon(t)}</button>`).join('');
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.nav-btn').forEach(x => x.classList.toggle('active', x === b));
      renderPage(b.dataset.page);
    };
  });
  renderPage(navItems[0]);
}

function panel(title, body) {
  return `<section class="panel"><div class="section-head"><h2>${title}</h2></div>${body}</section>`;
}

function renderBarChartSvg(series, options = {}) {
  const height = options.height || 220;
  const startColor = options.color || '#d97706';
  const endColor = options.accent || '#fde047';
  const gradId = 'ichigoBarGrad_' + Math.random().toString(36).slice(2, 8);

  const list = Array.isArray(series) && series.length
    ? series
    : [{ label: 'No Data', value: 0 }];

  const maxVal = Math.max(...list.map(d => Number(d.value || 0)), 1);
  const colWidth = 68;
  const gap = 18;
  const leftPad = 24;
  const width = Math.max(440, leftPad * 2 + list.length * (colWidth + gap) - gap);
  const chartTop = 28;
  const chartBottom = height - 38;
  const usableH = Math.max(60, chartBottom - chartTop);

  const gridLines = [0.25, 0.5, 0.75, 1].map(ratio => {
    const gy = Math.round(chartBottom - usableH * ratio);
    return `<line x1="16" y1="${gy}" x2="${width - 16}" y2="${gy}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4,4" stroke-width="1" />`;
  }).join('');

  const bars = list.map((item, idx) => {
    const val = Number(item.value || 0);
    const ratio = val > 0 ? Math.max(0.08, val / maxVal) : 0.05;
    const barH = Math.max(10, Math.round(ratio * usableH));
    const x = leftPad + idx * (colWidth + gap);
    const y = chartBottom - barH;
    const shortVal = options.formatVal ? options.formatVal(val) : String(val);
    const isLast = idx === list.length - 1;

    return `
      <g>
        <text x="${x + colWidth / 2}" y="${Math.max(14, y - 8)}" text-anchor="middle" fill="${isLast ? '#fef08a' : '#f5d08a'}" font-size="11.5" font-weight="700">${esc(shortVal)}</text>
        <rect x="${x}" y="${y}" width="${colWidth}" height="${barH}" rx="8" fill="url(#${gradId})" stroke="${isLast ? '#fde047' : 'rgba(251,191,36,0.45)'}" stroke-width="1" />
        <text x="${x + colWidth / 2}" y="${height - 14}" text-anchor="middle" fill="#e5d5bc" font-size="11.5" font-weight="600">${esc(String(item.label || '').slice(0, 12))}</text>
      </g>
    `;
  }).join('');

  return `
    <div style="width:100%;overflow-x:auto;padding:10px 12px;border-radius:12px;background:linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01));border:1px solid rgba(251,191,36,0.16);">
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;min-width:${Math.min(width, 460)}px;height:${height}px;display:block;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${endColor}" stop-opacity="0.95" />
            <stop offset="100%" stop-color="${startColor}" stop-opacity="0.72" />
          </linearGradient>
        </defs>
        ${gridLines}
        <line x1="16" y1="${chartBottom}" x2="${width - 16}" y2="${chartBottom}" stroke="rgba(251,191,36,0.35)" stroke-width="1.5" />
        ${bars}
      </svg>
    </div>
  `;
}

const SIZES = [{ label: 'Small', extra: 0 }, { label: 'Medium', extra: 10 }, { label: 'Large', extra: 20 }];
const TOPPINGS = [
  { name: 'Boba Pearls', price: 15 },
  { name: 'Jelly Grass', price: 15 },
  { name: 'Nata de Coco', price: 15 },
  { name: 'Cheese Foam', price: 20 },
  { name: 'Red Beans', price: 15 },
  { name: 'Sprinkles', price: 10 },
  { name: 'Pudding', price: 15 },
  { name: 'Matcha Powder', price: 20 }
];
const SUGARS = ['10%', '30%', '60%', '85%', '100%'];
const ICES = ['No Ice', 'Less Ice', 'Regular'];

function customize(p, source) {
  if (!p) return;
  const area = $('#cartArea') || $('#dashboard');
  let state = { size: 'Small', sizeExtra: 0, toppings: [], sugar: '100%', ice: 'No Ice', qty: 1 };
  const unitPrice = () => Number(p.price) + state.sizeExtra + state.toppings.reduce((s, t) => s + t.price, 0);

  const draw = () => {
    const total = unitPrice() * state.qty;
    area.innerHTML = `<section class="custom-box">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="display:flex;gap:12px;align-items:center;">
          ${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" style="width:64px;height:64px;border-radius:10px;object-fit:cover;border:1px solid var(--border);" onerror="this.style.display='none'">` : ''}
          <div>
            <h2 style="margin:0;">${esc(p.name)}</h2>
            <p class="muted" style="margin:4px 0 0;">${esc(p.description || p.category)} · Base ${money(p.price)}</p>
          </div>
        </div>
        <button type="button" class="small-btn" id="closeCustomize">✕</button>
      </div>

      <div class="custom-banner">Customize your order</div>

      <div>
        <span class="custom-group-title">SIZES</span>
        <div class="pill-row">
          ${SIZES.map(s => `<button type="button" class="small-btn opt-size ${state.size === s.label ? 'active' : ''}" data-size="${s.label}" data-extra="${s.extra}">${s.label}${s.extra ? ` (+${money(s.extra)})` : ''}</button>`).join('')}
        </div>
      </div>

      <div>
        <span class="custom-group-title">TOPPINGS</span>
        <div class="pill-row">
          ${TOPPINGS.map(t => {
            const on = state.toppings.some(x => x.name === t.name);
            return `<button type="button" class="small-btn opt-topping ${on ? 'active' : ''}" data-topping="${esc(t.name)}" data-price="${t.price}">${esc(t.name)} (+${money(t.price)})</button>`;
          }).join('')}
        </div>
      </div>

      <div>
        <span class="custom-group-title">SUGAR LEVEL</span>
        <div class="pill-row">
          ${SUGARS.map(sg => `<button type="button" class="small-btn opt-sugar ${state.sugar === sg ? 'active' : ''}" data-sugar="${sg}">${sg}</button>`).join('')}
        </div>
      </div>

      <div>
        <span class="custom-group-title">ICE LEVEL</span>
        <div class="pill-row">
          ${ICES.map(ic => `<button type="button" class="small-btn opt-ice ${state.ice === ic ? 'active' : ''}" data-ice="${ic}">${ic}</button>`).join('')}
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;padding-top:10px;border-top:1px solid var(--border);">
        <label style="display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--text-muted);">
          Qty <input id="customQty" type="number" min="1" max="50" value="${state.qty}" style="width:72px">
        </label>
        <div style="display:flex;align-items:center;gap:12px;">
          <div><small class="muted" style="display:block;">Total</small><strong class="price" style="font-size:1.15rem;">${money(total)}</strong></div>
          <button type="button" class="primary" id="addCustomized">Add to cart</button>
        </div>
      </div>
    </section>`;

    $('#closeCustomize').onclick = () => cart.length ? showCart(source) : area.innerHTML = '';
    area.querySelectorAll('.opt-size').forEach(b => b.onclick = () => { state.size = b.dataset.size; state.sizeExtra = Number(b.dataset.extra); draw(); });
    area.querySelectorAll('.opt-topping').forEach(b => b.onclick = () => {
      const name = b.dataset.topping, price = Number(b.dataset.price);
      const idx = state.toppings.findIndex(x => x.name === name);
      if (idx >= 0) state.toppings.splice(idx, 1);
      else state.toppings.push({ name, price });
      draw();
    });
    area.querySelectorAll('.opt-sugar').forEach(b => b.onclick = () => { state.sugar = b.dataset.sugar; draw(); });
    area.querySelectorAll('.opt-ice').forEach(b => b.onclick = () => { state.ice = b.dataset.ice; draw(); });
    $('#customQty').oninput = e => { state.qty = Math.max(1, Math.min(50, Number(e.target.value) || 1)); draw(); };
    $('#addCustomized').onclick = () => {
      cart.push({
        id: p.id,
        name: p.name,
        image_url: p.image_url || '',
        basePrice: Number(p.price),
        unitPrice: unitPrice(),
        size: state.size,
        size_extra: state.sizeExtra,
        toppings: state.toppings.map(t => t.name),
        topping_extra: state.toppings.reduce((s, t) => s + t.price, 0),
        sugar: state.sugar,
        ice: state.ice,
        quantity: state.qty,
        source
      });
      refreshNavLabels();
      if (currentUser?.role === 'customer' && source === 'online') {
        renderPage('Cart');
      } else {
        showCart(source);
      }
    };
  };

  draw();
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showCart(source) {
  const area = $('#cartArea') || $('#dashboard');
  if (currentUser?.role === 'customer' && source === 'online') {
    highlightNav('Cart');
  } else {
    refreshNavLabels();
  }

  const subtotal = cart.reduce((a, p) => a + (Number(p.unitPrice ?? p.price)) * p.quantity, 0);
  const savedProfile = JSON.parse(localStorage.getItem('ichigo_profile') || '{}');
  const defaultAddr = savedProfile.address || 'Brgy. Cawayan, Catarman, Northern Samar';

  area.innerHTML = panel('Your Cart', `${cart.length ? cart.map((p, i) => {
    const topLabel = Array.isArray(p.toppings) && p.toppings.length ? p.toppings.join(', ') : (p.topping && p.topping !== 'None' ? p.topping : 'No topping');
    const uPrice = Number(p.unitPrice ?? p.price);
    return `<div class="cart-item-box" style="margin-bottom:10px;flex-direction:row;justify-content:space-between;align-items:center;flex-wrap:wrap;">
      <div>
        <b>${esc(p.name)}</b>
        <p class="muted" style="margin:3px 0;">${esc(p.size)} · ${esc(p.sugar)} sugar · ${esc(p.ice)} · ${esc(topLabel)}</p>
        <small class="muted">${money(uPrice)} each</small>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <button type="button" class="small-btn dec-cart" data-i="${i}">-</button>
        <strong>${p.quantity}</strong>
        <button type="button" class="small-btn inc-cart" data-i="${i}">+</button>
        <strong class="price">${money(uPrice * p.quantity)}</strong>
        <button type="button" class="small-btn remove-cart" data-i="${i}">✕</button>
      </div>
    </div>`;
  }).join('') : '<p class="muted">Your cart is empty.</p>'}
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding-top:10px;border-top:1px solid var(--border);">
    <button type="button" class="small-btn" id="addMoreBtn">Add more</button>
    <div><span class="muted" style="margin-right:8px;">Order Total</span><strong class="price" style="font-size:1.1rem;">${money(subtotal)}</strong></div>
  </div>
  ${cart.length ? `<div style="margin-top:14px;">
    <button type="button" class="primary" id="openCheckoutBtn" style="width:100%;">Proceed to Checkout</button>
    <div id="checkoutPanel" hidden style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);">
      <h3 style="margin:0 0 10px;">Checkout · Order Summary</h3>
      <div class="cart-item-box" style="margin-bottom:12px;">
        ${cart.map(p => `<div style="display:flex;justify-content:space-between;gap:8px;"><span>${esc(p.name)} ×${p.quantity} (${esc(p.size)}, ${esc(p.sugar)}, ${esc(p.ice)})</span><strong class="price">${money((Number(p.unitPrice ?? p.price)) * p.quantity)}</strong></div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--border);"><span class="muted">Sub Total</span><span>${money(subtotal)}</span></div>
        <div style="display:flex;justify-content:space-between;"><b>Total</b><strong class="price">${money(subtotal)}</strong></div>
      </div>
      <form id="checkout" class="form-grid">
        <label>Customer name<input name="customer_name" value="${source === 'pos' ? 'Walk-in Customer' : esc(currentUser.name)}" required></label>
        <label>Phone<input name="customer_phone" placeholder="09XX-XXX-XXXX"></label>
        <label>Fulfillment<select name="fulfillment" id="checkoutFulfillment"><option value="pickup">Pick-up</option><option value="delivery">Delivery</option></select></label>
        <label>Payment method<select name="payment_method"><option value="cash">Cash</option><option value="gcash">G-Cash</option><option value="maya">Maya</option><option value="online_banking">Other bank card</option></select></label>
        <label class="wide">Complete address<input name="delivery_address" id="checkoutAddress" value="${source === 'pos' ? '' : esc(defaultAddr)}" placeholder="Type here (e.g. UEP Campus / Catarman, Northern Samar)"></label>
        <p class="wide muted" style="margin:0;font-size:0.82rem;">Before proceeding, please review and confirm that all the information you have entered is correct and complete.</p>
        <button type="submit" class="primary wide">Place Order · ${money(subtotal)}</button>
      </form>
    </div>
  </div>` : ''}`);

  $('#addMoreBtn').onclick = () => {
    if (currentUser?.role === 'customer' && source === 'online') {
      setCustomerNav('Menu');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const openCheckoutBtn = $('#openCheckoutBtn');
  if (openCheckoutBtn) {
    openCheckoutBtn.onclick = () => {
      const cp = $('#checkoutPanel');
      cp.hidden = !cp.hidden;
      if (!cp.hidden) cp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
  }
  document.querySelectorAll('.dec-cart').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (cart[i].quantity > 1) cart[i].quantity--; else cart.splice(i, 1); showCart(source); });
  document.querySelectorAll('.inc-cart').forEach(b => b.onclick = () => { const i = +b.dataset.i; cart[i].quantity = Math.min(50, cart[i].quantity + 1); showCart(source); });
  document.querySelectorAll('.remove-cart').forEach(b => b.onclick = () => { cart.splice(+b.dataset.i, 1); showCart(source); });

  const form = $('#checkout');
  if (form) form.onsubmit = async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (f.fulfillment === 'delivery' && !String(f.delivery_address || '').trim()) {
      return alert('Please enter your complete delivery address.');
    }
    const itemsSnapshot = cart.map(p => ({
      name: p.name,
      quantity: p.quantity,
      size: p.size,
      sugar: p.sugar,
      ice: p.ice,
      toppings: Array.isArray(p.toppings) ? p.toppings : (p.topping && p.topping !== 'None' ? [p.topping] : []),
      unit_price: Number(p.unitPrice ?? p.price)
    }));
    try {
      const d = await post('/orders', {
        ...f,
        items: cart.map(p => ({
          product_id: p.id,
          quantity: p.quantity,
          size: p.size,
          size_extra: Number(p.size_extra || 0),
          sugar: p.sugar,
          ice: p.ice,
          toppings: Array.isArray(p.toppings) ? p.toppings : (p.topping && p.topping !== 'None' ? [p.topping] : []),
          topping_extra: Number(p.topping_extra || 0)
        }))
      });
      lastOrder = {
        orderCode: d.orderCode,
        subtotal: d.subtotal ?? subtotal,
        total: d.total ?? subtotal,
        orderStatus: d.orderStatus || 'placed',
        paymentStatus: d.paymentStatus || 'pending',
        paymentMethod: f.payment_method,
        fulfillment: f.fulfillment,
        customerName: f.customer_name,
        address: f.delivery_address,
        items: itemsSnapshot,
        createdAt: new Date().toLocaleString()
      };
      cart = [];
      refreshNavLabels();
      renderOrderConfirmed(area, source);
    } catch (x) {
      alert(x.message);
    }
  };
}

function whitePaperReceiptHtml(rec, mode = 'full') {
  const computedSub = (rec.items || []).reduce(
    (s, i) => s + Number(i.unit_price || i.unitPrice || 0) * Number(i.quantity || 1),
    0
  );
  const subVal = rec.subtotal ?? computedSub;

  return `
    <div style="max-width:440px;margin:0 auto;background:#ffffff;color:#181410;border-radius:10px;padding:24px 22px;box-shadow:0 16px 38px rgba(0,0,0,0.5);border:1px solid #e6decb;font-family:'Courier New',Courier,monospace;">
      <div style="text-align:center;padding-bottom:12px;border-bottom:1.5px dashed #9e9384;">
        <div style="font-weight:900;letter-spacing:0.14em;font-size:1.25rem;color:#181410;">ICHIGO</div>
        <div style="font-size:0.78rem;color:#574c3f;">Catarman, Northern Samar</div>
        <div style="margin-top:6px;font-size:0.74rem;font-weight:800;letter-spacing:0.08em;color:#854d0e;">
          *** ${mode === 'confirmed' ? 'STORE ORDER RECEIPT' : 'OFFICIAL STORE RECEIPT'} ***
        </div>
      </div>

      <div style="display:grid;gap:4px;padding:12px 0;border-bottom:1.5px dashed #9e9384;font-size:0.82rem;color:#2a2219;">
        <div style="display:flex;justify-content:space-between;gap:8px;">
          <span><b>ORDER:</b> ${esc(rec.orderCode)}</span>
          <span>${esc(rec.createdAt || '')}</span>
        </div>
        ${rec.customerName ? `<div><b>CUST:</b> ${esc(rec.customerName)}</div>` : ''}
        ${rec.address ? `<div><b>ADDR:</b> ${esc(rec.address)}</div>` : ''}
      </div>

      <div style="display:grid;gap:10px;padding:12px 0;border-bottom:1.5px dashed #9e9384;">
        ${(rec.items || []).map(i => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div>
              <div style="font-weight:800;font-size:0.9rem;color:#181410;">${esc(i.name)} x${i.quantity || 1}</div>
              <div style="font-size:0.76rem;color:#574c3f;">${esc(i.size || 'Small')} · ${esc(i.sugar || '100%')} · ${esc(i.ice || 'No Ice')}${i.toppings && i.toppings.length ? ' · ' + esc(i.toppings.join(', ')) : ''}</div>
            </div>
            <div style="font-weight:800;font-size:0.9rem;color:#181410;white-space:nowrap;">${money((i.unit_price || i.unitPrice || 0) * (i.quantity || 1))}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:grid;gap:6px;padding:12px 0;font-size:0.85rem;color:#241d15;">
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#574c3f;">SUB TOTAL</span>
          <span>${money(subVal)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#574c3f;">PAYMENT</span>
          <b>${esc(String(rec.paymentMethod || '').toUpperCase())} (${esc(rec.paymentStatus || 'pending')})</b>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#574c3f;">FULFILLMENT</span>
          <b>${esc(rec.fulfillment || '')}</b>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;margin-top:4px;border-top:1.5px dashed #9e9384;font-size:1.12rem;font-weight:900;color:#181410;">
          <span>TOTAL</span>
          <span>${money(rec.total)}</span>
        </div>
      </div>

      <div style="margin-top:8px;padding-top:10px;border-top:1.5px dashed #9e9384;text-align:center;">
        <div style="font-weight:800;font-size:0.88rem;color:#181410;">THANK YOU FOR YOUR ORDER!</div>
        <div style="font-size:0.74rem;color:#574c3f;margin-top:2px;">ICHIGO Ordering System · Keep this receipt</div>
        <div style="margin-top:8px;font-size:0.72rem;letter-spacing:0.2em;color:#574c3f;">||||| || |||| ||| ||||| ||</div>
      </div>
    </div>
  `;
}

function renderOrderConfirmed(area, source) {
  if (!lastOrder) return renderPage(source === 'pos' ? 'POS' : 'Menu');
  refreshNavLabels();
  area.innerHTML = panel('Order Confirmed! · Your order has been received', `
    <div style="display:grid;gap:14px;">
      ${whitePaperReceiptHtml(lastOrder, 'confirmed')}
      <p class="muted" style="margin:0;text-align:center;">Please prepare exact payment / details for ${esc(lastOrder.fulfillment)}.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <button type="button" class="primary" id="trackMyOrderBtn">TRACK MY ORDER</button>
        <button type="button" class="small-btn" id="viewConfirmedReceiptBtn">View Official Receipt</button>
      </div>
    </div>
  `);
  $('#trackMyOrderBtn').onclick = () => renderOrderStatus(area, source, lastOrder);
  $('#viewConfirmedReceiptBtn').onclick = () => renderReceipt(area, source, lastOrder);
}

function mountCatarmanLiveMap(containerId, destinationText = '') {
  const box = document.getElementById(containerId);
  if (!box) return;

  const shopCoords = [12.5015, 124.6378];
  const lowerDest = String(destinationText || '').toLowerCase();
  let destCoords = [12.5095, 124.6525];
  if (lowerDest.includes('uep')) destCoords = [12.5128, 124.6612];
  else if (lowerDest.includes('cawayan')) destCoords = [12.4945, 124.6235];
  else if (lowerDest.includes('dalakit')) destCoords = [12.5042, 124.6421];

  if (typeof window.L !== 'undefined') {
    try {
      box.innerHTML = '';
      const map = window.L.map(box, { zoomControl: true, scrollWheelZoom: false }).setView(
        [(shopCoords[0] + destCoords[0]) / 2, (shopCoords[1] + destCoords[1]) / 2],
        14
      );
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      window.L.circleMarker(shopCoords, { radius: 8, color: '#fbbf24', fillColor: '#f59e0b', fillOpacity: 1 })
        .addTo(map)
        .bindPopup('<b>ICHIGO Shop</b><br>Catarman, Northern Samar');

      window.L.circleMarker(destCoords, { radius: 8, color: '#22c55e', fillColor: '#16a34a', fillOpacity: 1 })
        .addTo(map)
        .bindPopup(`<b>Destination</b><br>${esc(destinationText || 'Catarman, Northern Samar')}`);

      window.L.polyline([shopCoords, destCoords], { color: '#fbbf24', weight: 4, dashArray: '6, 8' }).addTo(map);
      setTimeout(() => map.invalidateSize(), 120);
      return;
    } catch {
      // Fallback below
    }
  }

  box.innerHTML = `
    <div style="height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:14px;background:radial-gradient(circle at 25% 30%, rgba(251,191,36,0.18), rgba(20,16,12,0.95));">
      <div style="display:flex;justify-content:space-between;font-size:0.78rem;color:#fbbf24;font-weight:700;">
        <span>📍 ICHIGO Shop · Catarman</span>
        <span>🏁 ${esc(destinationText || 'Catarman, Northern Samar')}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin:10px 0;">
        <span style="width:12px;height:12px;border-radius:50%;background:#fbbf24;"></span>
        <div style="flex:1;height:3px;background:repeating-linear-gradient(90deg,#fbbf24 0 8px,transparent 8px 14px);"></div>
        <span style="font-size:1.1rem;">🛵</span>
        <div style="flex:1;height:3px;background:repeating-linear-gradient(90deg,rgba(255,255,255,0.35) 0 8px,transparent 8px 14px);"></div>
        <span style="width:12px;height:12px;border-radius:50%;background:#22c55e;"></span>
      </div>
      <small class="muted">Catarman, Northern Samar · Live route preview</small>
    </div>
  `;
}

function renderOrderStatus(area, source, orderObj) {
  const st = orderObj.order_status || lastOrder?.orderStatus || 'placed';
  const code = orderObj.order_code || lastOrder?.orderCode || 'ORD-2026';
  const addr = orderObj.delivery_address || lastOrder?.address || 'Catarman, Northern Samar';
  const mapId = 'ichigoLiveMap_' + Date.now();

  area.innerHTML = panel('Order Status · ' + esc(code), `
    <div class="order-stepper">
      <div class="order-step-pill ${['placed', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(st) ? 'done' : ''}">Order Placed</div>
      <div class="order-step-pill ${['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(st) ? 'done' : ''}">Preparing</div>
      <div class="order-step-pill ${['out_for_delivery', 'delivered'].includes(st) ? 'done' : ''}">Out of Delivery</div>
      <div class="order-step-pill ${st === 'delivered' ? 'done' : ''}">Delivered</div>
    </div>

    <div id="${mapId}" style="width:100%;height:220px;border-radius:14px;overflow:hidden;border:1px solid var(--border-strong);margin-bottom:12px;background:#18130e;"></div>

    <div class="route-card" style="gap:10px;">
      <div style="font-size:1rem;"><b>Your order is on the way from ICHIGO Shop to your location</b></div>
      <div style="display:grid;gap:8px;">
        <div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);">
          <b>🛵 Rider: Assigned upon dispatch</b> · <span class="muted">Est. Delivery: 10 - 15 mins</span>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);">
          On the way to <b>${esc(addr)}</b> · Status: <b>${esc(String(st).replaceAll('_', ' '))}</b>
        </div>
        <div style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);">
          Currently in <b>Catarman, Northern Samar</b>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
      <button type="button" class="primary" id="viewReceiptBtn">View Official Receipt</button>
      <button type="button" class="small-btn" id="backFromStatusBtn">Back</button>
    </div>
  `);

  mountCatarmanLiveMap(mapId, addr);

  $('#viewReceiptBtn').onclick = () => renderReceipt(area, source, orderObj);
  $('#backFromStatusBtn').onclick = () => {
    if (currentUser.role === 'customer') setCustomerNav('My Orders');
    else renderPage(source === 'pos' ? 'Active Queue' : 'Orders');
  };
}

function renderReceipt(area, source, orderObj = null) {
  const rec = lastOrder || (orderObj ? {
    orderCode: orderObj.order_code,
    subtotal: orderObj.subtotal ?? orderObj.total,
    total: orderObj.total,
    paymentStatus: orderObj.payment_status,
    paymentMethod: orderObj.payment_method,
    fulfillment: orderObj.fulfillment,
    customerName: orderObj.customer_name,
    address: orderObj.delivery_address,
    items: (typeof orderObj.items_json === 'string' ? JSON.parse(orderObj.items_json) : orderObj.items_json) || [],
    createdAt: new Date(orderObj.created_at || Date.now()).toLocaleString()
  } : null);
  if (!rec) return renderPage(source === 'pos' ? 'POS' : 'Menu');

  refreshNavLabels();
  area.innerHTML = panel('Official Receipt · ' + esc(rec.orderCode), `
    <div style="display:grid;gap:14px;">
      ${whitePaperReceiptHtml(rec, 'full')}
      <div style="text-align:center;">
        <button type="button" class="primary" id="orderAgainBtn">Order Again</button>
      </div>
    </div>
  `);
  $('#orderAgainBtn').onclick = () => {
    lastOrder = null;
    if (currentUser?.role === 'customer' && source === 'online') {
      setCustomerNav('Menu');
    } else {
      renderPage(source === 'pos' ? 'POS' : 'Menu');
    }
  };
}

function ordersTable(rows, page) {
  return `<div class="section-head"><h2>${esc(page)}</h2><span class="muted">${rows.length} orders</span></div>${rows.length ? `<div class="panel table-wrap"><table class="data-table"><thead><tr><th>Order / Time</th><th>Customer</th><th>Items</th><th>Fulfillment</th><th>Total / Payment</th><th>Status / Action</th></tr></thead><tbody>${rows.map(o => {
    let items = [];
    try { items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json || []; } catch {}
    return `<tr>
      <td>${esc(o.order_code)}<br><small>${new Date(o.created_at).toLocaleString()}</small></td>
      <td>${esc(o.customer_name)}<br><small>${esc(o.customer_phone || '')}</small></td>
      <td>${items.map(i => `${esc(i.name)} ×${i.quantity} (${esc(i.size || 'Small')}, ${esc(i.sugar || '100%')}, ${esc(i.ice || 'No Ice')}${Array.isArray(i.toppings) && i.toppings.length ? ', ' + esc(i.toppings.join(', ')) : ''})`).join('<br>')}</td>
      <td>${esc(o.fulfillment)}<br><small>${esc(o.delivery_address || '')}</small></td>
      <td>${money(o.total)}<br><small>${esc(o.payment_method)} · ${esc(o.payment_status)}</small></td>
      <td>${currentUser.role === 'customer' ? `<span class="stock-pill ${['delivered'].includes(o.order_status) ? 'good' : o.order_status === 'cancelled' ? 'low' : ''}">${esc(String(o.order_status || '').replaceAll('_', ' '))}</span><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="small-btn track-row-btn" data-id="${o.id}">Track Order</button><button type="button" class="small-btn receipt-row-btn" data-id="${o.id}">Receipt</button></div>` : esc(o.order_status)}<br>${currentUser.role === 'rider' ? `<select class="rider-status" data-id="${o.id}"><option value="out_for_delivery">Picked up / On the way</option><option value="delivered">Delivered</option></select>` : ['admin', 'cashier'].includes(currentUser.role) ? `<select class="status-select" data-id="${o.id}"><option value="${o.order_status}">${o.order_status}</option>${['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].filter(x => x !== o.order_status).map(x => `<option value="${x}">${x}</option>`).join('')}</select>` : ''}${currentUser.role === 'admin' && o.payment_status !== 'paid' ? `<button class="small-btn verify" data-id="${o.id}">Verify paid</button>` : ''}</td>
    </tr>`;
  }).join('')}</tbody></table></div>` : '<div class="empty">No orders found yet.</div>'}`;
}

function bindOrderActions(page) {
  document.querySelectorAll('.status-select,.rider-status').forEach(s => s.onchange = async () => { try { await post('/orders/' + s.dataset.id + '/status', { status: s.value }, 'PATCH'); renderPage(page); } catch (e) { alert(e.message); } });
  document.querySelectorAll('.verify').forEach(b => b.onclick = async () => { if (confirm('Confirm you have independently verified the payment?')) { await post('/orders/' + b.dataset.id + '/payment', { payment_status: 'paid' }, 'PATCH'); renderPage(page); } });
  document.querySelectorAll('.track-row-btn').forEach(b => b.onclick = async () => {
    const rows = await api('/orders');
    const found = rows.find(x => String(x.id) === String(b.dataset.id));
    if (found) renderOrderStatus($('#dashboard'), 'online', found);
  });
  document.querySelectorAll('.receipt-row-btn').forEach(b => b.onclick = async () => {
    const rows = await api('/orders');
    const found = rows.find(x => String(x.id) === String(b.dataset.id));
    if (found) renderReceipt($('#dashboard'), 'online', found);
  });
}

async function renderPage(page) {
  highlightNav(page);
  const root = $('#dashboard');
  root.innerHTML = '<div class="empty">Loading ICHIGO workspace…</div>';
  try {
    if (page === 'Overview') {
      const [s, allOrders, dailyRows, ps] = await Promise.all([
        api('/admin/summary'),
        api('/orders').catch(() => []),
        api('/reports/daily').catch(() => []),
        api('/products').catch(() => [])
      ]);

      const byDayKey = new Map();
      (dailyRows || []).forEach(r => {
        const d = new Date(r.day);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        byDayKey.set(key, {
          label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: Number(r.paid_sales || 0)
        });
      });

      const now = new Date();
      const dailySeries = [];
      for (let offset = 6; offset >= 0; offset--) {
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        dailySeries.push(byDayKey.get(key) || {
          label: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: 0
        });
      }

      const itemCounts = {};
      (allOrders || []).forEach(o => {
        if (o.order_status === 'cancelled') return;
        let items = [];
        try { items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : (o.items_json || []); } catch {}
        items.forEach(it => {
          const k = it.name || 'Drink';
          itemCounts[k] = (itemCounts[k] || 0) + Number(it.quantity || 1);
        });
      });
      const topDrinkSeries = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, value]) => ({ label, value }));

      root.innerHTML = `
        <div class="stat-grid">
          <div class="stat"><span style="display:flex;align-items:center;gap:6px;">🛒 Total orders</span><strong>${s.orders.total_orders}</strong></div>
          <div class="stat"><span style="display:flex;align-items:center;gap:6px;">₱ Paid revenue</span><strong>${money(s.revenue)}</strong></div>
          <div class="stat"><span style="display:flex;align-items:center;gap:6px;">⏳ Pending orders</span><strong>${s.pending}</strong></div>
          <div class="stat"><span style="display:flex;align-items:center;gap:6px;">🧋 Available drinks</span><strong>${s.products}</strong></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px;">
          ${panel('📈 Sales Performance (7-Day Chart)', `
            <p class="muted" style="margin:0 0 8px;">Paid revenue trend across the last 7 days (${ps.length} drinks in catalog)</p>
            ${renderBarChartSvg(dailySeries, { height: 210, color: '#d97706', accent: '#fde047', formatVal: v => '₱' + Math.round(v) })}
          `)}

          ${panel('🧋 Top Selling Drinks (Chart)', `
            <p class="muted" style="margin:0 0 8px;">Cups ordered across non-cancelled orders</p>
            ${renderBarChartSvg(topDrinkSeries, { height: 210, color: '#b45309', accent: '#fde047', formatVal: v => v + 'x' })}
          `)}
        </div>

        ${panel('Business operations', '<p class="muted">Monitor orders from online checkout and the cashier POS. Use Dispatch to assign delivery orders, Staff to manage access, and Reports to review paid sales.</p>')}
      `;
    }
    else if (page === 'Products') {
      const ps = await api('/products');
      root.innerHTML = panel('Add a milk tea product', `<form id="newProduct" class="form-grid"><label>Drink name<input name="name" required></label><label>Category<input name="category" value="Milk Tea"></label><label>Price (₱)<input name="price" type="number" min="1" step=".01" required></label><label>Photo URL<input name="image_url" placeholder="https://…"></label><label class="wide">Description<input name="description"></label><button class="primary">Add product</button></form>`) + `<div class="section-head"><h2>Menu inventory</h2><span class="muted">${ps.length} products</span></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead><tbody>${ps.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.available ? 'Available' : 'Out of stock'}</td><td><button class="small-btn edit-product" data-id="${p.id}">Edit</button> <button class="small-btn toggle-product" data-id="${p.id}" data-on="${p.available ? 0 : 1}">${p.available ? 'Mark out' : 'Make available'}</button> <button class="small-btn delete-product" data-id="${p.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
      $('#newProduct').onsubmit = async e => { e.preventDefault(); try { await post('/products', Object.fromEntries(new FormData(e.target))); renderPage('Products'); } catch (x) { alert(x.message); } };
      document.querySelectorAll('.toggle-product').forEach(b => b.onclick = async () => { const p = ps.find(x => x.id == b.dataset.id); await post('/products/' + p.id, { ...p, available: Boolean(Number(b.dataset.on)) }, 'PATCH'); renderPage('Products'); });
      document.querySelectorAll('.edit-product').forEach(b => b.onclick = async () => { const p = ps.find(x => x.id == b.dataset.id); const name = prompt('Product name', p.name); if (name === null) return; const price = prompt('Price', p.price); if (price === null) return; await post('/products/' + p.id, { ...p, name, price: Number(price), available: p.available }, 'PATCH'); renderPage('Products'); });
      document.querySelectorAll('.delete-product').forEach(b => b.onclick = async () => { if (!confirm('Delete this product?')) return; try { await api('/products/' + b.dataset.id, { method: 'DELETE' }); renderPage('Products'); } catch (x) { alert(x.message); } });
    }
    else if (page === 'Inventory') {
      const [inv, sups] = await Promise.all([api('/inventory'), api('/suppliers')]);
      const invItems = inv.items || [];
      const stockSeries = invItems.slice(0, 7).map(x => ({
        label: x.item_name,
        value: Number(x.quantity || 0)
      }));

      root.innerHTML = `<div class="stat-grid"><div class="stat"><span>Total stock value</span><strong>${money(inv.totalValue)}</strong></div><div class="stat"><span>Low stock items</span><strong>${inv.lowStock}</strong></div><div class="stat"><span>Suppliers</span><strong>${sups.length}</strong></div></div>` +
        panel('Stock Levels (Chart)', `
          <p class="muted" style="margin:0 0 8px;">Current stock quantities across ingredients and supplies</p>
          ${renderBarChartSvg(stockSeries, { height: 210, color: '#d97706', accent: '#fde047', formatVal: v => String(v) })}
        `) +
        panel('Add inventory item', `<form id="addInvForm" class="form-grid"><label>Item name<input name="item_name" required></label><label>Category<input name="category" value="Ingredients"></label><label>Unit<input name="unit" value="pcs"></label><label>Quantity<input name="quantity" type="number" step="0.01" min="0" value="0" required></label><label>Reorder level<input name="reorder_level" type="number" step="0.01" min="0" value="5" required></label><label>Unit cost (₱)<input name="unit_cost" type="number" step="0.01" min="0" value="0" required></label><label class="wide">Supplier<select name="supplier_id"><option value="">None</option>${sups.map(s => `<option value="${s.id}">${esc(s.supplier_name)}</option>`).join('')}</select></label><button class="primary wide">Add item</button></form>`) +
        panel('Stock list', `<div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Category</th><th>Stock</th><th>Unit Cost</th><th>Supplier</th><th>Restock</th></tr></thead><tbody>${invItems.map(x => {
          const isLow = Number(x.quantity) <= Number(x.reorder_level);
          return `<tr><td>${esc(x.item_name)}</td><td>${esc(x.category)}</td><td><span class="stock-pill ${isLow ? 'low' : 'good'}">${esc(String(x.quantity))} ${esc(x.unit)}</span></td><td>${money(x.unit_cost)}</td><td>${esc(x.supplier_name || '—')}</td><td><button type="button" class="small-btn restock-btn" data-id="${x.id}" data-name="${esc(x.item_name)}">Restock</button></td></tr>`;
        }).join('')}</tbody></table></div>`);
      $('#addInvForm').onsubmit = async e => { e.preventDefault(); try { await post('/inventory', Object.fromEntries(new FormData(e.target))); renderPage('Inventory'); } catch (x) { alert(x.message); } };
      document.querySelectorAll('.restock-btn').forEach(b => b.onclick = async () => {
        const qty = prompt('Add quantity for ' + b.dataset.name, '10');
        if (!qty || Number(qty) <= 0) return;
        try { await post('/inventory/' + b.dataset.id + '/restock', { quantity: Number(qty) }); renderPage('Inventory'); } catch (x) { alert(x.message); }
      });
    }
    else if (page === 'Staff') {
      const staff = await api('/staff');
      root.innerHTML = panel('Create staff account', `<form id="addStaffForm" class="form-grid"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Password (min 8)<input name="password" type="password" minlength="8" required></label><label>Role<select name="role"><option value="cashier">Cashier</option><option value="rider">Rider</option><option value="admin">Admin</option></select></label><button class="primary wide">Create account</button></form>`) +
        panel('Staff accounts', `<div class="table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Action</th></tr></thead><tbody>${staff.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td>${esc(s.role)}</td><td>${s.id !== currentUser.id ? `<button type="button" class="small-btn del-staff" data-id="${s.id}">Delete</button>` : '<span class="muted">Current user</span>'}</td></tr>`).join('')}</tbody></table></div>`);
      $('#addStaffForm').onsubmit = async e => { e.preventDefault(); try { await post('/staff', Object.fromEntries(new FormData(e.target))); renderPage('Staff'); } catch (x) { alert(x.message); } };
      document.querySelectorAll('.del-staff').forEach(b => b.onclick = async () => { if (!confirm('Delete staff account?')) return; try { await api('/staff/' + b.dataset.id, { method: 'DELETE' }); renderPage('Staff'); } catch (x) { alert(x.message); } });
    }
    else if (page === 'Customers') {
      const cs = await api('/customers');
      root.innerHTML = `<div class="section-head"><h2>Customer directory</h2><span class="muted">${cs.length} customers</span></div>` +
        (cs.length ? `<div class="panel table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Orders</th><th>Lifetime Spend</th></tr></thead><tbody>${cs.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${c.order_count}</td><td>${money(c.lifetime_total)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No registered customers yet.</div>');
    }
    else if (page === 'Cart') {
      root.innerHTML = '<div id="cartArea"></div>';
      showCart('online');
    }
    else if (page === 'Settings' && currentUser.role === 'customer') {
      const savedProfile = JSON.parse(localStorage.getItem('ichigo_profile') || '{}');
      const prefs = JSON.parse(localStorage.getItem('ichigo_prefs') || '{"theme":"Gold & Dark","dateFmt":"MM/DD/YYYY hh:mm A","notifs":true}');

      const formatPreviewDateTime = (fmt, dateObj = new Date()) => {
        const cleanFmt = String(fmt || 'MM/DD/YYYY hh:mm A').trim();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const mNum = String(dateObj.getMonth() + 1);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dNum = String(dateObj.getDate());
        const yyyy = String(dateObj.getFullYear());
        const yy = yyyy.slice(-2);

        const h24 = dateObj.getHours();
        const hh24 = String(h24).padStart(2, '0');
        const ampm = h24 >= 12 ? 'PM' : 'AM';
        const h12Num = h24 % 12 || 12;
        const hh12 = String(h12Num).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        const sec = String(dateObj.getSeconds()).padStart(2, '0');

        return cleanFmt
          .replaceAll('YYYY', yyyy)
          .replaceAll('YY', yy)
          .replaceAll('MM', mm)
          .replaceAll('DD', dd)
          .replaceAll('HH', hh24)
          .replaceAll('hh', hh12)
          .replaceAll('mm', min)
          .replaceAll('ss', sec)
          .replaceAll('A', ampm)
          .replaceAll('a', ampm.toLowerCase())
          .replace(/\bM\b/g, mNum)
          .replace(/\bD\b/g, dNum)
          .replace(/\bH\b/g, String(h24))
          .replace(/\bh\b/g, String(h12Num));
      };

      root.innerHTML = `
        <section class="panel" style="display:grid;gap:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <button type="button" class="small-btn" id="settingsBackBtn">←</button>
              <h2 style="margin:0;">Settings</h2>
            </div>
            <span class="muted" id="settingsLiveStatus">Preview: ${esc(formatPreviewDateTime(prefs.dateFmt))}</span>
          </div>

          <div class="panel" style="padding:14px;display:grid;gap:10px;">
            <b style="color:var(--accent-bright);">Accounts</b>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div>
                <div><b>Sign In</b></div>
                <small class="muted">${esc(currentUser.email || '')} · Role: ${esc(String(currentUser.role || 'customer').toUpperCase())}</small>
              </div>
              <button type="button" class="small-btn" id="editProfileFromSettings">Edit Profile</button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding-top:4px;">
              <div>
                <div><b>Bank Accounts / E-wallets</b></div>
                <small class="muted">Preferred checkout method</small>
              </div>
              <select id="settingsPaySelect" style="max-width:200px;">
                <option value="GCash"${(savedProfile.payMethod || 'GCash') === 'GCash' ? ' selected' : ''}>GCash</option>
                <option value="Maya"${savedProfile.payMethod === 'Maya' ? ' selected' : ''}>Maya</option>
                <option value="Cash"${savedProfile.payMethod === 'Cash' ? ' selected' : ''}>Cash on Delivery</option>
              </select>
            </div>
          </div>

          <div class="panel" style="padding:14px;display:grid;gap:10px;">
            <b style="color:var(--accent-bright);">Preference</b>
            <label>Theme
              <select id="prefTheme">
                <option value="Gold & Dark"${prefs.theme === 'Gold & Dark' ? ' selected' : ''}>Gold & Dark</option>
                <option value="Warm Espresso"${prefs.theme === 'Warm Espresso' ? ' selected' : ''}>Warm Espresso</option>
              </select>
            </label>

            <label>Date & Time format (editable)
              <input id="prefDateFmt" type="text" value="${esc(prefs.dateFmt)}" placeholder="e.g. MM/DD/YYYY hh:mm A or DD/MM/YYYY HH:mm" />
            </label>

            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
              <small class="muted">Quick presets:</small>
              <button type="button" class="small-btn fmt-preset" data-fmt="MM/DD/YYYY hh:mm A">12h (MM/DD/YYYY)</button>
              <button type="button" class="small-btn fmt-preset" data-fmt="DD/MM/YYYY HH:mm">24h (DD/MM/YYYY)</button>
              <button type="button" class="small-btn fmt-preset" data-fmt="YYYY-MM-DD HH:mm:ss">ISO Date + Time</button>
            </div>

            <label style="display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="prefNotifs" ${prefs.notifs ? 'checked' : ''} style="width:auto;">
              <span>Notifications · Order & Delivery updates</span>
            </label>

            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <button type="button" class="small-btn" id="savePrefsBtn">Save Preferences</button>
              <small id="prefSavedMsg" class="muted" style="color:#4ade80;"></small>
            </div>
          </div>

          <div class="panel" style="padding:14px;display:grid;gap:8px;">
            <b style="color:var(--accent-bright);">History</b>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button type="button" class="small-btn" id="goMyOrdersBtn">Orders</button>
              <button type="button" class="small-btn" id="goTransactionsBtn">Transactions</button>
            </div>
          </div>

          <button type="button" class="small-btn" id="settingsLogoutBtn" style="width:100%;padding:12px;">Log Out</button>
        </section>
      `;

      $('#settingsBackBtn').onclick = () => setCustomerNav('Profile');
      $('#editProfileFromSettings').onclick = () => setCustomerNav('Profile');
      $('#goMyOrdersBtn').onclick = () => setCustomerNav('My Orders');
      $('#goTransactionsBtn').onclick = () => setCustomerNav('My Orders');

      $('#settingsPaySelect').onchange = () => {
        const nextProf = { ...savedProfile, payMethod: $('#settingsPaySelect').value };
        localStorage.setItem('ichigo_profile', JSON.stringify(nextProf));
        $('#prefSavedMsg').textContent = `Default payment updated to ${nextProf.payMethod}.`;
      };

      $('#prefDateFmt').oninput = () => {
        $('#settingsLiveStatus').textContent = `Preview: ${formatPreviewDateTime($('#prefDateFmt').value)}`;
      };

      document.querySelectorAll('.fmt-preset').forEach(btn => {
        btn.onclick = () => {
          $('#prefDateFmt').value = btn.dataset.fmt;
          $('#settingsLiveStatus').textContent = `Preview: ${formatPreviewDateTime(btn.dataset.fmt)}`;
        };
      });

      $('#savePrefsBtn').onclick = () => {
        const chosenFmt = ($('#prefDateFmt').value || '').trim() || 'MM/DD/YYYY hh:mm A';
        const nextPrefs = {
          theme: $('#prefTheme').value,
          dateFmt: chosenFmt,
          notifs: $('#prefNotifs').checked
        };
        localStorage.setItem('ichigo_prefs', JSON.stringify(nextPrefs));
        document.body.dataset.ichigoTheme = nextPrefs.theme;
        $('#settingsLiveStatus').textContent = `Preview: ${formatPreviewDateTime(nextPrefs.dateFmt)}`;
        $('#prefSavedMsg').textContent = 'Preferences saved!';
      };

      $('#settingsLogoutBtn').onclick = logoutNow;
    }
    else if (page === 'Settings') {
      const cfg = await api('/settings');
      root.innerHTML = panel('Store settings', `<form id="settingsForm" class="form-grid"><label>Store name<input name="store_name" value="${esc(cfg.store_name || 'ICHIGO')}"></label><label>Phone<input name="phone" value="${esc(cfg.phone || '')}"></label><label class="wide">Address<input name="store_address" value="${esc(cfg.store_address || 'Catarman, Northern Samar')}"></label><label class="wide">Opening hours<input name="opening_hours" value="${esc(cfg.opening_hours || '9:00 AM - 9:00 PM')}"></label><button class="primary wide">Save settings</button></form>`);
      $('#settingsForm').onsubmit = async e => { e.preventDefault(); try { await post('/settings', Object.fromEntries(new FormData(e.target)), 'PUT'); alert('Settings saved.'); } catch (x) { alert(x.message); } };
    }
    else if (page === 'Reports') {
      const [rows, allOrders, invData] = await Promise.all([
        api('/reports/daily'),
        api('/orders').catch(() => []),
        api('/inventory').catch(() => ({ items: [] }))
      ]);

      const byDayKey = new Map();
      (rows || []).forEach(r => {
        const d = new Date(r.day);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        byDayKey.set(key, {
          label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: Number(r.paid_sales || 0),
          orders_count: Number(r.orders_count || 0)
        });
      });

      const now = new Date();
      const salesSeries = [];
      for (let offset = 6; offset >= 0; offset--) {
        const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        salesSeries.push(byDayKey.get(key) || {
          label: dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          value: 0,
          orders_count: 0
        });
      }

      const maxVal = Math.max(...salesSeries.map(x => Number(x.value || 0)), 1);

      const itemTotals = {};
      (allOrders || []).forEach(o => {
        if (o.order_status === 'cancelled') return;
        let items = [];
        try { items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : (o.items_json || []); } catch {}
        items.forEach(it => {
          const name = it.name || 'Item';
          if (!itemTotals[name]) itemTotals[name] = { qty: 0, revenue: 0 };
          const q = Number(it.quantity || 1);
          const up = Number(it.unit_price || it.unitPrice || 0);
          itemTotals[name].qty += q;
          itemTotals[name].revenue += q * up;
        });
      });
      const topSellingList = Object.entries(itemTotals)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5);

      const invSeries = ((invData && invData.items) || []).slice(0, 6).map(x => ({
        label: x.item_name,
        value: Number(x.quantity || 0)
      }));

      root.innerHTML = `
        ${panel('Daily Sales Report · 7-Day Chart & Breakdown', `
          <p class="muted" style="margin:0 0 10px;">Paid sales performance across the last 7 days. Mark/verify orders as <b>paid</b> to update revenue bars.</p>
          ${renderBarChartSvg(salesSeries, { height: 225, color: '#d97706', accent: '#fde047', formatVal: v => '₱' + Math.round(v) })}
          <div class="report-bars" style="margin-top:14px;">
            ${salesSeries.map(r => `
              <div style="margin-bottom:10px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.025);border:1px solid var(--border);">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span><b>${esc(r.label)}</b> <small class="muted">(${r.orders_count} paid orders)</small></span>
                  <strong class="price">${money(r.value)}</strong>
                </div>
                <div class="bar-track" style="margin-top:6px;"><i style="width:${Math.max(3, (Number(r.value || 0) / maxVal) * 100)}%"></i></div>
              </div>
            `).join('')}
          </div>
        `)}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px;">
          ${panel('Top Selling Items', topSellingList.length ? `
            <div style="display:grid;gap:10px;">
              ${topSellingList.map(([name, info]) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid var(--border);">
                  <div><b>${esc(name)}</b><br><small class="muted">${money(info.revenue)} est. sales</small></div>
                  <span class="stock-pill good">${info.qty} Units</span>
                </div>
              `).join('')}
            </div>
          ` : '<p class="muted">No item sales data yet.</p>')}

          ${panel('Inventory Stock Chart', `
            <p class="muted" style="margin:0 0 8px;">Current stock levels across ingredients/supplies</p>
            ${renderBarChartSvg(invSeries, { height: 205, color: '#b45309', accent: '#fde047', formatVal: v => String(v) })}
          `)}
        </div>
      `;
    }
    else if (page === 'Menu' || page === 'POS') {
      const ps = await api('/products');
      const isCust = page === 'Menu' && currentUser?.role === 'customer';
      const cats = [...new Set(ps.map(p => p.category || 'Milk Tea'))];
      const bestSellers = ps.slice(0, 3);

      const card = p => `<article class="product-card"><div class="product-thumb-wrap"><img src="${esc(p.image_url || '')}" alt="${esc(p.name)}" onerror="this.style.display='none'"><span class="ichigo-img-badge">ICHIGO</span></div><div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.description || p.category)}</p><div class="product-actions"><span class="price">${money(p.price)}</span><button type="button" class="small-btn choose-drink" data-id="${p.id}">Customize</button></div></div></article>`;

      root.innerHTML = `<div class="section-head"><h2>${page === 'POS' ? 'Counter menu' : 'MENU CATALOG · Fresh Milk Tea in Catarman!'}</h2><span class="muted">Order your favorite drinks now</span></div>
      <label class="menu-search">Search drinks<div class="search-box-wrap"><span class="search-box-icon">🔍</span><input id="menuSearch" type="search" placeholder="Search milk tea, matcha, mango, ube, tropical..."></div></label>
      ${isCust && bestSellers.length ? `<section class="menu-category"><div class="section-head"><h2>BEST SELLER</h2><span class="muted">Popular picks</span></div><div class="product-rail">${bestSellers.map(card).join('')}</div></section>` : ''}
      ${cats.map(c => `<section class="menu-category"><div class="section-head"><h2>${esc(c)}</h2><span class="muted">${ps.filter(p => (p.category || 'Milk Tea') === c).length} drinks</span></div><div class="product-rail">${ps.filter(p => (p.category || 'Milk Tea') === c).map(card).join('')}</div></section>`).join('')}
      <div id="cartArea"></div>`;

      document.querySelectorAll('.choose-drink').forEach(b => b.onclick = () => customize(ps.find(p => p.id == b.dataset.id), page === 'POS' ? 'pos' : 'online'));
      if (cart.length) showCart(page === 'POS' ? 'pos' : 'online');
      $('#menuSearch').oninput = () => {
        const q = ($('#menuSearch').value || '').trim().toLowerCase();
        document.querySelectorAll('.product-card').forEach(cardEl => {
          cardEl.style.display = (!q || cardEl.textContent.toLowerCase().includes(q)) ? '' : 'none';
        });
      };
    }
    else if (page === 'Reviews') {
      const rows = await api('/reviews');
      const avg = rows.length ? (rows.reduce((s, r) => s + Number(r.rating || 5), 0) / rows.length).toFixed(1) : '4.5';
      const counts = [5, 4, 3, 2, 1].map(star => ({
        star,
        n: rows.filter(r => Number(r.rating) === star).length
      }));
      const breakdownHtml = `<div class="panel" style="padding:14px;margin-bottom:14px;display:grid;gap:6px;">
        ${counts.map(c => {
          const pct = rows.length ? Math.round((c.n / rows.length) * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:10px;font-size:0.84rem;"><span style="width:24px;">${c.star} ★</span><div class="bar-track" style="flex:1;"><i style="width:${pct}%;"></i></div><span class="muted">${c.n}</span></div>`;
        }).join('')}
      </div>`;

      root.innerHTML = panel(`Ratings and reviews · ${avg} ★ (${rows.length})`, `${breakdownHtml}<form id="reviewForm" class="form-grid"><label>Rating<select name="rating"><option value="5">★★★★★ · Excellent</option><option value="4">★★★★☆ · Good</option><option value="3">★★★☆☆ · Okay</option><option value="2">★★☆☆☆ · Fair</option><option value="1">★☆☆☆☆ · Poor</option></select></label><label>Order ID (optional)<input name="order_id" type="number" min="1" placeholder="Order number"></label><label class="wide">Write your review here<textarea name="review_text" rows="3" maxlength="1000" placeholder="Tell us about your order..."></textarea></label><button class="primary">Submit review</button></form>`) +
        panel('Customer reviews', rows.length ? rows.map(r => `<div class="review-row" style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><b>${esc(r.customer_name || 'Customer')}</b> <span class="price">${'★'.repeat(Number(r.rating || 5))}${'☆'.repeat(5 - Number(r.rating || 5))}</span><p style="margin:6px 0;">${esc(r.review_text || '')}</p><small class="muted">${new Date(r.created_at).toLocaleDateString()}</small></div>`).join('') : '<p class="muted">No reviews yet. Be the first to share your experience.</p>');
      $('#reviewForm').onsubmit = async e => { e.preventDefault(); try { const f = Object.fromEntries(new FormData(e.target)); await post('/reviews', { ...f, rating: Number(f.rating), order_id: f.order_id ? Number(f.order_id) : null }); alert('Thank you for your review!'); renderPage('Reviews'); } catch (x) { alert(x.message); } };
    }
    else if (page === 'Profile') {
      const u = currentUser || { name: 'Customer', role: 'customer', email: '' };
      const savedProfile = JSON.parse(localStorage.getItem('ichigo_profile') || '{}');
      const handle = savedProfile.handle || '@' + String(u.name || 'customer').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
      const fullName = savedProfile.fullName || u.name || 'Customer';
      const address = savedProfile.address || 'Brgy. Cawayan, Catarman, Northern Samar';
      const payMethod = savedProfile.payMethod || 'GCash';
      const points = savedProfile.points ?? 120;
      const lang = savedProfile.lang || 'English';
      const favs = savedProfile.favs || ['Okinawa Milk Tea', 'Strawberry Milk Tea'];
      const avatar = savedProfile.avatar || '';

      root.innerHTML = `
        <section class="panel" style="padding:20px;display:grid;gap:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:16px;border-radius:14px;background:linear-gradient(135deg,#2a1f16,#17120e);border:1px solid #3c2d1f;">
            <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
              <div style="position:relative;width:82px;height:82px;border-radius:50%;overflow:hidden;border:2px solid #f59e0b;background:#241c15;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fbbf24;">
                ${avatar ? `<img id="profAvatarImg" src="${avatar}" alt="Profile" style="width:100%;height:100%;object-fit:cover;" />` : `<span id="profAvatarInitial">${esc(fullName.charAt(0).toUpperCase())}</span>`}
              </div>
              <div>
                <p class="muted" style="margin:0;font-size:13px;">${esc(handle)}</p>
                <h2 style="margin:2px 0;">${esc(fullName)}</h2>
                <p class="muted" style="margin:0;font-size:13px;">${esc(u.email || '')}</p>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                  <label for="profPhotoInput" class="small-btn" style="cursor:pointer;">Change Profile Photo</label>
                  <input id="profPhotoInput" type="file" accept="image/*" style="display:none;" />
                </div>
              </div>
            </div>
            <span class="stock-pill good">Loyalty Points: ${esc(String(points))} pts</span>
          </div>

          <div class="panel" style="padding:14px;display:grid;gap:8px;">
            <h3 style="margin:0;">My Address</h3>
            <input id="profAddress" type="text" value="${esc(address)}" />
          </div>

          <div class="panel" style="padding:14px;display:grid;gap:10px;">
            <h3 style="margin:0;">Payment Info</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
              <div>
                <label class="muted">Loyalty Points</label>
                <input type="text" readonly value="${esc(String(points))} pts (Redeemable)" style="margin-top:4px;color:#fbbf24;" />
              </div>
              <div>
                <label class="muted">Payment Methods</label>
                <select id="profPayMethod" style="margin-top:4px;">
                  <option value="GCash"${payMethod === 'GCash' ? ' selected' : ''}>GCash</option>
                  <option value="Maya"${payMethod === 'Maya' ? ' selected' : ''}>Maya</option>
                  <option value="Cash"${payMethod === 'Cash' ? ' selected' : ''}>Cash on Delivery</option>
                </select>
              </div>
            </div>
          </div>

          <div class="panel" style="padding:14px;display:grid;gap:12px;">
            <h3 style="margin:0;">Settings & Preferences</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
              <div>
                <label class="muted">Language</label>
                <select id="profLang" style="margin-top:4px;">
                  <option value="English"${lang === 'English' ? ' selected' : ''}>English</option>
                  <option value="Filipino"${lang === 'Filipino' ? ' selected' : ''}>Filipino</option>
                  <option value="Waray"${lang === 'Waray' ? ' selected' : ''}>Waray</option>
                </select>
              </div>
              <div>
                <label class="muted">Contact Support</label>
                <div style="margin-top:4px;display:flex;gap:8px;align-items:center;">
                  <input type="text" readonly value="support@ichigo-catarman.ph" />
                  <button id="contactSupportBtn" type="button" class="small-btn">Message</button>
                </div>
              </div>
            </div>

            <div>
              <label class="muted">Favorites</label>
              <div id="profFavList" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                ${favs.map((f, idx) => `<span class="small-btn" style="display:inline-flex;align-items:center;gap:6px;">${esc(f)} <button type="button" data-del-fav="${idx}" style="background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;">×</button></span>`).join('')}
              </div>
              <div style="display:flex;gap:8px;margin-top:8px;max-width:420px;">
                <input id="newFavInput" type="text" placeholder="Add favorite drink..." />
                <button id="addFavBtn" type="button" class="small-btn">Add</button>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <button id="saveProfileBtn" type="button" class="primary">Save Profile</button>
            <button id="goSettingsBtn" type="button" class="small-btn">Open Full Settings</button>
          </div>
          <p id="profileMsg" class="muted" style="margin:0;color:#4ade80;"></p>
        </section>
      `;

      let currentAvatar = avatar;
      let currentFavs = [...favs];

      $('#profPhotoInput').onchange = e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          currentAvatar = reader.result;
          const box = $('#profAvatarInitial')?.parentElement || $('#profAvatarImg')?.parentElement;
          if (box) box.innerHTML = `<img id="profAvatarImg" src="${currentAvatar}" alt="Profile" style="width:100%;height:100%;object-fit:cover;" />`;
          $('#profileMsg').textContent = 'Photo selected! Click "Save Profile" to keep it.';
        };
        reader.readAsDataURL(file);
      };

      const bindFavDeletes = () => {
        document.querySelectorAll('[data-del-fav]').forEach(btn => {
          btn.onclick = () => {
            const idx = Number(btn.getAttribute('data-del-fav'));
            currentFavs.splice(idx, 1);
            $('#profFavList').innerHTML = currentFavs.map((f, i) => `<span class="small-btn" style="display:inline-flex;align-items:center;gap:6px;">${esc(f)} <button type="button" data-del-fav="${i}" style="background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;">×</button></span>`).join('');
            bindFavDeletes();
          };
        });
      };
      bindFavDeletes();

      $('#addFavBtn').onclick = () => {
        const val = $('#newFavInput').value.trim();
        if (!val) return;
        currentFavs.push(val);
        $('#newFavInput').value = '';
        $('#profFavList').innerHTML = currentFavs.map((f, i) => `<span class="small-btn" style="display:inline-flex;align-items:center;gap:6px;">${esc(f)} <button type="button" data-del-fav="${i}" style="background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;">×</button></span>`).join('');
        bindFavDeletes();
      };

      $('#contactSupportBtn').onclick = () => {
        $('#profileMsg').textContent = 'Support ticket ready: Chat with ICHIGO Catarman at support@ichigo-catarman.ph or 0917-000-ICHIGO.';
      };

      $('#saveProfileBtn').onclick = () => {
        const next = {
          handle,
          fullName,
          address: $('#profAddress').value.trim() || 'Brgy. Cawayan, Catarman, Northern Samar',
          payMethod: $('#profPayMethod').value,
          lang: $('#profLang').value,
          points,
          favs: currentFavs,
          avatar: currentAvatar
        };
        localStorage.setItem('ichigo_profile', JSON.stringify(next));
        $('#profileMsg').textContent = 'Profile & photo saved!';
      };

      $('#goSettingsBtn').onclick = () => setCustomerNav('Settings');
    }
    else if (page === 'Active Queue' || page === 'Order History' || page === 'Orders' || page === 'My Orders' || page === 'Payments' || page === 'My Deliveries') {
      const rows = await api('/orders');
      let filtered = rows;
      if (page === 'Active Queue') filtered = rows.filter(o => !['delivered', 'cancelled'].includes(o.order_status));
      if (page === 'Order History') filtered = rows.filter(o => ['delivered', 'cancelled'].includes(o.order_status));
      root.innerHTML = ordersTable(filtered, page);
    }
    else if (page === 'Dispatch') {
      const [orders, riders] = await Promise.all([api('/orders'), api('/staff')]);
      const pending = orders.filter(o => o.fulfillment === 'delivery' && o.order_status !== 'delivered');
      root.innerHTML = `<div class="section-head"><h2>Delivery dispatch</h2><span class="muted">Assign delivery orders to riders</span></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Customer / Address</th><th>Status</th><th>Assigned rider</th><th>Assign</th></tr></thead><tbody>${pending.map(o => `<tr><td>${o.order_code}<br>${money(o.total)}</td><td>${esc(o.customer_name)}<br><small>${esc(o.delivery_address || 'No address provided')}</small></td><td>${o.order_status}</td><td>${o.rider_id || 'Unassigned'}</td><td><select class="assign-rider" data-id="${o.id}"><option value="">Choose rider</option>${riders.filter(r => r.role === 'rider').map(r => `<option value="${r.id}" ${o.rider_id === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`;
      document.querySelectorAll('.assign-rider').forEach(s => s.onchange = async () => { if (s.value) { try { await post('/orders/' + s.dataset.id + '/assign', { rider_id: s.value }, 'PATCH'); alert('Rider assigned.'); renderPage('Dispatch'); } catch (e) { alert(e.message); } } });
    }
    else if (page === 'Delivery Board') {
      const [mine, available] = await Promise.all([api('/orders'), api('/rider/available')]);
      const active = mine.find(o => o.fulfillment === 'delivery' && o.order_status === 'out_for_delivery');
      const delivered = mine.filter(o => o.order_status === 'delivered');
      const cod = delivered.filter(o => o.payment_method === 'cash').reduce((a, o) => a + Number(o.total), 0);
      const orderCard = o => {
        let items = [];
        try { items = typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json || []; } catch {}
        return `<div class="rider-order-card">
          <div class="rider-route-banner">En Route: ICHIGO Shop <span>➜</span> ${esc(o.delivery_address || 'Catarman delivery destination')}</div>
          <div class="rider-order-details"><h2>🛵 Active Delivery Assignment</h2>
            <p><b>Order ID:</b> ${esc(o.order_code)} <span class="rider-paid">${esc(String(o.payment_method || '').toUpperCase())} · ${esc(o.payment_status)}</span></p>
            <p><b>Customer:</b> ${esc(o.customer_name)} ${o.customer_phone ? '(' + esc(o.customer_phone) + ')' : ''}</p>
            <p><b>Address:</b> ${esc(o.delivery_address || 'Catarman, Northern Samar')}</p>
            <p><b>Items:</b> ${items.map(i => `${esc(i.name)} ×${i.quantity}`).join(', ') || 'Order items'}</p>
            <div class="rider-map-preview"><span class="map-start"></span><span class="map-line"></span><span class="map-end"></span><small>Catarman live route preview</small></div>
            <div class="rider-actions">
              ${o.customer_phone ? `<a class="rider-action call" href="tel:${esc(o.customer_phone.replace(/[^0-9+]/g, ''))}">☎ Call Customer</a>` : `<button class="rider-action call" disabled>☎ No phone number</button>`}
              <button class="rider-action notify" id="notifyArriving" data-id="${o.id}">▣ Notify: “Arriving soon”</button>
              <button class="rider-action delivered" id="markDelivered" data-id="${o.id}">✓ Mark as Delivered / Completed</button>
              <a class="rider-action directions" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((o.delivery_address || '') + ' Catarman Northern Samar')}">↗ Open directions</a>
            </div>
          </div></div>`;
      };
      if (active) {
        root.innerHTML = orderCard(active) + `<div class="rider-shift"><h2>📊 Shift Dispatch Summary</h2><p>Remaining tasks: ${mine.filter(o => !['delivered', 'cancelled'].includes(o.order_status)).length}</p><p>Cash on Hand (COD): ${money(cod)}</p><p>Completed deliveries: ${delivered.length}</p></div>`;
        $('#notifyArriving').onclick = async () => { try { const d = await post('/rider/notify/' + active.id, {}); alert(d.message); } catch (e) { alert(e.message); } };
        $('#markDelivered').onclick = async () => { if (!confirm('Confirm that this order has been delivered to the customer?')) return; try { await post('/orders/' + active.id + '/status', { status: 'delivered' }, 'PATCH'); renderPage('Delivery Board'); } catch (e) { alert(e.message); } };
      } else {
        const last = delivered[0];
        root.innerHTML = (last ? `<div class="rider-success"><h2>ICHIGO · DELIVER SUCCESSFUL</h2><h3>✓ Delivery completed: ${esc(last.order_code)}</h3><p>Customer: ${esc(last.customer_name)}</p><p>Address: ${esc(last.delivery_address || '—')}</p><p>Payment: ${esc(last.payment_method)} · ${money(last.total)}</p></div>` : '') +
          `<div class="rider-shift"><h2>📊 Shift Dispatch Summary</h2><p>Remaining tasks: ${mine.filter(o => !['delivered', 'cancelled'].includes(o.order_status)).length}</p><p>Cash on Hand (COD): ${money(cod)}</p><p>Completed deliveries: ${delivered.length}</p></div>` +
          panel('Available delivery assignments', available.length ? available.map(o => `<div class="delivery-card"><div><b>${esc(o.order_code)}</b><p>${esc(o.customer_name)} · ${esc(o.delivery_address || 'Catarman address to confirm')}</p><small>${esc(o.payment_method)} · ${esc(o.payment_status)} · ${money(o.total)}</small></div><button class="primary claim-order" data-id="${o.id}">🛵 Accept & Start Delivery Route</button></div>`).join('') : '<p class="muted">No delivery assignments are waiting right now.</p>') +
          `<p class="muted">Accept an assigned delivery to open its route and customer details.</p>`;
        document.querySelectorAll('.claim-order').forEach(b => b.onclick = async () => { try { await post('/rider/claim/' + b.dataset.id, {}); renderPage('Delivery Board'); } catch (e) { alert(e.message); } });
      }
    }
    else if (page === 'Earnings') {
      const rows = await api('/orders');
      const done = rows.filter(o => o.order_status === 'delivered');
      root.innerHTML = `<div class="stat-grid"><div class="stat"><span>Completed deliveries</span><strong>${done.length}</strong></div><div class="stat"><span>COD collected (recorded)</span><strong>${money(done.filter(o => o.payment_method === 'cash').reduce((a, o) => a + Number(o.total), 0))}</strong></div><div class="stat"><span>Delivery pay</span><strong>Not configured</strong></div><div class="stat"><span>Payout requests</span><strong>—</strong></div></div>${panel('Earnings information', '<p class="muted">Rider compensation, tips and payout processing need store-defined pay rates and payout configuration. This view currently summarizes completed orders only.</p>')}`;
    }
    else root.innerHTML = '<div class="empty">Section not available yet.</div>';
    bindOrderActions(page);
  } catch (e) {
    root.innerHTML = `<div class="empty">${esc(e.message)}<br><br>Check that your Supabase connection and database tables are configured.</div>`;
  }
}

if (token && currentUser) showApp();
else showLoginScreen();