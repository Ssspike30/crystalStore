function validateWristSize(wristSizeCm, min = 13, max = 21) {
  const wrist = Number(wristSizeCm);
  if (!Number.isFinite(wrist)) {
    return { valid: false, message: "腕围必须是数字" };
  }
  if (wrist < min || wrist > max) {
    return { valid: false, message: `腕围必须在 ${min}-${max}cm 之间` };
  }
  return { valid: true, wrist };
}

module.exports = {
  validateWristSize
};
