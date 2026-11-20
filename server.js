require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const secret = process.env.JWT_SECRET || 'development_only_change_me';

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ message: 'Please log in first.' });
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ message: 'Your session expired. Please log in again.' });
  }
}

function allow(...roles) {
  return (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'You do not have permission to access this feature.' });
}

async function publishEvent(topic, userId, orderId, payload) {
  try {
    await supabase.from('system_events').insert({
      topic,
      user_id: userId || null,
      order_id: orderId || null,
      payload: payload || {}
    });
  } catch (err) {
    console.error('Event publish failed:', err.message);
  }
}

app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) throw error;
    res.json({ status: 'ok', database: 'connected' });
  } catch (e) {
    res.status(500).json({ status: 'error', database: 'not connected', detail: e.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (role !== 'customer') return res.status(403).json({ message: 'Admin, cashier and rider accounts must be created by an administrator.' });
    
    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email: email.toLowerCase(), password_hash: hash, role: 'customer' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'That email is already registered.' });
      throw error;
    }
    res.status(201).json({ message: 'Account created. You can now log in.', userId: data.id });
  } catch (e) {
    res.status(400).json({ message: 'Could not create account.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', String(email || '').toLowerCase())
      .limit(1);

    const user = users && users[0];
    if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
      return res.status(401).json({ message: 'Incorrect email or password.' });
    }
    if (role && role !== user.role) {
      return res.status(403).json({ message: `This account is registered as ${user.role}.` });
    }
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, secret, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ message: 'Login failed.' });
  }
});

app.get('/api/me', auth, (req, res) => res.json({ user: req.user }));

app.get('/api/products', async (req, res) => {
  try {
    let admin = false;
    const t = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (t) {
      try { admin = jwt.verify(t, secret).role === 'admin'; } catch {}
    }
    let query = supabase.from('products').select('*');
    if (!admin) query = query.eq('available', true);
    const { data, error } = await query.order('category', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Could not load products.' });
  }
});

app.post('/api/products', auth, allow('admin'), async (req, res) => {
  const { name, category, description, price, image_url } = req.body;
  if (!name || !price || Number(price) <= 0) return res.status(400).json({ message: 'Product name and valid price are required.' });
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({ name, category: category || 'Milk Tea', description: description || '', price, image_url: image_url || '' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ id: data.id, message: 'Product added.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not add product.' });
  }
});

app.post('/api/orders', auth, allow('customer', 'cashier'), async (req, res) => {
  try {
    const { fulfillment = 'pickup', customer_name, customer_phone, delivery_address, items, payment_method = 'cash', proof_image } = req.body;
    if (!customer_name || !Array.isArray(items) || !items.length) return res.status(400).json({ message: 'Customer name and at least one item are required.' });
    
    const productIds = items.map(i => Number(i.product_id));
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, price')
      .eq('available', true)
      .in('id', productIds);

    if (prodErr) throw prodErr;
    const map = new Map(products.map(p => [p.id, p]));
    let subtotal = 0, safeItems = [];
    
    for (const item of items) {
      const p = map.get(Number(item.product_id));
      const qty = Math.max(1, Math.min(50, Number(item.quantity) || 1));
      if (!p) return res.status(400).json({ message: 'One of the selected products is unavailable.' });
      const sizeExtra = Number(item.size_extra) || 0, toppingExtra = Number(item.topping_extra) || 0;
      const unit = Number(p.price) + sizeExtra + toppingExtra;
      subtotal += unit * qty;
      safeItems.push({ product_id: p.id, name: p.name, quantity: qty, size: item.size || 'Regular', sugar: item.sugar || '100%', ice: item.ice || 'Regular', toppings: item.toppings || [], unit_price: unit });
    }
    
    const total = subtotal;
    const method = String(payment_method).toLowerCase();
    const online = ['gcash', 'maya', 'qrph', 'online_banking'].includes(method);
    const paymentStatus = online ? (proof_image ? 'for_verification' : 'pending') : 'pending';
    const code = 'ICH-' + Date.now().toString().slice(-9);

    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        order_code: code,
        user_id: req.user.id,
        source: req.user.role === 'cashier' ? 'pos' : 'online',
        fulfillment: fulfillment === 'delivery' ? 'delivery' : 'pickup',
        customer_name,
        customer_phone: customer_phone || '',
        delivery_address: delivery_address || '',
        items_json: safeItems,
        subtotal,
        total,
        payment_method: method,
        payment_status: paymentStatus,
        proof_image: proof_image || null
      })
      .select()
      .single();

    if (orderErr) throw orderErr;
    await publishEvent('order.created', req.user.id, orderData.id, { orderCode: code, total, paymentStatus, fulfillment });
    res.status(201).json({ message: 'Order received.', orderId: orderData.id, orderCode: code, total, paymentStatus });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Could not place order.' });
  }
});

