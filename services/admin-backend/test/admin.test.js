const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const createApp = require("../src/app");

function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      resolve({ server, port: address.port });
    });
  });
}

async function request(serverPort, method, path, body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${serverPort}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  const text = await response.text();
  if (text) {
    data = JSON.parse(text);
  }

  return { response, data };
}

function createFakeDb(overrides = {}) {
  const state = {
    orders: [
      {
        id: 123,
        order_status: "pending_production",
        pay_status: "paid"
      }
    ],
    payments: [],
    refunds: [],
    shipments: [],
    logs: [],
    ...overrides
  };

  function findOrder(orderId) {
    return state.orders.find((item) => Number(item.id) === Number(orderId));
  }

  function findPayment(paymentId) {
    return state.payments.find((item) => Number(item.id) === Number(paymentId));
  }

  function findRefund(refundId) {
    return state.refunds.find((item) => Number(item.id) === Number(refundId));
  }

  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params = []) => {
      const normalizedSql = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (normalizedSql.startsWith("select id, order_status from orders where id = ? for update")) {
        const order = findOrder(params[0]);
        return [order ? [{ ...order }] : []];
      }

      if (
        normalizedSql.startsWith(
          "select r.id, r.order_id, r.payment_id, r.status as refund_status, o.order_status, o.pay_status from refunds r left join orders o on o.id = r.order_id where r.id = ? for update"
        )
      ) {
        const refund = findRefund(params[0]);
        const order = refund ? findOrder(refund.order_id) : null;
        return [refund && order ? [{
          id: refund.id,
          order_id: refund.order_id,
          payment_id: refund.payment_id,
          refund_status: refund.status,
          order_status: order.order_status,
          pay_status: order.pay_status
        }] : []];
      }

      if (
        normalizedSql.startsWith(
          "select from_status from order_status_logs where order_id = ? and to_status = 'refund_pending' order by id desc limit 1"
        )
      ) {
        const orderId = Number(params[0]);
        const rows = [...state.logs]
          .filter((item) => Number(item.order_id) === orderId && item.to_status === "refund_pending")
          .slice(-1)
          .map((item) => ({ from_status: item.from_status }));
        return [rows];
      }

      if (normalizedSql.startsWith("insert into shipments")) {
        const nextId = state.shipments.length + 1;
        state.shipments.push({
          id: nextId,
          order_id: Number(params[0]),
          logistics_company: params[1],
          tracking_no: params[2],
          remark: params[3],
          shipment_status: "shipped"
        });
        return [{ insertId: nextId, affectedRows: 1 }];
      }

      if (normalizedSql.startsWith("update orders set order_status = 'pending_shipment' where id = ?")) {
        const order = findOrder(params[0]);
        if (order) {
          order.order_status = "pending_shipment";
        }
        return [{ affectedRows: order ? 1 : 0 }];
      }

      if (normalizedSql.startsWith("update orders set order_status = ?, pay_status = 'paid' where id = ?")) {
        const order = findOrder(params[1]);
        if (order) {
          order.order_status = params[0];
          order.pay_status = "paid";
        }
        return [{ affectedRows: order ? 1 : 0 }];
      }

      if (normalizedSql.startsWith("update orders set order_status = 'cancelled', pay_status = 'closed', cancelled_at = now() where id = ?")) {
        const order = findOrder(params[0]);
        if (order) {
          order.order_status = "cancelled";
          order.pay_status = "closed";
        }
        return [{ affectedRows: order ? 1 : 0 }];
      }

      if (normalizedSql.startsWith("update payments set status = 'success' where id = ? and status = 'refund_pending'")) {
        const payment = findPayment(params[0]);
        if (payment && payment.status === "refund_pending") {
          payment.status = "success";
          return [{ affectedRows: 1 }];
        }
        return [{ affectedRows: 0 }];
      }

      if (normalizedSql.startsWith("update refunds set status = 'rejected', processed_at = now() where id = ?")) {
        const refund = findRefund(params[0]);
        if (refund) {
          refund.status = "rejected";
          refund.processed_at = "2026-04-09T00:00:00.000Z";
        }
        return [{ affectedRows: refund ? 1 : 0 }];
      }

      if (normalizedSql.startsWith("insert into order_status_logs")) {
        if (normalizedSql.includes("values (?, 'pending_production', 'pending_shipment', 'admin', null, ?)")) {
          state.logs.push({
            order_id: Number(params[0]),
            from_status: "pending_production",
            to_status: "pending_shipment",
            note: params[1]
          });
          return [{ insertId: state.logs.length, affectedRows: 1 }];
        }

        if (normalizedSql.includes("values (?, 'pending_shipment', 'completed', 'admin', null, ?)")) {
          state.logs.push({
            order_id: Number(params[0]),
            from_status: "pending_shipment",
            to_status: "completed",
            note: params[1]
          });
          return [{ insertId: state.logs.length, affectedRows: 1 }];
        }

        if (normalizedSql.includes("values (?, ?, 'cancelled', 'admin', null, ?)")) {
          state.logs.push({
            order_id: Number(params[0]),
            from_status: params[1],
            to_status: "cancelled",
            note: params[2]
          });
          return [{ insertId: state.logs.length, affectedRows: 1 }];
        }

        if (normalizedSql.includes("values (?, 'refund_pending', 'refunded', 'admin', null, ?)")) {
          state.logs.push({
            order_id: Number(params[0]),
            from_status: "refund_pending",
            to_status: "refunded",
            note: params[1]
          });
          return [{ insertId: state.logs.length, affectedRows: 1 }];
        }

        if (normalizedSql.includes("values (?, 'refund_pending', ?, 'admin', null, ?)")) {
          state.logs.push({
            order_id: Number(params[0]),
            from_status: "refund_pending",
            to_status: params[1],
            note: params[2]
          });
          return [{ insertId: state.logs.length, affectedRows: 1 }];
        }

        throw new Error(`Unexpected order_status_logs SQL in test fake connection: ${sql}`);
      }

      throw new Error(`Unexpected SQL in test fake connection: ${sql}`);
    }
  };

  return {
    state,
    query: async () => {
      throw new Error("List/detail queries are not expected in this test");
    },
    getConnection: async () => connection
  };
}

