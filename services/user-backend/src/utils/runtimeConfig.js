const DEFAULT_RUNTIME_CONFIG = {
  wristMinCm: 13,
  wristMaxCm: 21,
  shippingFee: 12,
  paymentChannel: "wechat"
};

async function loadRuntimeConfig(conn) {
  const [rows] = await conn.query(
    `
    SELECT config_key, config_value
    FROM system_configs
    WHERE config_key IN ('shipping_fee_fixed', 'wrist_size_min_cm', 'wrist_size_max_cm', 'payment_channel')
    `
  );

  const runtimeConfig = { ...DEFAULT_RUNTIME_CONFIG };
  for (const row of rows) {
    if (row.config_key === "shipping_fee_fixed") {
      const value = Number(row.config_value);
      if (Number.isFinite(value)) {
        runtimeConfig.shippingFee = value;
      }
    } else if (row.config_key === "wrist_size_min_cm") {
      const value = Number(row.config_value);
      if (Number.isFinite(value)) {
        runtimeConfig.wristMinCm = value;
      }
    } else if (row.config_key === "wrist_size_max_cm") {
      const value = Number(row.config_value);
      if (Number.isFinite(value)) {
        runtimeConfig.wristMaxCm = value;
      }
    } else if (row.config_key === "payment_channel") {
      runtimeConfig.paymentChannel = String(row.config_value || runtimeConfig.paymentChannel).trim() || runtimeConfig.paymentChannel;
    }
  }

  return runtimeConfig;
}

module.exports = {
  DEFAULT_RUNTIME_CONFIG,
  loadRuntimeConfig
};
