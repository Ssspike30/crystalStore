# crystalStore

crystalStore 是一个“水晶手链定制”MVP 仓库，当前已经补齐了可联调的最小闭环：用户端 mock 登录、珠子选择、购物车、地址、下单、mock 支付回调，以及后台订单发货、完结、退款审核。

## 仓库结构

- `apps/user-frontend`：用户端静态联调页，直接打开 HTML 即可使用
- `services/user-backend`：用户端后端接口
- `services/admin-backend`：后台管理接口
- `packages/database`：MySQL 建表与种子数据脚本
- `packages/shared-utils`：共享业务常量与工具函数
- `docs`：项目概述、接口说明等文档
- `infra`：部署相关配置
- `scripts`：辅助脚本

## 已完成的最小闭环能力

- 用户 mock 登录
- 读取腕围、运费、支付渠道等运行时配置
- 珠子列表查询、购物车增删改查、地址管理
- 下单、mock 支付预下单、mock 支付回调
- 后台订单查询、发货录入、订单完结、取消、退款审批
- 用户端静态联调页支持从浏览器直接跑通上述流程

## 快速启动顺序

1. 初始化数据库
   - 先看 [`packages/database/README.md`](./packages/database/README.md)
   - 按里面的顺序执行 `migrations/001_init.sql`，再执行 `seeds/001_seed.sql`
2. 启动 `user-backend`
   - 目录：`services/user-backend`
   - 命令：`npm install` 后执行 `npm run dev`
   - 默认端口：`3001`
3. 启动 `admin-backend`
   - 目录：`services/admin-backend`
   - 命令：`npm install` 后执行 `npm run dev`
   - 默认端口：`3002`
4. 打开用户端静态联调页
   - 直接打开 `apps/user-frontend/index.html`
   - 页面顶部可填写后端地址，优先联调真实接口，失败后回落到本地 mock 演示数据

## 已知限制

- 微信登录和微信支付当前都是 mock，不是真实小程序能力
- 后台鉴权目前使用临时 `x-admin-key`，通过 `ADMIN_API_KEY` 配置校验
- 用户端前端目前是静态联调页，不是正式的 uni-app 小程序工程
- 订单、退款、发货等流程已打通最小闭环，但还不是完整生产版后台

## 常用参考

- 用户端后端接口文档：[`docs/用户端后端接口文档.md`](./docs/用户端后端接口文档.md)
- 项目概述：[`docs/项目概述.md`](./docs/项目概述.md)
