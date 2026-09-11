CREATE TABLE IF NOT EXISTS site_state (
  id INT PRIMARY KEY, installed TINYINT NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO site_state(id,installed,created_at) VALUES(1,0,DATE_FORMAT(UTC_TIMESTAMP(3),'%Y-%m-%dT%H:%i:%s.000Z'));
CREATE TABLE IF NOT EXISTS admins (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, username VARCHAR(190) NOT NULL UNIQUE, email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL, password_salt VARCHAR(255) NOT NULL, created_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(190) PRIMARY KEY, admin_id BIGINT NOT NULL, csrf VARCHAR(190) NOT NULL, expires_at VARCHAR(40) NOT NULL, created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_sessions_admin FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS settings (key VARCHAR(190) PRIMARY KEY, value LONGTEXT NOT NULL, updated_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS content_items (
  id VARCHAR(190) PRIMARY KEY, type VARCHAR(40) NOT NULL, slug VARCHAR(255), title VARCHAR(255) NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'published',
  sort_date VARCHAR(40), featured TINYINT NOT NULL DEFAULT 0, data LONGTEXT NOT NULL, created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL,
  INDEX idx_content_type_status_date(type,status,sort_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS analytics (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, event_type VARCHAR(60) NOT NULL, object_type VARCHAR(60) NOT NULL, object_id VARCHAR(190) NOT NULL,
  visitor_hash VARCHAR(128) NOT NULL, bucket VARCHAR(190) NOT NULL, value INT NOT NULL DEFAULT 1, created_at VARCHAR(40) NOT NULL,
  UNIQUE KEY uq_analytics(event_type,object_type,object_id,visitor_hash,bucket), INDEX idx_analytics_event_object(event_type,object_type,object_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS integrations (provider VARCHAR(60) PRIMARY KEY, data_enc LONGTEXT NOT NULL, updated_at VARCHAR(40) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS checkout_sessions (
  paypal_order_id VARCHAR(190) PRIMARY KEY, cart_json LONGTEXT NOT NULL, currency VARCHAR(10) NOT NULL, subtotal DECIMAL(12,2) NOT NULL,
  shipping DECIMAL(12,2) NOT NULL DEFAULT 0, total DECIMAL(12,2) NOT NULL, expires_at VARCHAR(40) NOT NULL, created_at VARCHAR(40) NOT NULL,
  INDEX idx_checkout_expires(expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(190) PRIMARY KEY, public_id VARCHAR(190) NOT NULL UNIQUE, paypal_order_id VARCHAR(190) UNIQUE, customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255), currency VARCHAR(10) NOT NULL DEFAULT 'USD', subtotal DECIMAL(12,2) NOT NULL, shipping DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL, status VARCHAR(60) NOT NULL, fulfillment_status VARCHAR(60) NOT NULL DEFAULT 'unfulfilled', tracking_carrier VARCHAR(120), tracking_number VARCHAR(255),
  shipping_json LONGTEXT NOT NULL, data LONGTEXT NOT NULL, created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL, INDEX idx_orders_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, order_id VARCHAR(190) NOT NULL, product_id VARCHAR(190) NOT NULL, title VARCHAR(255) NOT NULL,
  quantity INT NOT NULL, unit_price DECIMAL(12,2) NOT NULL, kind VARCHAR(40) NOT NULL, data LONGTEXT NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS entitlements (
  id VARCHAR(190) PRIMARY KEY, order_id VARCHAR(190) NOT NULL, product_id VARCHAR(190) NOT NULL, customer_email VARCHAR(255) NOT NULL,
  downloads_used INT NOT NULL DEFAULT 0, downloads_max INT NOT NULL DEFAULT 5, created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_entitlements_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS download_tokens (
  token_hash VARCHAR(128) PRIMARY KEY, entitlement_id VARCHAR(190) NOT NULL, expires_at VARCHAR(40) NOT NULL, used_at VARCHAR(40),
  CONSTRAINT fk_download_tokens_entitlement FOREIGN KEY(entitlement_id) REFERENCES entitlements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS receipt_tokens (
  token_hash VARCHAR(128) PRIMARY KEY, order_id VARCHAR(190) NOT NULL, expires_at VARCHAR(40) NOT NULL, revoked_at VARCHAR(40), created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_receipt_tokens_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE, INDEX idx_receipt_tokens_order(order_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS security_events (
  event_id VARCHAR(190) PRIMARY KEY, event_type VARCHAR(100) NOT NULL, actor_id VARCHAR(190), target_id VARCHAR(190),
  source_ip_hash VARCHAR(128), user_agent_hash VARCHAR(128), success TINYINT NOT NULL DEFAULT 1, reason VARCHAR(500), request_id VARCHAR(190), created_at VARCHAR(40) NOT NULL,
  INDEX idx_security_events_created(created_at), INDEX idx_security_events_target(event_type,target_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT, login_key VARCHAR(190) NOT NULL, source_ip_hash VARCHAR(128) NOT NULL, success TINYINT NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL,
  INDEX idx_login_attempts_key(login_key,created_at), INDEX idx_login_attempts_ip(source_ip_hash,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash VARCHAR(128) PRIMARY KEY, admin_id BIGINT NOT NULL, expires_at VARCHAR(40) NOT NULL, used_at VARCHAR(40), created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_reset_admin FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE, INDEX idx_password_reset_admin(admin_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(190) PRIMARY KEY, type VARCHAR(60) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, link VARCHAR(255), is_read TINYINT NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL,
  INDEX idx_notifications_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT PRIMARY KEY, new_order TINYINT NOT NULL DEFAULT 1, digital_sale TINYINT NOT NULL DEFAULT 1, physical_sale TINYINT NOT NULL DEFAULT 1,
  shipping_updates TINYINT NOT NULL DEFAULT 1, security_alerts TINYINT NOT NULL DEFAULT 1, low_inventory TINYINT NOT NULL DEFAULT 1,
  low_inventory_threshold INT NOT NULL DEFAULT 5, updated_at VARCHAR(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO notification_preferences(id,updated_at) VALUES(1,DATE_FORMAT(UTC_TIMESTAMP(3),'%Y-%m-%dT%H:%i:%s.000Z'));
CREATE TABLE IF NOT EXISTS email_log (
  id VARCHAR(190) PRIMARY KEY, recipient VARCHAR(255) NOT NULL, template VARCHAR(120) NOT NULL, subject VARCHAR(500) NOT NULL, status VARCHAR(60) NOT NULL,
  provider VARCHAR(60), provider_message_id VARCHAR(255), error TEXT, created_at VARCHAR(40) NOT NULL, sent_at VARCHAR(40), INDEX idx_email_log_created(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS customer_magic_tokens (token_hash VARCHAR(128) PRIMARY KEY, email VARCHAR(255) NOT NULL, expires_at VARCHAR(40) NOT NULL, used_at VARCHAR(40), created_at VARCHAR(40) NOT NULL, INDEX idx_customer_magic_email(email,created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS customer_sessions (id VARCHAR(190) PRIMARY KEY, email VARCHAR(255) NOT NULL, expires_at VARCHAR(40) NOT NULL, created_at VARCHAR(40) NOT NULL, INDEX idx_customer_sessions_email(email)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS webhook_events (event_id VARCHAR(190) PRIMARY KEY, event_type VARCHAR(190) NOT NULL, status VARCHAR(60) NOT NULL, payload LONGTEXT NOT NULL, created_at VARCHAR(40) NOT NULL, processed_at VARCHAR(40), error TEXT, INDEX idx_webhook_events_created(created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_transactions (
  id VARCHAR(190) PRIMARY KEY, order_id VARCHAR(190) NOT NULL, provider VARCHAR(60) NOT NULL, type VARCHAR(60) NOT NULL, provider_id VARCHAR(190), status VARCHAR(60) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0, currency VARCHAR(10) NOT NULL DEFAULT 'USD', data LONGTEXT NOT NULL, created_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_transactions_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY uq_transaction_provider(provider,type,provider_id), INDEX idx_order_transactions_order(order_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS order_documents (
  order_id VARCHAR(190) PRIMARY KEY, invoice_number VARCHAR(190) NOT NULL UNIQUE, refunded_amount DECIMAL(12,2) NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL,
  CONSTRAINT fk_documents_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS media_objects (
  id VARCHAR(190) PRIMARY KEY, storage_provider VARCHAR(40) NOT NULL, storage_key VARCHAR(500) NOT NULL, filename VARCHAR(255) NOT NULL,
  content_type VARCHAR(190), size_bytes BIGINT NOT NULL DEFAULT 0, visibility VARCHAR(40) NOT NULL DEFAULT 'private', created_at VARCHAR(40) NOT NULL,
  INDEX idx_media_objects_visibility(visibility,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_queue (id VARCHAR(190) PRIMARY KEY, recipient VARCHAR(255) NOT NULL, template VARCHAR(120) NOT NULL, subject VARCHAR(500) NOT NULL, html LONGTEXT NOT NULL, text_body LONGTEXT NOT NULL, status VARCHAR(40) NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, next_attempt_at VARCHAR(40) NOT NULL, last_error TEXT, provider VARCHAR(60), provider_message_id VARCHAR(255), created_at VARCHAR(40) NOT NULL, updated_at VARCHAR(40) NOT NULL, sent_at VARCHAR(40), INDEX idx_email_queue_due(status,next_attempt_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
