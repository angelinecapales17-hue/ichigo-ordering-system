const $=s=>document.querySelector(s);
let token=localStorage.getItem('ichigo_token'),currentUser=JSON.parse(localStorage.getItem('ichigo_user')||'null'),cart=[],lastOrder=null;
const money=n=>'₱'+Number(n||0).toFixed(2), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(url,opts={}){const r=await fetch('/api'+url,{...opts,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...(opts.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Something went wrong');return d}
const post=(url,data,method='POST')=>api(url,{method,body:JSON.stringify(data)});
const NAV_ICONS = {
  'Menu': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
  'My Orders': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>`,
  'Reviews': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  'Profile': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'Settings': `<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
};

function navLabelWithIcon(label) {
  const ico = NAV_ICONS[label] || '';
  return `${ico}<span>${esc(label)}</span>`;
}
function showLoginScreen(){
  $('#appView').hidden=true;
  $('#authView').hidden=false;
  $('#logoutBtn').hidden=true;
  $('#roleChip').hidden=true;
  $('#welcome').textContent='';
  setAuthTab('login');
}

function setAuthTab(tabName,keepMessage=false){
  const isLogin=tabName!=='register';
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===(isLogin?'login':'register')));
  $('#loginForm').hidden=!isLogin;
  $('#registerForm').hidden=isLogin;
  $('#loginForm').style.display=isLogin?'':'none';
  $('#registerForm').style.display=isLogin?'none':'';
  if(!keepMessage)$('#authMessage').textContent='';
}

document.querySelectorAll('.tab').forEach(b=>{
  b.onclick=()=>setAuthTab(b.dataset.tab||'login');
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

document.querySelectorAll('.role-pick').forEach(btn => {
  btn.onclick = () => {
    const input = $('#loginRoleInput');
    if (!input) return;
    input.value = input.value === btn.dataset.role ? '' : btn.dataset.role;
    document.querySelectorAll('.role-pick').forEach(x => x.classList.toggle('active', x.dataset.role === input.value));
    updateLoginRoleButton();
  };
});

updateLoginRoleButton();

$('#registerForm').onsubmit=async e=>{
  e.preventDefault();
  const dataObj=Object.fromEntries(new FormData(e.target));
  try{
    const d=await post('/register',dataObj);
    e.target.reset();
    setAuthTab('login',true);
    const loginEmail=$('#loginForm input[name="email"]');
    const loginPass=$('#loginForm input[name="password"]');
    if(loginEmail&&dataObj.email)loginEmail.value=dataObj.email;
    if(loginPass)loginPass.value='';
    $('#authMessage').textContent=(d.message||'Account created!')+' Please log in now.';
    if(loginPass)loginPass.focus();
  }catch(err){
    $('#authMessage').textContent=err.message;
  }
};

$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  const payload=Object.fromEntries(new FormData(e.target));
  if(!payload.role)delete payload.role;
  try{
    const d=await post('/login',payload);
    token=d.token;
    currentUser=d.user;
    localStorage.setItem('ichigo_token',token);
    localStorage.setItem('ichigo_user',JSON.stringify(currentUser));
    showApp();
  }catch(err){
    $('#authMessage').textContent=err.message;
  }
};

$('#logoutBtn').onclick=()=>{
  localStorage.removeItem('ichigo_token');
  localStorage.removeItem('ichigo_user');
  token=null;
  currentUser=null;
  cart=[];
  lastOrder=null;
  showLoginScreen();
};

const pageSets={
  admin:['Overview','Products','Inventory','Orders','Dispatch','Staff','Customers','Reports','Settings','Payments'],
  cashier:['POS','Active Queue','Order History','Products'],
  customer:['Menu','My Orders','Reviews','Profile','Settings'],
  rider:['Delivery Board','My Deliveries','Earnings']
};

function showApp(){
  if(!currentUser||!token){
    showLoginScreen();
    return;
  }
  $('#authView').hidden=true;
  $('#appView').hidden=false;
  $('#logoutBtn').hidden=false;
  $('#roleChip').hidden=false;
  $('#welcome').textContent='Hello, '+currentUser.name;
  $('#roleChip').textContent=currentUser.role.toUpperCase();
  const titles={
    admin:['Admin Portal','Manage your milk tea business.'],
    cashier:['Cashier / POS','Counter sales, checkout and fulfillment.'],
    customer:['Your ICHIGO Space','Fresh Milk Tea in Catarman! Order your favorite drinks now.'],
    rider:['Rider Portal','Manage your delivery assignments.']
  };
  $('#portalTitle').textContent=titles[currentUser.role][0];
  $('#portalSubtitle').textContent=titles[currentUser.role][1];
  const teaIcon='<span class="milktea-inline-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg></span>';
 $('#portalLabel').textContent='ICHIGO '+currentUser.role.toUpperCase();
 $('#portalNav').innerHTML=(currentUser.role==='customer'?['Menu','My Orders','Reviews','Profile','Settings']:['Overview','Products','Inventory','Customers','Reports','Settings']).map((t,i)=>`<button class="nav-btn${i===0?' active':''}" data-page="${esc(t)}">${navLabelWithIcon(t)}</button>`).join('');
  document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x===b));
    renderPage(b.dataset.page);
  });
  renderPage(pageSets[currentUser.role][0]);
}

function panel(title,body){
  return `<section class="panel"><div class="section-head"><h2>${title}</h2></div>${body}</section>`;
}

