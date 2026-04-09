const express = require("express");
const authRouter = require("./routes/auth");
const appConfigRouter = require("./routes/appConfig");
const beadsRouter = require("./routes/beads");
const cartRouter = require("./routes/cart");
const addressesRouter = require("./routes/addresses");
const ordersRouter = require("./routes/orders");
const paymentsRouter = require("./routes/payments");
const paymentCallbackRouter = require("./routes/paymentCallback");
const requireUser = require("./middleware/requireUser");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "user-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/app-config", appConfigRouter);
app.use("/api/beads", beadsRouter);
app.use("/api/payments/callback", paymentCallbackRouter);
app.use("/api/cart", requireUser, cartRouter);
app.use("/api/addresses", requireUser, addressesRouter);
app.use("/api/orders", requireUser, ordersRouter);
app.use("/api/payments", requireUser, paymentsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "服务器内部错误", detail: err.message });
});

module.exports = app;
