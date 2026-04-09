# user-backend

用户端后端服务，提供 mock 登录、基础配置、珠子列表、购物车、地址、订单和支付相关接口。

## 环境变量

```bash
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=crystal_store
```

- `PORT`：服务监听端口，默认 `3001`
- `DB_HOST`：MySQL 主机
- `DB_PORT`：MySQL 端口
- `DB_USER`：MySQL 用户名
- `DB_PASSWORD`：MySQL 密码
- `DB_NAME`：数据库名

## 启动命令

```bash
npm install
npm run dev
```

- `npm run dev` 和 `npm start` 都会启动 `src/server.js`
- 启动后可访问 `GET /health` 检查服务状态

## 测试命令

```bash
npm test
```

- 当前测试入口是 `node test/run.js`
- 主要覆盖 mock 登录、配置读取、购物车越权拦截、订单取消、支付回调幂等等基础链路

## 主要接口总览

### 公开接口

- `POST /api/auth/mock-login`
  - mock 登录，创建或更新用户
- `GET /api/app-config`
  - 返回腕围范围、固定运费、支付渠道
- `GET /api/beads`
  - 查询可用珠子列表
- `POST /api/payments/callback`
  - mock 支付回调入口

### 需要用户上下文

以下接口会经过 `x-user-id` 鉴权中间件：

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `GET /api/addresses`
- `POST /api/addresses`
- `PUT /api/addresses/:id`
- `PATCH /api/addresses/:id/default`
- `DELETE /api/addresses/:id`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `POST /api/orders/:id/cancel`
- `POST /api/orders/:id/refund`
- `POST /api/payments/prepay`

### 说明

- 下单前需要先有地址
- 购物车和下单都带有腕围校验
- `prepay` 会生成 mock 支付参数，配合 `POST /api/payments/callback` 完成联调