app.get('/api/orders', auth, async (req, res) => {
  try {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (req.user.role === 'customer') {
      query = query.eq('user_id', req.user.id);
    } else if (req.user.role === 'rider') {
      query = query.eq('rider_id', req.user.id).eq('fulfillment', 'delivery');
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Could not load orders.' });
  }
});

app.get('/api/staff', auth, allow('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .in('role', ['admin', 'cashier', 'rider'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Could not load staff.' });
  }
});

app.post('/api/staff', auth, allow('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !['admin', 'cashier', 'rider'].includes(role)) {
      return res.status(400).json({ message: 'Name, email, password and a valid staff role are required.' });
    }
    if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    
    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email: String(email).trim().toLowerCase(), password_hash: hash, role })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ message: 'That email is already registered.' });
      throw error;
    }
    res.status(201).json({ message: 'Staff account created.', id: data.id });
  } catch (e) {
    res.status(400).json({ message: 'Could not create staff account.' });
  }
});

app.patch('/api/staff/:id/role', auth, allow('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'cashier', 'rider'].includes(role)) return res.status(400).json({ message: 'Invalid staff role.' });
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot change your own role.' });
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', req.params.id)
      .in('role', ['admin', 'cashier', 'rider'])
      .select();
    if (error || !data.length) return res.status(404).json({ message: 'Staff member not found.' });
    res.json({ message: 'Staff role updated.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not update staff role.' });
  }
});

app.delete('/api/staff/:id', auth, allow('admin'), async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'You cannot delete your own account.' });
  try {
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id)
      .in('role', ['admin', 'cashier', 'rider'])
      .select();
    if (error || !data.length) return res.status(404).json({ message: 'Staff member not found.' });
    res.json({ message: 'Staff account deleted.' });
  } catch (e) {
    res.status(400).json({ message: 'Could not delete staff account. Existing order records may depend on this account.' });
  }
});

app.get('/api/settings', auth, allow('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('store_settings').select('setting_key, setting_value');
    if (error) throw error;
    res.json(Object.fromEntries(data.map(x => [x.setting_key, x.setting_value])));
  } catch (e) {
    res.status(500).json({ message: 'Could not load store settings.' });
  }
});

app.put('/api/settings', auth, allow('admin'), async (req, res) => {
  try {
    const allowed = ['store_name', 'store_address', 'phone', 'opening_hours', 'delivery_radius_km', 'tax_rate', 'welcome_message'];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        await supabase.from('store_settings').upsert({ setting_key: k, setting_value: String(req.body[k]) });
      }
    }
    res.json({ message: 'Store settings saved.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not save settings.' });
  }
});

app.get('/api/customers', auth, allow('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, created_at, orders(id, total)')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const formatted = data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      created_at: u.created_at,
      order_count: u.orders ? u.orders.length : 0,
      lifetime_total: u.orders ? u.orders.reduce((sum, o) => sum + Number(o.total || 0), 0) : 0
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ message: 'Could not load customers.' });
  }
});

app.patch('/api/products/:id', auth, allow('admin'), async (req, res) => {
  const { name, category, description, price, image_url, available } = req.body;
  try {
    const { error } = await supabase
      .from('products')
      .update({ name, category: category || 'Milk Tea', description: description || '', price: Number(price), image_url: image_url || '', available: !!available })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Product updated.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not update product.' });
  }
});

app.delete('/api/products/:id', auth, allow('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Product deleted.' });
  } catch (e) {
    res.status(400).json({ message: 'This product is used in an order or cannot be deleted.' });
  }
});

app.patch('/api/orders/:id/assign', auth, allow('admin', 'cashier'), async (req, res) => {
  const riderId = Number(req.body.rider_id);
  try {
    const { data: rider } = await supabase.from('users').select('id').eq('id', riderId).eq('role', 'rider').single();
    if (!rider) return res.status(400).json({ message: 'Choose a valid rider account.' });
    
    const { data, error } = await supabase
      .from('orders')
      .update({ rider_id: riderId, fulfillment: 'delivery', order_status: 'out_for_delivery' })
      .eq('id', req.params.id)
      .select();
    if (error || !data.length) return res.status(404).json({ message: 'Order not found.' });
    res.json({ message: 'Delivery assigned to rider.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not assign rider.' });
  }
});

