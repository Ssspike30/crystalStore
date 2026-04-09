const express = require("express");
const defaultDb = require("./config/db");
const createRequireAdmin = require("./middleware/requireAdmin");
const createAdminRouter = require("./routes/admin");

function createApp(options = {}) {
  const db = options.db || defaultDb;
  const adminApiKey = options.adminApiKey ?? process.env.ADMIN_API_KEY;

  const app = express();

  app.use(express.json());

  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "admin-backend" });
  });

  app.use("/api/admin", createRequireAdmin(adminApiKey), createAdminRouter(db));

  app.use((req, res) => {
    res.status(404).json({ message: "Not Found" });
  });

  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;
    if (statusCode >= 500) {
      console.error(err);
    }
    res.status(statusCode).json({
      message: err.message || "服务内部错误"
    });
  });

  return app;
}

module.exports = createApp;
