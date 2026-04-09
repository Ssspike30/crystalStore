function normalizeRequiredText(value, fieldName, maxLength = 255) {
  const text = value == null ? "" : String(value).trim();
  if (!text) {
    return { ok: false, message: `${fieldName} 不能为空` };
  }
  if (text.length > maxLength) {
    return { ok: false, message: `${fieldName} 不能超过 ${maxLength} 个字符` };
  }
  return { ok: true, value: text };
}

function normalizeOptionalText(value, fieldName, maxLength = 255) {
  if (value == null) {
    return { ok: true, value: null };
  }
  const text = String(value).trim();
  if (!text) {
    return { ok: true, value: null };
  }
  if (text.length > maxLength) {
    return { ok: false, message: `${fieldName} 不能超过 ${maxLength} 个字符` };
  }
  return { ok: true, value: text };
}

function parsePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return { ok: false, message: `${fieldName} 必须是正整数` };
  }
  return { ok: true, value: num };
}

function parseNullableBoolean01(value, fieldName) {
  if (value == null || value === "") {
    return { ok: true, value: null };
  }
  if (value === 1 || value === "1" || value === true) {
    return { ok: true, value: 1 };
  }
  if (value === 0 || value === "0" || value === false) {
    return { ok: true, value: 0 };
  }
  return { ok: false, message: `${fieldName} 只能是 0 或 1` };
}

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
  normalizeRequiredText,
  normalizeOptionalText,
  parsePositiveInt,
  parseNullableBoolean01,
  validateWristSize
};
