const { test, beforeEach } = require("./support/testkit");
const assert = require("node:assert/strict");
const path = require("node:path");
const createMockPool = require("./support/mock-pool");
const supertest = require("./support/supertest");

const pool = createMockPool();
const dbPath = path.resolve(__dirname, "../src/config/db.js");
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: pool
};

const app = require("../src/app");
const request = supertest(app);

const now = new Date().toISOString();

beforeEach(() => {
  pool.reset();
});

test("mock-login returns user profile and app config", async () => {
  const configResponse = await request.get("/api/app-config").expect(200);
  assert.equal(configResponse.body.wristMinCm, 13);
  assert.equal(configResponse.body.wristMaxCm, 21);
  assert.equal(configResponse.body.shippingFee, 12);
  assert.equal(configResponse.body.paymentChannel, "wechat");

  const first = await request
    .post("/api/auth/mock-login")
    .send({ mockOpenId: "openid-demo", nickname: "Alice", avatarUrl: "https://example.com/a.png" })
    .expect(201);
  assert.equal(first.body.userId, 1);
  assert.equal(first.body.profile.nickname, "Alice");
  assert.equal(first.body.profile.avatarUrl, "https://example.com/a.png");

  const second = await request
    .post("/api/auth/mock-login")
    .send({ mockOpenId: "openid-demo", nickname: "Alice Updated" })
    .expect(200);
  assert.equal(second.body.userId, first.body.userId);
  assert.equal(second.body.profile.nickname, "Alice Updated");
  assert.equal(pool.state.users.length, 1);
});

test("cart patch and delete are limited to the current user", async () => {
  pool.reset({
    users: [
      { id: 1, openid: "openid-1", unionid: null, nickname: "U1", avatar_url: null, phone: null, status: "active", created_at: now, updated_at: now },
      { id: 2, openid: "openid-2", unionid: null, nickname: "U2", avatar_url: null, phone: null, status: "active", created_at: now, updated_at: now }
    ],
    carts: [{ id: 1, user_id: 1, created_at: now, updated_at: now }],
    cart_items: [{ id: 11, cart_id: 1, bead_id: 1, quantity: 2, selected: 1, created_at: now, updated_at: now }]
  });

  await request
    .patch("/api/cart/items/11")
    .set("x-user-id", "2")
    .send({ quantity: 3, selected: 1, wristSizeCm: 16 })
    .expect(404);

  await request
    .delete("/api/cart/items/11")
    .set("x-user-id", "2")
    .expect(404);

  assert.equal(pool.state.cart_items.length, 1);
  assert.equal(pool.state.cart_items[0].quantity, 2);
});

test("order cancel updates order and closes initiated payments", async () => {
  pool.reset({
    users: [{ id: 1, openid: "openid-1", unionid: null, nickname: "U1", avatar_url: null, phone: null, status: "active", created_at: now, updated_at: now }],
    orders: [
      {
        id: 20,
        order_no: "CS2026040900000000001",
        user_id: 1,
        order_status: "pending_payment",
        pay_status: "unpaid",
        wrist_size_cm: 16,
        beads_total_diameter_mm: 12,
        items_amount: 24,
        shipping_fee: 12,
        discount_amount: 0,
        payable_amount: 36,
        paid_amount: 0,
        remark: null,
        address_snapshot: null,
        paid_at: null,
        cancelled_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now
      }
    ],
    payments: [
      {
        id: 31,
        order_id: 20,
        payment_no: "PAY-20",
        channel: "wechat",
        status: "initiated",
        pay_amount: 36,
        transaction_id: null,
        callback_payload: null,
        paid_at: null,
        created_at: now,
        updated_at: now
      }
    ]
  });

  const response = await request.post("/api/orders/20/cancel").set("x-user-id", "1").expect(200);
  assert.equal(response.body.message, "订单已取消");
  assert.equal(pool.state.orders[0].order_status, "cancelled");
  assert.equal(pool.state.orders[0].pay_status, "closed");
  assert.equal(pool.state.payments[0].status, "closed");
  assert.equal(pool.state.order_status_logs.length, 1);
});

