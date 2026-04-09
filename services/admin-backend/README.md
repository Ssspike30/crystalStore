# admin-backend

后台管理服务，负责订单查询、发货录入、订单完结和退款审核。

## 环境变量

```bash
PORT=3002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=crystal_store
ADMIN_API_KEY=change-me
```

- `PORT`：服务监听端口，默认 `3002`
- `DB_HOST`：MySQL 主机
- `DB_PORT`：MySQL 端口
- `DB_USER`：MySQL 用户名
- `DB_PASSWORD`：MySQL 密码
- `DB_NAME`：数据库名
- `ADMIN_API_KEY`：后台接口鉴权密钥

## 启动命令

```bash
npm install
npm run dev
```

- `npm run dev` 和 `npm start` 都会启动 `src/server.js`
- 启动后可访问 `GET /health` 检查服务状态

## 鉴权方式

- 请求后台接口时需要在 Header 中携带 `x-admin-key`
- `x-admin-key` 的值必须等于环境变量 `ADMIN_API_KEY`
- 如果 `ADMIN_API_KEY` 没有配置，服务会返回 500
- 如果密钥不匹配，服务会返回 401

## 主要接口总览

### 健康检查

- `GET /health`

### 订单管理

- `GET /api/admin/orders`
  - 支持 `status`、`keyword`、`page`、`pageSize`
- `GET /api/admin/orders/:id`
  - 查询订单详情、支付、物流、退款和状态日志
- `POST /api/admin/orders/:id/ship`
  - 录入物流公司和运单号，仅待制作订单可操作，订单流转到待收货
- `POST /api/admin/orders/:id/complete`
  - 将待收货订单标记为已完成
- `POST /api/admin/orders/:id/cancel`
  - 仅取消待付款订单

### 退款管理

- `GET /api/admin/refunds`
  - 支持 `status`、`keyword`、`page`、`pageSize`
- `POST /api/admin/refunds/:id/approve`
  - 通过退款申请
- `POST /api/admin/refunds/:id/reject`
  - 驳回退款申请

### 说明

- 后台接口都挂在 `/api/admin` 下
- 订单和退款的状态变更会同步写入状态日志，方便联调时追踪流程
