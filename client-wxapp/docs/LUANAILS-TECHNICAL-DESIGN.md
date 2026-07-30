# luanails MVP 技术方案

版本：1.0
更新日期：2026-07-29
关联文档：[LUANAILS-PRD.md](./LUANAILS-PRD.md)

## 1. 技术目标

在现有 NestJS、Prisma、微信小程序和管理端基础上增量建设个人经营系统，不重写现有预约、客户、作品、聊天和鉴权模块。

技术目标：

- 保持现有接口和订单状态机兼容。
- 先统一经营指标，再增加推荐和基金交易域。
- 新业务采用独立表、独立服务和幂等约束。
- 涉及权限、余额、奖励和冲正的判断全部由服务端执行。
- 前端负责展示和交互，不作为权限或财务边界。

## 2. 现状与演进原则

现有可复用基础：

- `Technician`、`Customer`、`ClientUser` 和绑定关系。
- `Order` 预约状态机、占用时段和提醒状态。
- `Revenue` 完成订单收入记录。
- `NailWork`、客户授权、分享令牌和分享事件。
- `SubscriptionPlan` 和美甲师订阅关系。

演进原则：

1. 不修改现有主键和主要关系。
2. 新字段先可空，迁移后通过业务流逐步补齐。
3. 公开作品、原邀请码和老订单保持原行为。
4. 财务类记录只追加和冲正，不物理覆盖历史。
5. 经营指标统一由后端计算，前端不再依赖全量列表自行汇总。

## 3. 模块规划

### 3.1 `technician-insights`

职责：

- 美甲师经营概览。
- 客户增长、复购和客单价指标。
- 后续趋势和客户健康分组。

首期接口：

- `GET /api/technician/insights/overview`

响应结构：

```json
{
  "period": {
    "timezone": "Asia/Shanghai",
    "monthStart": "2026-07-01T00:00:00.000Z",
    "generatedAt": "2026-07-29T00:00:00.000Z"
  },
  "bookings": {
    "today": 2,
    "monthCompleted": 12,
    "pending": 3
  },
  "customers": {
    "total": 40,
    "newThisMonth": 5,
    "completed": 28,
    "repeat": 9,
    "repeatRate": 0.3214
  },
  "revenue": {
    "monthConfirmed": 3600,
    "averageTicket": 300
  },
  "rating": {
    "average": 4.8,
    "count": 12
  }
}
```

口径要求：

- 所有查询必须限制 `technicianId`。
- 收入从 `Revenue` 且 `status = confirmed` 统计。
- 复购按完成订单的客户去重计算。
- 日期边界使用配置时区，数据库继续存 UTC。

### 3.2 `customer-crm`

首期基于现有 Customer 和订单聚合，不立即拆分客户主表。

后续新增：

- `CustomerFollowUp`：跟进内容、计划时间、完成状态。
- `Customer.sourceType/sourceRef`：客户来源。
- 客户健康查询服务：新客、活跃、待复购、沉睡。

生命周期默认规则：

- 新客：建立客户档案后尚未完成服务，或仅完成首单且不超过默认周期。
- 活跃：最近服务时间未超过其复购周期。
- 待复购：已达到预计复购时间但未超过沉睡阈值。
- 沉睡：超过预计复购时间一个完整默认周期。

规则应集中在服务端纯函数中并覆盖单元测试，避免散落在页面。

### 3.3 `referrals`

建议模型：

```prisma
model ReferralCampaign {
  id             Int      @id @default(autoincrement())
  technicianId   Int      @unique
  rewardType     String
  rewardValue    Float
  minOrderAmount Float?
  expiresInDays  Int?
  status         String   @default("inactive")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model ReferralRelation {
  id                 Int      @id @default(autoincrement())
  technicianId       Int
  referrerClientId   Int
  referredClientId   Int
  sourceTokenHash    String?
  status             String   @default("registered")
  qualifiedOrderId   Int?
  qualifiedAt        DateTime?
  createdAt          DateTime @default(now())

  @@unique([technicianId, referredClientId])
  @@index([technicianId, referrerClientId])
}
```

说明：

- `referrerClientId` 和 `referredClientId` 指向平台客户账号，而不是美甲师侧可重复存在的 Customer 记录。
- 唯一约束从数据库层阻止同一被推荐人在同一美甲师下被重复归因。
- 分享 token 只保存哈希。
- 资格确认与订单完成事务绑定。

接口方向：

- `POST /api/client/referrals/link`
- `GET /api/client/referrals/mine`
- `GET /api/technician/referrals/summary`
- `PUT /api/technician/referrals/campaign`

### 3.4 `reward-funds`

建议模型：

```prisma
model RewardAccount {
  id           Int      @id @default(autoincrement())
  technicianId Int
  clientUserId Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([technicianId, clientUserId])
}

model RewardLedger {
  id              Int      @id @default(autoincrement())
  accountId       Int
  entryType       String
  amount          Float
  status          String
  sourceType      String
  sourceId        String
  reversalOfId    Int?
  availableAt     DateTime?
  expiresAt       DateTime?
  createdAt       DateTime @default(now())

  @@unique([sourceType, sourceId, entryType])
  @@index([accountId, status, expiresAt])
}
```

