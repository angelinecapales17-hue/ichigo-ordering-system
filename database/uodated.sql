create extension if not exists pgcrypto;

create table if not exists public.users (
  id bigserial primary key,
  name varchar(120) not null,
  email varchar(160) not null unique,
  password_hash varchar(255) not null,
  role varchar(20) not null default 'customer' check (role in ('admin','cashier','customer','rider')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigserial primary key,
  name varchar(120) not null,
  category varchar(80) not null default 'Milk Tea',
  description text,
  price numeric(10,2) not null,
  image_url varchar(500),
  available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigserial primary key,
  order_code varchar(32) not null unique,
  user_id bigint references public.users(id) on delete set null,
  source varchar(20) not null default 'online' check (source in ('online','pos')),
  fulfillment varchar(20) not null default 'pickup' check (fulfillment in ('pickup','delivery')),
  customer_name varchar(120) not null,
  customer_phone varchar(40),
  delivery_address text,
  items_json jsonb not null,
  subtotal numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method varchar(40) not null,
  payment_status varchar(30) not null default 'pending' check (payment_status in ('pending','paid','failed','for_verification')),
  order_status varchar(30) not null default 'placed' check (order_status in ('placed','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  proof_image varchar(500),
  rider_id bigint references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.products (name, category, description, price, image_url)
values
  ('Classic Pearl Milk Tea','Classic Milk Tea','Black tea, creamy milk and chewy pearls.',89,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800'),
  ('Brown Sugar Milk Tea','Premium Milk Tea','Rich brown sugar syrup with pearls.',109,'https://images.unsplash.com/photo-1525385133512-2f3nbb8e6f?w=800'),
  ('Okinawa Milk Tea','Classic Milk Tea','Toasty Okinawa brown sugar flavor.',99,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800'),
  ('Matcha Milk Tea','Matcha Series','Smooth green tea with creamy milk.',119,'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=800'),
  ('Wintermelon Milk Tea','Classic Milk Tea','Sweet and refreshing wintermelon tea.',99,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800'),
  ('Strawberry Milk Tea','Fruit Milk Tea','Strawberry flavor blended with milk tea.',109,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800')
on conflict do nothing;

create table if not exists public.store_settings (
  setting_key varchar(80) primary key,
  setting_value text not null,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (setting_key, setting_value)
values
  ('store_name','ICHIGO Milk Tea House'),
  ('opening_hours','10:00 AM – 9:00 PM'),
  ('delivery_radius_km','5'),
  ('tax_rate','0'),
  ('welcome_message','Freshly brewed happiness, one cup at a time.')
on conflict (setting_key) do nothing;

create table if not exists public.suppliers (
  id bigserial primary key,
  supplier_name varchar(140) not null,
  contact_person varchar(120) default '',
  phone varchar(40) default '',
  email varchar(160) default '',
  lead_time_days integer not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id bigserial primary key,
  item_name varchar(140) not null,
  category varchar(80) not null default 'Ingredients',
  unit varchar(30) not null default 'pcs',
  quantity numeric(12,2) not null default 0,
  reorder_level numeric(12,2) not null default 10,
  unit_cost numeric(12,2) not null default 0,
  supplier_id bigint references public.suppliers(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_movements (
  id bigserial primary key,
  inventory_item_id bigint not null references public.inventory_items(id) on delete cascade,
  movement_type varchar(20) not null check (movement_type in ('restock','adjustment','usage')),
  quantity numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0,
  reference_note varchar(255) default '',
  created_by bigint references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.product_reviews (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  order_id bigint references public.orders(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  review_text varchar(1000) default '',
  created_at timestamptz not null default now()
);

create table if not exists public.system_events (
  id bigserial primary key,
  topic varchar(100) not null,
  user_id bigint references public.users(id) on delete set null,
  order_id bigint references public.orders(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_topic_created on public.system_events(topic, created_at);
create index if not exists idx_event_user_created on public.system_events(user_id, created_at);