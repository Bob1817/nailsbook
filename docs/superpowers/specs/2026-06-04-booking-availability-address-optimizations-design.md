# 预约可用性与地址体验优化设计文档

**日期：** 2026-06-04
**作者：** Claude + shibo
**状态：** 已确认，待实现
**范围：** `backend`、`client-frontend`、`technician-frontend`。不改 `client-wxapp`、`mobile-flutter`。

---

## 背景

在「预约入口收敛」上线后，继续优化预约的可用性判定、冲突处理与地址体验。共 5 项，归为三组：

- **A 组｜可用性 & 冲突**（后端 + 双端）：需求 1、2
- **B 组｜地址体验**（客户端 + 后端校验）：需求 3、4
- **C 组｜小修复**（技师端）：需求 5
- **D 组｜美甲师省市结构化 + 强制完善**（技师端 + 后端）：需求 6（需求 4 同城判定的数据基础）

一份 spec、一次部署。部署串行构建 `backend → client-web → tech-web`，绝不触碰生产数据库数据。

---

## 关键决策（已确认）

1. 无生效工时时，时间网格改为**全天 00:00–23:30（48 格，半小时一格）**。
2. 冲突沿用现有「下单冻结 5 小时 `BlockedTimeSlot`」机制，**新预约 5h 窗口与他人已有占用重叠即冲突**。
3. 美甲师服务城市升级为**结构化省+市**：新增 `Technician.province` 列，技师端用**内置省/市两级下拉选择器**录入；**登录后硬性拦截完善**（未填省/市不能用主功能）。同城判定按**省+市**比对（各自归一化去尾「市/省」）。
4. 需求 3、4 仅客户端实现（技师端代客下单是自由文本地址、天然同城，不涉及）。

---

## 需求 1：无工时 → 默认全天可约

### 现状
- 客户端可用性集中在 `client-frontend/src/hooks/useTechnicianAvailability.ts`：`TIME_SLOTS` 为 22 格（09:00–20:30）；`isDateAvailable`、`getSlotStatuses`、`scheduleRange`。
- **现有 bug**：当 `serviceSchedule.schemes` 是数组但找不到 `activeScheme` 时，`isDateAvailable` 返回 `false`（全部不可约），与"无工时应全天可约"矛盾。
- 技师端 `CreateBookingSheet.tsx` 用自己的 `normalizeSchedule` + 时段源。
- 后端：上门预约不按排班校验日期/时间（仅到店按店铺营业时间 `assertShopOrderAvailability`），故无需改动。

### 设计
- **时段常量**：`TIME_SLOTS` 扩为 48 格 `['00:00','00:30',…,'23:30']`。技师端 `CreateBookingSheet` 的时段源同步改为同一 48 格。
- **"工时生效"判定**（统一口径）：
  - 新版（`Array.isArray(schemes)`）：存在 `activeScheme`（`schemes.find(s=>s.id===activeSchemeId)`）且其 `days.length > 0` → 生效；否则不生效。
  - 旧版：`days` 中至少一天 `enabled===true` → 生效；否则不生效。
- **`scheduleRange`**：仅当工时生效时返回 `{start,end}`；否则 `null`（不按工时过滤时段）。
- **`isDateAvailable(dateStr)`**：
  - 工时不生效 → 返回 `true`（任何未来日期可约，日历不置灰）。
  - 工时生效（新版）→ `restDays` 命中返回 `false`；否则当天 `dayKey ∈ activeScheme.days`。
  - 工时生效（旧版）→ `selectedDates` 优先；否则 `days[dayKey].enabled`。
- **`getSlotStatuses(dateStr, opts?)`**：
  - 基准 48 格；若 `opts.shopHours` 提供则先按营业时段过滤（到店）；若 `scheduleRange` 非空再按工时过滤。
  - 标记 `occupied`：与 `blockedSlots` 重叠为已占用。
  - **当天过去时段**：若 `dateStr === 今天` 且该时刻 `<= now`，标记为不可选（`occupied: true`，避免约到过去）。