账本原则：

- 正数表示发放，负数表示抵扣或冲正。
- `sourceType + sourceId + entryType` 保证业务幂等。
- 余额由有效账本记录汇总。
- 冲正创建反向记录，不修改原始记录金额。
- 金额计算和订单状态更新必须在同一数据库事务中。

MVP 不实现提现，因此账本不是平台代收付账户。

### 3.5 `cooperation-spaces` 和 `studios`

不进入首个 MVP 开发，但预留独立模块，不继续将合作空间追加到 `Technician.shopAddresses` JSON。

后续模型至少包括：

- 合作空间及营业时间。
- 空间与美甲师的合作关系。
- 空间不可用时段。
- 品牌/工作室、成员、角色和权限。
- 客户归属、订单分配和团队收益记录。

## 4. 接口兼容策略

- 保留现有 `/api/client/*` 和 `/api/technician/*`。
- 新经营接口放在 `/api/technician/insights/*`。
- 推荐和基金使用独立资源路径，不塞入订单通用更新接口。
- 旧客户端未使用新接口时仍可正常预约和查看作品。
- 新响应字段只追加，不修改已有字段语义。

## 5. 权限和安全

- 美甲师接口使用 `TechnicianJwtAuthGuard`。
- 客户接口使用客户 JWT，并校验与美甲师的有效绑定。
- 美甲师只能查询自己的客户、经营数据、推荐活动和基金成本。
- 客户只能查询自己在指定美甲师下的推荐和基金。
- 推荐 token 使用足够随机的原值，对数据库只保存哈希。
- 不将客户 ID、手机号或推荐关系写入公开分享 URL。
- 金额和奖励配置使用 DTO 校验范围。
- 所有奖励资格确认、发放、抵扣、冲正需记录操作日志。

## 6. 事务与幂等

当前生产环境使用单实例 SQLite 文件库。MVP 阶段通过应用内按美甲师分组的互斥队列串行执行档期写入，并在事务内再次查询占用时段。该方案只适用于单个后端进程。

当部署扩展到多个后端实例时，必须先迁移到支持可靠并发控制的数据库，并使用数据库级行锁、顾问锁或时间区间排他约束；不能继续依赖进程内互斥队列。

需要事务的场景：

- 完成订单、创建收入和确认推荐资格。
- 发放奖励并写入账本。
- 使用基金并更新订单应付信息。
- 取消/退款并冲正奖励。

需要幂等键的场景：

- 客户重复点击完成或确认。
- 支付/定金通知重复送达。
- 定时任务重复扫描。
- 同一订单重复触发奖励。

数据库唯一约束是最终防线，应用层检查只用于提供可读错误。

当前订单幂等策略：

- 同一美甲师的创建和占用时段写入在单进程内串行执行。
- 完成和取消通过带原状态条件的更新抢占流转权。
- `Revenue.orderId` 唯一约束防止同一订单重复生成收入。
- 未取得流转权的并发请求在创建收入、释放档期或发送业务消息前终止。

## 7. 指标计算

首期直接聚合数据库，数据量增长后再增加日快照。

统一定义：

- `monthConfirmedRevenue`：本月 `Revenue.status = confirmed` 的金额之和。
- `averageTicket`：本月确认收入 ÷ 本月确认收入记录数。
- `completedCustomers`：历史上有完成订单的去重客户数。
- `repeatCustomers`：历史上完成订单数大于等于 2 的去重客户数。
- `repeatRate`：`repeatCustomers / completedCustomers`。

禁止：

- 用预约报价代替确认收入。
- 用当前页列表代替全量数据。
- 在不同页面定义不同的复购口径。

## 8. 测试策略

### 单元测试

- 指标边界、零分母和金额计算。
- 单层推荐约束。
- 奖励发放、幂等和冲正。
- 生命周期规则和预计复购日期。

### 服务测试

- 美甲师数据隔离。
- 完成订单创建收入并触发一次奖励。
- 重复完成不重复发放。
- 取消和异常订单不获得奖励。
- 基金不能跨美甲师使用。

### 客户端验证

- 静态检查页面注册、事件绑定和 JSON。
- 开发者工具编译。
- iOS/Android 双账号核心流程。
- 弱网、重复点击、过期 token 和分享回跳。

## 9. 发布与迁移

1. 先发布只读经营概览接口。
2. 客户端接入后核对指标。
3. 推荐表和基金表使用新增迁移，不修改历史订单。
4. 推荐功能先对试点美甲师通过功能开关开放。
5. 校验账本和订单后再开放基金抵扣。
6. 任一阶段都可以关闭新功能而不影响基础预约。

回滚原则：

- 代码回滚不删除新表。
- 已生成账本保留审计记录。
- 禁用活动后停止新增奖励，已有有效余额按产品规则处理。
