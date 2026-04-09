(() => {
  const KEY = {
    config: "crystalStore.adminFrontend.config.v1",
    demo: "crystalStore.adminFrontend.demo.v1"
  };

  const STATUS_LABELS = {
    pending_payment: "待付款",
    pending_production: "待制作",
    pending_shipment: "待收货",
    completed: "已完成",
    cancelled: "已取消",
    refund_pending: "退款中",
    refunded: "已退款"
  };

  const PAYMENT_LABELS = {
    unpaid: "未支付",
    paid: "已支付",
    refund_pending: "退款处理中",
    refunded: "已退款",
    closed: "已关闭",
    initiated: "已发起",
    success: "支付成功",
    failed: "支付失败"
  };

  const REFUND_LABELS = {
    pending: "待审核",
    approved: "已批准",
    rejected: "已驳回",
    processing: "处理中",
    success: "退款成功",
    failed: "退款失败"
  };

  const DEMO_ORDERS = [
    {
      id: 501,
      order_no: "CS202604090001",
      order_status: "pending_payment",
      pay_status: "unpaid",
      payable_amount: "58.00",
      paid_amount: "0.00",
      items_amount: "46.00",
      shipping_fee: "12.00",
      created_at: "2026-04-09T18:10:00+08:00",
      updated_at: "2026-04-09T18:10:00+08:00",
      wrist_size_cm: "16.0",
      beads_total_diameter_mm: "48.0",
      remark: "用户下单后尚未付款",
      user_nickname: "演示用户 A",
      user_phone: "13800001111",
      address_snapshot: { receiverName: "张三", receiverPhone: "13800001111", province: "上海市", city: "上海市", district: "浦东新区", detailAddress: "世纪大道 88 号", postalCode: "200120", tag: "家" },
      items: [
        { id: 1, bead_name: "白水晶 6mm", bead_color: "透明白", bead_size_mm: "6.0", bead_unit_price: "3.00", quantity: 4, line_amount: "12.00" },
        { id: 2, bead_name: "粉晶 8mm", bead_color: "粉色", bead_size_mm: "8.0", bead_unit_price: "5.00", quantity: 4, line_amount: "20.00" },
        { id: 3, bead_name: "黑曜石 6mm", bead_color: "黑色", bead_size_mm: "6.0", bead_unit_price: "3.50", quantity: 4, line_amount: "14.00" }
      ],
      payments: [],
      shipments: [],
      refunds: [],
      logs: [{ id: 1, from_status: null, to_status: "pending_payment", operator_type: "user", note: "用户创建订单", created_at: "2026-04-09T18:10:00+08:00" }]
    },
    {
      id: 502,
      order_no: "CS202604090002",
      order_status: "pending_production",
      pay_status: "paid",
      payable_amount: "86.00",
      paid_amount: "86.00",
      items_amount: "74.00",
      shipping_fee: "12.00",
      created_at: "2026-04-09T17:40:00+08:00",
      updated_at: "2026-04-09T18:00:00+08:00",
      wrist_size_cm: "15.5",
      beads_total_diameter_mm: "60.0",
      remark: "已支付待制作",
      user_nickname: "演示用户 B",
      user_phone: "13800002222",
      address_snapshot: { receiverName: "李四", receiverPhone: "13800002222", province: "浙江省", city: "杭州市", district: "西湖区", detailAddress: "文三路 200 号", postalCode: "310000", tag: "公司" },
      items: [
        { id: 4, bead_name: "紫水晶 10mm", bead_color: "紫色", bead_size_mm: "10.0", bead_unit_price: "8.00", quantity: 5, line_amount: "40.00" },
        { id: 5, bead_name: "虎眼石 8mm", bead_color: "棕金", bead_size_mm: "8.0", bead_unit_price: "5.50", quantity: 4, line_amount: "22.00" },
        { id: 6, bead_name: "白玛瑙 6mm", bead_color: "奶白", bead_size_mm: "6.0", bead_unit_price: "3.00", quantity: 4, line_amount: "12.00" }
      ],
      payments: [{ id: 21, payment_no: "PAY202604090002", status: "success", pay_amount: "86.00", transaction_id: "wx_demo_paid_002", created_at: "2026-04-09T17:45:00+08:00", paid_at: "2026-04-09T17:46:00+08:00" }],
      shipments: [],
      refunds: [],
      logs: [
        { id: 2, from_status: null, to_status: "pending_payment", operator_type: "user", note: "用户创建订单", created_at: "2026-04-09T17:40:00+08:00" },
        { id: 3, from_status: "pending_payment", to_status: "pending_production", operator_type: "system", note: "支付回调成功", created_at: "2026-04-09T17:46:00+08:00" }
      ]
    },
    {
      id: 503,
      order_no: "CS202604090003",
      order_status: "pending_shipment",
      pay_status: "paid",
      payable_amount: "92.00",
      paid_amount: "92.00",
      items_amount: "80.00",
      shipping_fee: "12.00",
      created_at: "2026-04-09T16:20:00+08:00",
      updated_at: "2026-04-09T18:10:00+08:00",
      wrist_size_cm: "16.5",
      beads_total_diameter_mm: "66.0",
      remark: "已发货待收货",
      user_nickname: "演示用户 C",
      user_phone: "13800003333",
      address_snapshot: { receiverName: "王五", receiverPhone: "13800003333", province: "江苏省", city: "南京市", district: "建邺区", detailAddress: "江东中路 66 号", postalCode: "210000", tag: "工作室" },
      items: [
        { id: 7, bead_name: "月光石 8mm", bead_color: "银灰", bead_size_mm: "8.0", bead_unit_price: "6.00", quantity: 6, line_amount: "36.00" },
        { id: 8, bead_name: "海蓝宝 10mm", bead_color: "浅蓝", bead_size_mm: "10.0", bead_unit_price: "11.00", quantity: 4, line_amount: "44.00" }
      ],
      payments: [{ id: 22, payment_no: "PAY202604090003", status: "success", pay_amount: "92.00", transaction_id: "wx_demo_paid_003", created_at: "2026-04-09T16:25:00+08:00", paid_at: "2026-04-09T16:26:00+08:00" }],
      shipments: [{ id: 31, logistics_company: "顺丰速运", tracking_no: "SF1234567800", shipment_status: "shipped", shipped_at: "2026-04-09T18:10:00+08:00", remark: "已核对腕围后发货", created_at: "2026-04-09T18:10:00+08:00" }],
      refunds: [],
      logs: [
        { id: 4, from_status: null, to_status: "pending_payment", operator_type: "user", note: "用户创建订单", created_at: "2026-04-09T16:20:00+08:00" },
        { id: 5, from_status: "pending_payment", to_status: "pending_production", operator_type: "system", note: "支付回调成功", created_at: "2026-04-09T16:26:00+08:00" },
        { id: 6, from_status: "pending_production", to_status: "pending_shipment", operator_type: "admin", note: "录入物流信息", created_at: "2026-04-09T18:10:00+08:00" }
      ]
    },
    {
      id: 504,
      order_no: "CS202604090004",
      order_status: "refund_pending",
      pay_status: "refund_pending",
      payable_amount: "108.00",
      paid_amount: "108.00",
      items_amount: "96.00",
      shipping_fee: "12.00",
      created_at: "2026-04-09T15:30:00+08:00",
      updated_at: "2026-04-09T18:35:00+08:00",
      wrist_size_cm: "17.0",
      beads_total_diameter_mm: "68.0",
      remark: "用户发起退款申请",
      user_nickname: "演示用户 D",
      user_phone: "13800004444",
      address_snapshot: { receiverName: "赵六", receiverPhone: "13800004444", province: "广东省", city: "深圳市", district: "南山区", detailAddress: "科技园一路 18 号", postalCode: "518000", tag: "公司" },
      items: [
        { id: 9, bead_name: "金曜石 10mm", bead_color: "金黑", bead_size_mm: "10.0", bead_unit_price: "12.00", quantity: 5, line_amount: "60.00" },
        { id: 10, bead_name: "茶晶 8mm", bead_color: "棕灰", bead_size_mm: "8.0", bead_unit_price: "9.00", quantity: 4, line_amount: "36.00" }
      ],
      payments: [{ id: 23, payment_no: "PAY202604090004", status: "refund_pending", pay_amount: "108.00", transaction_id: "wx_demo_paid_004", created_at: "2026-04-09T15:40:00+08:00", paid_at: "2026-04-09T15:41:00+08:00" }],
      shipments: [],
      refunds: [{ id: 41, order_id: 504, payment_id: 23, refund_no: "RF202604090001", refund_amount: "108.00", reason: "用户表示不想要了", status: "pending", requested_at: "2026-04-09T18:35:00+08:00", processed_at: null, restore_status: "pending_production" }],
      logs: [
        { id: 7, from_status: null, to_status: "pending_payment", operator_type: "user", note: "用户创建订单", created_at: "2026-04-09T15:30:00+08:00" },
        { id: 8, from_status: "pending_payment", to_status: "pending_production", operator_type: "system", note: "支付回调成功", created_at: "2026-04-09T15:41:00+08:00" },
        { id: 9, from_status: "pending_production", to_status: "refund_pending", operator_type: "user", note: "用户申请退款", created_at: "2026-04-09T18:35:00+08:00" }
      ]
    }
  ];

  const state = {
    config: loadConfig(),
    demo: loadDemoDb(),
    mode: "demo",
    orders: [],
    refunds: [],
    selectedOrderId: null,
    detail: null,
    orderMeta: { page: 1, pageSize: 20, total: 0 },
    refundMeta: { page: 1, pageSize: 20, total: 0 }
  };

  const els = {};

  init().catch((error) => {
    console.error(error);
    setNotice(error.message || "初始化失败");
  });

  async function init() {
    bindElements();
    bindEvents();
    hydrateControls();
    await safeRefreshDashboard();
  }

  function bindElements() {
    const ids = [
      "modeBadge", "apiBaseBadge", "noticeText", "apiBaseUrlInput", "adminKeyInput", "orderStatusFilter", "refundStatusFilter",
      "keywordInput", "saveConfigBtn", "refreshBtn", "resetDemoBtn", "statsGrid", "ordersList", "refundsList", "ordersPager", "refundsPager",
      "detailPlaceholder", "detailShell", "detailMeta", "orderActions", "shipCompanyInput", "shipTrackingInput",
      "shipRemarkInput", "shipOrderBtn", "detailItems", "itemsBadge", "detailAddress", "detailPayments",
      "detailShipments", "detailRefunds", "detailLogs"
    ];

    for (const id of ids) {
      els[id] = document.getElementById(id);
    }
  }

  function bindEvents() {
    els.saveConfigBtn.addEventListener("click", async () => {
      readControlsIntoState({ resetPages: true });
      persistConfig();
      await safeRefreshDashboard();
    });

    els.refreshBtn.addEventListener("click", async () => {
      readControlsIntoState({ resetPages: true });
      persistConfig();
      await safeRefreshDashboard();
    });

    els.resetDemoBtn.addEventListener("click", async () => {
      state.demo = buildDemoDb();
      persistDemo();
      setNotice("本地 demo 已重置");
      if (state.mode === "demo") {
        await safeRefreshDashboard();
      }
    });

    els.shipOrderBtn.addEventListener("click", async () => {
      const orderId = Number(state.selectedOrderId);
      if (!orderId) {
        setNotice("请先选择待发货订单");
        return;
      }

      const logisticsCompany = els.shipCompanyInput.value.trim();
      const trackingNo = els.shipTrackingInput.value.trim();
      const remark = els.shipRemarkInput.value.trim();

      if (!logisticsCompany || !trackingNo) {
        setNotice("物流公司和运单号不能为空");
        return;
      }

      await runAction(async () => {
        await currentApi().shipOrder(orderId, { logisticsCompany, trackingNo, remark });
        setNotice(`订单 ${orderId} 已录入发货信息`);
        await safeRefreshDashboard({ keepSelection: true });
      });
    });
  }

  function hydrateControls() {
    els.apiBaseUrlInput.value = state.config.apiBaseUrl;
    els.adminKeyInput.value = state.config.adminKey;
    els.orderStatusFilter.value = state.config.orderStatus;
    els.refundStatusFilter.value = state.config.refundStatus;
    els.keywordInput.value = state.config.keyword;
  }

  function readControlsIntoState(options = {}) {
    const resetPages = options.resetPages === true;
    const normalizedBaseUrl = normalizeApiBaseUrl(els.apiBaseUrlInput.value);
    state.config.apiBaseUrl = normalizedBaseUrl;
    state.config.adminKey = els.adminKeyInput.value.trim();
    state.config.orderStatus = els.orderStatusFilter.value || "all";
    state.config.refundStatus = els.refundStatusFilter.value || "all";
    state.config.keyword = els.keywordInput.value.trim();
    if (resetPages) {
      state.config.orderPage = 1;
      state.config.refundPage = 1;
    }
    els.apiBaseUrlInput.value = state.config.apiBaseUrl;
  }

  async function refreshDashboard(options = {}) {
    const keepSelection = options.keepSelection !== false;
    const previousOrderId = keepSelection ? state.selectedOrderId : null;

    state.mode = await resolveMode();
    renderModeBadge();

    const keyword = state.config.keyword;
    const [ordersResult, refundsResult] = await Promise.all([
      currentApi().listOrders({ status: state.config.orderStatus, keyword, page: state.config.orderPage, pageSize: state.config.orderPageSize }),
      currentApi().listRefunds({ status: state.config.refundStatus, keyword, page: state.config.refundPage, pageSize: state.config.refundPageSize })
    ]);

    state.orders = ordersResult.items || [];
    state.refunds = refundsResult.items || [];
    state.orderMeta = {
      page: Number(ordersResult.page || state.config.orderPage || 1),
      pageSize: Number(ordersResult.pageSize || state.config.orderPageSize || 20),
      total: Number(ordersResult.total || 0)
    };
    state.refundMeta = {
      page: Number(refundsResult.page || state.config.refundPage || 1),
      pageSize: Number(refundsResult.pageSize || state.config.refundPageSize || 20),
      total: Number(refundsResult.total || 0)
    };
    state.config.orderPage = state.orderMeta.page;
    state.config.orderPageSize = state.orderMeta.pageSize;
    state.config.refundPage = state.refundMeta.page;
    state.config.refundPageSize = state.refundMeta.pageSize;

    renderStats();
    renderOrders();
    renderRefunds();

    if (previousOrderId) {
      const exists = isOrderVisibleInCurrentResults(previousOrderId);
      if (exists) {
        await openOrderDetail(previousOrderId, { silent: true });
        return;
      }
      state.selectedOrderId = null;
      clearDetail();
      setNotice("当前筛选结果已不包含原选中订单，详情已清空");
      return;
    }

    clearDetail();
  }

  async function safeRefreshDashboard(options = {}) {
    try {
      await refreshDashboard(options);
    } catch (error) {
      console.error(error);
      state.orders = [];
      state.refunds = [];
      renderStats();
      renderOrders();
      renderRefunds();
      clearDetail();
      setNotice(error.message || "刷新数据失败");
    }
  }

  async function resolveMode() {
    if (!state.config.apiBaseUrl) {
      setNotice("未配置后台地址，已使用本地 demo");
      return "demo";
    }

    try {
      const response = await fetch(joinUrl(state.config.apiBaseUrl, "/health"), { headers: { Accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`健康检查失败：${response.status}`);
      }
      setNotice("已连接真实后台接口");
      return "remote";
    } catch (error) {
      setNotice(`后台不可达，已回退到 demo：${error.message}`);
      return "demo";
    }
  }

  function currentApi() {
    return state.mode === "remote" ? remoteApi : demoApi;
  }

  const remoteApi = {
    async listOrders(params) {
      const query = new URLSearchParams();
      if (params.status && params.status !== "all") query.set("status", params.status);
      if (params.keyword) query.set("keyword", params.keyword);
      query.set("page", String(params.page || 1));
      query.set("pageSize", String(params.pageSize || 20));
      return requestJson(`/api/admin/orders?${query.toString()}`);
    },
    async listRefunds(params) {
      const query = new URLSearchParams();
      if (params.status && params.status !== "all") query.set("status", params.status);
      if (params.keyword) query.set("keyword", params.keyword);
      query.set("page", String(params.page || 1));
      query.set("pageSize", String(params.pageSize || 20));
      return requestJson(`/api/admin/refunds?${query.toString()}`);
    },
    async getOrderDetail(orderId) {
      return requestJson(`/api/admin/orders/${orderId}`);
    },
    async shipOrder(orderId, payload) {
      return requestJson(`/api/admin/orders/${orderId}/ship`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    async completeOrder(orderId) {
      return requestJson(`/api/admin/orders/${orderId}/complete`, { method: "POST" });
    },
    async cancelOrder(orderId) {
      return requestJson(`/api/admin/orders/${orderId}/cancel`, { method: "POST" });
    },
    async approveRefund(refundId) {
      return requestJson(`/api/admin/refunds/${refundId}/approve`, { method: "POST" });
    },
    async rejectRefund(refundId) {
      return requestJson(`/api/admin/refunds/${refundId}/reject`, { method: "POST" });
    }
  };

  const demoApi = {
    async listOrders(params) {
      const keyword = String(params.keyword || "").trim().toLowerCase();
      const rows = state.demo.orders
        .filter((order) => (params.status === "all" || !params.status ? true : order.order_status === params.status))
        .filter((order) => {
          if (!keyword) return true;
          return [order.order_no, order.user_nickname, order.user_phone].join(" ").toLowerCase().includes(keyword);
        })
        .sort((a, b) => Number(b.id) - Number(a.id))
        .map((order) => buildOrderListItem(order));
      return buildPagedResult(rows, params.page, params.pageSize);
    },
    async listRefunds(params) {
      const keyword = String(params.keyword || "").trim().toLowerCase();
      const rows = state.demo.orders
        .flatMap((order) => (order.refunds || []).map((refund) => ({ ...refund, order_id: order.id, order_no: order.order_no, order_status: order.order_status, pay_status: order.pay_status, payable_amount: order.payable_amount, user_nickname: order.user_nickname, user_phone: order.user_phone })))
        .filter((refund) => (params.status === "all" || !params.status ? true : refund.status === params.status))
        .filter((refund) => {
          if (!keyword) return true;
          return [refund.refund_no, refund.order_no, refund.user_nickname, refund.user_phone].join(" ").toLowerCase().includes(keyword);
        })
        .sort((a, b) => Number(b.id) - Number(a.id));
      return buildPagedResult(rows, params.page, params.pageSize);
    },
    async getOrderDetail(orderId) {
      const order = findDemoOrder(orderId);
      if (!order) throw new Error("订单不存在");
      return {
        order: { ...order, user: { nickname: order.user_nickname, phone: order.user_phone } },
        items: clone(order.items || []),
        payment: clone((order.payments || [])[0] || null),
        payments: clone(order.payments || []),
        shipment: clone((order.shipments || [])[0] || null),
        shipments: clone(order.shipments || []),
        refund: clone((order.refunds || [])[0] || null),
        refunds: clone(order.refunds || []),
        logs: clone(order.logs || [])
      };
    },
    async shipOrder(orderId, payload) {
      const order = findDemoOrder(orderId);
      if (!order) throw new Error("订单不存在");
      if (order.order_status !== "pending_production") throw new Error("当前订单状态不允许发货");
      order.shipments = [{ id: Date.now(), logistics_company: payload.logisticsCompany, tracking_no: payload.trackingNo, shipment_status: "shipped", shipped_at: new Date().toISOString(), remark: payload.remark || "", created_at: new Date().toISOString() }];
      pushLog(order, "pending_production", "pending_shipment", "admin", payload.remark || "录入物流信息");
      order.order_status = "pending_shipment";
      order.updated_at = new Date().toISOString();
      persistDemo();
      return { orderId, orderStatus: "pending_shipment" };
    },
    async completeOrder(orderId) {
      const order = findDemoOrder(orderId);
      if (!order) throw new Error("订单不存在");
      if (order.order_status !== "pending_shipment") throw new Error("当前订单状态不允许完结");
      pushLog(order, "pending_shipment", "completed", "admin", "订单已完成");
      order.order_status = "completed";
      order.completed_at = new Date().toISOString();
      order.updated_at = new Date().toISOString();
      persistDemo();
      return { orderId, orderStatus: "completed" };
    },
    async cancelOrder(orderId) {
      const order = findDemoOrder(orderId);
      if (!order) throw new Error("订单不存在");
      if (order.order_status !== "pending_payment") throw new Error("当前订单状态不允许取消");
      pushLog(order, "pending_payment", "cancelled", "admin", "订单已取消");
      order.order_status = "cancelled";
      order.pay_status = "closed";
      order.cancelled_at = new Date().toISOString();
      order.updated_at = new Date().toISOString();
      persistDemo();
      return { orderId, orderStatus: "cancelled" };
    },
    async approveRefund(refundId) {
      const pair = findDemoRefund(refundId);
      if (!pair) throw new Error("退款记录不存在");
      const { order, refund } = pair;
      if (refund.status !== "pending" || order.order_status !== "refund_pending") throw new Error("当前退款状态不允许通过");
      refund.status = "success";
      refund.processed_at = new Date().toISOString();
      order.order_status = "refunded";
      order.pay_status = "refunded";
      if (order.payments[0]) order.payments[0].status = "refunded";
      pushLog(order, "refund_pending", "refunded", "admin", "退款审核通过");
      order.updated_at = new Date().toISOString();
      persistDemo();
      return { refundId, orderStatus: "refunded" };
    },
    async rejectRefund(refundId) {
      const pair = findDemoRefund(refundId);
      if (!pair) throw new Error("退款记录不存在");
      const { order, refund } = pair;
      if (refund.status !== "pending" || order.order_status !== "refund_pending") throw new Error("当前退款状态不允许驳回");
      refund.status = "rejected";
      refund.processed_at = new Date().toISOString();
      order.order_status = refund.restore_status || "pending_production";
      order.pay_status = "paid";
      if (order.payments[0]) order.payments[0].status = "success";
      pushLog(order, "refund_pending", order.order_status, "admin", "退款审核驳回");
      order.updated_at = new Date().toISOString();
      persistDemo();
      return { refundId, orderStatus: order.order_status };
    }
  };

  async function requestJson(path, init = {}) {
    if (!state.config.apiBaseUrl) {
      throw new Error("后台地址未配置");
    }

    const headers = new Headers(init.headers || {});
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("x-admin-key", state.config.adminKey);

    const response = await fetch(joinUrl(state.config.apiBaseUrl, path), { ...init, headers });
    const payload = await parseResponse(response);

    if (!response.ok) {
      const message = payload?.message || payload?.error || `请求失败 (${response.status})`;
      throw new Error(message);
    }

    return payload;
  }

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  function renderModeBadge() {
    const remote = state.mode === "remote";
    els.modeBadge.textContent = remote ? "真实后台" : "本地 demo";
    els.modeBadge.className = `badge ${remote ? "" : "badge-warm"}`.trim();
    els.apiBaseBadge.textContent = state.config.apiBaseUrl || "未配置";
  }

  function renderStats() {
    const stats = [
      { label: "当前订单", value: state.orders.length, note: "按当前筛选结果统计" },
      { label: "待处理退款", value: state.refunds.filter((item) => item.status === "pending").length, note: "优先需要运营动作" },
      { label: "待制作", value: state.orders.filter((item) => readField(item, ["order_status"]) === "pending_production").length, note: "可录入发货信息" },
      { label: "待收货", value: state.orders.filter((item) => readField(item, ["order_status"]) === "pending_shipment").length, note: "可手动完结" }
    ];

    els.statsGrid.innerHTML = stats
      .map((item) => `
        <article class="stat-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(String(item.value))}</strong>
          <span>${escapeHtml(item.note)}</span>
        </article>
      `)
      .join("");
  }

  function renderPager(kind) {
    const isOrderPager = kind === "orders";
    const meta = isOrderPager ? state.orderMeta : state.refundMeta;
    const container = isOrderPager ? els.ordersPager : els.refundsPager;
    const pageCount = Math.max(1, Math.ceil((meta.total || 0) / (meta.pageSize || 20)));
    const selectValue = String(meta.pageSize || 20);

    container.innerHTML = `
      <div class="pager-meta">第 ${meta.page} / ${pageCount} 页，共 ${meta.total} 条</div>
      <div class="pager-controls">
        <label class="field">
          <span>每页</span>
          <select data-role="pageSize">
            <option value="10" ${selectValue === "10" ? "selected" : ""}>10</option>
            <option value="20" ${selectValue === "20" ? "selected" : ""}>20</option>
            <option value="50" ${selectValue === "50" ? "selected" : ""}>50</option>
          </select>
        </label>
        <button class="btn btn-sm" type="button" data-role="prev" ${meta.page <= 1 ? "disabled" : ""}>上一页</button>
        <button class="btn btn-sm" type="button" data-role="next" ${meta.page >= pageCount ? "disabled" : ""}>下一页</button>
      </div>
    `;

    container.querySelector("[data-role=\"pageSize\"]").addEventListener("change", async (event) => {
      const nextSize = Number(event.target.value || 20);
      if (isOrderPager) {
        state.config.orderPageSize = nextSize;
        state.config.orderPage = 1;
      } else {
        state.config.refundPageSize = nextSize;
        state.config.refundPage = 1;
      }
      persistConfig();
      await safeRefreshDashboard({ keepSelection: false });
    });

    container.querySelector("[data-role=\"prev\"]").addEventListener("click", async () => {
      if (isOrderPager) {
        state.config.orderPage = Math.max(1, meta.page - 1);
      } else {
        state.config.refundPage = Math.max(1, meta.page - 1);
      }
      persistConfig();
      await safeRefreshDashboard({ keepSelection: false });
    });

    container.querySelector("[data-role=\"next\"]").addEventListener("click", async () => {
      if (isOrderPager) {
        state.config.orderPage = Math.min(pageCount, meta.page + 1);
      } else {
        state.config.refundPage = Math.min(pageCount, meta.page + 1);
      }
      persistConfig();
      await safeRefreshDashboard({ keepSelection: false });
    });
  }

  function renderOrders() {
    const template = document.getElementById("orderCardTemplate");
    els.ordersList.innerHTML = "";
    renderPager("orders");

    if (!state.orders.length) {
      els.ordersList.innerHTML = '<div class="empty-state">当前筛选下没有订单。</div>';
      return;
    }

    for (const order of state.orders) {
      const node = template.content.firstElementChild.cloneNode(true);
      node.querySelector('[data-field="title"]').textContent = readField(order, ["order_no", "orderNo"]) || `订单 #${order.id}`;
      node.querySelector('[data-field="subTitle"]').textContent = `${readField(order, ["user_nickname"]) || "-"} / ${readField(order, ["user_phone"]) || "-"}`;
      node.querySelector('[data-field="status"]').textContent = labelStatus(readField(order, ["order_status", "orderStatus"]));
      node.querySelector('[data-field="metrics"]').textContent = `支付 ${labelPayment(readField(order, ["pay_status", "payStatus"]))} · 应付 ${money(readField(order, ["payable_amount", "payableAmount"]))} · 创建于 ${fmtDate(readField(order, ["created_at", "createdAt"]))}`;
      node.querySelector('[data-action="detail"]').addEventListener("click", () => openOrderDetail(order.id));
      els.ordersList.appendChild(node);
    }
  }

  function renderRefunds() {
    const template = document.getElementById("refundCardTemplate");
    els.refundsList.innerHTML = "";
    renderPager("refunds");

    if (!state.refunds.length) {
      els.refundsList.innerHTML = '<div class="empty-state">当前筛选下没有退款单。</div>';
      return;
    }

    for (const refund of state.refunds) {
      const node = template.content.firstElementChild.cloneNode(true);
      node.querySelector('[data-field="title"]').textContent = readField(refund, ["refund_no", "refundNo"]) || `退款 #${refund.id}`;
      node.querySelector('[data-field="subTitle"]').textContent = `${readField(refund, ["order_no", "orderNo"]) || "-"} / ${readField(refund, ["user_nickname"]) || "-"}`;
      node.querySelector('[data-field="status"]').textContent = labelRefund(readField(refund, ["status"]));
      node.querySelector('[data-field="metrics"]').textContent = `金额 ${money(readField(refund, ["refund_amount", "refundAmount"]))} · 订单 ${labelStatus(readField(refund, ["order_status", "orderStatus"]))} · 申请于 ${fmtDate(readField(refund, ["requested_at", "requestedAt"]))}`;
      node.querySelector('[data-action="locate"]').addEventListener("click", () => openOrderDetail(readField(refund, ["order_id", "orderId"])));
      node.querySelector('[data-action="approve"]').addEventListener("click", () => handleRefundAction("approve", refund));
      node.querySelector('[data-action="reject"]').addEventListener("click", () => handleRefundAction("reject", refund));
      const pending = readField(refund, ["status"]) === "pending";
      node.querySelector('[data-action="approve"]').disabled = !pending;
      node.querySelector('[data-action="reject"]').disabled = !pending;
      els.refundsList.appendChild(node);
    }
  }

  async function handleRefundAction(type, refund) {
    const refundId = Number(readField(refund, ["id"]));
    if (!refundId) return;

    await runAction(async () => {
      if (type === "approve") {
        await currentApi().approveRefund(refundId);
        setNotice(`退款 ${readField(refund, ["refund_no", "refundNo"])} 已通过`);
      } else {
        await currentApi().rejectRefund(refundId);
        setNotice(`退款 ${readField(refund, ["refund_no", "refundNo"])} 已驳回`);
      }
      await safeRefreshDashboard({ keepSelection: true });
      await openOrderDetail(readField(refund, ["order_id", "orderId"]), { silent: true });
    });
  }

  async function openOrderDetail(orderId, options = {}) {
    const normalizedId = Number(orderId);
    if (!normalizedId) {
      clearDetail();
      return;
    }

    state.selectedOrderId = normalizedId;
    try {
      state.detail = await currentApi().getOrderDetail(normalizedId);
      renderDetail();
      if (!options.silent) {
        setNotice(`已打开订单 ${normalizedId} 详情`);
      }
    } catch (error) {
      state.detail = null;
      clearDetail();
      setNotice(error.message || "加载订单详情失败");
      throw error;
    }
  }

  function renderDetail() {
    const detail = state.detail;
    const order = detail?.order;
    if (!order) {
      clearDetail();
      return;
    }

    els.detailPlaceholder.classList.add("hidden");
    els.detailShell.classList.remove("hidden");

    const orderNo = readField(order, ["order_no", "orderNo"]) || `订单 #${order.id}`;
    const user = order.user || {};
    const metaCards = [
      { label: "订单号", value: orderNo },
      { label: "订单状态", value: labelStatus(readField(order, ["order_status", "orderStatus"])) },
      { label: "支付状态", value: labelPayment(readField(order, ["pay_status", "payStatus"])) },
      { label: "用户", value: `${user.nickname || readField(order, ["user_nickname"]) || "-"} / ${user.phone || readField(order, ["user_phone"]) || "-"}` },
      { label: "应付金额", value: money(readField(order, ["payable_amount", "payableAmount"])) },
      { label: "已付金额", value: money(readField(order, ["paid_amount", "paidAmount"])) },
      { label: "腕围", value: `${readField(order, ["wrist_size_cm", "wristSizeCm"]) || "-"} cm` },
      { label: "创建时间", value: fmtDate(readField(order, ["created_at", "createdAt"])) }
    ];

    els.detailMeta.innerHTML = metaCards
      .map((item) => `<article class="meta-card"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(String(item.value))}</strong></article>`)
      .join("");

    renderOrderActions(order);
    renderItems(detail.items || []);
    renderAddress(order.address_snapshot || order.addressSnapshot || {});
    renderPayments(detail.payments || []);
    renderShipments(detail.shipments || []);
    renderRefundBlocks(detail.refunds || []);
    renderLogs(detail.logs || []);
  }

  function renderOrderActions(order) {
    const status = readField(order, ["order_status", "orderStatus"]);
    const buttons = [];

    if (status === "pending_payment") {
      buttons.push(buildActionButton("取消订单", "btn btn-ghost", async () => {
        await currentApi().cancelOrder(order.id);
        setNotice(`订单 ${order.id} 已取消`);
        await safeRefreshDashboard({ keepSelection: true });
      }));
    }

    if (status === "pending_shipment") {
      buttons.push(buildActionButton("完结订单", "btn btn-primary", async () => {
        await currentApi().completeOrder(order.id);
        setNotice(`订单 ${order.id} 已完结`);
        await safeRefreshDashboard({ keepSelection: true });
      }));
    }

    buttons.push(buildActionButton("刷新详情", "btn", async () => {
      await openOrderDetail(order.id, { silent: true });
      setNotice(`订单 ${order.id} 详情已刷新`);
    }));

    els.orderActions.innerHTML = "";
    for (const { element, handler } of buttons) {
      element.addEventListener("click", () => runAction(handler));
      els.orderActions.appendChild(element);
    }

    const shipEnabled = status === "pending_production";
    els.shipOrderBtn.disabled = !shipEnabled;
    els.shipCompanyInput.disabled = !shipEnabled;
    els.shipTrackingInput.disabled = !shipEnabled;
    els.shipRemarkInput.disabled = !shipEnabled;
    els.shipRemarkInput.placeholder = shipEnabled ? "例如：已核对腕围后发货" : "当前订单不是待制作状态";
  }

  function buildActionButton(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    return { element: button, handler };
  }

  function renderItems(items) {
    els.itemsBadge.textContent = `${items.length} 项`;
    els.detailItems.innerHTML = items.length
      ? items.map((item) => `<div class="key-value"><strong>${escapeHtml(readField(item, ["bead_name", "name"]) || "未命名珠子")}</strong><span>${escapeHtml(`${readField(item, ["quantity"]) || 0} 颗 · ${readField(item, ["bead_color", "color"]) || "-"} · ${readField(item, ["bead_size_mm", "size_mm"]) || "-"}mm · ${money(readField(item, ["line_amount", "lineAmount"]))}`)}</span></div>`).join("")
      : '<div class="empty-state">暂无商品明细。</div>';
  }

  function renderAddress(address) {
    const lines = [
      `${address.receiverName || address.receiver_name || "-"} / ${address.receiverPhone || address.receiver_phone || "-"}`,
      `${address.province || ""}${address.city || ""}${address.district || ""}`,
      address.detailAddress || address.detail_address || "-",
      `邮编：${address.postalCode || address.postal_code || "-"}`,
      `标签：${address.tag || "-"}`
    ];
    els.detailAddress.textContent = lines.join("\n");
  }

  function renderPayments(payments) {
    els.detailPayments.innerHTML = payments.length
      ? payments.map((item) => `<div class="key-value"><strong>${escapeHtml(readField(item, ["payment_no", "paymentNo"]) || "支付单")}</strong><span>${escapeHtml(`${labelPayment(readField(item, ["status"]))} · ${money(readField(item, ["pay_amount", "payAmount"]))} · ${fmtDate(readField(item, ["paid_at", "created_at", "createdAt"]))}`)}</span></div>`).join("")
      : '<div class="empty-state">暂无支付记录。</div>';
  }

  function renderShipments(shipments) {
    els.detailShipments.innerHTML = shipments.length
      ? shipments.map((item) => `<div class="key-value"><strong>${escapeHtml(`${readField(item, ["logistics_company", "logisticsCompany"]) || "-"} / ${readField(item, ["tracking_no", "trackingNo"]) || "-"}`)}</strong><span>${escapeHtml(`${readField(item, ["shipment_status", "shipmentStatus"]) || "-"} · ${fmtDate(readField(item, ["shipped_at", "shippedAt"]))}${readField(item, ["remark"]) ? ` · ${readField(item, ["remark"])}` : ""}`)}</span></div>`).join("")
      : '<div class="empty-state">还没有物流信息。</div>';
  }

  function renderRefundBlocks(refunds) {
    if (!refunds.length) {
      els.detailRefunds.innerHTML = '<div class="empty-state">暂无退款记录。</div>';
      return;
    }

    els.detailRefunds.innerHTML = "";
    for (const refund of refunds) {
      const wrapper = document.createElement("div");
      wrapper.className = "key-value";
      wrapper.innerHTML = `
        <strong>${escapeHtml(readField(refund, ["refund_no", "refundNo"]) || `退款 #${refund.id}`)}</strong>
        <span>${escapeHtml(`${labelRefund(readField(refund, ["status"]))} · ${money(readField(refund, ["refund_amount", "refundAmount"]))} · ${fmtDate(readField(refund, ["requested_at", "requestedAt"]))}`)}</span>
        <span>${escapeHtml(readField(refund, ["reason"]) || "无退款原因")}</span>
      `;
      if (readField(refund, ["status"]) === "pending") {
        const actionBar = document.createElement("div");
        actionBar.className = "record-actions";
        const approve = document.createElement("button");
        approve.type = "button";
        approve.className = "btn btn-sm btn-primary";
        approve.textContent = "通过退款";
        approve.addEventListener("click", () => handleRefundAction("approve", refund));
        const reject = document.createElement("button");
        reject.type = "button";
        reject.className = "btn btn-sm btn-ghost";
        reject.textContent = "驳回退款";
        reject.addEventListener("click", () => handleRefundAction("reject", refund));
        actionBar.append(approve, reject);
        wrapper.appendChild(actionBar);
      }
      els.detailRefunds.appendChild(wrapper);
    }
  }

  function renderLogs(logs) {
    els.detailLogs.innerHTML = logs.length
      ? logs.map((item) => `<div class="timeline-item"><strong>${escapeHtml(`${labelStatus(readField(item, ["from_status", "fromStatus"]))} -> ${labelStatus(readField(item, ["to_status", "toStatus"]))}`)}</strong><span>${escapeHtml(`${fmtDate(readField(item, ["created_at", "createdAt"]))} · ${readField(item, ["operator_type", "operatorType"]) || "-"}${readField(item, ["note"]) ? ` · ${readField(item, ["note"])}` : ""}`)}</span></div>`).join("")
      : '<div class="empty-state">暂无状态日志。</div>';
  }

  function clearDetail() {
    state.detail = null;
    els.detailPlaceholder.classList.remove("hidden");
    els.detailShell.classList.add("hidden");
    els.detailMeta.innerHTML = "";
    els.orderActions.innerHTML = "";
    els.detailItems.innerHTML = "";
    els.detailAddress.textContent = "";
    els.detailPayments.innerHTML = "";
    els.detailShipments.innerHTML = "";
    els.detailRefunds.innerHTML = "";
    els.detailLogs.innerHTML = "";
    els.itemsBadge.textContent = "0 项";
  }

  async function runAction(fn) {
    try {
      await fn();
      if (state.selectedOrderId) {
        await openOrderDetail(state.selectedOrderId, { silent: true });
      }
    } catch (error) {
      console.error(error);
      setNotice(error.message || "操作失败");
    }
  }

  function setNotice(message) {
    els.noticeText.textContent = message;
  }

  function joinUrl(base, path) {
    return `${String(base || "").replace(/\/$/, "")}${path}`;
  }

  function money(value) {
    const amount = Number(value || 0);
    return `¥${amount.toFixed(2)}`;
  }

  function fmtDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("zh-CN", { hour12: false });
  }

  function labelStatus(status) {
    if (!status) return "未知状态";
    return STATUS_LABELS[status] || status;
  }

  function labelPayment(status) {
    if (!status) return "未知支付状态";
    return PAYMENT_LABELS[status] || status;
  }

  function labelRefund(status) {
    if (!status) return "未知退款状态";
    return REFUND_LABELS[status] || status;
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  function readField(source, keys) {
    for (const key of keys) {
      if (source && source[key] !== undefined && source[key] !== null) {
        return source[key];
      }
    }
    return "";
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function loadConfig() {
    const saved = safeParse(localStorage.getItem(KEY.config), {});
    return {
      apiBaseUrl: normalizeApiBaseUrl(String(saved.apiBaseUrl || window.CRYSTALSTORE_ADMIN_API_BASE_URL || "http://localhost:3002").trim()),
      adminKey: String(saved.adminKey || "").trim(),
      orderStatus: saved.orderStatus || "all",
      refundStatus: saved.refundStatus || "all",
      keyword: String(saved.keyword || "").trim(),
      orderPage: Number(saved.orderPage || 1),
      orderPageSize: Number(saved.orderPageSize || 20),
      refundPage: Number(saved.refundPage || 1),
      refundPageSize: Number(saved.refundPageSize || 20)
    };
  }

  function persistConfig() {
    localStorage.setItem(KEY.config, JSON.stringify(state.config));
  }

  function loadDemoDb() {
    const saved = safeParse(localStorage.getItem(KEY.demo), null);
    if (saved?.orders?.length) {
      return saved;
    }
    return buildDemoDb();
  }

  function buildDemoDb() {
    return { orders: clone(DEMO_ORDERS) };
  }

  function persistDemo() {
    localStorage.setItem(KEY.demo, JSON.stringify(state.demo));
  }

  function safeParse(text, fallback) {
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  function buildOrderListItem(order) {
    return {
      id: order.id,
      order_no: order.order_no,
      order_status: order.order_status,
      pay_status: order.pay_status,
      payable_amount: order.payable_amount,
      paid_amount: order.paid_amount,
      created_at: order.created_at,
      updated_at: order.updated_at,
      user_nickname: order.user_nickname,
      user_phone: order.user_phone
    };
  }

  function findDemoOrder(orderId) {
    return state.demo.orders.find((item) => Number(item.id) === Number(orderId)) || null;
  }

  function isOrderVisibleInCurrentResults(orderId) {
    return state.orders.some((item) => Number(item.id) === Number(orderId)) || state.refunds.some((item) => Number(item.order_id) === Number(orderId));
  }

  function findDemoRefund(refundId) {
    for (const order of state.demo.orders) {
      const refund = (order.refunds || []).find((item) => Number(item.id) === Number(refundId));
      if (refund) {
        return { order, refund };
      }
    }
    return null;
  }

  function pushLog(order, fromStatus, toStatus, operatorType, note) {
    const nextId = Math.max(0, ...state.demo.orders.flatMap((item) => (item.logs || []).map((log) => Number(log.id) || 0))) + 1;
    order.logs = order.logs || [];
    order.logs.push({ id: nextId, from_status: fromStatus, to_status: toStatus, operator_type: operatorType, note, created_at: new Date().toISOString() });
  }

  function buildPagedResult(rows, page, pageSize) {
    const normalizedPageSize = Number(pageSize) > 0 ? Number(pageSize) : 20;
    const normalizedPage = Number(page) > 0 ? Number(page) : 1;
    const offset = (normalizedPage - 1) * normalizedPageSize;
    return {
      items: rows.slice(offset, offset + normalizedPageSize),
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total: rows.length
    };
  }

  function normalizeApiBaseUrl(value) {
    const trimmed = String(value || "").trim().replace(/\/+$/, "");
    if (!trimmed) return "";
    return trimmed.replace(/\/api\/admin$/i, "");
  }
})();
