function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, " ").trim().toLowerCase();
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

function createDefaultState() {
  return {
    users: [],
    beads: [
      {
        id: 1,
        sku_code: "BEAD-WHITE-6",
        name: "白水晶 6mm",
        color: "白水晶",
        size_mm: 6,
        unit_price: 3,
        is_active: 1,
        sort_order: 1
      }
    ],
    carts: [],
    cart_items: [],
    addresses: [],
    orders: [],
    order_items: [],
    payments: [],
    shipments: [],
    order_status_logs: [],
    refunds: [],
    system_configs: [
      { config_key: "shipping_fee_fixed", config_value: "12.00" },
      { config_key: "wrist_size_min_cm", config_value: "13.0" },
      { config_key: "wrist_size_max_cm", config_value: "21.0" },
      { config_key: "payment_channel", config_value: "wechat" }
    ]
  };
}

function createMockPool() {
  let state = createDefaultState();

  const pool = {
    get state() {
      return state;
    },
    reset(overrides = {}) {
      state = Object.assign(createDefaultState(), clone(overrides));
    },
    async query(sql, params = []) {
      return handleQuery(state, sql, params);
    },
    async getConnection() {
      return {
        query: pool.query.bind(pool),
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      };
    }
  };

  return pool;
}

function handleQuery(state, sql, params) {
  const normalized = normalizeSql(sql);

  if (normalized.startsWith("select config_key, config_value from system_configs where config_key in")) {
    const keys = new Set(params.length ? params.map(String) : ["shipping_fee_fixed", "wrist_size_min_cm", "wrist_size_max_cm", "payment_channel"]);
    return [state.system_configs.filter((row) => keys.has(row.config_key)).map(clone)];
  }

  if (normalized.startsWith("select id, openid, unionid, nickname, avatar_url, phone, status from users where openid = ? limit 1")) {
    const openid = String(params[0]);
    return [state.users.filter((row) => row.openid === openid).slice(0, 1).map(clone)];
  }

  if (normalized.startsWith("insert into users (openid, unionid, nickname, avatar_url, phone, status)")) {
    const [openid, unionid, nickname, avatarUrl, phone, status] = params;
    const row = {
      id: nextId(state.users),
      openid: String(openid),
      unionid: unionid ?? null,
      nickname: nickname ?? null,
      avatar_url: avatarUrl ?? null,
      phone: phone ?? null,
      status: status ?? "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.users.push(row);
    return [{ insertId: row.id, affectedRows: 1 }];
  }

  if (normalized.startsWith("update users set nickname = ?, avatar_url = ?, unionid = ?, phone = ? where id = ?")) {
    const [nickname, avatarUrl, unionid, phone, id] = params;
    const row = state.users.find((item) => Number(item.id) === Number(id));
    if (!row) {
      return [{ affectedRows: 0, changedRows: 0 }];
    }
    row.nickname = nickname;
    row.avatar_url = avatarUrl;
    row.unionid = unionid;
    row.phone = phone;
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1, changedRows: 1 }];
  }

  if (normalized.startsWith("select id from carts where user_id = ? limit 1")) {
    const userId = Number(params[0]);
    return [state.carts.filter((row) => Number(row.user_id) === userId).slice(0, 1).map(clone)];
  }

  if (normalized.startsWith("insert into carts (user_id) values (?)")) {
    const userId = Number(params[0]);
    const row = {
      id: nextId(state.carts),
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.carts.push(row);
    return [{ insertId: row.id, affectedRows: 1 }];
  }

  if (normalized.startsWith("select ci.id, ci.bead_id, ci.quantity, ci.selected, b.name, b.color, b.size_mm, b.unit_price from cart_items ci join beads b on b.id = ci.bead_id where ci.cart_id = ? order by ci.id asc")) {
    const cartId = Number(params[0]);
    const rows = state.cart_items
      .filter((item) => Number(item.cart_id) === cartId)
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((item) => {
        const bead = state.beads.find((row) => Number(row.id) === Number(item.bead_id));
        return {
          id: item.id,
          bead_id: item.bead_id,
          quantity: item.quantity,
          selected: item.selected,
          name: bead ? bead.name : null,
          color: bead ? bead.color : null,
          size_mm: bead ? bead.size_mm : null,
          unit_price: bead ? bead.unit_price : null
        };
      });
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, size_mm from beads where id = ? and is_active = 1 limit 1")) {
    const id = Number(params[0]);
    return [state.beads.filter((row) => Number(row.id) === id && Number(row.is_active) === 1).slice(0, 1).map(clone)];
  }

  if (normalized.startsWith("select id, selected from cart_items where cart_id = ? and bead_id = ? limit 1")) {
    const cartId = Number(params[0]);
    const beadId = Number(params[1]);
    return [state.cart_items.filter((row) => Number(row.cart_id) === cartId && Number(row.bead_id) === beadId).slice(0, 1).map(clone)];
  }

  if (normalized.startsWith("select ci.id, ci.quantity, ci.selected, b.size_mm from cart_items ci join beads b on b.id = ci.bead_id where ci.cart_id = ?")) {
    const cartId = Number(params[0]);
    const rows = state.cart_items
      .filter((item) => Number(item.cart_id) === cartId)
      .map((item) => {
        const bead = state.beads.find((row) => Number(row.id) === Number(item.bead_id));
        return {
          id: item.id,
          quantity: item.quantity,
          selected: item.selected,
          size_mm: bead ? bead.size_mm : null
        };
      });
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select ci.id, ci.cart_id, ci.quantity, ci.selected, b.size_mm from cart_items ci join carts c on c.id = ci.cart_id join beads b on b.id = ci.bead_id where ci.id = ? and c.user_id = ? limit 1")) {
    const itemId = Number(params[0]);
    const userId = Number(params[1]);
    const item = state.cart_items.find((row) => Number(row.id) === itemId);
    if (!item) {
      return [[]];
    }
    const cart = state.carts.find((row) => Number(row.id) === Number(item.cart_id) && Number(row.user_id) === userId);
    if (!cart) {
      return [[]];
    }
    const bead = state.beads.find((row) => Number(row.id) === Number(item.bead_id));
    return [[
      clone({
        id: item.id,
        cart_id: item.cart_id,
        quantity: item.quantity,
        selected: item.selected,
        size_mm: bead ? bead.size_mm : null
      })
    ]];
  }

  if (normalized.startsWith("update cart_items set quantity = ?, selected = ?, updated_at = now() where id = ?")) {
    const [quantity, selected, id] = params;
    const item = state.cart_items.find((row) => Number(row.id) === Number(id));
    if (!item) {
      return [{ affectedRows: 0, changedRows: 0 }];
    }
    item.quantity = Number(quantity);
    item.selected = Number(selected);
    item.updated_at = new Date().toISOString();
    return [{ affectedRows: 1, changedRows: 1 }];
  }

  if (normalized.startsWith("delete ci from cart_items ci join carts c on c.id = ci.cart_id where ci.id = ? and c.user_id = ?")) {
    const itemId = Number(params[0]);
    const userId = Number(params[1]);
    const before = state.cart_items.length;
    state.cart_items = state.cart_items.filter((item) => {
      if (Number(item.id) !== itemId) {
        return true;
      }
      const cart = state.carts.find((row) => Number(row.id) === Number(item.cart_id));
      return !(cart && Number(cart.user_id) === userId);
    });
    return [{ affectedRows: before - state.cart_items.length }];
  }

  if (normalized.startsWith("select id, order_no as orderno, order_status as orderstatus, pay_status as paystatus, payable_amount as payableamount, created_at as createdat from orders where user_id = ? order by id desc")) {
    const userId = Number(params[0]);
    const rows = state.orders
      .filter((row) => Number(row.user_id) === userId)
      .sort((a, b) => Number(b.id) - Number(a.id))
      .map((row) => ({
        id: row.id,
        orderNo: row.order_no,
        orderStatus: row.order_status,
        payStatus: row.pay_status,
        payableAmount: row.payable_amount,
        createdAt: row.created_at
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, order_no as orderno, order_status as orderstatus, pay_status as paystatus, payable_amount as payableamount, created_at as createdat, updated_at as updatedat from orders where id = ? and user_id = ?")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const rows = state.orders
      .filter((row) => Number(row.id) === id && Number(row.user_id) === userId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        orderNo: row.order_no,
        orderStatus: row.order_status,
        payStatus: row.pay_status,
        payableAmount: row.payable_amount,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, order_status as orderstatus, pay_status as paystatus from orders where id = ? and user_id = ? limit 1 for update")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const rows = state.orders
      .filter((row) => Number(row.id) === id && Number(row.user_id) === userId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        orderStatus: row.order_status,
        payStatus: row.pay_status
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, order_status as orderstatus, pay_status as paystatus, payable_amount as payableamount, paid_amount as paidamount from orders where id = ? and user_id = ? limit 1 for update")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const rows = state.orders
      .filter((row) => Number(row.id) === id && Number(row.user_id) === userId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        orderStatus: row.order_status,
        payStatus: row.pay_status,
        payableAmount: row.payable_amount,
        paidAmount: row.paid_amount
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, order_status as orderstatus, pay_status as paystatus, payable_amount as payableamount from orders where id = ? and user_id = ? limit 1")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const rows = state.orders
      .filter((row) => Number(row.id) === id && Number(row.user_id) === userId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        orderStatus: row.order_status,
        payStatus: row.pay_status,
        payableAmount: row.payable_amount
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select * from addresses where id = ? and user_id = ? limit 1")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    return [state.addresses.filter((row) => Number(row.id) === id && Number(row.user_id) === userId).slice(0, 1).map(clone)];
  }

  if (normalized.startsWith("select ci.bead_id, ci.quantity, b.name, b.color, b.size_mm, b.unit_price from cart_items ci join beads b on b.id = ci.bead_id where ci.cart_id = ? and ci.selected = 1 order by ci.id asc")) {
    const cartId = Number(params[0]);
    const rows = state.cart_items
      .filter((item) => Number(item.cart_id) === cartId && Number(item.selected) === 1)
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((item) => {
        const bead = state.beads.find((row) => Number(row.id) === Number(item.bead_id));
        return {
          bead_id: item.bead_id,
          quantity: item.quantity,
          name: bead ? bead.name : null,
          color: bead ? bead.color : null,
          size_mm: bead ? bead.size_mm : null,
          unit_price: bead ? bead.unit_price : null
        };
      });
    return [rows.map(clone)];
  }

  if (normalized.startsWith("insert into orders")) {
    const [orderNo, userId, wristSizeCm, beadsTotalDiameterMm, itemsAmount, shippingFee, payableAmount, remark, addressSnapshot] = params;
    const row = {
      id: nextId(state.orders),
      order_no: orderNo,
      user_id: Number(userId),
      order_status: "pending_payment",
      pay_status: "unpaid",
      wrist_size_cm: Number(wristSizeCm),
      beads_total_diameter_mm: Number(beadsTotalDiameterMm),
      items_amount: Number(itemsAmount),
      shipping_fee: Number(shippingFee),
      discount_amount: 0,
      payable_amount: Number(payableAmount),
      paid_amount: 0,
      remark: remark ?? null,
      address_snapshot: addressSnapshot,
      paid_at: null,
      cancelled_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.orders.push(row);
    return [{ insertId: row.id, affectedRows: 1 }];
  }

  if (normalized.startsWith("insert into order_items")) {
    const [orderId, beadId, beadName, beadColor, beadSizeMm, beadUnitPrice, quantity, lineAmount] = params;
    const row = {
      id: nextId(state.order_items),
      order_id: Number(orderId),
      bead_id: beadId,
      bead_name: beadName,
      bead_color: beadColor,
      bead_size_mm: Number(beadSizeMm),
      bead_unit_price: Number(beadUnitPrice),
      quantity: Number(quantity),
      line_amount: Number(lineAmount),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.order_items.push(row);
    return [{ insertId: row.id, affectedRows: 1 }];
  }

  if (normalized.startsWith("delete from cart_items where cart_id = ? and selected = 1")) {
    const cartId = Number(params[0]);
    const before = state.cart_items.length;
    state.cart_items = state.cart_items.filter((item) => !(Number(item.cart_id) === cartId && Number(item.selected) === 1));
    return [{ affectedRows: before - state.cart_items.length }];
  }

  if (normalized.startsWith("insert into order_status_logs")) {
    const [orderId, fromStatus, toStatus, operatorType, operatorId, note] = params;
    const row = {
      id: nextId(state.order_status_logs),
      order_id: Number(orderId),
      from_status: fromStatus ?? null,
      to_status: toStatus,
      operator_type: operatorType,
      operator_id: operatorId ?? null,
      note: note ?? null,
      created_at: new Date().toISOString()
    };
    state.order_status_logs.push(row);
    return [{ insertId: row.id, affectedRows: 1 }];
  }

  if (normalized.startsWith("select id, order_no as orderno, order_status as orderstatus, pay_status as paystatus, wrist_size_cm as wristsizecm, beads_total_diameter_mm as beadstotaldiametermm, items_amount as itemsamount, shipping_fee as shippingfee, discount_amount as discountamount, payable_amount as payableamount, paid_amount as paidamount, remark, address_snapshot as addresssnapshot, paid_at as paidat, cancelled_at as cancelledat, completed_at as completedat, created_at as createdat, updated_at as updatedat from orders where id = ? and user_id = ? limit 1")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const rows = state.orders
      .filter((row) => Number(row.id) === id && Number(row.user_id) === userId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        orderNo: row.order_no,
        orderStatus: row.order_status,
        payStatus: row.pay_status,
        wristSizeCm: row.wrist_size_cm,
        beadsTotalDiameterMm: row.beads_total_diameter_mm,
        itemsAmount: row.items_amount,
        shippingFee: row.shipping_fee,
        discountAmount: row.discount_amount,
        payableAmount: row.payable_amount,
        paidAmount: row.paid_amount,
        remark: row.remark,
        addressSnapshot: row.address_snapshot,
        paidAt: row.paid_at,
        cancelledAt: row.cancelled_at,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, bead_id as beadid, bead_name as beadname, bead_color as beadcolor, bead_size_mm as beadsizemm, bead_unit_price as beadunitprice, quantity, line_amount as lineamount, created_at as createdat from order_items where order_id = ? order by id asc")) {
    const orderId = Number(params[0]);
    const rows = state.order_items
      .filter((row) => Number(row.order_id) === orderId)
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map((row) => ({
        id: row.id,
        beadId: row.bead_id,
        beadName: row.bead_name,
        beadColor: row.bead_color,
        beadSizeMm: row.bead_size_mm,
        beadUnitPrice: row.bead_unit_price,
        quantity: row.quantity,
        lineAmount: row.line_amount,
        createdAt: row.created_at
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, logistics_company as logisticscompany, tracking_no as trackingno, shipment_status as shipmentstatus, shipped_at as shippedat, remark, created_at as createdat, updated_at as updatedat from shipments where order_id = ? limit 1")) {
    const orderId = Number(params[0]);
    const rows = state.shipments
      .filter((row) => Number(row.order_id) === orderId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        logisticsCompany: row.logistics_company,
        trackingNo: row.tracking_no,
        shipmentStatus: row.shipment_status,
        shippedAt: row.shipped_at,
        remark: row.remark,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id, refund_no as refundno, refund_amount as refundamount, reason, status, requested_at as requestedat, processed_at as processedat, created_at as createdat, updated_at as updatedat from refunds where order_id = ? order by id desc limit 1")) {
    const orderId = Number(params[0]);
    const rows = state.refunds
      .filter((row) => Number(row.order_id) === orderId)
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        refundNo: row.refund_no,
        refundAmount: row.refund_amount,
        reason: row.reason,
        status: row.status,
        requestedAt: row.requested_at,
        processedAt: row.processed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("update orders set order_status = 'cancelled', pay_status = 'closed', cancelled_at = now() where id = ?")) {
    const id = Number(params[0]);
    const row = state.orders.find((item) => Number(item.id) === id);
    if (!row) {
      return [{ affectedRows: 0 }];
    }
    row.order_status = "cancelled";
    row.pay_status = "closed";
    row.cancelled_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }

  if (normalized.startsWith("update payments set status = 'closed' where order_id = ? and status = 'initiated'")) {
    const orderId = Number(params[0]);
    let affectedRows = 0;
    for (const payment of state.payments) {
      if (Number(payment.order_id) === orderId && payment.status === "initiated") {
        payment.status = "closed";
        payment.updated_at = new Date().toISOString();
        affectedRows += 1;
      }
    }
    return [{ affectedRows }];
  }

  if (normalized.startsWith("update orders set order_status = 'refund_pending', pay_status = 'refund_pending' where id = ?")) {
    const id = Number(params[0]);
    const row = state.orders.find((item) => Number(item.id) === id);
    if (!row) {
      return [{ affectedRows: 0 }];
    }
    row.order_status = "refund_pending";
    row.pay_status = "refund_pending";
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }

  if (normalized.startsWith("update payments set status = 'refund_pending' where id = ?")) {
    const id = Number(params[0]);
    const row = state.payments.find((item) => Number(item.id) === id);
    if (!row) {
      return [{ affectedRows: 0 }];
    }
    row.status = "refund_pending";
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }

  if (normalized.startsWith("select id from refunds where order_id = ? and status in ('pending', 'approved', 'processing') limit 1")) {
    const orderId = Number(params[0]);
    const rows = state.refunds.filter((row) => Number(row.order_id) === orderId && ["pending", "approved", "processing"].includes(row.status)).slice(0, 1);
    return [rows.map(clone)];
  }

  if (normalized.startsWith("select id from payments where order_id = ? and status = 'success' order by id desc limit 1")) {
    const orderId = Number(params[0]);
    const rows = state.payments
      .filter((row) => Number(row.order_id) === orderId && row.status === "success")
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 1)
      .map((row) => ({ id: row.id }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("insert into refunds (order_id, payment_id, refund_no, refund_amount, reason, status, requested_by)")) {
    const [orderId, paymentId, refundNo, refundAmount, reason, status, requestedBy] = params;
    const row = {
      id: nextId(state.refunds),
      order_id: Number(orderId),
      payment_id: paymentId == null ? null : Number(paymentId),
      refund_no: refundNo,
      refund_amount: Number(refundAmount),
      reason: reason ?? null,
      status: status ?? "pending",
      requested_by: requestedBy ?? "user",
      requested_at: new Date().toISOString(),
      processed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.refunds.push(row);
    return [{ insertId: row.id, affectedRows: 1 }];
  }

  if (normalized.startsWith("select id, payment_no as paymentno from payments where order_id = ? and status = 'initiated' order by id desc limit 1")) {
    const orderId = Number(params[0]);
    const rows = state.payments
      .filter((row) => Number(row.order_id) === orderId && row.status === "initiated")
      .sort((a, b) => Number(b.id) - Number(a.id))
      .slice(0, 1)
      .map((row) => ({ id: row.id, paymentNo: row.payment_no }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("insert into payments (order_id, payment_no, channel, status, pay_amount)")) {
    const [orderId, paymentNo, channel, payAmount] = params;
    const row = {
      id: nextId(state.payments),
      order_id: Number(orderId),
      payment_no: paymentNo,
      channel,
      status: "initiated",
      pay_amount: Number(payAmount),
      transaction_id: null,
      callback_payload: null,
      paid_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.payments.push(row);
    return [{ insertId: row.id, affectedRows: 1 }];
  }

  if (normalized.startsWith("select p.id, p.order_id, p.status, o.order_status from payments p join orders o on o.id = p.order_id where p.payment_no = ? limit 1")) {
    const paymentNo = String(params[0]);
    const payment = state.payments.find((row) => row.payment_no === paymentNo);
    if (!payment) {
      return [[]];
    }
    const order = state.orders.find((row) => Number(row.id) === Number(payment.order_id));
    if (!order) {
      return [[]];
    }
    return [[
      clone({
        id: payment.id,
        order_id: payment.order_id,
        status: payment.status,
        order_status: order.order_status
      })
    ]];
  }

  if (normalized.startsWith("update payments set status = 'success', transaction_id = ?, callback_payload = ?, paid_at = now() where id = ?")) {
    const [transactionId, callbackPayload, id] = params;
    const row = state.payments.find((item) => Number(item.id) === Number(id));
    if (!row) {
      return [{ affectedRows: 0 }];
    }
    row.status = "success";
    row.transaction_id = transactionId;
    row.callback_payload = callbackPayload;
    row.paid_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }

  if (normalized.startsWith("update orders set pay_status = 'paid', order_status = 'pending_production', paid_amount = payable_amount, paid_at = now() where id = ?")) {
    const id = Number(params[0]);
    const row = state.orders.find((item) => Number(item.id) === id);
    if (!row) {
      return [{ affectedRows: 0 }];
    }
    row.pay_status = "paid";
    row.order_status = "pending_production";
    row.paid_amount = row.payable_amount;
    row.paid_at = new Date().toISOString();
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }

  if (normalized.startsWith("update payments set status = 'failed', callback_payload = ? where id = ?")) {
    const [callbackPayload, id] = params;
    const row = state.payments.find((item) => Number(item.id) === Number(id));
    if (!row) {
      return [{ affectedRows: 0 }];
    }
    row.status = "failed";
    row.callback_payload = callbackPayload;
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1 }];
  }

  if (normalized.startsWith("update orders set order_status = 'pending_payment', pay_status = 'unpaid', wrist_size_cm = ?, beads_total_diameter_mm = ?, items_amount = ?, shipping_fee = ?, discount_amount = 0, payable_amount = ?, paid_amount = 0, remark = ?, address_snapshot = ?")) {
    // Not used in tests, but kept for compatibility if route coverage expands later.
    return [{ affectedRows: 0 }];
  }

  if (normalized.startsWith("select id, order_status as orderstatus, pay_status as paystatus, payable_amount as payableamount, paid_amount as paidamount from orders where id = ? and user_id = ? limit 1")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const rows = state.orders
      .filter((row) => Number(row.id) === id && Number(row.user_id) === userId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        orderStatus: row.order_status,
        payStatus: row.pay_status,
        payableAmount: row.payable_amount,
        paidAmount: row.paid_amount
      }));
    return [rows.map(clone)];
  }

  if (normalized.startsWith("update users set nickname = ?, avatar_url = ?, unionid = ?, phone = ? where id = ?")) {
    const [nickname, avatarUrl, unionid, phone, id] = params;
    const row = state.users.find((item) => Number(item.id) === Number(id));
    if (!row) {
      return [{ affectedRows: 0, changedRows: 0 }];
    }
    row.nickname = nickname;
    row.avatar_url = avatarUrl;
    row.unionid = unionid;
    row.phone = phone;
    row.updated_at = new Date().toISOString();
    return [{ affectedRows: 1, changedRows: 1 }];
  }

  if (normalized.startsWith("select id, order_status as orderstatus, pay_status as paystatus from orders where id = ? and user_id = ? limit 1 for update")) {
    const id = Number(params[0]);
    const userId = Number(params[1]);
    const rows = state.orders
      .filter((row) => Number(row.id) === id && Number(row.user_id) === userId)
      .slice(0, 1)
      .map((row) => ({
        id: row.id,
        orderStatus: row.order_status,
        payStatus: row.pay_status
      }));
    return [rows.map(clone)];
  }

  return [[], []];
}

module.exports = createMockPool;
