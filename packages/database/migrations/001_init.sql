-- MVP: crystal_store schema
CREATE DATABASE IF NOT EXISTS `crystal_store`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `crystal_store`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `openid` VARCHAR(64) NOT NULL,
  `unionid` VARCHAR(64) DEFAULT NULL,
  `nickname` VARCHAR(64) DEFAULT NULL,
  `avatar_url` VARCHAR(512) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_openid` (`openid`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `beads` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku_code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `color` VARCHAR(32) NOT NULL,
  `size_mm` DECIMAL(4,1) NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_beads_sku_code` (`sku_code`),
  KEY `idx_beads_active_sort` (`is_active`, `sort_order`),
  CONSTRAINT `chk_beads_size_mm` CHECK (`size_mm` > 0),
  CONSTRAINT `chk_beads_unit_price` CHECK (`unit_price` >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `carts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_carts_user_id` (`user_id`),
  CONSTRAINT `fk_carts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cart_id` BIGINT UNSIGNED NOT NULL,
  `bead_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `selected` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cart_items_cart_bead` (`cart_id`, `bead_id`),
  KEY `idx_cart_items_cart_id` (`cart_id`),
  CONSTRAINT `fk_cart_items_cart_id` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_bead_id` FOREIGN KEY (`bead_id`) REFERENCES `beads` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_cart_items_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `addresses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `receiver_name` VARCHAR(64) NOT NULL,
  `receiver_phone` VARCHAR(20) NOT NULL,
  `province` VARCHAR(32) NOT NULL,
  `city` VARCHAR(32) NOT NULL,
  `district` VARCHAR(32) NOT NULL,
  `detail_address` VARCHAR(255) NOT NULL,
  `postal_code` VARCHAR(20) DEFAULT NULL,
  `tag` VARCHAR(20) DEFAULT NULL,
  `is_default` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_addresses_user_id` (`user_id`),
  KEY `idx_addresses_user_default` (`user_id`, `is_default`),
  CONSTRAINT `fk_addresses_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `order_status` ENUM(
    'pending_payment',
    'pending_production',
    'pending_shipment',
    'completed',
    'cancelled',
    'refund_pending',
    'refunded'
  ) NOT NULL DEFAULT 'pending_payment',
  `pay_status` ENUM('unpaid', 'paid', 'refund_pending', 'refunded', 'closed') NOT NULL DEFAULT 'unpaid',
  `wrist_size_cm` DECIMAL(4,1) NOT NULL,
  `beads_total_diameter_mm` DECIMAL(8,1) NOT NULL,
  `items_amount` DECIMAL(10,2) NOT NULL,
  `shipping_fee` DECIMAL(10,2) NOT NULL DEFAULT 12.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payable_amount` DECIMAL(10,2) NOT NULL,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `remark` VARCHAR(255) DEFAULT NULL,
  `address_snapshot` JSON DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `cancelled_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_order_no` (`order_no`),
  KEY `idx_orders_user_status` (`user_id`, `order_status`),
  CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_orders_wrist_size_cm` CHECK (`wrist_size_cm` >= 13.0 AND `wrist_size_cm` <= 21.0),
  CONSTRAINT `chk_orders_beads_total_diameter_mm` CHECK (`beads_total_diameter_mm` > 0),
  CONSTRAINT `chk_orders_items_amount` CHECK (`items_amount` >= 0),
  CONSTRAINT `chk_orders_shipping_fee` CHECK (`shipping_fee` >= 0),
  CONSTRAINT `chk_orders_discount_amount` CHECK (`discount_amount` >= 0),
  CONSTRAINT `chk_orders_payable_amount` CHECK (`payable_amount` >= 0),
  CONSTRAINT `chk_orders_paid_amount` CHECK (`paid_amount` >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `bead_id` BIGINT UNSIGNED DEFAULT NULL,
  `bead_name` VARCHAR(64) NOT NULL,
  `bead_color` VARCHAR(32) NOT NULL,
  `bead_size_mm` DECIMAL(4,1) NOT NULL,
  `bead_unit_price` DECIMAL(10,2) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `line_amount` DECIMAL(10,2) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order_id` (`order_id`),
  CONSTRAINT `fk_order_items_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_bead_id` FOREIGN KEY (`bead_id`) REFERENCES `beads` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_order_items_quantity` CHECK (`quantity` > 0),
  CONSTRAINT `chk_order_items_bead_size_mm` CHECK (`bead_size_mm` > 0),
  CONSTRAINT `chk_order_items_bead_unit_price` CHECK (`bead_unit_price` >= 0),
  CONSTRAINT `chk_order_items_line_amount` CHECK (`line_amount` >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `payment_no` VARCHAR(64) NOT NULL,
  `channel` ENUM('wechat') NOT NULL DEFAULT 'wechat',
  `status` ENUM('initiated', 'success', 'failed', 'closed', 'refund_pending', 'refunded') NOT NULL DEFAULT 'initiated',
  `pay_amount` DECIMAL(10,2) NOT NULL,
  `transaction_id` VARCHAR(64) DEFAULT NULL,
  `callback_payload` JSON DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payments_payment_no` (`payment_no`),
  KEY `idx_payments_order_id_status` (`order_id`, `status`),
  CONSTRAINT `fk_payments_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_payments_pay_amount` CHECK (`pay_amount` >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `shipments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `logistics_company` VARCHAR(64) NOT NULL,
  `tracking_no` VARCHAR(64) NOT NULL,
  `shipment_status` ENUM('pending', 'shipped', 'signed', 'exception') NOT NULL DEFAULT 'shipped',
  `shipped_at` DATETIME NOT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shipments_order_id` (`order_id`),
  KEY `idx_shipments_tracking_no` (`tracking_no`),
  CONSTRAINT `fk_shipments_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `order_status_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `from_status` ENUM(
    'pending_payment',
    'pending_production',
    'pending_shipment',
    'completed',
    'cancelled',
    'refund_pending',
    'refunded'
  ) DEFAULT NULL,
  `to_status` ENUM(
    'pending_payment',
    'pending_production',
    'pending_shipment',
    'completed',
    'cancelled',
    'refund_pending',
    'refunded'
  ) NOT NULL,
  `operator_type` ENUM('system', 'user', 'admin') NOT NULL DEFAULT 'system',
  `operator_id` BIGINT UNSIGNED DEFAULT NULL,
  `note` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_order_status_logs_order_id_created_at` (`order_id`, `created_at`),
  CONSTRAINT `fk_order_status_logs_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `payment_id` BIGINT UNSIGNED DEFAULT NULL,
  `refund_no` VARCHAR(64) NOT NULL,
  `refund_amount` DECIMAL(10,2) NOT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'processing', 'success', 'failed') NOT NULL DEFAULT 'pending',
  `requested_by` ENUM('user', 'admin', 'system') NOT NULL DEFAULT 'user',
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refunds_refund_no` (`refund_no`),
  KEY `idx_refunds_order_status` (`order_id`, `status`),
  CONSTRAINT `fk_refunds_order_id` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_refunds_payment_id` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_refunds_refund_amount` CHECK (`refund_amount` >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `system_configs` (
  `config_key` VARCHAR(64) NOT NULL,
  `config_value` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE=InnoDB;