app.patch('/api/rider/availability', auth, allow('rider'), async (req, res) => {
  res.json({ message: req.body.online ? 'You are now online.' : 'You are now offline.', online: !!req.body.online });
});

app.get('/api/rider/available', auth, allow('rider'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('fulfillment', 'delivery')
      .is('rider_id', null)
      .in('order_status', ['placed', 'confirmed', 'ready'])
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Could not load available deliveries.' });
  }
});

app.post('/api/rider/claim/:id', auth, allow('rider'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ rider_id: req.user.id, order_status: 'out_for_delivery' })
      .eq('id', req.params.id)
      .is('rider_id', null)
      .eq('fulfillment', 'delivery')
      .select();
    if (error || !data.length) return res.status(409).json({ message: 'This delivery was already claimed or is unavailable.' });
    res.json({ message: 'Delivery accepted.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not accept delivery.' });
  }
});

app.post('/api/rider/notify/:id', auth, allow('rider'), async (req, res) => {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, order_code, customer_name')
      .eq('id', req.params.id)
      .eq('rider_id', req.user.id)
      .eq('order_status', 'out_for_delivery')
      .single();

    if (!order) return res.status(404).json({ message: 'This active delivery was not found.' });
    
    await publishEvent('rider.arriving', order.user_id, order.id, {
      order_code: order.order_code,
      message: 'Your ICHIGO rider is arriving soon.',
      rider_name: req.user.name
    });
    res.json({ message: 'Arrival notification recorded for the customer.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not send the arrival notification.' });
  }
});

app.patch('/api/orders/:id/status', auth, allow('admin', 'cashier', 'rider'), async (req, res) => {
  const allowed = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
  const status = req.body.status;
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid order status.' });

  if (req.user.role === 'rider') {
    if (!['out_for_delivery', 'delivered'].includes(status)) return res.status(403).json({ message: 'Riders can only update delivery milestones.' });
    const { data: owned } = await supabase.from('orders').select('id').eq('id', req.params.id).eq('rider_id', req.user.id);
    if (!owned || !owned.length) return res.status(403).json({ message: 'This delivery is not assigned to your account.' });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ order_status: status })
      .eq('id', req.params.id)
      .select('user_id, order_code')
      .single();

    if (error || !data) return res.status(404).json({ message: 'Order not found.' });
    await publishEvent('order.status.updated', data.user_id, Number(req.params.id), { orderCode: data.order_code, status });
    res.json({ message: 'Order status updated.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not update order.' });
  }
});

app.patch('/api/orders/:id/payment', auth, allow('admin', 'cashier'), async (req, res) => {
  const status = req.body.payment_status;
  if (!['paid', 'failed', 'for_verification', 'pending'].includes(status)) return res.status(400).json({ message: 'Invalid payment status.' });
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: status })
      .eq('id', req.params.id)
      .select('user_id, order_code')
      .single();

    if (error || !data) return res.status(404).json({ message: 'Order not found.' });
    await publishEvent('payment.status.updated', data.user_id, Number(req.params.id), { orderCode: data.order_code, payment_status: status });
    res.json({ message: 'Payment status updated.' });
  } catch (e) {
    res.status(500).json({ message: 'Could not update payment.' });
  }
});

app.get('/api/events', auth, async (req, res) => {
  try {
    const since = Number(req.query.since) || 0;
    let query = supabase.from('system_events').select('id, topic, user_id, order_id, payload, created_at').gt('id', since).order('id', { ascending: true }).limit(100);
    
    if (req.user.role === 'customer') {
      // Supabase supports or syntax for filtering user_id = me or user_id is null
      query = query.or(`user_id.eq.${req.user.id},user_id.is.null`);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Could not retrieve integration events.' });
  }
});

app.get('/api/inventory', auth, allow('admin'), async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*, suppliers(supplier_name, lead_time_days)')
      .order('item_name', { ascending: true });
    if (error) throw error;
    
    const formatted = items.map(i => ({
      ...i,
      supplier_name: i.suppliers ? i.suppliers.supplier_name : null,
      lead_time_days: i.suppliers ? i.suppliers.lead_time_days : null
    }));

    const totalValue = formatted.reduce((sum, x) => sum + Number(x.quantity) * Number(x.unit_cost), 0);
    const lowStock = formatted.filter(x => Number(x.quantity) <= Number(x.reorder_level)).length;
    res.json({ items: formatted, totalValue, lowStock });
  } catch (e) {
    res.status(500).json({ message: 'Could not load inventory.' });
  }
});

