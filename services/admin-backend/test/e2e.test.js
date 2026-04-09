const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const createMockPool = require("../../user-backend/test/support/mock-pool");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, " ").trim().toLowerCase();
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

function sanitizeLike(value) {
  return String(value || "").replaceAll("%", "").trim().toLowerCase();
}

function parseOrderSearchParams(params, withPaging) {
  const values = withPaging ? params.slice(0, -2) : params;
  if (values.length === 4) {
    return { status: String(values[0]), keyword: sanitizeLike(values[1]) };
  }
  if (values.length === 1) {
    return { status: String(values[0]), keyword: "" };
  }
  if (values.length === 3) {
    return { status: "all", keyword: sanitizeLike(values[0]) };
  }
  return { status: "all", keyword: "" };
}

function parseRefundSearchParams(params, withPaging) {
  const values = withPaging ? params.slice(0, -2) : params;
  if (values.length === 5) {
    return { status: String(values[0]), keyword: sanitizeLike(values[1]) };
  }
  if (values.length === 1) {
    return { status: String(values[0]), keyword: "" };
  }
  if (values.length === 4) {
    return { status: "all", keyword: sanitizeLike(values[0]) };
  }
  return { status: "all", keyword: "" };
}

function buildAdminDb(state) {
  function findUser(userId) {
    return state.users.find((item) => Number(item.id) === Number(userId)) || null;
  }

  function findOrder(orderId) {
    return state.orders.find((item) => Number(item.id) === Number(orderId)) || null;
  }

  function findRefund(refundId) {
    return state.refunds.find((item) => Number(item.id) === Number(refundId)) || null;
  }

  function filterOrders(status, keyword) {
    return state.orders
      .filter((order) => (status && status !== "all" ? order.order_status === status : true))
      .filter((order) => {
        if (!keyword) return true;
        const user = findUser(order.user_id);
        return [order.order_no, user?.nickname, user?.phone].join(" ").toLowerCase().includes(keyword);
      })
      .sort((a, b) => Number(b.id) - Number(a.id));
  }

  function filterRefunds(status, keyword) {
    return state.refunds
      .filter((refund) => (status && status !== "all" ? refund.status === status : true))
      .filter((refund) => {
        if (!keyword) return true;
        const order = findOrder(refund.order_id);
        const user = order ? findUser(order.user_id) : null;
        return [refund.refund_no, order?.order_no, user?.nickname, user?.phone].join(" ").toLowerCase().includes(keyword);
      })
      .sort((a, b) => Number(b.id) - Number(a.id));
  }

  async function handleQuery(sql, params = []) {
    const normalized = normalizeSql(sql);

    if (normalized.startsWith("select count(*) as total from orders o left join users u on u.id = o.user_id")) {
      const { status, keyword } = parseOrderSearchParams(params, false);
      return [[{ total: filterOrders(status, keyword).length }]];
    }

    if (normalized.startsWith("select o.id, o.order_no, o.order_status, o.pay_status, o.payable_amount, o.paid_amount, o.created_at, o.updated_at, u.nickname as user_nickname, u.phone as user_phone from orders o left join users u on u.id = o.user_id")) {
      const { status, keyword } = parseOrderSearchParams(params, true);
      const limit = Number(params[params.length - 2]);
      const offset = Number(params[params.length - 1]);
      const rows = filterOrders(status, keyword)
        .slice(offset, offset + limit)
        .map((order) => {
          const user = findUser(order.user_id);
          return {
            id: order.id,
            order_no: order.order_no,
            order_status: order.order_status,
            pay_status: order.pay_status,
            payable_amount: order.payable_amount,
            paid_amount: order.paid_amount,
            created_at: order.created_at,
            updated_at: order.updated_at,
            user_nickname: user?.nickname || null,
            user_phone: user?.phone || null
          };
        });
      return [rows.map(clone)];
    }

    if (normalized.startsWith("select o.*, u.nickname as user_nickname, u.phone as user_phone, u.avatar_url as user_avatar_url, u.openid as user_openid from orders o left join users u on u.id = o.user_id where o.id = ? limit 1")) {
      const order = findOrder(params[0]);
      if (!order) return [[]];
      const user = findUser(order.user_id);
      return [[{
        ...clone(order),
        user_nickname: user?.nickname || null,
        user_phone: user?.phone || null,
        user_avatar_url: user?.avatar_url || null,
        user_openid: user?.openid || null
      }]];
    }

    if (normalized.startsWith("select * from order_items where order_id = ? order by id asc")) {
      const orderId = Number(params[0]);
      return [state.order_items.filter((item) => Number(item.order_id) === orderId).sort((a, b) => Number(a.id) - Number(b.id)).map(clone)];
    }

    if (normalized.startsWith("select * from payments where order_id = ? order by id desc")) {
      const orderId = Number(params[0]);
      return [state.payments.filter((item) => Number(item.order_id) === orderId).sort((a, b) => Number(b.id) - Number(a.id)).map(clone)];
    }

    if (normalized.startsWith("select * from shipments where order_id = ? order by id desc")) {
      const orderId = Number(params[0]);
      return [state.shipments.filter((item) => Number(item.order_id) === orderId).sort((a, b) => Number(b.id) - Number(a.id)).map(clone)];
    }

    if (normalized.startsWith("select * from refunds where order_id = ? order by id desc")) {
      const orderId = Number(params[0]);
      return [state.refunds.filter((item) => Number(item.order_id) === orderId).sort((a, b) => Number(b.id) - Number(a.id)).map(clone)];
    }

    if (normalized.startsWith("select * from order_status_logs where order_id = ? order by created_at asc, id asc")) {
      const orderId = Number(params[0]);
      return [state.order_status_logs.filter((item) => Number(item.order_id) === orderId).sort((a, b) => {
        const timeCompare = String(a.created_at).localeCompare(String(b.created_at));
        if (timeCompare !== 0) return timeCompare;
        return Number(a.id) - Number(b.id);
      }).map(clone)];
    }

    if (normalized.startsWith("select count(*) as total from refunds r left join orders o on o.id = r.order_id left join users u on u.id = o.user_id")) {
      const { status, keyword } = parseRefundSearchParams(params, false);
      return [[{ total: filterRefunds(status, keyword).length }]];
    }

    if (normalized.startsWith("select r.id, r.refund_no, r.refund_amount, r.reason, r.status, r.requested_at, r.processed_at, o.id as order_id, o.order_no, o.order_status, o.pay_status, o.payable_amount, u.nickname as user_nickname, u.phone as user_phone from refunds r left join orders o on o.id = r.order_id left join users u on u.id = o.user_id")) {
      const { status, keyword } = parseRefundSearchParams(params, true);
      const limit = Number(params[params.length - 2]);
      const offset = Number(params[params.length - 1]);
      const rows = filterRefunds(status, keyword)
        .slice(offset, offset + limit)
        .map((refund) => {
          const order = findOrder(refund.order_id);
          const user = order ? findUser(order.user_id) : null;
          return {
            id: refund.id,
            refund_no: refund.refund_no,
            refund_amount: refund.refund_amount,
            reason: refund.reason,
            status: refund.status,
            requested_at: refund.requested_at,
            processed_at: refund.processed_at,
            order_id: order?.id || null,
            order_no: order?.order_no || null,
            order_status: order?.order_status || null,
            pay_status: order?.pay_status || null,
            payable_amount: order?.payable_amount || null,
            user_nickname: user?.nickname || null,
            user_phone: user?.phone || null
          };
        });
      return [rows.map(clone)];
    }

    throw new Error(`Unexpected admin query SQL: ${sql}`);
  }

  const connection = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params = []) => {
      const normalized = normalizeSql(sql);

      if (normalized.startsWith("select id, order_status from orders where id = ? for update")) {
        const order = findOrder(params[0]);
        return [order ? [{ id: order.id, order_status: order.order_status }] : []];
      }

      if (normalized.startsWith("insert into shipments")) {
        const row = {
          id: nextId(state.shipments),
          order_id: Number(params[0]),
          logistics_company: params[1],
          tracking_no: params[2],
          shipment_status: "shipped",
          shipped_at: new Date().toISOString(),
          remark: params[3] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        state.shipments.push(row);
        return [{ insertId: row.id, affectedRows: 1 }];
      }

      if (normalized.startsWith("update orders set order_status = 'pending_shipment' where id = ?")) {
        const order = findOrder(params[0]);
        if (order) {
          order.order_status = "pending_shipment";
          order.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: order ? 1 : 0 }];
      }

      if (normalized.startsWith("update orders set order_status = 'completed', completed_at = now() where id = ?")) {
        const order = findOrder(params[0]);
        if (order) {
          order.order_status = "completed";
          order.completed_at = new Date().toISOString();
          order.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: order ? 1 : 0 }];
      }

      if (normalized.startsWith("select r.id, r.order_id, r.status as refund_status, r.refund_amount, o.order_status, o.pay_status from refunds r left join orders o on o.id = r.order_id where r.id = ? for update")) {
        const refund = findRefund(params[0]);
        const order = refund ? findOrder(refund.order_id) : null;
        return [refund && order ? [{
          id: refund.id,
          order_id: refund.order_id,
          refund_status: refund.status,
          refund_amount: refund.refund_amount,
          order_status: order.order_status,
          pay_status: order.pay_status
        }] : []];
      }

      if (normalized.startsWith("update refunds set status = 'success', processed_at = now() where id = ?")) {
        const refund = findRefund(params[0]);
        if (refund) {
          refund.status = "success";
          refund.processed_at = new Date().toISOString();
          refund.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: refund ? 1 : 0 }];
      }

      if (normalized.startsWith("update orders set order_status = 'refunded', pay_status = 'refunded' where id = ?")) {
        const order = findOrder(params[0]);
        if (order) {
          order.order_status = "refunded";
          order.pay_status = "refunded";
          order.updated_at = new Date().toISOString();
        }
        return [{ affectedRows: order ? 1 : 0 }];
      }

      if (normalized.startsWith("update payments set status = 'refunded' where order_id = ? and status in ('success', 'refund_pending')")) {
        let affectedRows = 0;
        for (const payment of state.payments) {
          if (Number(payment.order_id) === Number(params[0]) && ["success", "refund_pending"].includes(payment.status)) {
            payment.status = "refunded";
            payment.updated_at = new Date().toISOString();
            affectedRows += 1;
          }
        }
        return [{ affectedRows }];
      }

      if (normalized.startsWith("insert into order_status_logs")) {
        const row = buildStatusLogRow(normalized, params, state);
        state.order_status_logs.push(row);
        return [{ insertId: row.id, affectedRows: 1 }];
      }

      return handleQuery(sql, params);
    }
  };

  return {
    query: handleQuery,
    getConnection: async () => connection
  };
}