- 技师端 `CreateBookingSheet`：其排班归一化与时段计算按同口径调整——无生效工时时 48 格全开、仅去掉被占用项。

### 影响文件
- `client-frontend/src/hooks/useTechnicianAvailability.ts`
- `technician-frontend/src/components/CreateBookingSheet.tsx`

---

## 需求 2：提交时冲突校验 + 刷新日历/时段

### 现状
- 客户 `createOrder` 建单时状态为 `pending_quote`，**未做任何占用冲突校验**，仅在事务末尾写入「下单起 5 小时」的 `BlockedTimeSlot`（`reason:'booking'`）。
- 取消订单（`updateOrderStatus → cancelled`）已 `deleteMany` 释放该订单的 `BlockedTimeSlot`。
- 已有私有方法 `assertOrderConflict`（按 `order.status ∈ {pending_home,pending_shop}` 查重叠），但未用于建单路径。
- `getBlockedSlots(techId)` 读 `blockedTimeSlot` 中 `endTime >= now`，驱动前端日历占用。

### 设计（后端）
- 新增私有方法 `assertNoBlockedConflict(tx, techId, startTime, blockEnd, ignoreOrderId?)`：在事务内查询该 `techId` 是否存在 `BlockedTimeSlot` 满足 `startTime < blockEnd && endTime > startTime`（排除 `ignoreOrderId` 对应记录）。命中则
  `throw new BadRequestException('该时间段已经被其他用户预约，请重新选择预约时间')`。
- 在三个建单事务中、**写入新 `BlockedTimeSlot` 之前**调用：
  - `client-orders.service.ts` → `createOrder`
  - `client-orders.service.ts` → `createFromDesign`
  - 技师代客下单服务方法（`orders.service.ts` 中对应的 create 方法）
  - `blockEnd = startTime + 5h`，与现有冻结窗口一致。
- 该校验在事务内执行，配合 `$transaction` 降低并发竞态。

### 设计（前端）
- 在三处提交处理（客户端 `BookingSheet`、客户端 `CreateOrder`、技师端 `CreateBookingSheet`）：
  - 捕获后端错误，若错误消息包含「该时间段已经被其他用户预约」：
    1. 弹出该提示（toast / alert，按各端现有方式）。
    2. 重新调用 `orderService.getBlockedSlots(techId)`（客户端经 `useTechnicianAvailability` 内部 refetch，新增暴露 `refresh()`；技师端直接重拉），刷新占用。
    3. 清空已选 `startTime`，提示用户重选。
  - 日历与时段控件随新 `blockedSlots` 重渲染。
- `useTechnicianAvailability` 增加返回 `refresh: () => void`，触发重新拉取 `getBlockedSlots`（把 fetch 抽成可手动触发）。

### 影响文件
- `backend/src/orders/client-orders.service.ts`
- `backend/src/orders/orders.service.ts`（技师代客下单路径）
- `client-frontend/src/hooks/useTechnicianAvailability.ts`（暴露 `refresh`）
- `client-frontend/src/components/BookingSheet.tsx`
- `client-frontend/src/pages/CreateOrder.tsx`
- `technician-frontend/src/components/CreateBookingSheet.tsx`

---

## 需求 3：客户端预约页内联填地址（仅客户端）

### 现状
- `CreateOrder.tsx` 上门服务无地址时显示「暂无上门地址，请先添加」并跳 `/profile/addresses`，**强制中断预约**。
- `BookingSheet.tsx` 已支持内联地址：无地址时内联表单（姓名/电话/详细地址），提交时 `addressService.createAddress` 存入地址簿。

