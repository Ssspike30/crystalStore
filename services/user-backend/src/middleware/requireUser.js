function requireUser(req, res, next) {
  const userId = Number(req.header("x-user-id"));
  if (!userId || Number.isNaN(userId)) {
    return res.status(401).json({ message: "缺少有效的 x-user-id" });
  }
  req.userId = userId;
  return next();
}

module.exports = requireUser;
