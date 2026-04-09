function buildSequenceId(prefix) {
  const timestamp = Date.now().toString();
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `${prefix}${timestamp}${rand}`;
}

function buildOrderNo() {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `CS${y}${m}${d}${hh}${mm}${ss}${rand}`;
}

function buildPaymentNo() {
  return buildSequenceId("PAY");
}

function buildRefundNo() {
  return buildSequenceId("RF");
}

module.exports = {
  buildOrderNo,
  buildPaymentNo,
  buildRefundNo
};