### 设计
- `CreateOrder.tsx` 复用 `BookingSheet` 的内联地址模式：
  - 上门服务且无可用地址时，**页面内**展示内联地址表单（联系人、手机号、详细地址），不再强制跳转。
  - 提交时若使用内联表单：先 `addressService.createAddress({...,isDefault: 无地址时为 true})` 存入用户地址簿，再用返回的 `id` 作为 `addressId` 下单。
  - 保留「管理地址」入口（可选跳转），但不阻断预约。

### 影响文件
- `client-frontend/src/pages/CreateOrder.tsx`

---

## 需求 4：同城锁定省市（仅客户端）

> 城市来源升级为结构化省+市，见「需求 6」。本节描述客户端基于该数据的同城锁定。

### 设计
- **归一化与匹配**：
  - `normalizeCity(s) = (s||'').trim().replace(/市$/,'')`；`normalizeProvince(s) = (s||'').trim().replace(/省$/,'')`。
  - 同城 = `normalizeProvince(addr.province)===normalizeProvince(tech.province)` 且 `normalizeCity(addr.city)===normalizeCity(tech.city)`。
- **内联地址表单**（`CreateOrder` 与 `BookingSheet` 共用模式）：
  - 当美甲师有省/市时，地址 `province`、`city` 字段锁定为美甲师的省/市、不可编辑（只读展示）；用户仅填区/详细地址。
  - 美甲师省/市为空时（理论上被「需求 6」强制完善挡住，极少出现）回退为可自由填写。
- **已有地址选择**：
  - 列表渲染时对每个地址做省+市比对；不匹配项**置灰、禁用点击**。
  - 用户点选不匹配项 → 弹 `美甲师不支持跨城上门美甲`。
- **后端兜底校验**（防绕过）：上门下单（`createOrder`、`createFromDesign`）解析地址后，若美甲师省/市非空且地址省+市归一化不一致 →
  `throw new BadRequestException('美甲师不支持跨城上门美甲')`。

### 影响文件
- `client-frontend/src/components/BookingSheet.tsx`（内联表单省/市锁定 + 已有地址同城过滤）
- `client-frontend/src/pages/CreateOrder.tsx`（同上）
- `backend/src/orders/client-orders.service.ts`（上门下单同城兜底校验）

---

## 需求 5：技师端首页「今日热门作品」点击进详情（仅技师端）

### 现状
- `technician-frontend/src/pages/HomePage.tsx` 的热门作品项点击进入了作品**列表页**，而非该作品详情。

### 设计
- 将热门作品项 `onClick` 改为跳转到该作品的**详情路由**（用作品 `id`），与技师端现有作品详情入口一致。

### 影响文件
- `technician-frontend/src/pages/HomePage.tsx`

---

## 需求 6：美甲师省市结构化 + 登录强制完善（技师端 + 后端）

为支撑同城判定与将来的"定位查看可预约美甲师"，把美甲师服务城市升级为结构化省+市并强制完善。

### 现状
- `Technician` 仅有 `city String?`（自由文本）+ `serviceArea String?`，无 `province`。
- `ProfileSettingsPage.tsx` 用纯文本框录入「所在城市」（占位"如：北京市"）。
- `ShopAddressDto` 的 `province/city` 是**门店地址**字段，与美甲师本人服务城市无关。
- 首次改密通过 `AuthContext` 的 `mustChangePassword` 驱动跳转。

### 设计（后端）
- `Technician` 新增列 `province String?`（**仅新增可空列，增量迁移，非破坏**；生产现有 3 位技师 `province=null`，靠强制完善补齐）。
- `UpdateTechnicianProfileDto` 增加 `province?: string`；`updateProfile` 持久化 `province`（trim，空转 null）。
- 登录响应 / `me` / profile 查询的 `select` 增加 `province` 字段返回。

