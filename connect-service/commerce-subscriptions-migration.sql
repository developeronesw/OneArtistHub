-- Run once against the existing oneartisthub-commerce D1 database.
ALTER TABLE products ADD COLUMN square_subscription_plan_variation_id TEXT;
ALTER TABLE orders ADD COLUMN square_subscription_id TEXT;
ALTER TABLE orders ADD COLUMN square_customer_id TEXT;
ALTER TABLE orders ADD COLUMN subscription_status TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_square_subscription ON orders(square_subscription_id);
CREATE INDEX IF NOT EXISTS idx_orders_square_customer ON orders(square_customer_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  square_subscription_id TEXT PRIMARY KEY,
  order_id TEXT,
  square_customer_id TEXT,
  product_id TEXT,
  plan_variation_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  start_date TEXT,
  charged_through_date TEXT,
  canceled_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_order ON subscriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(square_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
