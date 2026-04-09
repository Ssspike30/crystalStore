(() => {
  const KEY = {
    config: "crystalStore.userFrontend.config.v1",
    db: "crystalStore.userFrontend.db.v1",
    ui: "crystalStore.userFrontend.ui.v1"
  };

  const BEADS = [
    { id: 1, sku_code: "BEAD-WHITE-6", name: "白玉髓 6mm", color: "白玉髓", size_mm: 6, unit_price: 3 },
    { id: 2, sku_code: "BEAD-ROSE-8", name: "粉晶 8mm", color: "粉晶", size_mm: 8, unit_price: 5 },
    { id: 3, sku_code: "BEAD-AMETHYST-10", name: "紫水晶 10mm", color: "紫水晶", size_mm: 10, unit_price: 8 },
    { id: 4, sku_code: "BEAD-OBSIDIAN-6", name: "黑曜石 6mm", color: "黑曜石", size_mm: 6, unit_price: 4 },
    { id: 5, sku_code: "BEAD-TIGER-8", name: "虎眼石 8mm", color: "虎眼石", size_mm: 8, unit_price: 6 },
    { id: 6, sku_code: "BEAD-OLIVE-10", name: "橄榄石 10mm", color: "橄榄石", size_mm: 10, unit_price: 9 }
  ];

  const DEMO_ADDRESS = {
    id: 1,
    receiverName: "张三",
    receiverPhone: "13800000000",
    province: "上海市",
    city: "上海市",
    district: "浦东新区",
    detailAddress: "世纪大道100号",
    postalCode: "200120",
    tag: "家",
    isDefault: 1
  };

  const state = {
    config: loadConfig(),
    ui: loadUi(),
    db: loadDb(),
    user: null,
    profile: null,
    selectedOrderId: null,
    paymentNo: "",
    paymentResult: null,
    remoteReachable: false
  };

  const els = {};

  function loadConfig() {
    const saved = safeParse(localStorage.getItem(KEY.config), {});
    return {
      apiBaseUrl: (saved.apiBaseUrl || window.CRYSTALSTORE_API_BASE_URL || "").trim(),
      shippingFee: numberOrFallback(saved.shippingFee, 12)
    };
  }

  function loadUi() {
    return safeParse(localStorage.getItem(KEY.ui), {
      wristSizeCm: 16,
      orderWristSizeCm: 16,
      remark: "",
      nickname: "演示用户",
      avatarUrl: "",
      openid: ""
    });
  }

  function seedProfile() {
    return {
      user: { userId: 1001, openid: "demo_openid", nickname: "演示用户", avatarUrl: "", createdAt: new Date().toISOString() },
      next: { addressId: 2, cartItemId: 2, orderId: 1001, paymentNo: 1, refundId: 1 },
      cart: { cartId: 1, items: [] },
      addresses: [clone(DEMO_ADDRESS)],
      orders: [],
      payments: [],
      refunds: []
    };
  }

  function loadDb() {
    const saved = safeParse(localStorage.getItem(KEY.db), null);
    if (saved?.profiles) return normalizeDb(saved);
    return { currentOpenid: "demo_openid", profiles: { demo_openid: seedProfile() } };
  }

  function normalizeDb(saved) {
    const db = { currentOpenid: saved.currentOpenid || "demo_openid", profiles: saved.profiles || {} };
    if (!db.profiles.demo_openid) db.profiles.demo_openid = seedProfile();
    return db;
  }

  function persistConfig() { localStorage.setItem(KEY.config, JSON.stringify(state.config)); }
  function persistDb() { localStorage.setItem(KEY.db, JSON.stringify(state.db)); }
  function persistUi() { localStorage.setItem(KEY.ui, JSON.stringify(state.ui)); }

  function safeParse(text, fallback) {
    if (!text) return fallback;
    try { return JSON.parse(text); } catch { return fallback; }
  }

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function money(value) { return `¥${Number(value || 0).toFixed(2)}`; }
  function fmtDate(value) {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? String(value || "-") : dt.toLocaleString("zh-CN");
  }
  function fmtWrist(value) { return `${Number(value).toFixed(1)} cm`; }
  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function numberOrFallback(value, fallback) {
    if (value === "" || value === null || value === undefined) return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function currentProfile() {
    const profile = state.db.profiles[state.db.currentOpenid];
    state.profile = profile || null;
    state.user = profile?.user || null;
    return profile || null;
  }

  function currentOrder(profile = currentProfile()) {
    if (!profile) throw new Error("请先登录");
    const orderId = Number(state.selectedOrderId);
    if (!Number.isFinite(orderId) || orderId <= 0) throw new Error("请选择订单");
    const order = profile.orders.find((item) => Number(item.id) === orderId);
    if (!order) throw new Error("当前选中的订单不存在");
    return order;
  }

  function currentOrderPayment(order, paymentNo = state.paymentNo) {
    const payments = Array.isArray(order?.payments) ? order.payments : [];
    const key = String(paymentNo || "").trim();
    if (key) {
      const payment = payments.find((item) => String(item.paymentNo) === key);
      if (!payment) throw new Error("当前选中的订单下不存在该支付单");
      return payment;
    }
    const payment = [...payments].reverse().find((item) => ["initiated", "success"].includes(item.status));
    if (!payment) throw new Error("当前选中的订单没有可回调的支付单");
    return payment;
  }

  function ensureProfile(openid, payload = {}) {
    const key = String(openid || `mock_${Date.now()}`).trim();
    if (!state.db.profiles[key]) {
      const userId = Object.values(state.db.profiles).reduce((max, item) => Math.max(max, Number(item.user.userId || 0)), 1000) + 1;
      state.db.profiles[key] = {
        user: { userId, openid: key, nickname: payload.nickname || "演示用户", avatarUrl: payload.avatarUrl || "", createdAt: new Date().toISOString() },
        next: { addressId: 2, cartItemId: 2, orderId: 1001, paymentNo: 1, refundId: 1 },
        cart: { cartId: userId * 10 + 1, items: [] },
        addresses: [clone(DEMO_ADDRESS)],
        orders: [],
        payments: [],
        refunds: []
      };
    }
    state.db.currentOpenid = key;
    persistDb();
    return state.db.profiles[key];
  }

  function ensureCart(profile) {
    if (!profile.cart) profile.cart = { cartId: profile.user.userId * 10 + 1, items: [] };
    return profile.cart;
  }

  function beadById(id) { return BEADS.find((item) => Number(item.id) === Number(id)); }

  function cartItems(profile) {
    const cart = ensureCart(profile);
    return cart.items.map((item) => {
      const bead = beadById(item.beadId) || item.snapshot;
      return {
        id: item.id,
        bead_id: item.beadId,
        quantity: item.quantity,
        selected: item.selected ? 1 : 0,
        name: bead?.name || "未知珠子",
        color: bead?.color || "-",
        size_mm: bead?.size_mm || 0,
        unit_price: bead?.unit_price || 0
      };
    });
  }

  function sumDiameter(items) {
    return items.reduce((total, item) => total + Number(item.size_mm) * Number(item.quantity), 0);
  }

  function validateWrist(value) {
    const wrist = Number(value);
    if (Number.isNaN(wrist)) return { ok: false, message: "腕围必须是数字" };
    if (wrist < 13 || wrist > 21) return { ok: false, message: "腕围超出范围，必须在 13 - 21 cm 之间" };
    return { ok: true, wrist };
  }

  function validateAddress(payload) {
    const required = ["receiverName", "receiverPhone", "province", "city", "district", "detailAddress"];
    const labels = { receiverName: "收件人", receiverPhone: "手机号", province: "省份", city: "城市", district: "区县", detailAddress: "详细地址" };
    for (const key of required) {
      if (!String(payload[key] || "").trim()) return `${labels[key]}不能为空`;
    }
    return "";
  }

  function orderSummary(order) {
    return {
      id: order.id,
      order_no: order.orderNo,
      order_status: order.orderStatus,
      pay_status: order.payStatus,
      payable_amount: Number(order.payableAmount).toFixed(2),
      created_at: order.createdAt,
      orderNo: order.orderNo,
      orderStatus: order.orderStatus,
      payStatus: order.payStatus,
      payableAmount: order.payableAmount,
      createdAt: order.createdAt,
      items: order.items || []
    };
  }

  function buildOrderNo() {
    const now = new Date();
    const pad = (value, len = 2) => String(value).padStart(len, "0");
    return `CS${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 100000), 5)}`;
  }

  function joinUrl(base, path) {
    return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  }

  function shouldFallback(path, method, error) {
    const unsupported = [
      ["POST", /^\/api\/auth\/mock-login$/],
      ["GET", /^\/api\/orders\/\d+$/],
      ["POST", /^\/api\/orders\/\d+\/refund$/]
    ];
    if (unsupported.some(([m, rx]) => m === method && rx.test(path))) return true;
    if (error?.name === "TypeError" || String(error?.message || "").includes("Failed to fetch")) return true;
    if (error?.status === 404) return true;
    return false;
  }

  function initEls() {
    const ids = [
      "modeBadge", "currentUserLabel", "noticeText", "apiBaseUrlInput", "wristSizeInput", "shippingFeeInput",
      "saveConfigBtn", "refreshBtn", "resetDemoBtn", "loginBtn", "nicknameInput", "avatarInput", "openidInput",
      "beadsGrid", "cartSummary", "cartList", "addressList", "addressFormMode", "receiverNameInput",
      "receiverPhoneInput", "provinceInput", "cityInput", "districtInput", "detailAddressInput", "postalCodeInput",
      "tagInput", "isDefaultInput", "cancelAddressEditBtn", "saveAddressBtn", "orderAddressSelect", "orderWristInput",
      "remarkInput", "createOrderBtn", "createOrderFromFormBtn", "loadOrderDetailBtn", "paymentOrderSelect",
      "prepayBtn", "callbackSuccessBtn", "callbackFailBtn", "paymentResult", "ordersList", "orderDetail",
      "clearSelectionBtn", "selectAllBtn"
    ];
    ids.forEach((id) => { els[id] = document.getElementById(id); });
  }

  function setNotice(text, kind = "warm") {
    els.noticeText.textContent = text;
    els.noticeText.className = `notice-text notice-enter ${kind === "danger" ? "text-danger" : ""}`.trim();
  }

  function setModeLabel() {
    const hasBase = Boolean(state.config.apiBaseUrl.trim());
    els.modeBadge.textContent = hasBase ? (state.remoteReachable ? "远程优先" : "远程尝试 + 本地兜底") : "本地演示";
    els.modeBadge.className = `badge ${hasBase ? "badge-soft" : "badge-warm"}`;
  }

  function syncSnapshot() {
    const profile = currentProfile();
    if (!profile) {
      state.profile = null;
      state.user = null;
      state.orders = [];
      state.cart = { cartId: null, items: [] };
      state.addresses = [];
      return;
    }
    state.cart = { cartId: ensureCart(profile).cartId, items: clone(cartItems(profile)) };
    state.addresses = clone(profile.addresses || []);
    state.orders = clone(profile.orders || []);
  }

  function renderShell() {
    els.apiBaseUrlInput.value = state.config.apiBaseUrl || "";
    els.shippingFeeInput.value = state.config.shippingFee;
    els.wristSizeInput.value = state.ui.wristSizeCm ?? 16;
    els.orderWristInput.value = state.ui.orderWristSizeCm ?? state.ui.wristSizeCm ?? 16;
    els.remarkInput.value = state.ui.remark || "";
    els.nicknameInput.value = state.ui.nickname || "演示用户";
    els.avatarInput.value = state.ui.avatarUrl || "";
    els.openidInput.value = state.ui.openid || "";
    els.currentUserLabel.textContent = state.user
      ? `${state.user.nickname || "未命名用户"} · ID ${state.user.userId}`
      : "未登录";
    setModeLabel();
  }

  function renderBeads() {
    els.beadsGrid.innerHTML = BEADS.map((bead) => `
      <article class="bead-card" data-bead-id="${bead.id}">
        <div class="bead-top">
          <div>
            <h3>${escapeHtml(bead.name)}</h3>
            <p>${escapeHtml(bead.color)} · ${Number(bead.size_mm).toFixed(1)} mm · SKU ${escapeHtml(bead.sku_code)}</p>
          </div>
          <span class="price-tag">${money(bead.unit_price)}</span>
        </div>
        <div class="bead-actions">
          <label class="field compact">
            <span>数量</span>
            <input data-role="qty" type="number" min="1" step="1" value="1" />
          </label>
          <button data-action="add" class="btn btn-primary" type="button">加入购物车</button>
        </div>
      </article>
    `).join("");

    els.beadsGrid.querySelectorAll("[data-action='add']").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const card = event.currentTarget.closest("[data-bead-id]");
        const beadId = Number(card.dataset.beadId);
        const qty = card.querySelector("[data-role='qty']").value;
        await handleAddToCart(beadId, qty);
      });
    });
  }

  function renderCart() {
    const items = state.cart.items || [];
    const selected = items.filter((item) => item.selected);
    const selectedDiameter = sumDiameter(selected);
    const selectedAmount = selected.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);

    els.cartSummary.innerHTML = [
      `购物车 ${items.length} 项`,
      `已勾选 ${selected.length} 项`,
      `累计直径 ${selectedDiameter.toFixed(1)} mm`,
      `商品金额 ${money(selectedAmount)}`
    ].map((text) => `<span class="summary-chip">${escapeHtml(text)}</span>`).join("");

    if (!items.length) {
      els.cartList.innerHTML = `<div class="empty-state">购物车还是空的。先去左侧挑几颗珠子加入吧。</div>`;
      return;
    }

    els.cartList.innerHTML = items.map((item) => `
      <article class="cart-item" data-item-id="${item.id}">
        <label class="checkbox-field cart-checkbox">
          <input data-action="selected" type="checkbox" ${item.selected ? "checked" : ""} />
          <span>${escapeHtml(item.name)}</span>
        </label>
        <div class="cart-meta">
          <span>${escapeHtml(item.color)} · ${Number(item.size_mm).toFixed(1)} mm · 单价 ${money(item.unit_price)}</span>
          <span>小计 ${money(Number(item.unit_price) * Number(item.quantity))}</span>
        </div>
        <div class="cart-controls">
          <button data-action="decrease" class="btn btn-sm" type="button">-</button>
          <input data-action="quantity" type="number" min="1" step="1" value="${item.quantity}" />
          <button data-action="increase" class="btn btn-sm" type="button">+</button>
          <button data-action="delete" class="btn btn-sm btn-ghost" type="button">删除</button>
        </div>
      </article>
    `).join("");

    els.cartList.querySelectorAll("[data-action='selected']").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const itemId = Number(event.currentTarget.closest("[data-item-id]").dataset.itemId);
        await updateCartItem(itemId, { selected: event.currentTarget.checked });
      });
    });
    els.cartList.querySelectorAll("[data-action='quantity']").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const itemId = Number(event.currentTarget.closest("[data-item-id]").dataset.itemId);
        await updateCartItem(itemId, { quantity: event.currentTarget.value });
      });
    });
    els.cartList.querySelectorAll("[data-action='decrease']").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const card = event.currentTarget.closest("[data-item-id]");
        const item = items.find((entry) => Number(entry.id) === Number(card.dataset.itemId));
        await updateCartItem(item.id, { quantity: Math.max(1, Number(item.quantity) - 1) });
      });
    });
    els.cartList.querySelectorAll("[data-action='increase']").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const card = event.currentTarget.closest("[data-item-id]");
        const item = items.find((entry) => Number(entry.id) === Number(card.dataset.itemId));
        await updateCartItem(item.id, { quantity: Number(item.quantity) + 1 });
      });
    });
    els.cartList.querySelectorAll("[data-action='delete']").forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        const itemId = Number(event.currentTarget.closest("[data-item-id]").dataset.itemId);
        await deleteCartItem(itemId);
      });
    });
  }

  function renderAddresses() {
    if (!state.addresses.length) {
      els.addressList.innerHTML = `<div class="empty-state">还没有地址。可以先在右侧新增一个默认地址。</div>`;
      return;
    }
    els.addressList.innerHTML = state.addresses.map((address) => `
      <article class="address-card" data-address-id="${address.id}">
        <div class="address-head">
          <strong>${escapeHtml(address.receiverName)} · ${escapeHtml(address.receiverPhone)}</strong>
          <span class="badge ${address.isDefault ? "badge-soft" : ""}">${address.isDefault ? "默认" : "普通"}</span>
        </div>
        <p>${escapeHtml(`${address.province}${address.city}${address.district}${address.detailAddress}`)}${address.postalCode ? ` · ${escapeHtml(address.postalCode)}` : ""}${address.tag ? ` · ${escapeHtml(address.tag)}` : ""}</p>
        <div class="address-actions">
          <button data-action="default" class="btn btn-sm" type="button">设默认</button>
          <button data-action="edit" class="btn btn-sm" type="button">编辑</button>
          <button data-action="delete" class="btn btn-sm btn-ghost" type="button">删除</button>
        </div>
      </article>
    `).join("");

    els.addressList.querySelectorAll("[data-action='default']").forEach((btn) => btn.addEventListener("click", async (event) => {
      const addressId = Number(event.currentTarget.closest("[data-address-id]").dataset.addressId);
      await setDefaultAddress(addressId);
    }));
    els.addressList.querySelectorAll("[data-action='edit']").forEach((btn) => btn.addEventListener("click", (event) => {
      const addressId = Number(event.currentTarget.closest("[data-address-id]").dataset.addressId);
      const address = state.addresses.find((item) => Number(item.id) === addressId);
      fillAddressForm(address);
    }));
    els.addressList.querySelectorAll("[data-action='delete']").forEach((btn) => btn.addEventListener("click", async (event) => {
      const addressId = Number(event.currentTarget.closest("[data-address-id]").dataset.addressId);
      await deleteAddress(addressId);
    }));
  }

  function renderAddressSelects() {
    els.orderAddressSelect.innerHTML = state.addresses.length
      ? state.addresses.map((address) => `<option value="${address.id}" ${address.isDefault ? "selected" : ""}>${escapeHtml(address.receiverName)} · ${escapeHtml(address.province)}${escapeHtml(address.city)}${escapeHtml(address.district)}</option>`).join("")
      : `<option value="">请先创建收货地址</option>`;

    const pending = state.orders.filter((order) => order.orderStatus === "pending_payment");
    els.paymentOrderSelect.innerHTML = pending.length
      ? pending.map((order) => `<option value="${order.id}">${escapeHtml(order.orderNo)} · ${money(order.payableAmount)}</option>`).join("")
      : `<option value="">没有待支付订单</option>`;
    if (!state.selectedOrderId || !state.orders.some((order) => Number(order.id) === Number(state.selectedOrderId))) {
      state.selectedOrderId = pending[0]?.id || state.selectedOrderId;
    }
  }

  function renderOrders() {
    if (!state.orders.length) {
      els.ordersList.innerHTML = `<div class="empty-state">还没有订单。先完成一次下单流程吧。</div>`;
      return;
    }
    els.ordersList.innerHTML = state.orders.map((order) => `
      <article class="order-card" data-order-id="${order.id}">
        <div class="order-head">
          <div><strong>${escapeHtml(order.orderNo)}</strong><p>${escapeHtml(order.orderStatus)} · ${fmtDate(order.createdAt)}</p></div>
          <span class="badge ${payBadge(order.payStatus)}">${escapeHtml(order.payStatus)}</span>
        </div>
        <div class="order-sum">${escapeHtml(fmtWrist(order.wristSizeCm))} · ${escapeHtml(money(order.payableAmount))} · ${order.items.length} 项</div>
        <div class="order-actions">
          <button data-action="detail" class="btn btn-sm btn-primary" type="button">查看详情</button>
          <button data-action="pay" class="btn btn-sm" type="button">去支付</button>
          <button data-action="refund" class="btn btn-sm btn-ghost" type="button">申请退款</button>
        </div>
      </article>
    `).join("");

    els.ordersList.querySelectorAll("[data-action='detail']").forEach((btn) => btn.addEventListener("click", (event) => {
      const orderId = Number(event.currentTarget.closest("[data-order-id]").dataset.orderId);
      state.selectedOrderId = orderId;
      renderOrderDetail();
    }));
    els.ordersList.querySelectorAll("[data-action='pay']").forEach((btn) => btn.addEventListener("click", async (event) => {
      const orderId = Number(event.currentTarget.closest("[data-order-id]").dataset.orderId);
      state.selectedOrderId = orderId;
      await prepayOrder(orderId);
    }));
    els.ordersList.querySelectorAll("[data-action='refund']").forEach((btn) => btn.addEventListener("click", async (event) => {
      const orderId = Number(event.currentTarget.closest("[data-order-id]").dataset.orderId);
      state.selectedOrderId = orderId;
      await requestRefund(orderId);
    }));
    els.ordersList.querySelectorAll("[data-order-id]").forEach((card) => {
      const orderId = Number(card.dataset.orderId);
      const order = state.orders.find((item) => Number(item.id) === orderId);
      const payBtn = card.querySelector("[data-action='pay']");
      const refundBtn = card.querySelector("[data-action='refund']");
      if (order?.orderStatus !== "pending_payment") payBtn.classList.add("hidden");
      if (!(order?.payStatus === "paid" || order?.payStatus === "refund_pending" || order?.orderStatus === "refund_pending")) {
        refundBtn.classList.add("hidden");
      }
    });
  }

  function payBadge(status) {
    if (status === "paid") return "badge-soft";
    if (status === "refund_pending") return "badge-warm";
    return "";
  }

  function renderOrderDetail() {
    const order = state.orders.find((item) => Number(item.id) === Number(state.selectedOrderId));
    if (!order) {
      els.orderDetail.innerHTML = `<div class="empty-state">请选择一笔订单查看详情。<br />如果当前还没有订单，请先走完下单流程。</div>`;
      return;
    }
    const payments = order.payments || [];
    const refunds = order.refunds || [];
    const timeline = order.timeline || [];
    const addr = order.addressSnapshot || {};
    els.orderDetail.innerHTML = `
      <div class="detail-block">
        <h3>${escapeHtml(order.orderNo)}</h3>
        <p>订单状态：<strong>${escapeHtml(order.orderStatus)}</strong> · 支付状态：<strong>${escapeHtml(order.payStatus)}</strong></p>
        <p>腕围：${escapeHtml(fmtWrist(order.wristSizeCm))} · 运费：${escapeHtml(money(order.shippingFee))} · 应付：${escapeHtml(money(order.payableAmount))}</p>
        <p>备注：${escapeHtml(order.remark || "无")}</p>
      </div>
      <div class="detail-block">
        <h4>收货信息</h4>
        <p>${escapeHtml(addr.receiverName || "-")} · ${escapeHtml(addr.receiverPhone || "-")}</p>
        <p>${escapeHtml(`${addr.province || ""}${addr.city || ""}${addr.district || ""}${addr.detailAddress || ""}`)}</p>
        <p>${escapeHtml([addr.postalCode, addr.tag].filter(Boolean).join(" · ") || "无")}</p>
      </div>
      <div class="detail-block">
        <h4>订单明细</h4>
        ${order.items.length ? order.items.map((item) => `<p>${escapeHtml(item.bead_name)} · ${item.quantity} 颗 · ${item.bead_size_mm} mm · ${money(item.line_amount)}</p>`).join("") : "<p>暂无明细</p>"}
      </div>
      <div class="detail-block">
        <h4>支付记录</h4>
        ${payments.length ? payments.map((item) => `<p>${escapeHtml(item.paymentNo)} · ${escapeHtml(item.status)} · ${money(item.payAmount)}</p>`).join("") : "<p>尚未发起支付</p>"}
      </div>
      <div class="detail-block">
        <h4>退款记录</h4>
        ${refunds.length ? refunds.map((item) => `<p>${escapeHtml(item.refundNo)} · ${escapeHtml(item.status)} · ${money(item.refundAmount)} · ${escapeHtml(item.reason || "无原因")}</p>`).join("") : "<p>暂无退款申请</p>"}
      </div>
      <div class="detail-block">
        <h4>状态流转</h4>
        ${timeline.length ? timeline.map((item) => `<p>${fmtDate(item.at)} · ${escapeHtml(item.fromStatus || "创建")} → ${escapeHtml(item.toStatus)} · ${escapeHtml(item.note || "")}</p>`).join("") : "<p>暂无状态日志</p>"}
      </div>
      <div class="detail-block">
        <h4>动作</h4>
        <div class="order-actions">
          <button id="detailPrepayBtn" class="btn btn-primary" type="button">发起 prepay</button>
          <button id="detailCallbackBtn" class="btn" type="button">模拟 callback 成功</button>
          <button id="detailRefundBtn" class="btn btn-ghost" type="button">申请退款</button>
        </div>
      </div>
    `;
    els.orderDetail.querySelector("#detailPrepayBtn").addEventListener("click", () => prepayOrder(order.id));
    els.orderDetail.querySelector("#detailCallbackBtn").addEventListener("click", () => callbackPayment(true));
    els.orderDetail.querySelector("#detailRefundBtn").addEventListener("click", () => requestRefund(order.id));
    if (order.orderStatus !== "pending_payment") {
      els.orderDetail.querySelector("#detailPrepayBtn").classList.add("hidden");
      els.orderDetail.querySelector("#detailCallbackBtn").classList.add("hidden");
    }
    if (order.payStatus !== "paid" && order.payStatus !== "refund_pending" && order.orderStatus !== "refund_pending") {
      els.orderDetail.querySelector("#detailRefundBtn").classList.add("hidden");
    }
  }

  function renderAll() {
    syncSnapshot();
    renderShell();
    renderBeads();
    renderCart();
    renderAddresses();
    renderAddressSelects();
    renderOrders();
    renderOrderDetail();
    persistUi();
  }

  async function api(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const body = options.body && typeof options.body === "string" ? safeParse(options.body, null) : (options.body || null);
    const base = state.config.apiBaseUrl.trim();
    if (base) {
      try {
        const res = await fetch(joinUrl(base, path), {
          method,
          headers: buildHeaders(options.headers, body, options.skipAuth),
          body: body ? JSON.stringify(body) : undefined,
          mode: "cors"
        });
        const text = await res.text();
        const data = text ? safeParse(text, text) : null;
        if (!res.ok) {
          const err = new Error(data?.message || `HTTP ${res.status}`);
          err.status = res.status;
          throw err;
        }
        state.remoteReachable = true;
        setModeLabel();
        return data;
      } catch (error) {
        if (!shouldFallback(path, method, error)) throw error;
        state.remoteReachable = false;
        setModeLabel();
        setNotice(`远程请求失败，已切换到本地演示：${error.message}`, "danger");
      }
    }
    return mockApi(path, method, body);
  }

  function buildHeaders(extra = {}, body = null, skipAuth = false) {
    const headers = { "Content-Type": "application/json", ...extra };
    if (!skipAuth && state.user) headers["x-user-id"] = String(state.user.userId);
    if (!body) delete headers["Content-Type"];
    return headers;
  }

  function mockApi(path, method, body) {
    if (method === "GET" && path === "/health") return { status: "ok", service: "user-frontend" };
    if (method === "POST" && path === "/api/auth/mock-login") return mockLogin(body || {});
    if (method === "GET" && path === "/api/beads") return clone(BEADS);

    const profile = currentProfile();
    if (!profile) throw new Error("请先登录后再进行该操作");
    ensureCart(profile);

    if (method === "GET" && path === "/api/cart") return { cartId: profile.cart.cartId, items: clone(cartItems(profile)) };
    if (method === "POST" && path === "/api/cart/items") return mockAddCartItem(profile, body || {});
    const cartMatch = path.match(/^\/api\/cart\/items\/(\d+)$/);
    if (cartMatch && method === "PATCH") return mockUpdateCartItem(profile, Number(cartMatch[1]), body || {});
    if (cartMatch && method === "DELETE") return mockDeleteCartItem(profile, Number(cartMatch[1]));

    if (method === "GET" && path === "/api/addresses") return clone(profile.addresses || []);
    if (method === "POST" && path === "/api/addresses") return mockCreateAddress(profile, body || {});
    const addrMatch = path.match(/^\/api\/addresses\/(\d+)$/);
    if (addrMatch && method === "PUT") return mockUpdateAddress(profile, Number(addrMatch[1]), body || {});
    const addrDefaultMatch = path.match(/^\/api\/addresses\/(\d+)\/default$/);
    if (addrDefaultMatch && method === "PATCH") return mockSetDefaultAddress(profile, Number(addrDefaultMatch[1]));
    if (addrMatch && method === "DELETE") return mockDeleteAddress(profile, Number(addrMatch[1]));

    if (method === "POST" && path === "/api/orders") return mockCreateOrder(profile, body || {});
    if (method === "GET" && path === "/api/orders") return clone(profile.orders || []).map(orderSummary);
    const orderMatch = path.match(/^\/api\/orders\/(\d+)$/);
    if (orderMatch && method === "GET") return clone(getOrderDetail(profile, Number(orderMatch[1])));
    const refundMatch = path.match(/^\/api\/orders\/(\d+)\/refund$/);
    if (refundMatch && method === "POST") return mockCreateRefund(profile, Number(refundMatch[1]), body || {});

    if (method === "POST" && path === "/api/payments/prepay") return mockPrepay(profile, body || {});
    if (method === "POST" && path === "/api/payments/callback") return mockPaymentCallback(profile, body || {});
    throw new Error(`未实现的本地 mock 接口：${method} ${path}`);
  }

  function mockLogin(payload) {
    const openid = String(payload.openid || `mock_${Date.now()}`).trim();
    const profile = ensureProfile(openid, payload);
    profile.user.nickname = String(payload.nickname || "演示用户").trim() || "演示用户";
    profile.user.avatarUrl = String(payload.avatarUrl || "").trim();
    state.db.currentOpenid = openid;
    persistDb();
    setNotice(`登录成功，已切换到 ${profile.user.nickname}`, "success");
    return { userId: profile.user.userId, openid, nickname: profile.user.nickname, avatarUrl: profile.user.avatarUrl, message: "mock 登录成功" };
  }

  function mockAddCartItem(profile, payload) {
    const beadId = Number(payload.beadId);
    const quantity = Number(payload.quantity || 1);
    const wrist = validateWrist(payload.wristSizeCm);
    const bead = beadById(beadId);
    if (!bead) throw new Error("珠子不存在");
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("数量必须大于 0");
    if (!wrist.ok) throw new Error(wrist.message);

    const cart = ensureCart(profile);
    const nextItems = cart.items.map((item) => Number(item.beadId) === beadId ? { ...item, quantity: Number(item.quantity) + quantity } : item);
    if (!nextItems.some((item) => Number(item.beadId) === beadId)) {
      nextItems.push({ id: profile.next.cartItemId++, beadId, quantity, selected: true, snapshot: clone(bead) });
    }
    const totalDiameter = sumDiameter(nextItems.map((item) => ({ size_mm: (item.snapshot || beadById(item.beadId)).size_mm, quantity: item.quantity })));
    if (totalDiameter > wrist.wrist * 10) throw new Error("珠子累计直径超出腕围上限，禁止添加");
    cart.items = nextItems;
    persistDb();
    syncSnapshot();
    setNotice("已加入购物车", "success");
    return { message: "已加入购物车" };
  }

  function mockUpdateCartItem(profile, itemId, payload) {
    const item = ensureCart(profile).items.find((entry) => Number(entry.id) === Number(itemId));
    if (!item) throw new Error("购物车项不存在");
    if (Object.prototype.hasOwnProperty.call(payload, "quantity")) {
      const quantity = Number(payload.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("数量必须大于 0");
      item.quantity = quantity;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "selected")) item.selected = Boolean(payload.selected);
    persistDb();
    syncSnapshot();
    setNotice("购物车已更新", "success");
    return { message: "购物车项已更新" };
  }

  function mockDeleteCartItem(profile, itemId) {
    const cart = ensureCart(profile);
    const before = cart.items.length;
    cart.items = cart.items.filter((item) => Number(item.id) !== Number(itemId));
    if (before === cart.items.length) throw new Error("购物车项不存在");
    persistDb();
    syncSnapshot();
    setNotice("购物车项已删除", "success");
    return { message: "购物车项已删除" };
  }

  function mockCreateAddress(profile, payload) {
    const err = validateAddress(payload);
    if (err) throw new Error(err);
    if (Number(payload.isDefault) === 1) profile.addresses.forEach((item) => { item.isDefault = 0; });
    const address = {
      id: profile.next.addressId++,
      receiverName: payload.receiverName,
      receiverPhone: payload.receiverPhone,
      province: payload.province,
      city: payload.city,
      district: payload.district,
      detailAddress: payload.detailAddress,
      postalCode: payload.postalCode || "",
      tag: payload.tag || "",
      isDefault: Number(payload.isDefault) === 1 ? 1 : 0
    };
    profile.addresses.push(address);
    if (address.isDefault) profile.addresses = profile.addresses.map((item) => ({ ...item, isDefault: Number(item.id) === Number(address.id) ? 1 : 0 }));
    persistDb();
    syncSnapshot();
    setNotice("地址已创建", "success");
    return { id: address.id, message: "地址已创建" };
  }

  function mockUpdateAddress(profile, addressId, payload) {
    const err = validateAddress(payload);
    if (err) throw new Error(err);
    const index = profile.addresses.findIndex((item) => Number(item.id) === Number(addressId));
    if (index < 0) throw new Error("地址不存在");
    if (Number(payload.isDefault) === 1) profile.addresses.forEach((item) => { item.isDefault = 0; });
    profile.addresses[index] = { ...profile.addresses[index], ...payload, postalCode: payload.postalCode || "", tag: payload.tag || "", isDefault: Number(payload.isDefault) === 1 ? 1 : 0 };
    persistDb();
    syncSnapshot();
    setNotice("地址已更新", "success");
    return { message: "地址已更新" };
  }

  function mockSetDefaultAddress(profile, addressId) {
    const address = profile.addresses.find((item) => Number(item.id) === Number(addressId));
    if (!address) throw new Error("地址不存在");
    profile.addresses.forEach((item) => { item.isDefault = Number(item.id) === Number(addressId) ? 1 : 0; });
    persistDb();
    syncSnapshot();
    setNotice("已设为默认地址", "success");
    return { message: "默认地址已更新" };
  }

  function mockDeleteAddress(profile, addressId) {
    const before = profile.addresses.length;
    profile.addresses = profile.addresses.filter((item) => Number(item.id) !== Number(addressId));
    if (before === profile.addresses.length) throw new Error("地址不存在");
    if (!profile.addresses.some((item) => item.isDefault) && profile.addresses[0]) profile.addresses[0].isDefault = 1;
    persistDb();
    syncSnapshot();
    setNotice("地址已删除", "success");
    return { message: "地址已删除" };
  }

  function mockCreateOrder(profile, payload) {
    const wrist = validateWrist(payload.wristSizeCm);
    if (!wrist.ok) throw new Error(wrist.message);
    const address = profile.addresses.find((item) => Number(item.id) === Number(payload.addressId));
    if (!address) throw new Error("请选择有效收货地址");
    const selected = cartItems(profile).filter((item) => item.selected);
    if (!selected.length) throw new Error("购物车未选择商品");
    const diameter = sumDiameter(selected);
    if (diameter > wrist.wrist * 10) throw new Error("珠子累计直径超出腕围上限，禁止下单");
    const itemsAmount = selected.reduce((sum, item) => sum + Number(item.unit_price) * Number(item.quantity), 0);
    const shippingFee = numberOrFallback(state.config.shippingFee, 12);
    const order = {
      id: profile.next.orderId++,
      orderNo: buildOrderNo(),
      orderStatus: "pending_payment",
      payStatus: "unpaid",
      wristSizeCm: wrist.wrist,
      beadsTotalDiameterMm: Number(diameter.toFixed(1)),
      itemsAmount: Number(itemsAmount.toFixed(2)),
      shippingFee: Number(shippingFee.toFixed(2)),
      discountAmount: 0,
      payableAmount: Number((itemsAmount + shippingFee).toFixed(2)),
      paidAmount: 0,
      remark: String(payload.remark || "").trim(),
      addressSnapshot: clone(address),
      createdAt: new Date().toISOString(),
      paidAt: null,
      cancelledAt: null,
      completedAt: null,
      timeline: [{ fromStatus: null, toStatus: "pending_payment", operatorType: "user", note: "用户创建订单", at: new Date().toISOString() }],
      items: selected.map((item) => ({ bead_id: item.bead_id, bead_name: item.name, bead_color: item.color, bead_size_mm: item.size_mm, bead_unit_price: item.unit_price, quantity: item.quantity, line_amount: Number((Number(item.unit_price) * Number(item.quantity)).toFixed(2)) })),
      payments: [],
      refunds: []
    };
    profile.orders.unshift(order);
    profile.cart.items = profile.cart.items.filter((item) => !selected.some((selectedItem) => Number(selectedItem.id) === Number(item.id)));
    persistDb();
    syncSnapshot();
    state.selectedOrderId = order.id;
    setNotice(`订单已创建：${order.orderNo}`, "success");
    return { orderId: order.id, orderNo: order.orderNo, orderStatus: order.orderStatus, payableAmount: order.payableAmount };
  }

  function getOrderDetail(profile, orderId) {
    const order = profile.orders.find((item) => Number(item.id) === Number(orderId));
    if (!order) throw new Error("订单不存在");
    return order;
  }

  function mockPrepay(profile, payload) {
    const orderId = Number(payload.orderId);
    const order = profile.orders.find((item) => Number(item.id) === orderId);
    if (!order) throw new Error("订单不存在");
    if (order.orderStatus !== "pending_payment") throw new Error("当前订单状态不可支付");
    let payment = profile.payments.find((item) => Number(item.orderId) === orderId && item.status === "initiated");
    if (!payment) {
      payment = {
        id: profile.payments.length + 1,
        orderId,
        paymentNo: `PAY${Date.now()}${String(profile.next.paymentNo++).padStart(5, "0")}`,
        channel: "wechat",
        status: "initiated",
        payAmount: order.payableAmount,
        transactionId: null,
        callbackPayload: null,
        createdAt: new Date().toISOString(),
        paidAt: null
      };
      profile.payments.unshift(payment);
      order.payments.unshift(payment);
    }
    state.paymentNo = payment.paymentNo;
    state.paymentResult = {
      paymentNo: payment.paymentNo,
      channel: "wechat",
      mockClientParams: {
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: `nonce_${payment.paymentNo}`,
        package: `prepay_id=${payment.paymentNo}`,
        signType: "RSA",
        paySign: "mock-signature"
      }
    };
    els.paymentResult.textContent = `paymentNo: ${state.paymentResult.paymentNo}\nchannel: ${state.paymentResult.channel}\nmockClientParams: ${JSON.stringify(state.paymentResult.mockClientParams, null, 2)}`;
    persistDb();
    setNotice("已生成支付单", "success");
    return state.paymentResult;
  }

  function mockPaymentCallback(profile, payload) {
    const orderId = Number(payload.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0) throw new Error("订单不存在");
    const order = profile.orders.find((item) => Number(item.id) === orderId);
    if (!order) throw new Error("订单不存在");
    const payments = Array.isArray(order.payments) && order.payments.length ? order.payments : profile.payments.filter((item) => Number(item.orderId) === orderId);
    const payment = payments.find((item) => item.paymentNo === String(payload.paymentNo || ""));
    if (!payment) throw new Error("支付单不存在");
    payment.callbackPayload = clone(payload);
    if (payload.success === false) {
      payment.status = "failed";
      persistDb();
      syncSnapshot();
      setNotice("支付回调已标记为失败", "danger");
      return { message: "回调处理完成" };
    }
    if (payment.status === "success" && order.payStatus === "paid") {
      setNotice("该支付单已处理过", "success");
      return { message: "回调处理完成" };
    }
    payment.status = "success";
    payment.transactionId = payload.transactionId || `wx_tx_${Date.now()}`;
    payment.paidAt = new Date().toISOString();
    order.payStatus = "paid";
    order.orderStatus = "pending_production";
    order.paidAmount = order.payableAmount;
    order.paidAt = payment.paidAt;
    order.timeline.unshift({ fromStatus: "pending_payment", toStatus: "pending_production", operatorType: "system", note: "支付成功", at: payment.paidAt });
    persistDb();
    syncSnapshot();
    state.selectedOrderId = order.id;
    setNotice("支付成功，订单已进入待制作", "success");
    return { message: "回调处理完成" };
  }

  function mockCreateRefund(profile, orderId, payload) {
    const order = profile.orders.find((item) => Number(item.id) === Number(orderId));
    if (!order) throw new Error("订单不存在");
    if (order.payStatus !== "paid" && order.orderStatus !== "pending_production" && order.orderStatus !== "pending_shipment") {
      throw new Error("仅已支付订单可发起退款");
    }
    const existing = profile.refunds.find((item) => Number(item.orderId) === Number(orderId) && ["pending", "approved", "processing"].includes(item.status));
    if (existing) {
      setNotice("该订单已有进行中的退款申请", "warm");
      return clone(existing);
    }
    const refund = {
      id: profile.next.refundId++,
      orderId: order.id,
      paymentId: profile.payments.find((item) => Number(item.orderId) === Number(order.id))?.id || null,
      refundNo: `RF${Date.now()}${String(profile.next.refundId).padStart(4, "0")}`,
      refundAmount: Number(order.payableAmount),
      reason: String(payload.reason || "用户发起退款").trim(),
      status: "pending",
      requestedBy: "user",
      requestedAt: new Date().toISOString(),
      processedAt: null
    };
    profile.refunds.unshift(refund);
    order.refunds.unshift(refund);
    order.orderStatus = "refund_pending";
    order.payStatus = "refund_pending";
    order.timeline.unshift({ fromStatus: "pending_production", toStatus: "refund_pending", operatorType: "user", note: "用户发起退款申请", at: refund.requestedAt });
    const payment = profile.payments.find((item) => Number(item.orderId) === Number(order.id));
    if (payment) payment.status = "refund_pending";
    persistDb();
    syncSnapshot();
    state.selectedOrderId = order.id;
    setNotice("退款申请已提交", "success");
    return { refundId: refund.id, refundNo: refund.refundNo, status: refund.status, message: "退款申请已提交" };
  }

  async function handleLogin() {
    persistUi();
    try {
      const result = await api("/api/auth/mock-login", { method: "POST", body: { nickname: els.nicknameInput.value.trim() || "演示用户", avatarUrl: els.avatarInput.value.trim(), openid: els.openidInput.value.trim() }, skipAuth: true });
      if (result?.userId) {
        const resolvedOpenid = String(result.openid || els.openidInput.value.trim() || `mock_${result.userId}`).trim();
        state.db.currentOpenid = resolvedOpenid;
        state.ui.openid = resolvedOpenid;
        const profile = currentProfile() || ensureProfile(resolvedOpenid, { nickname: result.nickname, avatarUrl: result.avatarUrl });
        profile.user.userId = result.userId;
        profile.user.openid = resolvedOpenid;
        profile.user.nickname = result.nickname || profile.user.nickname;
        profile.user.avatarUrl = result.avatarUrl || "";
        persistDb();
      }
      renderAll();
      setNotice(result?.message || "登录完成", "success");
    } catch (error) {
      setNotice(`登录失败：${error.message}`, "danger");
    }
  }

  async function handleAddToCart(beadId, quantity) {
    persistUi();
    try {
      const result = await api("/api/cart/items", { method: "POST", body: { beadId, quantity, wristSizeCm: Number(els.wristSizeInput.value) } });
      renderAll();
      setNotice(result.message || "已加入购物车", "success");
    } catch (error) {
      setNotice(`加入购物车失败：${error.message}`, "danger");
    }
  }

  async function updateCartItem(itemId, payload) {
    try {
      const profile = currentProfile();
      const item = ensureCart(profile).items.find((entry) => Number(entry.id) === Number(itemId));
      if (!item) throw new Error("购物车项不存在");
      const nextQuantity = Object.prototype.hasOwnProperty.call(payload, "quantity") ? Number(payload.quantity) : item.quantity;
      const nextSelected = Object.prototype.hasOwnProperty.call(payload, "selected") ? Boolean(payload.selected) : item.selected;
      const tentativeItems = cartItems(profile).map((entry) => (
        Number(entry.id) === Number(itemId)
          ? { ...entry, quantity: nextQuantity, selected: nextSelected ? 1 : 0 }
          : entry
      ));
      if (Object.prototype.hasOwnProperty.call(payload, "quantity")) {
        const wrist = validateWrist(els.wristSizeInput.value);
        if (!wrist.ok) throw new Error(wrist.message);
        if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) throw new Error("数量必须大于 0");
        const selected = tentativeItems.filter((entry) => entry.selected || Number(entry.id) === Number(itemId));
        const diameter = sumDiameter(selected.map((entry) => ({ size_mm: entry.size_mm, quantity: entry.quantity })));
        if (diameter > wrist.wrist * 10) throw new Error("珠子累计直径超出腕围上限，禁止修改");
      }
      item.quantity = nextQuantity;
      item.selected = nextSelected;
      persistDb();
      syncSnapshot();
      renderAll();
      setNotice("购物车已更新", "success");
    } catch (error) {
      setNotice(`更新失败：${error.message}`, "danger");
    }
  }

  async function deleteCartItem(itemId) {
    try {
      const profile = currentProfile();
      profile.cart.items = profile.cart.items.filter((item) => Number(item.id) !== Number(itemId));
      persistDb();
      syncSnapshot();
      renderAll();
      setNotice("购物车项已删除", "success");
    } catch (error) {
      setNotice(`删除失败：${error.message}`, "danger");
    }
  }

  function fillAddressForm(address) {
    state.editingAddressId = address.id;
    els.addressFormMode.textContent = `编辑地址 #${address.id}`;
    els.receiverNameInput.value = address.receiverName || "";
    els.receiverPhoneInput.value = address.receiverPhone || "";
    els.provinceInput.value = address.province || "";
    els.cityInput.value = address.city || "";
    els.districtInput.value = address.district || "";
    els.detailAddressInput.value = address.detailAddress || "";
    els.postalCodeInput.value = address.postalCode || "";
    els.tagInput.value = address.tag || "";
    els.isDefaultInput.checked = Boolean(address.isDefault);
  }

  function resetAddressForm() {
    state.editingAddressId = null;
    els.addressFormMode.textContent = "新增模式";
    ["receiverNameInput", "receiverPhoneInput", "provinceInput", "cityInput", "districtInput", "detailAddressInput", "postalCodeInput", "tagInput"].forEach((id) => { els[id].value = ""; });
    els.isDefaultInput.checked = false;
  }

  async function saveAddress() {
    try {
      const profile = currentProfile();
      const payload = {
        receiverName: els.receiverNameInput.value.trim(),
        receiverPhone: els.receiverPhoneInput.value.trim(),
        province: els.provinceInput.value.trim(),
        city: els.cityInput.value.trim(),
        district: els.districtInput.value.trim(),
        detailAddress: els.detailAddressInput.value.trim(),
        postalCode: els.postalCodeInput.value.trim(),
        tag: els.tagInput.value.trim(),
        isDefault: els.isDefaultInput.checked ? 1 : 0
      };
      if (state.editingAddressId) {
        mockUpdateAddress(profile, state.editingAddressId, payload);
      } else {
        mockCreateAddress(profile, payload);
      }
      resetAddressForm();
      renderAll();
    } catch (error) {
      setNotice(`保存地址失败：${error.message}`, "danger");
    }
  }

  async function setDefaultAddress(addressId) {
    try {
      mockSetDefaultAddress(currentProfile(), addressId);
      renderAll();
    } catch (error) {
      setNotice(`设默认失败：${error.message}`, "danger");
    }
  }

  async function deleteAddress(addressId) {
    try {
      mockDeleteAddress(currentProfile(), addressId);
      renderAll();
    } catch (error) {
      setNotice(`删除地址失败：${error.message}`, "danger");
    }
  }

  async function createOrder() {
    try {
      persistUi();
      const result = mockCreateOrder(currentProfile(), {
        wristSizeCm: numberOrFallback(els.orderWristInput.value, numberOrFallback(els.wristSizeInput.value, 16)),
        addressId: Number(els.orderAddressSelect.value),
        remark: els.remarkInput.value.trim()
      });
      state.selectedOrderId = result.orderId;
      renderAll();
      setNotice(`订单创建成功：${result.orderNo}`, "success");
    } catch (error) {
      setNotice(`下单失败：${error.message}`, "danger");
    }
  }

  async function prepayOrder(orderId = null) {
    try {
      const targetOrderId = Number(orderId || els.paymentOrderSelect.value || state.selectedOrderId || 0);
      if (!targetOrderId) throw new Error("请选择待支付订单");
      const result = await api("/api/payments/prepay", { method: "POST", body: { orderId: targetOrderId } });
      state.paymentNo = result.paymentNo;
      state.paymentResult = result;
      els.paymentResult.textContent = `paymentNo: ${result.paymentNo}\nchannel: ${result.channel}\nmockClientParams: ${JSON.stringify(result.mockClientParams, null, 2)}`;
      renderAll();
      setNotice(`prepay 已完成：${result.paymentNo}`, "success");
    } catch (error) {
      setNotice(`prepay 失败：${error.message}`, "danger");
    }
  }

  async function callbackPayment(success = true) {
    try {
      const profile = currentProfile();
      const order = currentOrder(profile);
      const payment = currentOrderPayment(order);
      state.paymentNo = payment.paymentNo;
      const result = await api("/api/payments/callback", {
        method: "POST",
        body: {
          orderId: order.id,
          paymentNo: payment.paymentNo,
          success,
          transactionId: success ? `wx_tx_${Date.now()}` : `wx_fail_${Date.now()}`
        }
      });
      renderAll();
      setNotice(result.message || "回调已完成", success ? "success" : "danger");
    } catch (error) {
      setNotice(`回调失败：${error.message}`, "danger");
    }
  }

  async function requestRefund(orderId = null) {
    try {
      const targetOrderId = Number(orderId || state.selectedOrderId || 0);
      if (!targetOrderId) throw new Error("请选择订单");
      const result = await api(`/api/orders/${targetOrderId}/refund`, { method: "POST", body: { reason: "用户在前端页面发起退款申请" } });
      renderAll();
      setNotice(result.message || "退款申请已提交", "success");
    } catch (error) {
      setNotice(`退款申请失败：${error.message}`, "danger");
    }
  }

  async function refreshAll() {
    try {
      if (!currentProfile()) {
        syncSnapshot();
        renderAll();
        return;
      }
      await api("/api/beads", { method: "GET", skipAuth: true });
      await api("/api/addresses", { method: "GET" });
      await api("/api/cart", { method: "GET" });
      await api("/api/orders", { method: "GET" });
      syncSnapshot();
      renderAll();
      setNotice("数据已刷新", "success");
    } catch (error) {
      syncSnapshot();
      renderAll();
      setNotice(`刷新失败：${error.message}`, "danger");
    }
  }

  function toggleSelection(selected) {
    try {
      const profile = currentProfile();
      profile.cart.items = profile.cart.items.map((item) => ({ ...item, selected: Boolean(selected) }));
      persistDb();
      syncSnapshot();
      renderAll();
      setNotice(selected ? "已全选" : "已全部取消选择", "success");
    } catch (error) {
      setNotice(`操作失败：${error.message}`, "danger");
    }
  }

  function resetDemo() {
    state.db = { currentOpenid: "demo_openid", profiles: { demo_openid: seedProfile() } };
    state.user = null;
    state.profile = null;
    state.selectedOrderId = null;
    state.paymentNo = "";
    state.paymentResult = null;
    persistDb();
    renderAll();
    setNotice("演示数据已重置", "success");
  }

  function bindEvents() {
    els.saveConfigBtn.addEventListener("click", () => {
      state.config.apiBaseUrl = els.apiBaseUrlInput.value.trim();
      state.config.shippingFee = numberOrFallback(els.shippingFeeInput.value, 12);
      persistConfig();
      setModeLabel();
      setNotice("配置已保存", "success");
    });
    els.refreshBtn.addEventListener("click", refreshAll);
    els.resetDemoBtn.addEventListener("click", resetDemo);
    els.loginBtn.addEventListener("click", handleLogin);
    els.createOrderBtn.addEventListener("click", createOrder);
    els.createOrderFromFormBtn.addEventListener("click", createOrder);
    els.prepayBtn.addEventListener("click", () => prepayOrder());
    els.callbackSuccessBtn.addEventListener("click", () => callbackPayment(true));
    els.callbackFailBtn.addEventListener("click", () => callbackPayment(false));
    els.loadOrderDetailBtn.addEventListener("click", () => { state.selectedOrderId = Number(els.paymentOrderSelect.value || state.selectedOrderId || 0); renderOrderDetail(); });
    els.saveAddressBtn.addEventListener("click", saveAddress);
    els.cancelAddressEditBtn.addEventListener("click", () => { resetAddressForm(); renderAll(); });
    els.orderWristInput.addEventListener("input", () => { state.ui.orderWristSizeCm = numberOrFallback(els.orderWristInput.value, 16); persistUi(); });
    els.wristSizeInput.addEventListener("input", () => { state.ui.wristSizeCm = numberOrFallback(els.wristSizeInput.value, 16); persistUi(); });
    els.remarkInput.addEventListener("input", () => { state.ui.remark = els.remarkInput.value; persistUi(); });
    els.nicknameInput.addEventListener("input", () => { state.ui.nickname = els.nicknameInput.value; persistUi(); });
    els.avatarInput.addEventListener("input", () => { state.ui.avatarUrl = els.avatarInput.value; persistUi(); });
    els.openidInput.addEventListener("input", () => { state.ui.openid = els.openidInput.value; persistUi(); });
    els.paymentOrderSelect.addEventListener("change", () => { state.selectedOrderId = Number(els.paymentOrderSelect.value || 0) || state.selectedOrderId; renderOrderDetail(); persistUi(); });
    els.clearSelectionBtn.addEventListener("click", () => toggleSelection(false));
    els.selectAllBtn.addEventListener("click", () => toggleSelection(true));
  }

  function detectRemote() {
    if (!state.config.apiBaseUrl.trim()) return Promise.resolve(false);
    return api("/health", { method: "GET", skipAuth: true })
      .then(() => { setModeLabel(); return state.remoteReachable; })
      .catch(() => { state.remoteReachable = false; setModeLabel(); return false; });
  }

  function buildOrderNo() {
    const now = new Date();
    const pad = (value, len = 2) => String(value).padStart(len, "0");
    return `CS${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(Math.random() * 100000), 5)}`;
  }

  async function boot() {
    initEls();
    bindEvents();
    renderAll();
    detectRemote();
    setNotice(state.user ? "已载入演示账号，可直接开始测试" : "请先登录，或直接使用演示数据模式", "warm");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
