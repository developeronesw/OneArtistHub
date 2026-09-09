PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS site_state (
  id INTEGER PRIMARY KEY CHECK(id=1), installed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO site_state(id,installed,created_at) VALUES(1,0,datetime('now'));
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, csrf TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY, type TEXT NOT NULL, slug TEXT, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published',
  sort_date TEXT, featured INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_content_type_status_date ON content_items(type,status,sort_date DESC);
CREATE TABLE IF NOT EXISTS analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, object_type TEXT NOT NULL, object_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL, bucket TEXT NOT NULL, value INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
  UNIQUE(event_type,object_type,object_id,visitor_hash,bucket)
);
CREATE INDEX IF NOT EXISTS idx_analytics_event_object ON analytics(event_type,object_type,object_id);
CREATE TABLE IF NOT EXISTS integrations (
  provider TEXT PRIMARY KEY, data_enc TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkout_sessions (
  paypal_order_id TEXT PRIMARY KEY, cart_json TEXT NOT NULL, currency TEXT NOT NULL, subtotal REAL NOT NULL,
  shipping REAL NOT NULL DEFAULT 0, total REAL NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checkout_expires ON checkout_sessions(expires_at);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE, paypal_order_id TEXT UNIQUE, customer_email TEXT NOT NULL,
  customer_name TEXT, currency TEXT NOT NULL DEFAULT 'USD', subtotal REAL NOT NULL, shipping REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL, status TEXT NOT NULL, fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled',
  tracking_carrier TEXT, tracking_number TEXT, shipping_json TEXT NOT NULL DEFAULT '{}', data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, product_id TEXT NOT NULL, title TEXT NOT NULL,
  quantity INTEGER NOT NULL, unit_price REAL NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id TEXT NOT NULL, customer_email TEXT NOT NULL,
  downloads_used INTEGER NOT NULL DEFAULT 0, downloads_max INTEGER NOT NULL DEFAULT 5, created_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS download_tokens (
  token_hash TEXT PRIMARY KEY, entitlement_id TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT,
  FOREIGN KEY(entitlement_id) REFERENCES entitlements(id) ON DELETE CASCADE
);
