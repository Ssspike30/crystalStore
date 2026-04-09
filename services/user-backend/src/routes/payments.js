const express = require("express");
const pool = require("../config/db");
const { buildPaymentNo } = require("../utils/ids");
const { loadRuntimeConfig } = require("../utils/runtimeConfig");

const router = express.Router();

function buildMockClientParams(paymentNo) {
  return {
    timeStamp: String(Math.floor(Date.now() / 1000)),
    nonceStr: `nonce_${paymentNo}`,
    package: `prepay_id=${paymentNo}`,
    signType: "RSA",
    paySign: "mock-signature"
  };
}

router.post("/prepay", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const orderId = Number(req.body.orderId);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "orderId 必须是正整数" });
    }

    await conn.beginTransaction();
    const runtimeConfig = await loadRuntimeConfig(conn);

    const [orderRows] = await conn.query(
      "SELECT id, order_status AS orderStatus, pay_status AS payStatus, payable_amount AS payableAmount FROM orders WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE",
      [orderId, req.userId]
    );
    if (!orderRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "订单不存在" });
    }

    const order = orderRows[0];
    if (order.orderStatus !== "pending_payment") {
      await conn.rollback();
      return res.status(400).json({ message: "当前订单状态不可支付" });
    }

    const [existingPaymentRows] = await conn.query(
      `
      SELECT id, payment_no AS paymentNo
      FROM payments
      WHERE order_id = ? AND status = 'initiated'
      ORDER BY id DESC
      LIMIT 1 FOR UPDATE
      `,
      [orderId]
    );

    if (existingPaymentRows.length) {
      await conn.commit();
      return res.status(200).json({
        paymentNo: existingPaymentRows[0].paymentNo,
        channel: runtimeConfig.paymentChannel,
        mockClientParams: buildMockClientParams(existingPaymentRows[0].paymentNo)
      });
    }

    const paymentNo = buildPaymentNo();
    await conn.query(
      `
      INSERT INTO payments (order_id, payment_no, channel, status, pay_amount)
      VALUES (?, ?, ?, 'initiated', ?)
      `,
      [orderId, paymentNo, runtimeConfig.paymentChannel, Number(order.payableAmount)]
    );

    await conn.commit();
    res.status(201).json({
      paymentNo,
      channel: runtimeConfig.paymentChannel,
      mockClientParams: buildMockClientParams(paymentNo)
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback failure in error path
    }
    next(error);
  } finally {
    conn.release();
  }
});

module.exports = router;