app.post('/api/inventory', auth, allow('admin'), async (req, res) => {
  const { item_name, category, unit, quantity, reorder_level, unit_cost, supplier_id } = req.body;
  if (!item_name || Number(quantity) < 0 || Number(reorder_level) < 0 || Number(unit_cost) < 0) {
    return res.status(400).json({ message: 'Enter a valid item, quantity, reorder level and cost.' });
  }
  try {
    const { data: item, error } = await supabase
      .from('inventory_items')
      .insert({
        item_name,
        category: category || 'Ingredients',
        unit: unit || 'pcs',
        quantity: Number(quantity),
        reorder_level: Number(reorder_level) || 0,
        unit_cost: Number(unit_cost) || 0,
        supplier_id: supplier_id || null
      })
      .select()
      .single();

    if (error) throw error;

    if (Number(quantity) > 0) {
      await supabase.from('stock_movements').insert({
        inventory_item_id: item.id,
        movement_type: 'adjustment',
        quantity: Number(quantity),
        unit_cost: Number(unit_cost) || 0,
        reference_note: 'Opening stock',
        created_by: req.user.id
      });
    }
    res.status(201).json({ message: 'Inventory item added.', id: item.id });
  } catch (e) {
    res.status(500).json({ message: 'Could not add inventory item.' });
  }
});

app.get('/api/suppliers', auth, allow('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('suppliers').select('*').order('supplier_name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Could not load suppliers.' });
  }
});

app.post('/api/suppliers', auth, allow('admin'), async (req, res) => {
  const { supplier_name, contact_person, phone, email, lead_time_days } = req.body;
  if (!supplier_name) return res.status(400).json({ message: 'Supplier name is required.' });
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ supplier_name, contact_person: contact_person || '', phone: phone || '', email: email || '', lead_time_days: Math.max(0, Number(lead_time_days) || 0) })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'Supplier added.', id: data.id });
  } catch (e) {
    res.status(500).json({ message: 'Could not add supplier.' });
  }
});

app.get('/api/inventory/movements', auth, allow('admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, inventory_items(item_name, unit), users(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    const formatted = data.map(m => ({
      ...m,
      item_name: m.inventory_items ? m.inventory_items.item_name : null,
      unit: m.inventory_items ? m.inventory_items.unit : null,
      staff_name: m.users ? m.users.name : null
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ message: 'Could not load stock history.' });
  }
});

app.get('/api/reviews', auth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*, users(name)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    const formatted = data.map(r => ({
      ...r,
      customer_name: r.users ? r.users.name : null
    }));
    res.json(formatted);
  } catch (e) {
    res.status(500).json({ message: 'Could not load reviews.' });
  }
});

app.post('/api/reviews', auth, allow('customer'), async (req, res) => {
  const rating = Number(req.body.rating), review = String(req.body.review_text || '').slice(0, 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Choose a rating from 1 to 5.' });
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .insert({ user_id: req.user.id, order_id: req.body.order_id || null, rating, review_text: review })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ message: 'Thank you for your review.', id: data.id });
  } catch (e) {
    res.status(500).json({ message: 'Could not submit review.' });
  }
});

app.get('/api/admin/summary', auth, allow('admin'), async (req, res) => {
  try {
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const { data: paidOrders } = await supabase.from('orders').select('total').eq('payment_status', 'paid');
    const revenue = paidOrders ? paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0) : 0;
    
    const { count: pending } = await supabase.from('orders').select('*', { count: 'exact', head: true }).in('order_status', ['placed', 'confirmed', 'preparing']);
    const { count: products } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('available', true);

    res.json({
      orders: { total_orders: totalOrders || 0, revenue },
      revenue,
      pending: pending || 0,
      products: products || 0
    });
  } catch (e) {
    res.status(500).json({ message: 'Could not load dashboard.' });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`ICHIGO is running at http://localhost:${port} connected to Supabase!`));