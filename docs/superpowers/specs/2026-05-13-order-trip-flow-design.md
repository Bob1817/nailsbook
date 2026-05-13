# 订单行程流程设计

> 日期: 2026-05-13
> 状态: 已确认

## 1. 背景与目标

当前系统采用 `Quote` + `Booking` 双模型架构，订单和预约的概念混在一起，状态流转不够清晰。本次重构目标：

1. 建立以订单（Order）为核心的统一数据模型，合并报价信息
2. 定义清晰的订单状态流转规则，两端状态保持一致，仅操作权限不同
3. 将行程（Trip）从订单中分离，作为基于状态的虚拟视图
4. 所有订单记录不可删除和隐藏

## 2. 数据模型

### 2.1 Order 模型（替代 Booking，合并 Quote）

```prisma
model Order {
  id                      Int       @id @default(autoincrement())
  orderNo                 String    @unique
  technicianId            Int
  customerId              Int
  clientUserId            Int?
  addressId               Int?
  designRequestId         Int?
  customServiceRequestId  Int?

  // 服务信息（用户创建时填写）
  startTime               DateTime
  endTime                 DateTime
  address                 String?
  serviceType             String?   // 上门美甲 / 到店美甲
  remark                  String?

  // 报价信息（美甲师填写）
  quotePrice              Float?
  quoteRemark             String?
  quotedAt                DateTime?

  // 状态与时间戳
  status                  String    @default("pending_quote")
  isDepositPaid           Boolean   @default(false)
  depositAmount           Float?    @default(0)
  depositStatus           String?   @default("pending")
  depositConfirmedAt      DateTime?
  confirmedAt             DateTime?
  completedAt             DateTime?
  cancelledAt             DateTime?
  cancelReason            String?
  source                  String?   @default("technician") // technician / client_webapp
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @default(now()) @updatedAt

  // Relations
  technician              Technician           @relation(fields: [technicianId], references: [id])
  customer                Customer             @relation(fields: [customerId], references: [id])
  clientUser              ClientUser?          @relation(fields: [clientUserId], references: [id])
  clientAddress           ClientAddress?       @relation(fields: [addressId], references: [id])
  designRequest           ClientDesignRequest? @relation(fields: [designRequestId], references: [id])
  customServiceRequest    CustomServiceRequest? @relation(fields: [customServiceRequestId], references: [id])
  revenue                 Revenue?

  @@index([technicianId])
  @@index([customerId])
  @@index([clientUserId])
  @@index([status])
  @@index([startTime])
}
```

### 2.2 删除的模型

- `Quote` — 完全合并到 Order 中

### 2.3 行程（Trip）

行程不创建新模型，是基于 Order 状态过滤的虚拟视图：

```
行程 = status IN (pending_home, pending_shop, in_progress)
```

订单详情页 = 行程详情页，共用同一个页面。

## 3. 状态流转

### 3.1 状态定义

| 状态值 | 中文显示 | 含义 |
|--------|---------|------|
| `pending_quote` | 待报价 | 订单创建完成，等待美甲师报价 |
| `pending_agree` | 待同意 | 美甲师已报价，等待用户同意 |
| `pending_confirm` | 待确认 | 用户已同意，等待美甲师确认（含定金确认） |
| `pending_home` | 待上门 | 上门服务，美甲师已确认，等待预约时间 |
| `pending_shop` | 待到店 | 到店服务，美甲师已确认，等待预约时间 |
| `in_progress` | 服务中 | 预约时间前30分钟自动进入 |
| `completed` | 已完成 | 美甲师确认完成或endTime后24小时自动完成 |
| `cancelled` | 已取消 | 用户或美甲师取消 |

### 3.2 流转规则

```
订单创建
   ↓
[pending_quote] ──美甲师报价──→ [pending_agree]
      ↑                              │
      │                     用户同意 ↓    用户拒绝→ 回到[pending_quote]
      │                        [pending_confirm]
      │                              │
      │                     美甲师确认(含定金)
      │                              ↓
      │              serviceType=上门 → [pending_home] ──→ 行程列表
      │              serviceType=到店 → [pending_shop] ──→ 行程列表
      │                              │
      │                     预约时间前30分钟自动
      │                              ↓
      │                        [in_progress] ──→ 行程列表
      │                              │
      │                     美甲师确认完成 / endTime+24h自动
      │                              ↓
      │                        [completed] ──→ 从行程列表移除
      │
      └──── cancelled ←── 用户/美甲师可取消（pending_confirm及之前的状态）
```

