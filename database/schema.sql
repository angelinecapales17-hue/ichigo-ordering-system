CREATE DATABASE IF NOT EXISTS ichigo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ichigo_db;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','cashier','customer','rider') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Milk Tea',
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500),
  available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(32) NOT NULL UNIQUE,
  user_id INT NULL,
  source ENUM('online','pos') NOT NULL DEFAULT 'online',
  fulfillment ENUM('pickup','delivery') NOT NULL DEFAULT 'pickup',
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(40),
  delivery_address TEXT,
  items_json JSON NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  payment_status ENUM('pending','paid','failed','for_verification') NOT NULL DEFAULT 'pending',
  order_status ENUM('placed','confirmed','preparing','ready','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'placed',
  proof_image VARCHAR(500),
  rider_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_rider FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO products (name, category, description, price, image_url) VALUES
('Classic Pearl Milk Tea','Classic Milk Tea','Black tea, creamy milk and chewy pearls.',89,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800'),
('Brown Sugar Milk Tea','Premium Milk Tea','Rich brown sugar syrup with pearls.',109,'https://images.unsplash.com/photo-1525385133512-2f3nbb8e6f?w=800'),
('Okinawa Milk Tea','Classic Milk Tea','Toasty Okinawa brown sugar flavor.',99,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800'),
('Matcha Milk Tea','Matcha Series','Smooth green tea with creamy milk.',119,'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=800'),
('Wintermelon Milk Tea','Classic Milk Tea','Sweet and refreshing wintermelon tea.',99,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800'),
('Strawberry Milk Tea','Fruit Milk Tea','Strawberry flavor blended with milk tea.',109,'https://images.unsplash.com/photo-1558857563-b371033873b8?w=800');

CREATE TABLE IF NOT EXISTS store_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT IGNORE INTO store_settings(setting_key,setting_value) VALUES
('store_name','ICHIGO Milk Tea House'),
('opening_hours','10:00 AM – 9:00 PM'),
('delivery_radius_km','5'),
('tax_rate','0'),
('welcome_message','Freshly brewed happiness, one cup at a time.');


CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_name VARCHAR(140) NOT NULL,
  contact_person VARCHAR(120) DEFAULT '',
  phone VARCHAR(40) DEFAULT '',
  email VARCHAR(160) DEFAULT '',
  lead_time_days INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(140) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Ingredients',
  unit VARCHAR(30) NOT NULL DEFAULT 'pcs',
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 10,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  supplier_id INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_item_id INT NOT NULL,
  movement_type ENUM('restock','adjustment','usage') NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  reference_note VARCHAR(255) DEFAULT '',
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_stock_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS product_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT NULL,
  rating TINYINT NOT NULL,
  review_text VARCHAR(1000) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS system_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  topic VARCHAR(100) NOT NULL,
  user_id INT NULL,
  order_id INT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_topic_created(topic,created_at),
  INDEX idx_event_user_created(user_id,created_at),
  CONSTRAINT fk_event_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_event_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);
