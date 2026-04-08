USE `crystal_store`;

-- 系统配置（按当前确认规则）
INSERT INTO `system_configs` (`config_key`, `config_value`, `description`) VALUES
  ('shipping_fee_fixed', '12.00', '固定运费（元）'),
  ('wrist_size_min_cm', '13.0', '腕围最小值（cm）'),
  ('wrist_size_max_cm', '21.0', '腕围最大值（cm）'),
  ('payment_channel', 'wechat', '首版支付渠道')
ON DUPLICATE KEY UPDATE
  `config_value` = VALUES(`config_value`),
  `description` = VALUES(`description`);

-- 珠子示例数据（可按实际价格调整）
INSERT INTO `beads` (`sku_code`, `name`, `color`, `size_mm`, `unit_price`, `is_active`, `sort_order`) VALUES
  ('BEAD-WHITE-6', '白水晶 6mm', '白水晶', 6.0, 3.00, 1, 10),
  ('BEAD-WHITE-8', '白水晶 8mm', '白水晶', 8.0, 4.00, 1, 11),
  ('BEAD-WHITE-10', '白水晶 10mm', '白水晶', 10.0, 5.00, 1, 12),
  ('BEAD-PURPLE-6', '紫水晶 6mm', '紫水晶', 6.0, 3.50, 1, 20),
  ('BEAD-PURPLE-8', '紫水晶 8mm', '紫水晶', 8.0, 4.50, 1, 21),
  ('BEAD-PURPLE-10', '紫水晶 10mm', '紫水晶', 10.0, 5.50, 1, 22),
  ('BEAD-PINK-6', '粉晶 6mm', '粉晶', 6.0, 3.20, 1, 30),
  ('BEAD-PINK-8', '粉晶 8mm', '粉晶', 8.0, 4.20, 1, 31),
  ('BEAD-PINK-10', '粉晶 10mm', '粉晶', 10.0, 5.20, 1, 32)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `color` = VALUES(`color`),
  `size_mm` = VALUES(`size_mm`),
  `unit_price` = VALUES(`unit_price`),
  `is_active` = VALUES(`is_active`),
  `sort_order` = VALUES(`sort_order`);