### 设计（技师端）
- **省市数据集**：新增 `technician-frontend/src/data/regions.ts`（或 JSON）—— 中国省→市两级数据（含 4 直辖市，province===city）。
- **RegionSelect 组件**：`technician-frontend/src/components/RegionSelect.tsx`，省份下拉 → 联动城市下拉，受控输出 `{province, city}`。
- **ProfileSettingsPage**：把「所在城市」文本框替换为 `RegionSelect`（省+市），保存时一并提交 `province`、`city`；`serviceArea` 保留为补充文本。
- **登录强制完善守卫**：在路由守卫处（`App.tsx` / `AuthContext`），登录后若 `!technician.province || !technician.city` → 强制跳转到资料完善页（复用 `RegionSelect`，类似首次改密的拦截），未填不能进入主功能。完善保存后解除拦截。

### 影响文件
- `backend/prisma/schema.prisma`（`Technician.province String?`）
- `backend/src/technician-auth/dto/update-technician-profile.dto.ts`
- `backend/src/technician-auth/technician-auth.service.ts`（持久化 + 返回 province）
- `technician-frontend/src/data/regions.ts`（新增）
- `technician-frontend/src/components/RegionSelect.tsx`（新增）
- `technician-frontend/src/pages/ProfileSettingsPage.tsx`
- `technician-frontend/src/App.tsx` / `technician-frontend/src/contexts/AuthContext.tsx`（强制完善守卫）
- `technician-frontend/src/services/auth.ts`（`province` 字段类型 + 透传）
- 客户端 `Technician` 类型（`client-frontend/src/services/auth.ts`）增加 `province?: string`，供需求 4 同城判定读取。

---

## 测试与验证

- 三端 `npm run build` + `npm run lint` 全绿。
- 后端可加最小单测（backend 已有 jest）：
  - `assertNoBlockedConflict` 重叠/不重叠两例；
  - 「无生效工时 → isDateAvailable=true / 全天 48 格」逻辑（若抽为可测纯函数）。
- 手动冒烟（用 demo 数据）：
  1. 美甲师清空工时 → 客户端日历无置灰、时段 00:00–23:30 全开（除占用）。
  2. 两个客户先后约同一时段 → 第二个提交弹「该时间段已经被其他用户预约…」并刷新日历、清空所选。
  3. 取消订单 → 该时段重新可约。
  4. 客户无地址发起上门 → 预约页内联填地址 → 成功且地址出现在地址簿。
  5. 地址省/市与美甲师不同城 → 该地址置灰；强选弹「美甲师不支持跨城上门美甲」；内联表单省/市锁定为美甲师省/市。
  6. 技师端首页点热门作品 → 进入该作品详情页。
  7. 省/市为空的技师登录 → 被强制跳转完善页，选完省/市保存后方可进入主功能；现有 demo 技师可清空 province 复现。
  8. 技师用 RegionSelect 选省→联动市→保存 → profile 返回结构化 province/city。

## 部署

- 串行构建：`DEPLOY_BRANCH=<branch> ./deploy/deploy.sh backend` → `client-web` → `tech-web`（一次一个，避免 OOM）；或 `deploy.sh` 自动检测逐个构建。构建后 `docker compose restart nginx`。
- 后端含 schema 变更（新增 `Technician.province` 可空列）：靠容器启动的 `prisma db push --skip-generate` 增量应用，**仅加列、非破坏**，不触碰 `prod.db` 已有数据。
- backend 重建不触碰 `prod.db`（数据在 Docker 卷）；部署后核验 `DATABASE_URL` 为绝对路径且行数不变。
- 部署后生产 3 位技师 `province=null` → 下次登录被强制完善（符合预期）。

---

## 不做（YAGNI）

- 不改技师端代客下单的自由文本地址（需求 3、4 不涉及技师端）。
- 省市只到「市」两级，不做区/县级联（技师服务城市无需到区）。
- 不引入定位/经纬度与"附近美甲师"功能本身——本次只把结构化省市数据补齐，为将来定位打基础。
- 不改时间选择的整体交互范式（仍是日历 + 时段网格）。
- 不动 `client-wxapp`、`mobile-flutter`。
