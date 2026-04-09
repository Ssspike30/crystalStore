const express = require("express");
const pool = require("../config/db");
const { loadRuntimeConfig } = require("../utils/runtimeConfig");
const { validateWristSize, parsePositiveInt, normalizeOptionalText } = require("../utils/validation");
const { parseJsonMaybe } = require("../utils/json");
const { buildOrderNo, buildRefundNo } = require("../utils/ids");

const router = express.Router();

function calcDiameterAndAmount(items) {
  let beadsTotalDiameterMm = 0;
  let itemsAmount = 0;
  for (const item of items) {
    beadsTotalDiameterMm += Number(item.size_mm) * Number(item.quantity);
    itemsAmount += Number(item.unit_price) * Number(item.quantity);
  }
  return {
    beadsTotalDiameterMm,
    itemsAmount
  };
}

router.post("/", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const runtimeConfig = await loadRuntimeConfig(conn);
    const wristCheck = validateWristSize(req.body.wristSizeCm, runtimeConfig.wristMinCm, runtimeConfig.wristMaxCm);
    if (!wristCheck.valid) {
      return res.status(400).json({ message: wristCheck.message });
    }

    const addressCheck = parsePositiveInt(req.body.addressId, "addressId");
    if (!addressCheck.ok) {
      return res.status(400).json({ message: addressCheck.message });
    }

    const remarkCheck = normalizeOptionalText(req.body.remark, "remark", 255);
    if (!remarkCheck.ok) {
      return res.status(400).json({ message: remarkCheck.message });
    }

    await conn.beginTransaction();

    const [addressRows] = await conn.query("SELECT * FROM addresses WHERE id = ? AND user_id = ? LIMIT 1", [
      addressCheck.value,
      req.userId
    ]);
    if (!addressRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "收货地址不存在" });
    }

    const [cartRows] = await conn.query("SELECT id FROM carts WHERE user_id = ? LIMIT 1 FOR UPDATE", [req.userId]);
    if (!cartRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "购物车为空" });
    }

    const cartId = cartRows[0].id;
    const [items] = await conn.query(
      `
      SELECT ci.bead_id, ci.quantity, b.name, b.color, b.size_mm, b.unit_price
      FROM cart_items ci
      JOIN beads b ON b.id = ci.bead_id
      WHERE ci.cart_id = ? AND ci.selected = 1
      ORDER BY ci.id ASC
      FOR UPDATE
      `,
      [cartId]
    );
    if (!items.length) {
      await conn.rollback();
      return res.status(400).json({ message: "购物车未选择商品" });
    }

    const { beadsTotalDiameterMm, itemsAmount } = calcDiameterAndAmount(items);
    if (beadsTotalDiameterMm > wristCheck.wrist * 10) {
      await conn.rollback();
      return res.status(400).json({ message: "珠子累计直径超出腕围上限，禁止下单" });
    }

    const shippingFee = runtimeConfig.shippingFee;
    const payableAmount = itemsAmount + shippingFee;
    const orderNo = buildOrderNo();

    const [orderResult] = await conn.query(
      `
      INSERT INTO orders
      (order_no, user_id, order_status, pay_status, wrist_size_cm, beads_total_diameter_mm, items_amount, shipping_fee, discount_amount, payable_amount, paid_amount, remark, address_snapshot)
      VALUES (?, ?, 'pending_payment', 'unpaid', ?, ?, ?, ?, 0, ?, 0, ?, ?)
      `,
      [
        orderNo,
        req.userId,
        wristCheck.wrist,
        beadsTotalDiameterMm,
        itemsAmount.toFixed(2),
        shippingFee.toFixed(2),
        payableAmount.toFixed(2),
        remarkCheck.value,
        JSON.stringify(addressRows[0])
      ]
    );
    const orderId = orderResult.insertId;

    for (const item of items) {
      const lineAmount = Number(item.unit_price) * Number(item.quantity);
      await conn.query(
        `
        INSERT INTO order_items
        (order_id, bead_id, bead_name, bead_color, bead_size_mm, bead_unit_price, quantity, line_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.bead_id,
          item.name,
          item.color,
          item.size_mm,
          item.unit_price,
          item.quantity,
          lineAmount.toFixed(2)
        ]
      );
    }

    await conn.query("DELETE FROM cart_items WHERE cart_id = ? AND selected = 1", [cartId]);
    await conn.query(
      `
      INSERT INTO order_status_logs (order_id, from_status, to_status, operator_type, operator_id, note)
      VALUES (?, NULL, 'pending_payment', 'user', ?, '用户创建订单')
      `,
      [orderId, req.userId]
    );

    await conn.commit();

    res.status(201).json({
      orderId,
      orderNo,
      orderStatus: "pending_payment",
      payStatus: "unpaid",
      payableAmount: Number(payableAmount.toFixed(2))
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

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT id, order_no AS orderNo, order_status AS orderStatus, pay_status AS payStatus, payable_amount AS payableAmount, created_at AS createdAt
      FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
      `,
      [req.userId]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const orderIdCheck = parsePositiveInt(req.params.id, "id");
    if (!orderIdCheck.ok) {
      return res.status(400).json({ message: orderIdCheck.message });
    }

    const [orderRows] = await pool.query(
      `
      SELECT
        id,
        order_no AS orderNo,
        order_status AS orderStatus,
        pay_status AS payStatus,
        wrist_size_cm AS wristSizeCm,
        beads_total_diameter_mm AS beadsTotalDiameterMm,
        items_amount AS itemsAmount,
        shipping_fee AS shippingFee,
        discount_amount AS discountAmount,
        payable_amount AS payableAmount,
        paid_amount AS paidAmount,
        remark,
        address_snapshot AS addressSnapshot,
        paid_at AS paidAt,
        cancelled_at AS cancelledAt,
        completed_at AS completedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [orderIdCheck.value, req.userId]
    );
    if (!orderRows.length) {
      return res.status(404).json({ message: "订单不存在" });
    }

    const order = orderRows[0];
    const [items] = await pool.query(
      `
      SELECT
        id,
        bead_id AS beadId,
        bead_name AS beadName,
        bead_color AS beadColor,
        bead_size_mm AS beadSizeMm,
        bead_unit_price AS beadUnitPrice,
        quantity,
        line_amount AS lineAmount,
        created_at AS createdAt
      FROM order_items
      WHERE order_id = ?
      ORDER BY id ASC
      `,
      [order.id]
    );

    const [shipmentRows] = await pool.query(
      `
      SELECT
        id,
        logistics_company AS logisticsCompany,
        tracking_no AS trackingNo,
        shipment_status AS shipmentStatus,
        shipped_at AS shippedAt,
        remark,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM shipments
      WHERE order_id = ?
      LIMIT 1
      `,
      [order.id]
    );

    const [refundRows] = await pool.query(
      `
      SELECT
        id,
        refund_no AS refundNo,
        refund_amount AS refundAmount,
        reason,
        status,
        requested_at AS requestedAt,
        processed_at AS processedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM refunds
      WHERE order_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [order.id]
    );

    const addressSnapshot = parseJsonMaybe(order.addressSnapshot);
    res.json({
      order: {
        ...order,
        addressSnapshot
      },
      items,
      addressSnapshot,
      logisticsSummary: shipmentRows.length ? shipmentRows[0] : null,
      refundSummary: refundRows.length ? refundRows[0] : null
    });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/cancel", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const orderIdCheck = parsePositiveInt(req.params.id, "id");
    if (!orderIdCheck.ok) {
      return res.status(400).json({ message: orderIdCheck.message });
    }

    await conn.beginTransaction();
    const [orderRows] = await conn.query(
      `
      SELECT id, order_status AS orderStatus, pay_status AS payStatus
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [orderIdCheck.value, req.userId]
    );
    if (!orderRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "订单不存在" });
    }

    const order = orderRows[0];
    if (order.orderStatus !== "pending_payment") {
      await conn.rollback();
      return res.status(400).json({ message: "只有待付款订单才能取消" });
    }

    await conn.query(
      `
      UPDATE orders
      SET order_status = 'cancelled', pay_status = 'closed', cancelled_at = NOW()
      WHERE id = ?
      `,
      [orderIdCheck.value]
    );
    await conn.query(
      `
      UPDATE payments
      SET status = 'closed'
      WHERE order_id = ? AND status = 'initiated'
      `,
      [orderIdCheck.value]
    );
    await conn.query(
      `
      INSERT INTO order_status_logs (order_id, from_status, to_status, operator_type, operator_id, note)
      VALUES (?, 'pending_payment', 'cancelled', 'user', ?, '用户取消订单')
      `,
      [orderIdCheck.value, req.userId]
    );

    await conn.commit();
    res.json({ message: "订单已取消" });
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

router.post("/:id/refund", async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const orderIdCheck = parsePositiveInt(req.params.id, "id");
    if (!orderIdCheck.ok) {
      return res.status(400).json({ message: orderIdCheck.message });
    }

    const reasonCheck = normalizeOptionalText(req.body.reason, "reason", 255);
    if (!reasonCheck.ok) {
      return res.status(400).json({ message: reasonCheck.message });
    }

    await conn.beginTransaction();
    const [orderRows] = await conn.query(
      `
      SELECT id, order_status AS orderStatus, pay_status AS payStatus, payable_amount AS payableAmount, paid_amount AS paidAmount
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [orderIdCheck.value, req.userId]
    );
    if (!orderRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "订单不存在" });
    }

    const order = orderRows[0];
    if (order.payStatus !== "paid") {
      await conn.rollback();
      return res.status(400).json({ message: "只有已支付订单才能申请退款" });
    }
    if (["cancelled", "refunded", "refund_pending"].includes(order.orderStatus)) {
      await conn.rollback();
      return res.status(400).json({ message: "当前订单状态不支持退款" });
    }

    const [activeRefundRows] = await conn.query(
      `
      SELECT id
      FROM refunds
      WHERE order_id = ? AND status IN ('pending', 'approved', 'processing')
      LIMIT 1
      `,
      [orderIdCheck.value]
    );
    if (activeRefundRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "当前订单已有退款申请" });
    }

    const [paymentRows] = await conn.query(
      `
      SELECT id
      FROM payments
      WHERE order_id = ? AND status = 'success'
      ORDER BY id DESC
      LIMIT 1
      `,
      [orderIdCheck.value]
    );
    if (!paymentRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: "未找到可退款的支付记录" });
    }

    const refundAmount = Number(order.paidAmount) > 0 ? Number(order.paidAmount) : Number(order.payableAmount);
    const refundNo = buildRefundNo();
    const refundReason = reasonCheck.value || "用户申请退款";

    const [refundResult] = await conn.query(
      `
      INSERT INTO refunds (order_id, payment_id, refund_no, refund_amount, reason, status, requested_by)
      VALUES (?, ?, ?, ?, ?, 'pending', 'user')
      `,
      [orderIdCheck.value, paymentRows[0].id, refundNo, refundAmount.toFixed(2), refundReason]
    );

    await conn.query(
      `
      UPDATE orders
      SET order_status = 'refund_pending', pay_status = 'refund_pending'
      WHERE id = ?
      `,
      [orderIdCheck.value]
    );
    await conn.query(
      `
      UPDATE payments
      SET status = 'refund_pending'
      WHERE id = ?
      `,
      [paymentRows[0].id]
    );
    await conn.query(
      `
      INSERT INTO order_status_logs (order_id, from_status, to_status, operator_type, operator_id, note)
      VALUES (?, ?, 'refund_pending', 'user', ?, ?)
      `,
      [orderIdCheck.value, order.orderStatus, req.userId, refundReason]
    );

    await conn.commit();
    res.status(201).json({
      refundId: refundResult.insertId,
      refundNo,
      orderStatus: "refund_pending",
      payStatus: "refund_pending"
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
