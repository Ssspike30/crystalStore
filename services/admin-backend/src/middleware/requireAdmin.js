function createRequireAdmin(adminApiKey) {
  const expectedKey = typeof adminApiKey === "string" ? adminApiKey : process.env.ADMIN_API_KEY || "";

  return function requireAdmin(req, res, next) {
    if (!expectedKey) {
      return res.status(500).json({ message: "ADMIN_API_KEY 未配置" });
    }

    const providedKey = req.header("x-admin-key");
    if (!providedKey || providedKey !== expectedKey) {
      return res.status(401).json({ message: "无效的管理员凭证" });
    }

    req.adminKey = providedKey;
    return next();
  };
}

module.exports = createRequireAdmin;