### 3.3 取消权限

| 状态 | 用户可取消 | 美甲师可取消 |
|------|----------|------------|
| pending_quote | ✓ | ✓ |
| pending_agree | ✓ | ✓ |
| pending_confirm | ✓ | ✓ |
| pending_home | ✗ | ✗ |
| pending_shop | ✗ | ✗ |
| in_progress | ✗ | ✗ |
| completed | ✗ | ✗ |

### 3.4 用户端操作权限

| 状态 | 用户可执行操作 |
|------|-------------|
| pending_quote | 取消订单 |
| pending_agree | 同意报价 / 拒绝报价（回到待报价） / 取消订单 |
| pending_confirm | 取消订单 |
| pending_home/pending_shop | 无操作（查看行程） |
| in_progress | 无操作（查看行程） |
| completed | 查看历史 |

### 3.5 美甲师端操作权限

| 状态 | 美甲师可执行操作 |
|------|-------------|
| pending_quote | 提交报价（填写价格） / 取消订单 |
| pending_agree | 取消订单 |
| pending_confirm | 确认定金 → 确认订单 / 取消订单 |
| pending_home/pending_shop | 无操作（查看行程） |
| in_progress | 确认完成 |
| completed | 查看历史 |

### 3.6 拒绝报价行为

用户拒绝报价后，订单回到 `pending_quote` 状态：
- 已填写的 `quotePrice`、`quoteRemark`、`quotedAt` 清空
- 美甲师需要重新填写报价

## 4. 自动流转（定时任务）

| 触发条件 | 转换 | 检查频率 |
|---------|------|---------|
| `status = pending_home/pending_shop` 且 `startTime - 30min ≤ now` | → `in_progress` | 每5分钟 |
| `status = in_progress` 且 `endTime + 24h ≤ now` | → `completed` | 每5分钟 |

- 自动进入 `in_progress` 时，系统发送聊天消息通知双方
- 自动进入 `completed` 时，系统创建 `Revenue` 记录并通知用户

## 5. 行程逻辑

### 5.1 行程列表查询

```
WHERE status IN (pending_home, pending_shop, in_progress)
  AND {technicianId / clientUserId} = {当前用户}
ORDER BY startTime ASC
```

### 5.2 行程自动进入与移除

- **进入行程**：订单状态变为 `pending_home` 或 `pending_shop`
- **移出行程**：订单状态变为 `completed` 或 `cancelled`

### 5.3 前端显示

**用户端：**
- 行程 Tab：`pending_home/pending_shop/in_progress` 的订单
- 订单 Tab：所有历史订单（按状态分组：进行中、已完成、已取消）
- 无行程时显示"暂无行程"提示

**美甲师端：**
- 行程 Tab：`pending_home/pending_shop/in_progress` 的订单
- 订单 Tab：所有历史订单
- 无行程时显示"暂无行程"提示

## 6. 实施范围

### 6.1 后端改动

**数据层：**
- 删除 `Quote` 模型，将报价字段合并到 Order
- 创建 Prisma 迁移脚本，迁移现有数据
- 更新 Order 模型的 status 字段枚举值

**服务层：**
- `bookings.service.ts` → `orders.service.ts`
- `client-bookings.service.ts` → `client-orders.service.ts`
- 删除 Quote 相关 service 方法
- 更新 Scheduler 自动流转规则
- 在 orders service 中增加行程查询方法

**控制器层：**
- `technician-bookings.controller.ts` → `technician-orders.controller.ts`
- `client-bookings.controller.ts` → `client-orders.controller.ts`
- 新增行程相关 API 端点

### 6.2 前端改动

**用户端（client-frontend）：**
- `BookingList.tsx`：拆分为行程列表 + 订单列表两个视图
- `BookingDetail.tsx`：适配新状态和操作按钮
- `CreateBooking.tsx`：适配新订单创建流程
- `Home.tsx`：行程卡片数据改为从行程 API 获取

**美甲师端（technician-frontend）：**
- `OrdersPage.tsx`：拆分为行程列表 + 订单列表
- `BookingDetailPage.tsx`：适配新状态和操作
- 首页行程卡片：从行程 API 获取数据

### 6.3 数据迁移策略

1. 创建新的 `Order` 表
2. 将现有 `Booking` 数据迁移到 `Order`（合并 Quote 信息）
3. 将现有 `Quote` 的 `price`、`quotedAt` 等字段写入对应 `Order`
4. 删除旧的 `Quote` 表和 `Booking` 表
