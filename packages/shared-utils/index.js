const ORDER_STATUS = Object.freeze({
  PENDING_PAYMENT: "pending_payment",
  PENDING_PRODUCTION: "pending_production",
  PENDING_SHIPMENT: "pending_shipment",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REFUND_PENDING: "refund_pending",
  REFUNDED: "refunded",
});

const ORDER_STATUS_LABELS = Object.freeze({
  [ORDER_STATUS.PENDING_PAYMENT]: "待付款",
  [ORDER_STATUS.PENDING_PRODUCTION]: "待制作",
  [ORDER_STATUS.PENDING_SHIPMENT]: "待发货",
  [ORDER_STATUS.COMPLETED]: "已完成",
  [ORDER_STATUS.CANCELLED]: "已取消",
  [ORDER_STATUS.REFUND_PENDING]: "退款中",
  [ORDER_STATUS.REFUNDED]: "已退款",
});

const WRIST_RULES = Object.freeze({
  MIN_WRIST_SIZE_CM: 13,
  MAX_WRIST_SIZE_CM: 21,
  MAX_BEAD_DIAMETER_RATIO: 10,
});

const SYSTEM_CONFIG_KEYS = Object.freeze({
  SHIPPING_FEE_FIXED: "shipping_fee_fixed",
  WRIST_SIZE_MIN_CM: "wrist_size_min_cm",
  WRIST_SIZE_MAX_CM: "wrist_size_max_cm",
  PAYMENT_CHANNEL: "payment_channel",
});

function parseMoneyCents(amount) {
  if (typeof amount === "bigint") {
    return amount * 100n;
  }

  const raw = String(amount).trim();
  if (!raw) {
    throw new TypeError(`Invalid money amount: ${amount}`);
  }

  const match = raw.match(/^([+-])?(\d+)(?:\.(\d+))?$/);
  if (!match) {
    throw new TypeError(`Invalid money amount: ${amount}`);
  }

  const sign = match[1] === "-" ? -1n : 1n;
  const integerPart = BigInt(match[2]);
  const fractionPart = (match[3] || "").padEnd(3, "0");
  let cents = integerPart * 100n + BigInt(fractionPart.slice(0, 2));

  if (Number(fractionPart[2]) >= 5) {
    cents += 1n;
  }

  return sign * cents;
}

function formatMoneyCents(cents) {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = String(absolute % 100n).padStart(2, "0");
  return `${sign}${whole.toString()}.${fraction}`;
}

function toMoneyCents(amount) {
  return parseMoneyCents(amount);
}

function formatMoney(amount) {
  return formatMoneyCents(toMoneyCents(amount));
}

function sumMoney(...amounts) {
  const flatAmounts =
    amounts.length === 1 && Array.isArray(amounts[0]) ? amounts[0] : amounts;
  const totalCents = flatAmounts.reduce((total, amount) => total + toMoneyCents(amount), 0n);
  return formatMoneyCents(totalCents);
}

function getMaxBeadTotalDiameterMm(wristSizeCm) {
  const value = Number(wristSizeCm);
  if (!Number.isFinite(value)) {
    throw new TypeError(`Invalid wrist size: ${wristSizeCm}`);
  }
  return value * WRIST_RULES.MAX_BEAD_DIAMETER_RATIO;
}

module.exports = {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  WRIST_RULES,
  SYSTEM_CONFIG_KEYS,
  formatMoney,
  sumMoney,
  getMaxBeadTotalDiameterMm,
};