async function renderPage(page){
  const root=$('#dashboard');
  root.innerHTML='<div class="empty">Loading ICHIGO workspace…</div>';
  try{
    if(page==='Overview'){
      const s=await api('/admin/summary');
      root.innerHTML=`<div class="stat-grid"><div class="stat"><span>Total orders</span><strong>${s.orders.total_orders}</strong></div><div class="stat"><span>Paid revenue</span><strong>${money(s.revenue)}</strong></div><div class="stat"><span>Pending orders</span><strong>${s.pending}</strong></div><div class="stat"><span>Available drinks</span><strong>${s.products}</strong></div></div>${panel('Business operations','<p class="muted">Monitor orders from online checkout and the cashier POS. Use Dispatch to assign delivery orders, Staff to manage access, and Reports to review paid sales.</p>')}`;
    }
    else if(page==='Products'){
      const ps=await api('/products');
      root.innerHTML=panel('Add a milk tea product',`<form id="newProduct" class="form-grid"><label>Drink name<input name="name" required></label><label>Category<input name="category" value="Milk Tea"></label><label>Price (₱)<input name="price" type="number" min="1" step=".01" required></label><label>Photo URL<input name="image_url" placeholder="https://…"></label><label class="wide">Description<input name="description"></label><button class="primary">Add product</button></form>`)+`<div class="section-head"><h2>Menu inventory</h2><span class="muted">${ps.length} products</span></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Availability</th><th>Actions</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td>${p.available?'Available':'Out of stock'}</td><td><button class="small-btn edit-product" data-id="${p.id}">Edit</button> <button class="small-btn toggle-product" data-id="${p.id}" data-on="${p.available?0:1}">${p.available?'Mark out':'Make available'}</button> <button class="small-btn delete-product" data-id="${p.id}">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
      $('#newProduct').onsubmit=async e=>{e.preventDefault();try{await post('/products',Object.fromEntries(new FormData(e.target)));renderPage('Products')}catch(x){alert(x.message)}};
      document.querySelectorAll('.toggle-product').forEach(b=>b.onclick=async()=>{const p=ps.find(x=>x.id==b.dataset.id);await post('/products/'+p.id,{...p,available:Boolean(Number(b.dataset.on))},'PATCH');renderPage('Products')});
      document.querySelectorAll('.edit-product').forEach(b=>b.onclick=async()=>{const p=ps.find(x=>x.id==b.dataset.id);const name=prompt('Product name',p.name);if(name===null)return;const price=prompt('Price',p.price);if(price===null)return;await post('/products/'+p.id,{...p,name,price:Number(price),available:p.available},'PATCH');renderPage('Products')});
      document.querySelectorAll('.delete-product').forEach(b=>b.onclick=async()=>{if(confirm('Delete this product? If it has order history, mark it unavailable instead.')){try{await api('/products/'+b.dataset.id,{method:'DELETE'});renderPage('Products')}catch(x){alert(x.message)}}});
    }
    else if(page==='Inventory'){
      const [data,suppliers,moves]=await Promise.all([api('/inventory'),api('/suppliers'),api('/inventory/movements')]);
      const items=data.items||[];
      root.innerHTML=`<div class="stat-grid"><div class="stat"><span>Inventory value</span><strong>${money(data.totalValue)}</strong></div><div class="stat"><span>Tracked ingredients</span><strong>${items.length}</strong></div><div class="stat"><span>Low-stock alerts</span><strong class="${data.lowStock?'warning-text':''}">${data.lowStock}</strong></div><div class="stat"><span>Suppliers</span><strong>${suppliers.length}</strong></div></div>
      <div class="inventory-layout"><section class="panel"><div class="section-head"><h2>Inventory valuation</h2><span class="muted">Current stock and reorder levels</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Stock</th><th>Reorder at</th><th>Unit cost</th><th>Value</th><th>Status</th><th>Restock</th></tr></thead><tbody>${items.map(i=>`<tr><td><b>${esc(i.item_name)}</b><br><small>${esc(i.category)} · ${esc(i.supplier_name||'No supplier')}</small></td><td>${Number(i.quantity).toLocaleString()} ${esc(i.unit)}</td><td>${Number(i.reorder_level)} ${esc(i.unit)}</td><td>${money(i.unit_cost)}</td><td>${money(Number(i.quantity)*Number(i.unit_cost))}</td><td><span class="stock-pill ${Number(i.quantity)<=Number(i.reorder_level)?'low':'good'}">${Number(i.quantity)<=Number(i.reorder_level)?'Restock needed':'In stock'}</span></td><td><button class="small-btn restock-item" data-id="${i.id}" data-name="${esc(i.item_name)}">Restock</button></td></tr>`).join('')}</tbody></table></div></section>
      <aside class="inventory-side"><section class="panel"><h2>Add inventory item</h2><form id="inventoryForm" class="form-grid"><label class="wide">Item name<input name="item_name" required placeholder="e.g. Tapioca pearls"></label><label>Category<input name="category" value="Ingredients"></label><label>Unit<input name="unit" value="kg"></label><label>Starting stock<input name="quantity" type="number" min="0" step=".01" value="0"></label><label>Reorder level<input name="reorder_level" type="number" min="0" step=".01" value="5"></label><label>Unit cost (₱)<input name="unit_cost" type="number" min="0" step=".01" value="0"></label><label>Supplier<select name="supplier_id"><option value="">No supplier</option>${suppliers.map(s=>`<option value="${s.id}">${esc(s.supplier_name)}</option>`).join('')}</select></label><button class="primary">Save item</button></form></section>
      <section class="panel"><h2>Supplier lead time</h2><form id="supplierForm" class="form-grid"><label class="wide">Supplier name<input name="supplier_name" required></label><label>Contact person<input name="contact_person"></label><label>Phone<input name="phone"></label><label>Email<input name="email" type="email"></label><label>Lead time (days)<input name="lead_time_days" type="number" min="0" value="3"></label><button class="primary">Add supplier</button></form>${suppliers.map(s=>`<div class="supplier-row"><b>${esc(s.supplier_name)}</b><span>${s.lead_time_days} days</span></div>`).join('')}</section></aside></div>
      <section class="panel"><div class="section-head"><h2>Recent stock movements</h2><span class="muted">Latest 100 records</span></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Item</th><th>Movement</th><th>Quantity</th><th>Reference</th><th>Recorded by</th></tr></thead><tbody>${moves.map(m=>`<tr><td>${new Date(m.created_at).toLocaleString()}</td><td>${esc(m.item_name)}</td><td>${esc(m.movement_type)}</td><td>${Number(m.quantity)} ${esc(m.unit)}</td><td>${esc(m.reference_note||'—')}</td><td>${esc(m.staff_name||'System')}</td></tr>`).join('')}</tbody></table></div></section>`;
      $('#inventoryForm').onsubmit=async e=>{e.preventDefault();try{await post('/inventory',Object.fromEntries(new FormData(e.target)));renderPage('Inventory')}catch(x){alert(x.message)}};
      $('#supplierForm').onsubmit=async e=>{e.preventDefault();try{await post('/suppliers',Object.fromEntries(new FormData(e.target)));renderPage('Inventory')}catch(x){alert(x.message)}};
      document.querySelectorAll('.restock-item').forEach(b=>b.onclick=async()=>{const quantity=prompt('Quantity to add for '+b.dataset.name+':','10');if(quantity===null)return;const unit_cost=prompt('Unit cost (₱):','0');if(unit_cost===null)return;const reference_note=prompt('Supplier / purchase reference:','Restock purchase')||'Restock purchase';try{await post('/inventory/'+b.dataset.id+'/restock',{quantity:Number(quantity),unit_cost:Number(unit_cost),reference_note});renderPage('Inventory')}catch(x){alert(x.message)}});
    }
    else if(page==='Staff'){
      const staff=await api('/staff');
      root.innerHTML=panel('Create staff account',`<form id="staffForm" class="form-grid"><label>Full name<input name="name" required></label><label>Email<input name="email" type="email" required></label><label>Temporary password<input name="password" type="password" minlength="8" required></label><label>Role<select name="role"><option value="cashier">Cashier</option><option value="rider">Rider</option><option value="admin">Admin</option></select></label><button class="primary">Create staff account</button></form>`)+`<div class="section-head"><h2>Staff directory</h2><span class="muted">${staff.length} accounts</span></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead><tbody>${staff.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role}</td><td>${new Date(u.created_at).toLocaleDateString()}</td><td>${u.id===currentUser.id?'Current account':`<button class="small-btn remove-staff" data-id="${u.id}">Remove</button>`}</td></tr>`).join('')}</tbody></table></div>`;
      $('#staffForm').onsubmit=async e=>{e.preventDefault();try{const d=await post('/staff',Object.fromEntries(new FormData(e.target)));alert(d.message);renderPage('Staff')}catch(x){alert(x.message)}};
      document.querySelectorAll('.remove-staff').forEach(b=>b.onclick=async()=>{if(confirm('Remove this staff account?')){try{await api('/staff/'+b.dataset.id,{method:'DELETE'});renderPage('Staff')}catch(x){alert(x.message)}}});
    }
    else if(page==='Settings'){
      const v=await api('/settings');
      root.innerHTML=panel('Store configuration',`<form id="settingsForm" class="form-grid"><label>Store name<input name="store_name" value="${esc(v.store_name||'ICHIGO Milk Tea House')}"></label><label>Contact number<input name="phone" value="${esc(v.phone||'')}"></label><label class="wide">Store address<input name="store_address" value="${esc(v.store_address||'')}"></label><label>Operating hours<input name="opening_hours" value="${esc(v.opening_hours||'10:00 AM – 9:00 PM')}"></label><label>Delivery range (km)<input type="number" step="0.5" min="0" name="delivery_radius_km" value="${esc(v.delivery_radius_km||'5')}"></label><label>Tax rate (%)<input type="number" step="0.01" min="0" name="tax_rate" value="${esc(v.tax_rate||'0')}"></label><label class="wide">Welcome message<input name="welcome_message" value="${esc(v.welcome_message||'Freshly brewed happiness, one cup at a time.')}"></label><button class="primary">Save store settings</button></form>`);
      $('#settingsForm').onsubmit=async e=>{e.preventDefault();try{const d=await post('/settings',Object.fromEntries(new FormData(e.target)),'PUT');alert(d.message)}catch(x){alert(x.message)}};
    }
    else if(page==='Customers'){
      const cs=await api('/customers');
      root.innerHTML=`<div class="section-head"><h2>Customer directory</h2><span class="muted">${cs.length} customers</span></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Lifetime spend</th><th>Joined</th></tr></thead><tbody>${cs.map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${c.order_count}</td><td>${money(c.lifetime_total)}</td><td>${new Date(c.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table></div>`;
    }
    else if(page==='Reports'){
      const rows=await api('/reports/daily');
      root.innerHTML=panel('Last 7 days · paid sales',rows.length?`<div class="report-bars">${rows.map(r=>`<div><span>${new Date(r.day).toLocaleDateString()}</span><strong>${money(r.paid_sales)}</strong><div class="bar-track"><i style="width:${Math.max(2,Number(r.paid_sales)/(Math.max(...rows.map(x=>Number(x.paid_sales)),1))*100)}%"></i></div><small>${r.orders_count} orders</small></div>`).join('')}</div>`:'<p class="muted">No sales recorded yet.</p>');
    }
    else if(page==='Menu'||page==='POS'){
     const ps=await api('/products');
      const cats=[...new Set(ps.map(p=>p.category||'Milk Tea'))];
     const card=p=>`<article class="product-card"><div class="product-thumb-wrap"><img src="${esc(p.image_url||'')}" alt="${esc(p.name)}" onerror="this.style.display='none'"></div><div class="product-info"><h3>${esc(p.name)}</h3><p>${esc(p.description||p.category)}</p><div class="product-actions"><span class="price">${money(p.price)}</span><button class="small-btn choose-drink" data-id="${p.id}">Customize</button></div></div></article>`;
      root.innerHTML=`<div class="section-head"><h2>${page==='POS'?'Counter menu':'Fresh Milk Tea in Catarman!'}</h2><span class="muted">Order your favorite drinks now</span></div><label class="menu-search">Search drinks<input id="menuSearch" type="search" placeholder="Search milk tea, matcha, fruit..."></label>${cats.map(c=>`<section class="menu-category"><div class="section-head"><h2>${esc(c)}</h2><span class="muted">${ps.filter(p=>p.category===c).length} drinks</span></div><div class="product-rail">${ps.filter(p=>p.category===c).map(card).join('')}</div></section>`).join('')}<div id="cartArea"></div>`;
      document.querySelectorAll('.choose-drink').forEach(b=>b.onclick=()=>customize(ps.find(p=>p.id==b.dataset.id),page==='POS'?'pos':'online'));
      if(cart.length)showCart(page==='POS'?'pos':'online');
    $('#menuSearch').oninput = () => {
  const q = ($('#menuSearch').value || '').trim().toLowerCase();
  document.querySelectorAll('.product-card').forEach(card => {
    const match = !q || card.textContent.toLowerCase().includes(q);
    card.style.display = match ? '' : 'none';
  });
};
    }
    else if(page==='Reviews'){
      const rows=await api('/reviews');
      root.innerHTML=panel('Ratings and reviews',`<form id="reviewForm" class="form-grid"><label>Rating<select name="rating"><option value="5">★★★★★ · Excellent</option><option value="4">★★★★☆ · Good</option><option value="3">★★★☆☆ · Okay</option><option value="2">★★☆☆☆ · Fair</option><option value="1">★☆☆☆☆ · Poor</option></select></label><label>Order ID (optional)<input name="order_id" type="number" min="1" placeholder="Order number"></label><label class="wide">Write your review here<textarea name="review_text" rows="3" maxlength="1000" placeholder="Tell us about your order..."></textarea></label><button class="primary">Submit review</button></form>`)+panel('Customer reviews',rows.length?rows.map(r=>`<div class="review-row"><b>${esc(r.customer_name)}</b><span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span><p>${esc(r.review_text)}</p><small>${new Date(r.created_at).toLocaleDateString()}</small></div>`).join(''):'<p class="muted">No reviews yet. Be the first to share your experience.</p>');
      $('#reviewForm').onsubmit=async e=>{e.preventDefault();try{const f=Object.fromEntries(new FormData(e.target));await post('/reviews',{...f,rating:Number(f.rating),order_id:f.order_id?Number(f.order_id):null});alert('Thank you for your review!');renderPage('Reviews')}catch(x){alert(x.message)}};
    }
 else if(page==='Profile'){
  const u=currentUser||{name:'Angeline Guita',role:'customer',email:'guitaangeline@gmail.com'};
  const savedProfile=JSON.parse(localStorage.getItem('ichigo_profile')||'{}');
  const handle=savedProfile.handle||'@angeline';
  const fullName=savedProfile.fullName||u.name||'Angeline Guita';
  const address=savedProfile.address||'Brgy. Cawayan, Catarman, Northern Samar';
  const payMethod=savedProfile.payMethod||'GCash';
  const points=savedProfile.points??120;
  const lang=savedProfile.lang||'English';
  const favs=savedProfile.favs||['Okinawa Milk Tea','Strawberry Milk Tea'];
  const avatar=savedProfile.avatar||'';

  root.innerHTML=`
    <section class="panel" style="padding:20px;display:grid;gap:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding:16px;border-radius:14px;background:linear-gradient(135deg,#2a1f16,#17120e);border:1px solid #3c2d1f;">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="position:relative;width:82px;height:82px;border-radius:50%;overflow:hidden;border:2px solid #f59e0b;background:#241c15;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fbbf24;">
            ${avatar?`<img id="profAvatarImg" src="${avatar}" alt="Profile" style="width:100%;height:100%;object-fit:cover;" />`:`<span id="profAvatarInitial">${esc(fullName.charAt(0).toUpperCase())}</span>`}
          </div>
          <div>
            <p class="muted" style="margin:0;font-size:13px;">${esc(handle)}</p>
            <h2 style="margin:2px 0;">${esc(fullName)}</h2>
            <p class="muted" style="margin:0;font-size:13px;">${esc(u.email||'guitaangeline@gmail.com')}</p>
            <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
              <label for="profPhotoInput" class="btn-secondary" style="cursor:pointer;padding:6px 12px;font-size:13px;">Change Profile Photo</label>
              <input id="profPhotoInput" type="file" accept="image/*" style="display:none;" />
            </div>
          </div>
        </div>
        <span class="stock-pill">Loyalty Points: ${esc(String(points))} pts</span>
      </div>

      <div class="panel" style="padding:14px;display:grid;gap:8px;">
        <h3 style="margin:0;">My Address</h3>
        <input id="profAddress" type="text" value="${esc(address)}" style="width:100%;padding:9px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;" />
      </div>

      <div class="panel" style="padding:14px;display:grid;gap:10px;">
        <h3 style="margin:0;">Payment Info</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <div>
            <label class="muted">Loyalty Points</label>
            <input type="text" readonly value="${esc(String(points))} pts (Redeemable)" style="width:100%;padding:9px;border-radius:8px;border:1px solid #333;background:#100d0b;color:#fbbf24;margin-top:4px;" />
          </div>
          <div>
            <label class="muted">Payment Methods</label>
            <select id="profPayMethod" style="width:100%;padding:9px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;margin-top:4px;">
              <option value="GCash"${payMethod==='GCash'?' selected':''}>GCash</option>
              <option value="Maya"${payMethod==='Maya'?' selected':''}>Maya</option>
              <option value="Cash"${payMethod==='Cash'?' selected':''}>Cash on Delivery</option>
            </select>
          </div>
        </div>
      </div>

      <div class="panel" style="padding:14px;display:grid;gap:12px;">
        <h3 style="margin:0;">Settings & Preferences</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <div>
            <label class="muted">Language</label>
            <select id="profLang" style="width:100%;padding:9px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;margin-top:4px;">
              <option value="English"${lang==='English'?' selected':''}>English</option>
              <option value="Filipino"${lang==='Filipino'?' selected':''}>Filipino</option>
              <option value="Waray"${lang==='Waray'?' selected':''}>Waray</option>
            </select>
          </div>
          <div>
            <label class="muted">Contact Support</label>
            <div style="margin-top:4px;display:flex;gap:8px;align-items:center;">
              <input type="text" readonly value="support@ichigo-catarman.ph" style="width:100%;padding:9px;border-radius:8px;border:1px solid #333;background:#100d0b;color:#ccc;" />
              <button id="contactSupportBtn" type="button" class="btn-secondary">Message</button>
            </div>
          </div>
        </div>

        <div>
          <label class="muted">Favorites</label>
          <div id="profFavList" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
            ${favs.map((f,idx)=>`<span class="chip" style="display:inline-flex;align-items:center;gap:6px;">${esc(f)} <button type="button" data-del-fav="${idx}" style="background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;">×</button></span>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;max-width:420px;">
            <input id="newFavInput" type="text" placeholder="Add favorite drink..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;" />
            <button id="addFavBtn" type="button" class="btn-secondary">Add</button>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button id="saveProfileBtn" type="button" class="btn-primary">Save Profile</button>
        <button id="goSettingsBtn" type="button" class="btn-secondary">Open Full Settings</button>
      </div>
      <p id="profileMsg" class="muted" style="margin:0;color:#4ade80;"></p>
    </section>
  `;

  let currentAvatar=avatar;
  let currentFavs=[...favs];

  $('#profPhotoInput').onchange=(e)=>{
    const file=e.target.files&&e.target.files[0];
    if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{
      currentAvatar=reader.result;
      const box=$('#profAvatarInitial')?.parentElement||$('#profAvatarImg')?.parentElement;
      if(box) box.innerHTML=`<img id="profAvatarImg" src="${currentAvatar}" alt="Profile" style="width:100%;height:100%;object-fit:cover;" />`;
      $('#profileMsg').textContent='Photo selected! Click "Save Profile" to keep it.';
    };
    reader.readAsDataURL(file);
  };

  const bindFavDeletes=()=>{
    document.querySelectorAll('[data-del-fav]').forEach(btn=>{
      btn.onclick=()=>{
        const idx=Number(btn.getAttribute('data-del-fav'));
        currentFavs.splice(idx,1);
        $('#profFavList').innerHTML=currentFavs.map((f,i)=>`<span class="chip" style="display:inline-flex;align-items:center;gap:6px;">${esc(f)} <button type="button" data-del-fav="${i}" style="background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;">×</button></span>`).join('');
        bindFavDeletes();
      };
    });
  };
  bindFavDeletes();

  $('#addFavBtn').onclick=()=>{
    const val=$('#newFavInput').value.trim();
    if(!val) return;
    currentFavs.push(val);
    $('#newFavInput').value='';
    $('#profFavList').innerHTML=currentFavs.map((f,i)=>`<span class="chip" style="display:inline-flex;align-items:center;gap:6px;">${esc(f)} <button type="button" data-del-fav="${i}" style="background:none;border:none;color:#f87171;cursor:pointer;font-weight:bold;">×</button></span>`).join('');
    bindFavDeletes();
  };

  $('#contactSupportBtn').onclick=()=>{
    $('#profileMsg').textContent='Support ticket ready: Chat with ICHIGO Catarman at support@ichigo-catarman.ph or 0917-000-ICHIGO.';
  };

  $('#saveProfileBtn').onclick=()=>{
    const next={
      handle,
      fullName,
      address:$('#profAddress').value.trim()||'Brgy. Cawayan, Catarman, Northern Samar',
      payMethod:$('#profPayMethod').value,
      lang:$('#profLang').value,
      points,
      favs:currentFavs,
      avatar:currentAvatar
    };
    localStorage.setItem('ichigo_profile',JSON.stringify(next));
    $('#profileMsg').textContent='Profile & photo saved!';
  };

  $('#goSettingsBtn').onclick=()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>{
      if(b.textContent.trim()==='Settings') b.click();
    });
    renderPage('Settings');
  };
}
else if(page==='Settings'){
  const saved=JSON.parse(localStorage.getItem('ichigo_settings')||'{}');
  const signInEmail=saved.signInEmail||(currentUser&&currentUser.email)||'guitaangeline@gmail.com';
  const wallet=saved.wallet||'GCash (09XX-XXX-XXXX)';
  const theme=saved.theme||'Dark Gold & Black';
  const dateFmt=saved.dateFmt||'MM/DD/YYYY (12h)';
  const notif=saved.notif!==false;

  root.innerHTML=`
    <section class="panel" style="padding:20px;display:grid;gap:16px;">
      <div>
        <h2 style="margin:0;">Settings</h2>
        <p class="muted" style="margin:4px 0 0;">Accounts, Preference, History, and Session Controls</p>
      </div>

      <div class="panel" style="padding:14px;display:grid;gap:12px;">
        <h3 style="margin:0;">Accounts</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
          <div>
            <label class="muted">Sign In Account</label>
            <input id="setSignIn" type="email" value="${esc(signInEmail)}" style="width:100%;padding:9px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;margin-top:4px;" />
          </div>
          <div>
            <label class="muted">Bank Accounts / E-wallets</label>
            <input id="setWallet" type="text" value="${esc(wallet)}" style="width:100%;padding:9px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;margin-top:4px;" />
          </div>
        </div>
      </div>

      <div class="panel" style="padding:14px;display:grid;gap:12px;">
        <h3 style="margin:0;">Preference</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
          <div>
            <label class="muted">Theme</label>
            <select id="setTheme" style="width:100%;padding:9px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;margin-top:4px;">
              <option value="Dark Gold & Black"${theme==='Dark Gold & Black'?' selected':''}>Dark Gold & Black</option>
              <option value="Classic Warm"${theme==='Classic Warm'?' selected':''}>Classic Warm</option>
            </select>
          </div>
          <div>
            <label class="muted">Date & Time format</label>
            <select id="setDateFmt" style="width:100%;padding:9px;border-radius:8px;border:1px solid #444;background:#14110f;color:#fff;margin-top:4px;">
              <option value="MM/DD/YYYY (12h)"${dateFmt==='MM/DD/YYYY (12h)'?' selected':''}>MM/DD/YYYY (12h)</option>
              <option value="DD/MM/YYYY (24h)"${dateFmt==='DD/MM/YYYY (24h)'?' selected':''}>DD/MM/YYYY (24h)</option>
            </select>
          </div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:4px;">
          <input id="setNotif" type="checkbox"${notif?' checked':''} />
          <span>Notifications (Order updates & promo alerts)</span>
        </label>
      </div>

      <div class="panel" style="padding:14px;display:grid;gap:10px;">
        <h3 style="margin:0;">History</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
          <div class="panel" style="padding:12px;">
            <strong>Orders</strong>
            <ul style="margin:8px 0 0;padding-left:18px;display:grid;gap:6px;">
              <li><strong>ORD-2026-0001</strong> — Okinawa Milk Tea (Large, 50% Sugar) • <em>Delivered</em></li>
              <li><strong>ORD-2026-0002</strong> — Strawberry Milk Tea (Medium, Pearls) • <em>Completed</em></li>
            </ul>
          </div>
          <div class="panel" style="padding:12px;">
            <strong>Transactions</strong>
            <ul style="margin:8px 0 0;padding-left:18px;display:grid;gap:6px;">
              <li><strong>TXN-2026-0042</strong> — GCash • ₱109.00 • <em>Paid</em></li>
              <li><strong>TXN-2026-0043</strong> — Maya • ₱99.00 • <em>Paid</em></li>
            </ul>
          </div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <button id="saveSettingsBtn" type="button" class="btn-primary">Save Settings</button>
        <button id="settingsLogoutBtn" type="button" class="btn-secondary">Log Out</button>
      </div>
      <p id="settingsMsg" class="muted" style="margin:0;color:#4ade80;"></p>
    </section>
  `;

  $('#saveSettingsBtn').onclick=()=>{
    const next={
      signInEmail:$('#setSignIn').value.trim()||'guitaangeline@gmail.com',
      wallet:$('#setWallet').value.trim()||'GCash (09XX-XXX-XXXX)',
      theme:$('#setTheme').value,
      dateFmt:$('#setDateFmt').value,
      notif:$('#setNotif').checked
    };
    localStorage.setItem('ichigo_settings',JSON.stringify(next));
    $('#settingsMsg').textContent='Settings saved!';
  };

  $('#settingsLogoutBtn').onclick=()=>{
    const logoutBtn=$('#logoutBtn')||document.querySelector('[id*="logout" i],button[onclick*="logout" i]');
    if(logoutBtn) logoutBtn.click();
    else location.reload();
  };
}
    else if(page==='Active Queue'||page==='Order History'||page==='Orders'||page==='My Orders'||page==='Payments'||page==='My Deliveries'){
      const rows=await api('/orders');let filtered=rows;
      if(page==='Active Queue')filtered=rows.filter(o=>!['delivered','cancelled'].includes(o.order_status));
      if(page==='Order History')filtered=rows.filter(o=>['delivered','cancelled'].includes(o.order_status));
      root.innerHTML=ordersTable(filtered,page);
    }
    else if(page==='Dispatch'){
      const [orders,riders]=await Promise.all([api('/orders'),api('/staff')]);
      const pending=orders.filter(o=>o.fulfillment==='delivery'&&o.order_status!=='delivered');
      root.innerHTML=`<div class="section-head"><h2>Delivery dispatch</h2><span class="muted">Assign delivery orders to riders</span></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>Order</th><th>Customer / Address</th><th>Status</th><th>Assigned rider</th><th>Assign</th></tr></thead><tbody>${pending.map(o=>`<tr><td>${o.order_code}<br>${money(o.total)}</td><td>${esc(o.customer_name)}<br><small>${esc(o.delivery_address||'No address provided')}</small></td><td>${o.order_status}</td><td>${o.rider_id||'Unassigned'}</td><td><select class="assign-rider" data-id="${o.id}"><option value="">Choose rider</option>${riders.filter(r=>r.role==='rider').map(r=>`<option value="${r.id}" ${o.rider_id===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`;
      document.querySelectorAll('.assign-rider').forEach(s=>s.onchange=async()=>{if(s.value){try{await post('/orders/'+s.dataset.id+'/assign',{rider_id:s.value},'PATCH');alert('Rider assigned.');renderPage('Dispatch')}catch(e){alert(e.message)}}});
    }
    else if(page==='Delivery Board'){
      const [mine,available]=await Promise.all([api('/orders'),api('/rider/available')]);
      const active=mine.find(o=>o.fulfillment==='delivery'&&o.order_status==='out_for_delivery');
      const delivered=mine.filter(o=>o.order_status==='delivered');
      const cod=delivered.filter(o=>o.payment_method==='cash').reduce((a,o)=>a+Number(o.total),0);
      const orderCard=o=>{let items=[];try{items=typeof o.items_json==='string'?JSON.parse(o.items_json):o.items_json||[]}catch{}return `<div class="rider-order-card">
        <div class="rider-route-banner">En Route: ICHIGO Shop <span>➜</span> ${esc(o.delivery_address||'Catarman delivery destination')}</div>
        <div class="rider-order-details"><h2>🛵 Active Delivery Assignment</h2>
          <p><b>Order ID:</b> ${esc(o.order_code)} <span class="rider-paid">${esc(String(o.payment_method||'').toUpperCase())} · ${esc(o.payment_status)}</span></p>
          <p><b>Customer:</b> ${esc(o.customer_name)} ${o.customer_phone?'('+esc(o.customer_phone)+')':''}</p>
          <p><b>Address:</b> ${esc(o.delivery_address||'Catarman, Northern Samar')}</p>
          <p><b>Items:</b> ${items.map(i=>`${esc(i.name)} ×${i.quantity}`).join(', ')||'Order items'}</p>
          <div class="rider-map-preview"><span class="map-start"></span><span class="map-line"></span><span class="map-end"></span><small>Catarman live route preview</small></div>
          <div class="rider-actions">
            ${o.customer_phone?`<a class="rider-action call" href="tel:${esc(o.customer_phone.replace(/[^0-9+]/g,''))}">☎ Call Customer</a>`:`<button class="rider-action call" disabled>☎ No phone number</button>`}
            <button class="rider-action notify" id="notifyArriving" data-id="${o.id}">▣ Notify: “Arriving soon”</button>
            <button class="rider-action delivered" id="markDelivered" data-id="${o.id}">✓ Mark as Delivered / Completed</button>
            <a class="rider-action directions" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((o.delivery_address||'')+' Catarman Northern Samar')}">↗ Open directions</a>
          </div>
        </div></div>`};
      if(active){
        root.innerHTML=orderCard(active)+`<div class="rider-shift"><h2>📊 Shift Dispatch Summary</h2><p>Remaining tasks: ${mine.filter(o=>!['delivered','cancelled'].includes(o.order_status)).length}</p><p>Cash on Hand (COD): ${money(cod)}</p><p>Completed deliveries: ${delivered.length}</p></div>`;
        $('#notifyArriving').onclick=async()=>{try{const d=await post('/rider/notify/'+active.id,{});alert(d.message)}catch(e){alert(e.message)}};
        $('#markDelivered').onclick=async()=>{if(!confirm('Confirm that this order has been delivered to the customer?'))return;try{await post('/orders/'+active.id+'/status',{status:'delivered'},'PATCH');renderPage('Delivery Board')}catch(e){alert(e.message)}};
      }else{
        const last=delivered[0];
        root.innerHTML=(last?`<div class="rider-success"><h2>ICHIGO · DELIVER SUCCESSFUL</h2><h3>✓ Delivery completed: ${esc(last.order_code)}</h3><p>Customer: ${esc(last.customer_name)}</p><p>Address: ${esc(last.delivery_address||'—')}</p><p>Payment: ${esc(last.payment_method)} · ${money(last.total)}</p></div>`:'')+
          `<div class="rider-shift"><h2>📊 Shift Dispatch Summary</h2><p>Remaining tasks: ${mine.filter(o=>!['delivered','cancelled'].includes(o.order_status)).length}</p><p>Cash on Hand (COD): ${money(cod)}</p><p>Completed deliveries: ${delivered.length}</p></div>`+
          panel('Available delivery assignments',available.length?available.map(o=>`<div class="delivery-card"><div><b>${esc(o.order_code)}</b><p>${esc(o.customer_name)} · ${esc(o.delivery_address||'Catarman address to confirm')}</p><small>${esc(o.payment_method)} · ${esc(o.payment_status)} · ${money(o.total)}</small></div><button class="primary claim-order" data-id="${o.id}">🛵 Accept & Start Delivery Route</button></div>`).join(''):'<p class="muted">No delivery assignments are waiting right now.</p>')+
          `<p class="muted">Accept an assigned delivery to open its route and customer details.</p>`;
        document.querySelectorAll('.claim-order').forEach(b=>b.onclick=async()=>{try{await post('/rider/claim/'+b.dataset.id,{});renderPage('Delivery Board')}catch(e){alert(e.message)}});
      }
    }
    else if(page==='Earnings'){
      const rows=await api('/orders');const done=rows.filter(o=>o.order_status==='delivered');
      root.innerHTML=`<div class="stat-grid"><div class="stat"><span>Completed deliveries</span><strong>${done.length}</strong></div><div class="stat"><span>COD collected (recorded)</span><strong>${money(done.filter(o=>o.payment_method==='cash').reduce((a,o)=>a+Number(o.total),0))}</strong></div><div class="stat"><span>Delivery pay</span><strong>Not configured</strong></div><div class="stat"><span>Payout requests</span><strong>—</strong></div></div>${panel('Earnings information','<p class="muted">Rider compensation, tips and payout processing need store-defined pay rates and payout configuration. This view currently summarizes completed orders only.</p>')}`;
    }
    else root.innerHTML='<div class="empty">Section not available yet.</div>';
    bindOrderActions(page);
  }catch(e){
    root.innerHTML=`<div class="empty">${esc(e.message)}<br><br>Check that your Supabase connection and database tables are configured.</div>`;
  }
}

const SIZES=[{label:'Small',extra:0},{label:'Medium',extra:10},{label:'Large',extra:20}];
const TOPPINGS=[
  {name:'Boba Pearls',price:15},
  {name:'Jelly Grass',price:15},
  {name:'Nata de Coco',price:15},
  {name:'Cheese Foam',price:20},
  {name:'Red Beans',price:15},
  {name:'Sprinkles',price:10},
  {name:'Pudding',price:15},
  {name:'Matcha Powder',price:20}
];
const SUGARS=['10%','30%','60%','85%','100%'];
const ICES=['No Ice','Less Ice','Regular'];

function customize(p,source){
  if(!p)return;
  const area=$('#cartArea')||$('#dashboard');
  let state={size:'Small',sizeExtra:0,toppings:[],sugar:'100%',ice:'No Ice',qty:1};
  const unitPrice=()=>Number(p.price)+state.sizeExtra+state.toppings.reduce((s,t)=>s+t.price,0);
  const draw=()=>{
    const total=unitPrice()*state.qty;
    area.innerHTML=`<section class="panel custom-modal-box">
      <div class="section-head">
        <div>
          <h2>Customize your order · ${esc(p.name)}</h2>
          <p class="muted">${esc(p.description||p.category)} · Base ${money(p.price)}</p>
        </div>
        <button type="button" class="small-btn" id="closeCustomize">✕</button>
      </div>
      <div class="custom-group">
        <b>SIZES</b>
        <div class="pill-row">
          ${SIZES.map(s=>`<button type="button" class="small-btn opt-size ${state.size===s.label?'active':''}" data-size="${s.label}" data-extra="${s.extra}">${s.label}${s.extra?` (+${money(s.extra)})`:''}</button>`).join('')}
        </div>
      </div>
      <div class="custom-group">
        <b>TOPPINGS</b>
        <div class="pill-row">
          ${TOPPINGS.map(t=>{const on=state.toppings.some(x=>x.name===t.name);return `<button type="button" class="small-btn opt-topping ${on?'active':''}" data-topping="${esc(t.name)}" data-price="${t.price}">${esc(t.name)} (+${money(t.price)})</button>`}).join('')}
        </div>
      </div>
      <div class="custom-group">
        <b>SUGAR LEVEL</b>
        <div class="pill-row">
          ${SUGARS.map(sg=>`<button type="button" class="small-btn opt-sugar ${state.sugar===sg?'active':''}" data-sugar="${sg}">${sg}</button>`).join('')}
        </div>
      </div>
      <div class="custom-group">
        <b>ICE LEVEL</b>
        <div class="pill-row">
          ${ICES.map(ic=>`<button type="button" class="small-btn opt-ice ${state.ice===ic?'active':''}" data-ice="${ic}">${ic}</button>`).join('')}
        </div>
      </div>
      <div class="custom-footer">
        <label>Quantity <input id="customQty" type="number" min="1" max="50" value="${state.qty}" style="width:72px"></label>
        <div class="custom-footer-cta"><strong>Total: ${money(total)}</strong> <button type="button" class="primary" id="addCustomized">Add to cart</button></div>
      </div>
    </section>`;
    $('#closeCustomize').onclick=()=>cart.length?showCart(source):area.innerHTML='';
    area.querySelectorAll('.opt-size').forEach(b=>b.onclick=()=>{state.size=b.dataset.size;state.sizeExtra=Number(b.dataset.extra);draw()});
    area.querySelectorAll('.opt-topping').forEach(b=>b.onclick=()=>{
      const name=b.dataset.topping,price=Number(b.dataset.price);
      const idx=state.toppings.findIndex(x=>x.name===name);
      if(idx>=0)state.toppings.splice(idx,1);else state.toppings.push({name,price});
      draw();
    });
    area.querySelectorAll('.opt-sugar').forEach(b=>b.onclick=()=>{state.sugar=b.dataset.sugar;draw()});
    area.querySelectorAll('.opt-ice').forEach(b=>b.onclick=()=>{state.ice=b.dataset.ice;draw()});
    $('#customQty').oninput=e=>{state.qty=Math.max(1,Math.min(50,Number(e.target.value)||1));draw()};
    $('#addCustomized').onclick=()=>{
      cart.push({
        id:p.id,
        name:p.name,
        basePrice:Number(p.price),
        unitPrice:unitPrice(),
        size:state.size,
        size_extra:state.sizeExtra,
        toppings:state.toppings.map(t=>t.name),
        topping_extra:state.toppings.reduce((s,t)=>s+t.price,0),
        sugar:state.sugar,
        ice:state.ice,
        quantity:state.qty,
        source
      });
      showCart(source);
    };
  };
  draw();
  area.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function showCart(source){
  const area=$('#cartArea')||$('#dashboard');
  const subtotal=cart.reduce((a,p)=>a+(Number(p.unitPrice??p.price))*p.quantity,0);
  area.innerHTML=panel('Your Cart',`${cart.length?cart.map((p,i)=>{
    const topLabel=Array.isArray(p.toppings)&&p.toppings.length?p.toppings.join(', '):(p.topping&&p.topping!=='None'?p.topping:'No topping');
    const uPrice=Number(p.unitPrice??p.price);
    return `<div class="delivery-card">
      <div>
        <b>${esc(p.name)}</b>
        <p>${esc(p.size)} · ${esc(p.sugar)} sugar · ${esc(p.ice)} · ${esc(topLabel)}</p>
        <small>${money(uPrice)} each</small>
      </div>
      <div class="cart-controls">
        <button type="button" class="small-btn dec-cart" data-i="${i}">-</button>
        <strong>${p.quantity}</strong>
        <button type="button" class="small-btn inc-cart" data-i="${i}">+</button>
        <strong>${money(uPrice*p.quantity)}</strong>
        <button type="button" class="small-btn remove-cart" data-i="${i}">✕</button>
      </div>
    </div>`;
  }).join(''):'<p class="muted">Your cart is empty.</p>'}
  <div class="cart-summary-bar">
    <button type="button" class="small-btn" id="addMoreBtn">Add more</button>
    <strong>Order Total: ${money(subtotal)}</strong>
  </div>
  ${cart.length?`<hr><form id="checkout" class="form-grid">
    <label>Customer name<input name="customer_name" value="${source==='pos'?'Walk-in Customer':esc(currentUser.name)}" required></label>
    <label>Phone<input name="customer_phone" placeholder="09XX-XXX-XXXX"></label>
    <label>Fulfillment<select name="fulfillment"><option value="pickup">Pick-up</option><option value="delivery">Delivery</option></select></label>
    <label>Payment method<select name="payment_method"><option value="cash">Cash</option><option value="gcash">G-Cash</option><option value="maya">Maya</option><option value="online_banking">Other bank card</option></select></label>
    <label class="wide">Complete address<input name="delivery_address" placeholder="Catarman, Northern Samar (required for delivery)"></label>
    <button type="submit" class="primary">${source==='pos'?'Complete POS Transaction':'Proceed to Checkout · Place Order'} (${money(subtotal)})</button>
  </form>`:''}`);
  $('#addMoreBtn').onclick=()=>area.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.dec-cart').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(cart[i].quantity>1)cart[i].quantity--;else cart.splice(i,1);showCart(source)});
  document.querySelectorAll('.inc-cart').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;cart[i].quantity=Math.min(50,cart[i].quantity+1);showCart(source)});
  document.querySelectorAll('.remove-cart').forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.i,1);showCart(source)});
  const form=$('#checkout');
  if(form)form.onsubmit=async e=>{
    e.preventDefault();
    const f=Object.fromEntries(new FormData(e.target));
    if(f.fulfillment==='delivery'&&!f.delivery_address.trim())return alert('Please enter your complete delivery address.');
    const itemsSnapshot=cart.map(p=>({
      name:p.name,
      quantity:p.quantity,
      size:p.size,
      sugar:p.sugar,
      ice:p.ice,
      toppings:Array.isArray(p.toppings)?p.toppings:(p.topping&&p.topping!=='None'?[p.topping]:[]),
      unit_price:Number(p.unitPrice??p.price)
    }));
    try{
      const d=await post('/orders',{
        ...f,
        items:cart.map(p=>({
          product_id:p.id,
          quantity:p.quantity,
          size:p.size,
          size_extra:Number(p.size_extra||0),
          sugar:p.sugar,
          ice:p.ice,
          toppings:Array.isArray(p.toppings)?p.toppings:(p.topping&&p.topping!=='None'?[p.topping]:[]),
          topping_extra:Number(p.topping_extra||0)
        }))
      });
      lastOrder={
        orderCode:d.orderCode,
        total:d.total,
        paymentStatus:d.paymentStatus,
        paymentMethod:f.payment_method,
        fulfillment:f.fulfillment,
        customerName:f.customer_name,
        address:f.delivery_address,
        items:itemsSnapshot,
        createdAt:new Date().toLocaleString()
      };
      cart=[];
      renderReceipt(area,source);
    }catch(x){alert(x.message)}
  };
}

function renderReceipt(area,source){
  if(!lastOrder)return renderPage(source==='pos'?'POS':'Menu');
  area.innerHTML=panel('Order Confirmed! · Official Receipt',`
    <p class="muted">Your order has been received · ${esc(lastOrder.createdAt)}</p>
    <h3>Order ${esc(lastOrder.orderCode)}</h3>
    <p><b>Customer:</b> ${esc(lastOrder.customerName)} · <b>Payment:</b> ${esc(String(lastOrder.paymentMethod||'').toUpperCase())} (${esc(lastOrder.paymentStatus)}) · <b>Fulfillment:</b> ${esc(lastOrder.fulfillment)}</p>
    ${lastOrder.address?`<p><b>Address:</b> ${esc(lastOrder.address)}</p>`:''}
    <hr>
    ${lastOrder.items.map(i=>`<div class="delivery-card"><div><b>${esc(i.name)} ×${i.quantity}</b><p>${esc(i.size)} · ${esc(i.sugar)} sugar · ${esc(i.ice)}${i.toppings&&i.toppings.length?' · '+esc(i.toppings.join(', ')):''}</p></div><strong>${money(i.unit_price*i.quantity)}</strong></div>`).join('')}
    <p class="receipt-total"><strong>Total: ${money(lastOrder.total)}</strong></p>
    <p class="muted">Thank you for ordering from ICHIGO Ordering System (Catarman, Northern Samar).</p>
    <div class="receipt-actions">
      <button type="button" class="primary" id="orderAgainBtn">Order Again</button>
      <button type="button" class="small-btn" id="trackOrderBtn">Track My Order</button>
    </div>
  `);
  $('#orderAgainBtn').onclick=()=>renderPage(source==='pos'?'POS':'Menu');
  $('#trackOrderBtn').onclick=()=>{
    if(currentUser.role==='customer'){
      document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.page==='My Orders'));
      renderPage('My Orders');
    }else{
      renderPage(source==='pos'?'Active Queue':'Orders');
    }
  };
}

function ordersTable(rows,page){return `<div class="section-head"><h2>${page}</h2><span class="muted">${rows.length} orders</span></div>${rows.length?`<div class="panel table-wrap"><table class="data-table"><thead><tr><th>Order / Time</th><th>Customer</th><th>Items</th><th>Fulfillment</th><th>Total / Payment</th><th>Status / Action</th></tr></thead><tbody>${rows.map(o=>{let items=[];try{items=typeof o.items_json==='string'?JSON.parse(o.items_json):o.items_json||[]}catch{}return `<tr><td>${o.order_code}<br><small>${new Date(o.created_at).toLocaleString()}</small></td><td>${esc(o.customer_name)}<br><small>${esc(o.customer_phone||'')}</small></td><td>${items.map(i=>`${esc(i.name)} ×${i.quantity} (${esc(i.size||'Small')}, ${esc(i.sugar||'100%')}, ${esc(i.ice||'No Ice')}${Array.isArray(i.toppings)&&i.toppings.length?', '+esc(i.toppings.join(', ')):''})`).join('<br>')}</td><td>${o.fulfillment}<br><small>${esc(o.delivery_address||'')}</small></td><td>${money(o.total)}<br><small>${o.payment_method} · ${o.payment_status}</small></td><td>${currentUser.role==='customer'?`<span class="stock-pill ${['delivered'].includes(o.order_status)?'good':o.order_status==='cancelled'?'low':''}">${o.order_status.replaceAll('_',' ')}</span><div class="order-steps"><span class="${['placed','confirmed','preparing','ready','out_for_delivery','delivered'].includes(o.order_status)?'done':''}">Order Placed</span><span class="${['preparing','ready','out_for_delivery','delivered'].includes(o.order_status)?'done':''}">Preparing</span><span class="${['out_for_delivery','delivered'].includes(o.order_status)?'done':''}">Out of Delivery</span><span class="${o.order_status==='delivered'?'done':''}">Delivered</span></div>`:o.order_status}<br>${currentUser.role==='rider'?`<select class="rider-status" data-id="${o.id}"><option value="out_for_delivery">Picked up / On the way</option><option value="delivered">Delivered</option></select>`:['admin','cashier'].includes(currentUser.role)?`<select class="status-select" data-id="${o.id}"><option value="${o.order_status}">${o.order_status}</option>${['confirmed','preparing','ready','out_for_delivery','delivered','cancelled'].filter(x=>x!==o.order_status).map(x=>`<option value="${x}">${x}</option>`).join('')}</select>`:''}${currentUser.role==='admin'&&o.payment_status!=='paid'?`<button class="small-btn verify" data-id="${o.id}">Verify paid</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">No orders found yet.</div>'}`}

function bindOrderActions(page){
  document.querySelectorAll('.status-select,.rider-status').forEach(s=>s.onchange=async()=>{try{await post('/orders/'+s.dataset.id+'/status',{status:s.value},'PATCH');renderPage(page)}catch(e){alert(e.message)}});
  document.querySelectorAll('.verify').forEach(b=>b.onclick=async()=>{if(confirm('Confirm you have independently verified the payment?')){await post('/orders/'+b.dataset.id+'/payment',{payment_status:'paid'},'PATCH');renderPage(page)}});
}

if(token&&currentUser)showApp();
else showLoginScreen();

document.addEventListener('click', e => {
  const regBtn = e.target.closest('.reg-role-pick');
  if (regBtn) {
    const input = $('#registerRoleInput');
    const submitBtn = $('#registerForm button[type="submit"]');
    const role = (regBtn.dataset.role || 'customer').toLowerCase();
    if (input) input.value = role;
    document.querySelectorAll('.reg-role-pick').forEach(x => x.classList.toggle('active', x === regBtn));
    if (submitBtn) {
      submitBtn.textContent = 'Register ' + role.charAt(0).toUpperCase() + role.slice(1) + ' account';
    }
    return;
  }

  const loginBtn = e.target.closest('.role-pick');
  if (loginBtn) {
    const input = $('#loginRoleInput');
    const submitBtn = $('#loginForm button[type="submit"]');
    const nextRole = input && input.value === loginBtn.dataset.role ? '' : (loginBtn.dataset.role || '');
    if (input) input.value = nextRole;
    document.querySelectorAll('.role-pick').forEach(x => x.classList.toggle('active', x.dataset.role === nextRole));
    if (submitBtn) {
      submitBtn.textContent = nextRole
        ? 'Sign in to ' + nextRole.charAt(0).toUpperCase() + nextRole.slice(1)
        : 'Sign in to ICHIGO';
    }
  }
});