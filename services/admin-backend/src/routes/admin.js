const express = require("express");

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseJsonField(value) {
  if (value == null) {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function normalizeNumber(value, fallback, min = 1) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

function normalizePositiveId(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function buildKeywordLike(keyword) {
  return `%${keyword}%`;
}

function buildOrderSearch({ status, keyword }) {
  const conditions = [];
  const params = [];

  if (status && status.toLowerCase() !== "all") {
    conditions.push("o.order_status = ?");
    params.push(status);
  }

  if (keyword) {
    const like = buildKeywordLike(keyword);
    conditions.push("(o.order_no LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)");
    params.push(like, like, like);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

function buildRefundSearch({ status, keyword }) {
  const conditions = [];
  const params = [];

  if (status && status.toLowerCase() !== "all") {
    conditions.push("r.status = ?");
    params.push(status);
  }

  if (keyword) {
    const like = buildKeywordLike(keyword);
    conditions.push("(r.refund_no LIKE ? OR o.order_no LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)");
    params.push(like, like, like, like);
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

async function getRefundRestoreStatus(conn, orderId) {
  const [rows] = await conn.query(
    `
    SELECT from_status
    FROM order_status_logs
    WHERE order_id = ? AND to_status = 'refund_pending'
    ORDER BY id DESC
    LIMIT 1
    `,
    [orderId]
  );

  const fromStatus = rows[0]?.from_status;
  if (typeof fromStatus !== "string" || !fromStatus.trim()) {
    return null;
  }

  return fromStatus.trim();
}

async function withTransaction(db, fn) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rollbackError) {
      // ignore rollback failures and preserve the original error
    }
    throw error;
  } finally {
    conn.release();
  }
}

function getBodyField(body, keys) {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function createAdminRouter(db) {
  const router = express.Router();

  router.get("/orders", async (req, res, next) => {
    try {
      const status = normalizeText(req.query.status);
      const keyword = normalizeText(req.query.keyword);
      const page = normalizeNumber(req.query.page, 1);
      const pageSize = normalizeNumber(req.query.pageSize, 20);
      const offset = (page - 1) * pageSize;
      const { whereSql, params } = buildOrderSearch({ status, keyword });

      const [countRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ${whereSql}
        `,
        params
      );
      const total = Number(countRows[0]?.total || 0);

      const [rows] = await db.query(
        `
        SELECT
          o.id,
          o.order_no,
          o.order_status,
          o.pay_status,
          o.payable_amount,
          o.paid_amount,
          o.created_at,
          o.updated_at,
          u.nickname AS user_nickname,
          u.phone AS user_phone
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ${whereSql}
        ORDER BY o.id DESC
        LIMIT ? OFFSET ?
        `,
        [...params, pageSize, offset]
      );

      res.json({
        items: rows,
        page,
        pageSize,
        total
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/orders/:id", async (req, res, next) => {
    try {
      const orderId = normalizePositiveId(req.params.id);
      if (!orderId) {
        throw createHttpError(400, "订单 ID 非法");
      }

      const [orderRows] = await db.query(
        `
        SELECT
          o.*,
          u.nickname AS user_nickname,
          u.phone AS user_phone,
          u.avatar_url AS user_avatar_url,
          u.openid AS user_openid
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
        LIMIT 1
        `,
        [orderId]
      );

      if (!orderRows.length) {
        throw createHttpError(404, "订单不存在");
      }

      const [items] = await db.query(
        "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
        [orderId]
      );
      const [payments] = await db.query(
        "SELECT * FROM payments WHERE order_id = ? ORDER BY id DESC",
        [orderId]
      );
      const [shipments] = await db.query(
        "SELECT * FROM shipments WHERE order_id = ? ORDER BY id DESC",
        [orderId]
      );
      const [refunds] = await db.query(
        "SELECT * FROM refunds WHERE order_id = ? ORDER BY id DESC",
        [orderId]
      );
      const [logs] = await db.query(
        "SELECT * FROM order_status_logs WHERE order_id = ? ORDER BY created_at ASC, id ASC",
        [orderId]
      );

      const order = orderRows[0];
      res.json({
        order: {
          ...order,
          address_snapshot: parseJsonField(order.address_snapshot),
          user: {
            nickname: order.user_nickname,
            phone: order.user_phone,
            avatar_url: order.user_avatar_url,
            openid: order.user_openid
          }
        },
        items,
        payment: payments[0] || null,
        payments,
        shipment: shipments[0] || null,
        shipments,
        refund: refunds[0] || null,
        refunds,
        logs
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:id/ship", async (req, res, next) => {
    try {
      const orderId = normalizePositiveId(req.params.id);
      if (!orderId) {
        throw createHttpError(400, "订单 ID 非法");
      }

      const logisticsCompany = getBodyField(req.body, ["logisticsCompany", "logistics_company"]);
      const trackingNo = getBodyField(req.body, ["trackingNo", "tracking_no"]);
      const remark = typeof req.body.remark === "string" && req.body.remark.trim() ? req.body.remark.trim() : null;

      if (!logisticsCompany || !trackingNo) {
        throw createHttpError(400, "物流公司和单号不能为空");
      }

      const result = await withTransaction(db, async (conn) => {
        const [orderRows] = await conn.query(
          "SELECT id, order_status FROM orders WHERE id = ? FOR UPDATE",
          [orderId]
        );

        if (!orderRows.length) {
          throw createHttpError(404, "订单不存在");
        }

        const order = orderRows[0];
        if (order.order_status !== "pending_production") {
          throw createHttpError(400, "当前订单状态不允许发货");
        }

        const [insertResult] = await conn.query(
          `
          INSERT INTO shipments
          (order_id, logistics_company, tracking_no, shipment_status, shipped_at, remark)
          VALUES (?, ?, ?, 'shipped', NOW(), ?)
          `,
          [orderId, logisticsCompany, trackingNo, remark]
        );

        await conn.query(
          "UPDATE orders SET order_status = 'pending_shipment' WHERE id = ?",
          [orderId]
        );
        await conn.query(
          `
          INSERT INTO order_status_logs
          (order_id, from_status, to_status, operator_type, operator_id, note)
          VALUES (?, 'pending_production', 'pending_shipment', 'admin', NULL, ?)
          `,
          [orderId, remark || "录入物流信息"]
        );

        return {
          shipmentId: insertResult.insertId
        };
      });

      res.status(201).json({
        message: "发货信息已录入",
        orderId,
        orderStatus: "pending_shipment",
        ...result
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:id/complete", async (req, res, next) => {
    try {
      const orderId = normalizePositiveId(req.params.id);
      if (!orderId) {
        throw createHttpError(400, "订单 ID 非法");
      }

      const restoreStatus = await withTransaction(db, async (conn) => {
        const [orderRows] = await conn.query(
          "SELECT id, order_status FROM orders WHERE id = ? FOR UPDATE",
          [orderId]
        );

        if (!orderRows.length) {
          throw createHttpError(404, "订单不存在");
        }

        const order = orderRows[0];
        if (order.order_status !== "pending_shipment") {
          throw createHttpError(400, "当前订单状态不允许完结");
        }

        await conn.query(
          "UPDATE orders SET order_status = 'completed', completed_at = NOW() WHERE id = ?",
          [orderId]
        );
        await conn.query(
          `
          INSERT INTO order_status_logs
          (order_id, from_status, to_status, operator_type, operator_id, note)
          VALUES (?, 'pending_shipment', 'completed', 'admin', NULL, ?)
          `,
          [orderId, "订单已完成"]
        );
      });

      res.json({
        message: "订单已完成",
        orderId,
        orderStatus: "completed"
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:id/cancel", async (req, res, next) => {
    try {
      const orderId = normalizePositiveId(req.params.id);
      if (!orderId) {
        throw createHttpError(400, "订单 ID 非法");
      }

      const restoreStatus = await withTransaction(db, async (conn) => {
        const [orderRows] = await conn.query(
          "SELECT id, order_status FROM orders WHERE id = ? FOR UPDATE",
          [orderId]
        );

        if (!orderRows.length) {
          throw createHttpError(404, "订单不存在");
        }

        const order = orderRows[0];
        if (order.order_status !== "pending_payment") {
          throw createHttpError(400, "当前订单状态不允许取消");
        }

        await conn.query(
          `
          UPDATE orders
          SET order_status = 'cancelled',
              pay_status = 'closed',
              cancelled_at = NOW()
          WHERE id = ?
          `,
          [orderId]
        );
        await conn.query(
          `
          INSERT INTO order_status_logs
          (order_id, from_status, to_status, operator_type, operator_id, note)
          VALUES (?, ?, 'cancelled', 'admin', NULL, ?)
          `,
          [orderId, order.order_status, "订单已取消"]
        );
      });

      res.json({
        message: "订单已取消",
        orderId,
        orderStatus: "cancelled"
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/refunds", async (req, res, next) => {
    try {
      const status = normalizeText(req.query.status);
      const keyword = normalizeText(req.query.keyword);
      const page = normalizeNumber(req.query.page, 1);
      const pageSize = normalizeNumber(req.query.pageSize, 20);
      const offset = (page - 1) * pageSize;
      const { whereSql, params } = buildRefundSearch({ status, keyword });

      const [countRows] = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM refunds r
        LEFT JOIN orders o ON o.id = r.order_id
        LEFT JOIN users u ON u.id = o.user_id
        ${whereSql}
        `,
        params
      );
      const total = Number(countRows[0]?.total || 0);

      const [rows] = await db.query(
        `
        SELECT
          r.id,
          r.refund_no,
          r.refund_amount,
          r.reason,
          r.status,
          r.requested_at,
          r.processed_at,
          o.id AS order_id,
          o.order_no,
          o.order_status,
          o.pay_status,
          o.payable_amount,
          u.nickname AS user_nickname,
          u.phone AS user_phone
        FROM refunds r
        LEFT JOIN orders o ON o.id = r.order_id
        LEFT JOIN users u ON u.id = o.user_id
        ${whereSql}
        ORDER BY r.id DESC
        LIMIT ? OFFSET ?
        `,
        [...params, pageSize, offset]
      );

      res.json({
        items: rows,
        page,
        pageSize,
        total
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/refunds/:id/approve", async (req, res, next) => {
    try {
      const refundId = normalizePositiveId(req.params.id);
      if (!refundId) {
        throw createHttpError(400, "退款单 ID 非法");
      }

      await withTransaction(db, async (conn) => {
        const [refundRows] = await conn.query(
          `
          SELECT
            r.id,
            r.order_id,
            r.status AS refund_status,
            r.refund_amount,
            o.order_status,
            o.pay_status
          FROM refunds r
          LEFT JOIN orders o ON o.id = r.order_id
          WHERE r.id = ?
          FOR UPDATE
          `,
          [refundId]
        );

        if (!refundRows.length) {
          throw createHttpError(404, "退款单不存在");
        }

        const refund = refundRows[0];
        if (refund.refund_status !== "pending" || refund.order_status !== "refund_pending") {
          throw createHttpError(400, "当前退款状态不允许通过");
        }

        await conn.query(
          "UPDATE refunds SET status = 'success', processed_at = NOW() WHERE id = ?",
          [refundId]
        );
        await conn.query(
          "UPDATE orders SET order_status = 'refunded', pay_status = 'refunded' WHERE id = ?",
          [refund.order_id]
        );
        await conn.query(
          "UPDATE payments SET status = 'refunded' WHERE order_id = ? AND status IN ('success', 'refund_pending')",
          [refund.order_id]
        );
        await conn.query(
          `
          INSERT INTO order_status_logs
          (order_id, from_status, to_status, operator_type, operator_id, note)
          VALUES (?, 'refund_pending', 'refunded', 'admin', NULL, ?)
          `,
          [refund.order_id, "退款审核通过"]
        );
      });

      res.json({
        message: "退款已通过",
        refundId,
        orderStatus: "refunded"
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/refunds/:id/reject", async (req, res, next) => {
    try {
      const refundId = normalizePositiveId(req.params.id);
      if (!refundId) {
        throw createHttpError(400, "退款单 ID 非法");
      }

      const restoreStatus = await withTransaction(db, async (conn) => {
        const [refundRows] = await conn.query(
          `
          SELECT
            r.id,
            r.order_id,
            r.payment_id,
            r.status AS refund_status,
            o.order_status,
            o.pay_status
          FROM refunds r
          LEFT JOIN orders o ON o.id = r.order_id
          WHERE r.id = ?
          FOR UPDATE
          `,
          [refundId]
        );

        if (!refundRows.length) {
          throw createHttpError(404, "退款单不存在");
        }

        const refund = refundRows[0];
        if (refund.refund_status !== "pending" || refund.order_status !== "refund_pending") {
          throw createHttpError(400, "当前退款状态不允许驳回");
        }

        const restoreStatus = await getRefundRestoreStatus(conn, refund.order_id);
        if (!restoreStatus) {
          throw createHttpError(500, "退款单缺少原始订单状态");
        }
        if (!refund.payment_id) {
          throw createHttpError(500, "退款单缺少支付记录");
        }

        await conn.query(
          "UPDATE refunds SET status = 'rejected', processed_at = NOW() WHERE id = ?",
          [refundId]
        );
        await conn.query(
          "UPDATE orders SET order_status = ?, pay_status = 'paid' WHERE id = ?",
          [restoreStatus, refund.order_id]
        );
        await conn.query(
          "UPDATE payments SET status = 'success' WHERE id = ? AND status = 'refund_pending'",
          [refund.payment_id]
        );
        await conn.query(
          `
          INSERT INTO order_status_logs
          (order_id, from_status, to_status, operator_type, operator_id, note)
          VALUES (?, 'refund_pending', ?, 'admin', NULL, ?)
          `,
          [refund.order_id, restoreStatus, "退款审核驳回"]
        );

        return restoreStatus;
      });

      res.json({
        message: "退款已驳回",
        refundId,
        orderStatus: restoreStatus
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = createAdminRouter;
