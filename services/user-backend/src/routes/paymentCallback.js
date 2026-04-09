const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.post("/", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const paymentNo = req.body.paymentNo == null ? "" : String(req.body.paymentNo).trim();
    const success = req.body.success !== false && req.body.success !== "false" && req.body.success !== 0 && req.body.success !== "0";
    const transactionId = req.body.transactionId == null ? null : String(req.body.transactionId).trim() || null;

    if (!paymentNo) {
      return res.status(400).json({ message: "paymentNo 不能为空" });
    }

    await conn.beginTransaction();
    const [paymentRows] = await conn.query(
      `
      SELECT p.id, p.order_id, p.status, o.order_status
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE p.payment_no = ?
      LIMIT 1 FOR UPDATE
      `,
      [paymentNo]
    );

    if (!paymentRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "支付单不存在" });
    }

    const payment = paymentRows[0];
    const terminalStatuses = new Set(["success", "failed", "closed", "refund_pending", "refunded"]);
    if (terminalStatuses.has(payment.status)) {
      await conn.rollback();
      return res.json({ message: "回调已处理" });
    }

    if (success) {
      if (payment.order_status === "pending_payment") {
        await conn.query(
          `
          UPDATE payments
          SET status = 'success', transaction_id = ?, callback_payload = ?, paid_at = NOW()
          WHERE id = ?
          `,
          [transactionId, JSON.stringify(req.body), payment.id]
        );
        await conn.query(
          `
          UPDATE orders
          SET pay_status = 'paid', order_status = 'pending_production', paid_amount = payable_amount, paid_at = NOW()
          WHERE id = ?
          `,
          [payment.order_id]
        );
        await conn.query(
          `
          INSERT INTO order_status_logs (order_id, from_status, to_status, operator_type, note)
          VALUES (?, 'pending_payment', 'pending_production', 'system', '支付回调成功')
          `,
          [payment.order_id]
        );
        await conn.commit();
        return res.json({ message: "回调处理完成" });
      }

      await conn.rollback();
      return res.json({ message: "回调已处理" });
    }

    await conn.query(
      `
      UPDATE payments
      SET status = 'failed', callback_payload = ?
      WHERE id = ?
      `,
      [JSON.stringify(req.body), payment.id]
    );
    await conn.commit();
    return res.json({ message: "回调处理完成" });
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
