function parseJsonMaybe(value, fallback = null) {
  if (value == null || value === "") {
    return fallback;
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

module.exports = {
  parseJsonMaybe
};