function buildStatusLogRow(normalizedSql, params, state) {
  const base = {
    id: nextId(state.order_status_logs),
    operator_id: null,
    created_at: new Date().toISOString()
  };

  if (normalizedSql.includes("values (?, 'pending_production', 'pending_shipment', 'admin', null, ?)")) {
    return { ...base, order_id: Number(params[0]), from_status: "pending_production", to_status: "pending_shipment", operator_type: "admin", note: params[1] };
  }
  if (normalizedSql.includes("values (?, 'pending_shipment', 'completed', 'admin', null, ?)")) {
    return { ...base, order_id: Number(params[0]), from_status: "pending_shipment", to_status: "completed", operator_type: "admin", note: params[1] };
  }
  if (normalizedSql.includes("values (?, 'refund_pending', 'refunded', 'admin', null, ?)")) {
    return { ...base, order_id: Number(params[0]), from_status: "refund_pending", to_status: "refunded", operator_type: "admin", note: params[1] };
  }

  throw new Error(`Unexpected admin status log SQL: ${normalizedSql}`);
}

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

async function request(port, method, requestPath, { body, headers } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${requestPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

const pool = createMockPool();
const userDbPath = path.resolve(__dirname, "../../user-backend/src/config/db.js");
require.cache[userDbPath] = {
  id: userDbPath,
  filename: userDbPath,
  loaded: true,
  exports: pool
};

const userApp = require("../../user-backend/src/app");
const createAdminApp = require("../src/app");

test("e2e: user pays order and admin ships then completes it", async () => {
  pool.reset();
  const adminDb = buildAdminDb(pool.state);
  const adminApp = createAdminApp({ db: adminDb, adminApiKey: "secret" });

  const [{ server: userServer, port: userPort }, { server: adminServer, port: adminPort }] = await Promise.all([
    startServer(userApp),
    startServer(adminApp)
  ]);

  try {
    const login = await request(userPort, "POST", "/api/auth/mock-login", {
      body: { mockOpenId: "flow-user-1", nickname: "Flow User 1" }
    });
    assert.equal(login.response.status, 201);
    const userId = login.data.userId;

    const address = await request(userPort, "POST", "/api/addresses", {
      headers: { "x-user-id": String(userId) },
      body: {
        receiverName: "Flow User",
        receiverPhone: "13800000000",
        province: "Zhejiang",
        city: "Hangzhou",
        district: "Xihu",
        detailAddress: "Wensan Road 1",
        postalCode: "310000",
        tag: "home",
        isDefault: 1
      }
    });
    assert.equal(address.response.status, 201);

    const addCart = await request(userPort, "POST", "/api/cart/items", {
      headers: { "x-user-id": String(userId) },
      body: { beadId: 1, quantity: 2, wristSizeCm: 16 }
    });
    assert.equal(addCart.response.status, 201);

    const createOrder = await request(userPort, "POST", "/api/orders", {
      headers: { "x-user-id": String(userId) },
      body: { wristSizeCm: 16, addressId: address.data.id, remark: "ship flow" }
    });
    assert.equal(createOrder.response.status, 201);
    const orderId = createOrder.data.orderId;

    const prepay = await request(userPort, "POST", "/api/payments/prepay", {
      headers: { "x-user-id": String(userId) },
      body: { orderId }
    });
    assert.equal(prepay.response.status, 201);

    const callback = await request(userPort, "POST", "/api/payments/callback", {
      body: { paymentNo: prepay.data.paymentNo, success: true, transactionId: "wx-e2e-ship" }
    });
    assert.equal(callback.response.status, 200);

    pool.state.orders.push({
      id: nextId(pool.state.orders),
      order_no: "NOISE-ORDER-1",
      user_id: userId,
      order_status: "pending_payment",
      pay_status: "unpaid",
      payable_amount: 88,
      paid_amount: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const adminOrders = await request(adminPort, "GET", "/api/admin/orders?status=pending_production&page=1&pageSize=10", {
      headers: { "x-admin-key": "secret" }
    });
    assert.equal(adminOrders.response.status, 200);
    assert.equal(adminOrders.data.total, 1);
    assert.equal(adminOrders.data.items[0].id, orderId);

    const ship = await request(adminPort, "POST", `/api/admin/orders/${orderId}/ship`, {
      headers: { "x-admin-key": "secret" },
      body: { logisticsCompany: "SF Express", trackingNo: "SF202604090001", remark: "e2e ship" }
    });
    assert.equal(ship.response.status, 201);
    assert.equal(ship.data.orderStatus, "pending_shipment");

    const complete = await request(adminPort, "POST", `/api/admin/orders/${orderId}/complete`, {
      headers: { "x-admin-key": "secret" }
    });
    assert.equal(complete.response.status, 200);
    assert.equal(complete.data.orderStatus, "completed");

    const userDetail = await request(userPort, "GET", `/api/orders/${orderId}`, {
      headers: { "x-user-id": String(userId) }
    });
    assert.equal(userDetail.response.status, 200);
    assert.equal(userDetail.data.order.orderStatus, "completed");
    assert.equal(userDetail.data.logisticsSummary.trackingNo, "SF202604090001");
    assert.equal(pool.state.payments[0].status, "success");
  } finally {
    await Promise.all([
      new Promise((resolve) => userServer.close(resolve)),
      new Promise((resolve) => adminServer.close(resolve))
    ]);
  }
});

test("e2e: user requests refund and admin approves it", async () => {
  pool.reset();
  const adminDb = buildAdminDb(pool.state);
  const adminApp = createAdminApp({ db: adminDb, adminApiKey: "secret" });

  const [{ server: userServer, port: userPort }, { server: adminServer, port: adminPort }] = await Promise.all([
    startServer(userApp),
    startServer(adminApp)
  ]);

  try {
    const login = await request(userPort, "POST", "/api/auth/mock-login", {
      body: { mockOpenId: "flow-user-2", nickname: "Flow User 2" }
    });
    const userId = login.data.userId;

    const address = await request(userPort, "POST", "/api/addresses", {
      headers: { "x-user-id": String(userId) },
      body: {
        receiverName: "Refund User",
        receiverPhone: "13800000001",
        province: "Guangdong",
        city: "Shenzhen",
        district: "Nanshan",
        detailAddress: "Science Park 18",
        postalCode: "518000",
        tag: "office",
        isDefault: 1
      }
    });
    assert.equal(address.response.status, 201);

    await request(userPort, "POST", "/api/cart/items", {
      headers: { "x-user-id": String(userId) },
      body: { beadId: 1, quantity: 3, wristSizeCm: 16 }
    }).then(({ response }) => assert.equal(response.status, 201));

    const createOrder = await request(userPort, "POST", "/api/orders", {
      headers: { "x-user-id": String(userId) },
      body: { wristSizeCm: 16, addressId: address.data.id, remark: "refund flow" }
    });
    assert.equal(createOrder.response.status, 201);
    const orderId = createOrder.data.orderId;

    const prepay = await request(userPort, "POST", "/api/payments/prepay", {
      headers: { "x-user-id": String(userId) },
      body: { orderId }
    });
    assert.equal(prepay.response.status, 201);
    await request(userPort, "POST", "/api/payments/callback", {
      body: { paymentNo: prepay.data.paymentNo, success: true, transactionId: "wx-e2e-refund" }
    }).then(({ response }) => assert.equal(response.status, 200));

    const refund = await request(userPort, "POST", `/api/orders/${orderId}/refund`, {
      headers: { "x-user-id": String(userId) },
      body: { reason: "user wants another style" }
    });
    assert.equal(refund.response.status, 201);

    pool.state.refunds.push({
      id: nextId(pool.state.refunds),
      order_id: orderId,
      payment_id: pool.state.payments[0].id,
      refund_no: "RF-NOISE-1",
      refund_amount: 12,
      reason: "already closed",
      status: "success",
      requested_by: "user",
      requested_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const adminRefunds = await request(adminPort, "GET", "/api/admin/refunds?status=pending&page=1&pageSize=10", {
      headers: { "x-admin-key": "secret" }
    });
    assert.equal(adminRefunds.response.status, 200);
    assert.equal(adminRefunds.data.total, 1);
    const refundId = adminRefunds.data.items[0].id;

    const approve = await request(adminPort, "POST", `/api/admin/refunds/${refundId}/approve`, {
      headers: { "x-admin-key": "secret" }
    });
    assert.equal(approve.response.status, 200);
    assert.equal(approve.data.orderStatus, "refunded");

    const userDetail = await request(userPort, "GET", `/api/orders/${orderId}`, {
      headers: { "x-user-id": String(userId) }
    });
    assert.equal(userDetail.response.status, 200);
    assert.equal(userDetail.data.order.orderStatus, "refunded");
    assert.equal(userDetail.data.order.payStatus, "refunded");
    assert.equal(userDetail.data.refundSummary.status, "success");
    assert.equal(pool.state.payments[0].status, "refunded");
  } finally {
    await Promise.all([
      new Promise((resolve) => userServer.close(resolve)),
      new Promise((resolve) => adminServer.close(resolve))
    ]);
  }
});

