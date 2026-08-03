# 数据库迁移部署与恢复手册

本项目使用 SQLite 与 Prisma Migrate。历史环境曾通过 `prisma db push` 创建部分结构，因此全新数据库和已有数据库必须使用不同的预检步骤。

## 迁移分类

- `20260531120000_create_order_compat`：补齐历史缺失的 `Order` 基线；已有 `Order` 的数据库执行时为无操作。
- `20260610090000_create_feedback_compat`：补齐历史缺失的 `Feedback` 基线；已有表的数据库执行时为无操作。
- `20260721150000` 至 `20260721190000`：本轮作品授权、审美字段、评价/分享、来源作品和客户美甲照片增量迁移。
- `20260721185000_reconcile_historical_schema`：仅供全新数据库补齐过去由 `db push` 创建的结构。历史运行库不得直接执行该 SQL。
- `20260721220000_add_order_client_record_note`：增加客户在已完成美甲记录中的独立备注。
- `20260731090000_add_customer_source_and_follow_up`：增加客户来源字段和客户跟进记录。
- `20260731110000_add_order_reminder_delivery`：增加预约提醒发送状态、尝试次数、失败原因和取消记录。
- `20260731140000_add_referral_campaign`：增加美甲师推荐活动配置。
- `20260731160000_add_direct_referrals`：增加随机推荐链接和单层直接推荐关系，并限制同一美甲师下重复归因。
- `20260731180000_add_referral_qualification`：快照推荐活动门槛与奖励，并记录首个有效完成订单的推荐资格。
- `20260731200000_add_reward_fund_ledger`：增加客户分美甲师基金账户和具有唯一业务来源的不可变账本。
- `20260731220000_add_order_fund_discount`：记录订单使用的基金抵扣金额，完成收入按抵扣后金额确认。
- `20260803160000_add_payment_orders`：增加定金、尾款和订阅统一支付单。
- `20260803170000_add_wechat_identity`：增加微信 OpenID 与客户、美甲师双角色绑定。
- `20260803180000_add_auth_verification_codes`：增加持久化验证码和限流状态。
- `20260803190000_add_wechat_platform_config`：增加后台维护的微信登录、支付加密配置及校验状态。

## A. 全新数据库部署

先创建空 SQLite 文件，然后运行完整迁移链：

```bash
deployment_db=/absolute/path/to/new-production.db
touch "$deployment_db"
DATABASE_URL="file:$deployment_db" npx prisma migrate deploy
DATABASE_URL="file:$deployment_db" npx prisma migrate diff \
  --from-url "file:$deployment_db" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
sqlite3 "$deployment_db" "PRAGMA foreign_key_check;"
```

验收结果应为：

- 37 个迁移全部完成；
- `migrate diff` 输出 `No difference detected.`；
- `foreign_key_check` 无输出。

## B. 已有数据库升级

### 1. 停写并备份

部署期间停止后端写入，然后创建可恢复副本：

```bash
production_db=/absolute/path/to/production.db
backup_db=/absolute/path/to/production-before-upgrade.db
sqlite3 "$production_db" ".backup '$backup_db'"
sqlite3 "$backup_db" "PRAGMA integrity_check;"
```

`integrity_check` 必须返回 `ok`。

### 2. 确认属于历史 db-push 数据库

```bash
sqlite3 "$production_db" "
SELECT name FROM sqlite_master
WHERE type='table'
  AND name IN ('Order','Feedback','CustomServiceRequest','ArtistApplication','DeviceToken')
ORDER BY name;
SELECT name FROM pragma_table_info('ClientUser')
WHERE name IN ('passwordHash','tokenVersion','city','bio')
ORDER BY name;
"
```

五张表以及四个 `ClientUser` 字段必须全部存在。若不完整，停止部署，不要标记对账迁移。

记录升级前核心数据数量：

```bash
sqlite3 "$production_db" "
SELECT 'Technician', COUNT(*) FROM Technician
UNION ALL SELECT 'ClientUser', COUNT(*) FROM ClientUser
UNION ALL SELECT 'Order', COUNT(*) FROM 'Order';
"
```

### 3. 标记历史对账迁移

该数据库已经具有对账迁移所描述的旧结构，因此只登记迁移状态，不执行其建表和重建 SQL：

```bash
DATABASE_URL="file:$production_db" npx prisma migrate resolve \
  --applied 20260721185000_reconcile_historical_schema
```

此操作只允许在第 2 步完整通过后执行。

### 4. 执行安全增量迁移

```bash
DATABASE_URL="file:$production_db" npx prisma migrate deploy
DATABASE_URL="file:$production_db" npx prisma migrate status
DATABASE_URL="file:$production_db" npx prisma migrate diff \
  --from-url "file:$production_db" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
sqlite3 "$production_db" "PRAGMA foreign_key_check; PRAGMA integrity_check;"
```

必须满足：迁移全部完成、schema 零差异、外键检查无输出、完整性检查返回 `ok`，且核心数据数量与升级前一致。

### 5. 应用验证

```bash
npx prisma generate
npm run build
npm test -- --runInBand
```

启动后执行作品预览、预约、绑定和对话冒烟检查，再恢复外部流量。

## 恢复方案

SQLite 迁移不采用逆向 SQL 回滚。部署失败时停止服务，并恢复升级前完整备份：

1. 保留失败数据库用于排查，不在其上继续写入。
2. 将连接配置切回 `production-before-upgrade.db`，或复制备份到新的明确路径。
3. 对恢复库执行 `PRAGMA integrity_check` 和核心数量核对。
4. 使用上一版本应用启动并完成只读冒烟检查后恢复流量。

不要在未备份的生产数据库上运行 `prisma migrate reset`、`prisma db push --force-reset` 或手工删除 `_prisma_migrations` 记录。
