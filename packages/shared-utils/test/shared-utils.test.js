const test = require("node:test");
const assert = require("node:assert/strict");

const {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  WRIST_RULES,
  SYSTEM_CONFIG_KEYS,
  formatMoney,
  sumMoney,
  getMaxBeadTotalDiameterMm,
} = require("../index");

test("order status labels are aligned with the business states", () => {
  assert.equal(ORDER_STATUS.PENDING_PAYMENT, "pending_payment");
  assert.equal(ORDER_STATUS_LABELS[ORDER_STATUS.PENDING_PRODUCTION], "待制作");
  assert.equal(ORDER_STATUS_LABELS[ORDER_STATUS.REFUNDED], "已退款");
});

test("money helpers keep two decimal places", () => {
  assert.equal(formatMoney(12), "12.00");
  assert.equal(formatMoney("3.456"), "3.46");
  assert.equal(formatMoney(1.005), "1.01");
  assert.equal(formatMoney("0.335"), "0.34");
  assert.equal(sumMoney(1.2, 2.3, 0.5), "4.00");
  assert.equal(sumMoney([1, "2.5", 3.25]), "6.75");
  assert.equal(sumMoney(0.1, 0.2), "0.30");
  assert.equal(sumMoney(["1.005", "0.335"]), "1.34");
});

test("wrist rules expose the current limits", () => {
  assert.equal(WRIST_RULES.MIN_WRIST_SIZE_CM, 13);
  assert.equal(WRIST_RULES.MAX_WRIST_SIZE_CM, 21);
  assert.equal(WRIST_RULES.MAX_BEAD_DIAMETER_RATIO, 10);
  assert.equal(getMaxBeadTotalDiameterMm(16), 160);
});

test("system config keys cover current seeded values", () => {
  assert.equal(SYSTEM_CONFIG_KEYS.SHIPPING_FEE_FIXED, "shipping_fee_fixed");
  assert.equal(SYSTEM_CONFIG_KEYS.WRIST_SIZE_MIN_CM, "wrist_size_min_cm");
  assert.equal(SYSTEM_CONFIG_KEYS.WRIST_SIZE_MAX_CM, "wrist_size_max_cm");
  assert.equal(SYSTEM_CONFIG_KEYS.PAYMENT_CHANNEL, "payment_channel");
});
