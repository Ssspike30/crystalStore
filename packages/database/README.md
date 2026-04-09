# 数据库初始化说明（MVP）

这份说明是给“没有数据库基础”的使用方式，按步骤做即可。

## 1. 本次交付内容

- `migrations/001_init.sql`：建库 + 建表脚本（仅 MVP）
- `seeds/001_seed.sql`：基础示例数据（珠子 + 系统配置）

## 2. 适用范围

- 数据库：MySQL 8.0
- 项目阶段：MVP（不包含二期预留表）
- 数据库名：`crystal_store`

## 3. 脚本执行顺序

必须先执行建表，再执行种子数据：

1. 执行 `migrations/001_init.sql`
2. 执行 `seeds/001_seed.sql`

## 4. 在 DBeaver 中怎么执行（推荐）

1. 打开 DBeaver，连接到你的 MySQL 8.0。
2. 右键连接，选择“SQL 编辑器”->“新建 SQL 脚本”。
3. 打开并粘贴 `001_init.sql`，点击执行（或 `Ctrl+Enter`）。
4. 再打开 `001_seed.sql`，执行。
5. 刷新数据库树，确认已出现 `crystal_store` 和各表。

## 5. 最小验证

执行以下 SQL，确认结构和数据已生效：

```sql
USE crystal_store;
SHOW TABLES;
SELECT COUNT(*) AS bead_count FROM beads;
SELECT * FROM system_configs;
```

预期：
- `SHOW TABLES` 能看到本次创建的 MVP 表。
- `beads` 表有示例数据（大于 0）。
- `system_configs` 有固定运费、腕围范围、支付渠道配置。

## 6. 关键业务配置（已按当前约定写入）

- 固定运费：`12.00`
- 腕围范围：`13.0 ~ 21.0 cm`
- 支付渠道：`wechat`

## 7. 注意事项

- 当前是“脚本生成版”，未在你的数据库上自动执行。
- 示例珠子价格仅用于开发联调，后续可直接改 `seeds/001_seed.sql` 或后台配置。