test("admin auth blocks requests without x-admin-key", async () => {
  const app = createApp({
    db: {
      query: async () => {
        throw new Error("db should not be called");
      },
      getConnection: async () => {
        throw new Error("db should not be called");
      }
    },
    adminApiKey: "secret"
  });

  const { server, port } = await startServer(app);
  try {
    const { response } = await request(port, "GET", "/api/admin/orders");
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("ship endpoint stores shipment data and advances order status", async () => {
  const fakeDb = createFakeDb();
  const app = createApp({
    db: fakeDb,
    adminApiKey: "secret"
  });

  const { server, port } = await startServer(app);
  try {
    const { response, data } = await request(
      port,
      "POST",
      "/api/admin/orders/123/ship",
      {
        logisticsCompany: "SF Express",
        trackingNo: "SF123456789",
        remark: "urgent"
      },
      {
        "x-admin-key": "secret"
      }
    );

    assert.equal(response.status, 201);
    assert.equal(data.shipmentId, 1);
    assert.equal(fakeDb.state.orders[0].order_status, "pending_shipment");
    assert.equal(fakeDb.state.shipments[0].tracking_no, "SF123456789");
    assert.equal(fakeDb.state.logs[0].to_status, "pending_shipment");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("refund reject restores the previous order status and payment state", async () => {
  const fakeDb = createFakeDb({
    orders: [
      {
        id: 201,
        order_status: "refund_pending",
        pay_status: "refund_pending"
      }
    ],
    payments: [
      {
        id: 88,
        order_id: 201,
        status: "refund_pending"
      }
    ],
    refunds: [
      {
        id: 7,
        order_id: 201,
        payment_id: 88,
        status: "pending"
      }
    ],
    logs: [
      {
        order_id: 201,
        from_status: "pending_shipment",
        to_status: "refund_pending",
        note: "user refund request"
      }
    ]
  });
  const app = createApp({
    db: fakeDb,
    adminApiKey: "secret"
  });

  const { server, port } = await startServer(app);
  try {
    const { response, data } = await request(
      port,
      "POST",
      "/api/admin/refunds/7/reject",
      {},
      {
        "x-admin-key": "secret"
      }
    );

    assert.equal(response.status, 200);
    assert.equal(data.orderStatus, "pending_shipment");
    assert.equal(fakeDb.state.refunds[0].status, "rejected");
    assert.equal(fakeDb.state.orders[0].order_status, "pending_shipment");
    assert.equal(fakeDb.state.orders[0].pay_status, "paid");
    assert.equal(fakeDb.state.payments[0].status, "success");
    assert.equal(fakeDb.state.logs.at(-1).to_status, "pending_shipment");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("cancel endpoint only allows pending_payment orders", async () => {
  const fakeDb = createFakeDb({
    orders: [
      {
        id: 301,
        order_status: "pending_production",
        pay_status: "paid"
      }
    ]
  });
  const app = createApp({
    db: fakeDb,
    adminApiKey: "secret"
  });

  const { server, port } = await startServer(app);
  try {
    const { response } = await request(
      port,
      "POST",
      "/api/admin/orders/301/cancel",
      {},
      {
        "x-admin-key": "secret"
      }
    );

    assert.equal(response.status, 400);
    assert.equal(fakeDb.state.orders[0].order_status, "pending_production");
    assert.equal(fakeDb.state.orders[0].pay_status, "paid");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