test("order creation consumes selected cart items and prevents duplicate submission", async () => {
  pool.reset({
    users: [{ id: 1, openid: "openid-1", unionid: null, nickname: "U1", avatar_url: null, phone: null, status: "active", created_at: now, updated_at: now }],
    carts: [{ id: 1, user_id: 1, created_at: now, updated_at: now }],
    cart_items: [
      { id: 11, cart_id: 1, bead_id: 1, quantity: 2, selected: 1, created_at: now, updated_at: now }
    ],
    addresses: [
      {
        id: 7,
        user_id: 1,
        receiver_name: "Alice",
        receiver_phone: "13800000000",
        province: "浙江省",
        city: "杭州市",
        district: "西湖区",
        detail_address: "文三路 1 号",
        is_default: 1,
        created_at: now,
        updated_at: now
      }
    ]
  });

  const first = await request
    .post("/api/orders")
    .set("x-user-id", "1")
    .send({ wristSizeCm: 16, addressId: 7, remark: "first order" })
    .expect(201);
  assert.equal(first.body.orderStatus, "pending_payment");
  assert.equal(first.body.payStatus, "unpaid");
  assert.equal(first.body.payableAmount, 18);
  assert.equal(pool.state.orders.length, 1);
  assert.equal(pool.state.order_items.length, 1);
  assert.equal(pool.state.cart_items.length, 0);
  assert.equal(pool.state.order_status_logs.length, 1);

  await request
    .post("/api/orders")
    .set("x-user-id", "1")
    .send({ wristSizeCm: 16, addressId: 7, remark: "second order" })
    .expect(400);
});

test("prepay reuses the same initiated payment for one order", async () => {
  pool.reset({
    users: [{ id: 1, openid: "openid-1", unionid: null, nickname: "U1", avatar_url: null, phone: null, status: "active", created_at: now, updated_at: now }],
    orders: [
      {
        id: 30,
        order_no: "CS2026040900000000003",
        user_id: 1,
        order_status: "pending_payment",
        pay_status: "unpaid",
        wrist_size_cm: 16,
        beads_total_diameter_mm: 12,
        items_amount: 24,
        shipping_fee: 12,
        discount_amount: 0,
        payable_amount: 36,
        paid_amount: 0,
        remark: null,
        address_snapshot: null,
        paid_at: null,
        cancelled_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now
      }
    ]
  });

  const first = await request.post("/api/payments/prepay").set("x-user-id", "1").send({ orderId: 30 }).expect(201);
  const second = await request.post("/api/payments/prepay").set("x-user-id", "1").send({ orderId: 30 }).expect(200);
  assert.equal(second.body.paymentNo, first.body.paymentNo);
  assert.equal(pool.state.payments.length, 1);
  assert.equal(pool.state.payments[0].status, "initiated");
});

test("payment callback is idempotent after success", async () => {
  pool.reset({
    orders: [
      {
        id: 21,
        order_no: "CS2026040900000000002",
        user_id: 1,
        order_status: "pending_payment",
        pay_status: "unpaid",
        wrist_size_cm: 16,
        beads_total_diameter_mm: 12,
        items_amount: 24,
        shipping_fee: 12,
        discount_amount: 0,
        payable_amount: 36,
        paid_amount: 0,
        remark: null,
        address_snapshot: null,
        paid_at: null,
        cancelled_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now
      }
    ],
    payments: [
      {
        id: 41,
        order_id: 21,
        payment_no: "PAY-21",
        channel: "wechat",
        status: "initiated",
        pay_amount: 36,
        transaction_id: null,
        callback_payload: null,
        paid_at: null,
        created_at: now,
        updated_at: now
      }
    ]
  });

  const first = await request
    .post("/api/payments/callback")
    .send({ paymentNo: "PAY-21", success: true, transactionId: "tx-1" })
    .expect(200);
  assert.equal(first.body.message, "回调处理完成");
  assert.equal(pool.state.orders[0].order_status, "pending_production");
  assert.equal(pool.state.orders[0].pay_status, "paid");
  assert.equal(pool.state.payments[0].status, "success");
  assert.equal(pool.state.order_status_logs.length, 1);

  const second = await request
    .post("/api/payments/callback")
    .send({ paymentNo: "PAY-21", success: true, transactionId: "tx-2" })
    .expect(200);
  assert.equal(second.body.message, "回调已处理");
  assert.equal(pool.state.order_status_logs.length, 1);
  assert.equal(pool.state.orders[0].order_status, "pending_production");
});


