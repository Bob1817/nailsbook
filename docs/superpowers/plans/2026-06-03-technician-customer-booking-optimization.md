# 美甲师端：客户/预约优化 实现计划

分支 `reconcile-set-password`。前端 technician-frontend + client(消费不变) + 后端(增量、不动数据库结构)。验证：各包 `npm run build` + `eslint` 改动文件 + 预览手测。每任务独立提交（精确 `git add`，绝不 -A）。

## 根因小结
- 地址读不到：① `client-orders.service` 的 `customer.upsert` `update:{}` 不回填地址；② 读取端不回退到最近订单地址。
- 历史恒空：详情接口返回 `orders`，前端读 `item.bookings`（字段名不符）。
- 卡片：地址显示两次 + 底部「X 次服务」；列表 `totalOrders` 写死 0。
- 新建预约：内嵌 OrdersPage，需抽成组件就地复用；日期时间分开 input，需改日历+时段网格并联动工作时间。

---

## Task 1（后端）：客户地址回填 + 读取回退 + 列表统计 + 详情字段对齐
**Files:** `backend/src/orders/client-orders.service.ts`、`backend/src/customers/customers.service.ts`
- `client-orders.service`：所有 `customer.upsert` 的 `update` 改为在 `orderAddress` 非空时写 `address: orderAddress`（回填）；不覆盖为 null。
- `customers.service.findAll`/列表：每个客户返回 `address`（为空回退到该客户最近一笔有地址订单的 `order.address`）、`totalOrders`(=订单数)。
- `customers.service.findOne`/详情：返回的 `address` 同样回退；保留 `orders`(供历史)、`revenues`。
- 验证：`cd backend && npm run build`；若有 spec 受影响则 `npx jest` 相关。后端不动 schema、不重置数据。
- 提交：`fix(backend-customers): backfill & fallback customer address, list order counts`

## Task 2（前端 service）：对齐详情字段 + 列表统计
**Files:** `technician-frontend/src/services/customers.ts`
- `normalizeCustomerSummary`：`totalOrders` 用后端返回值（不再写死 0）；`address` 用后端返回（已回退）。
- `normalizeCustomerDetail`：历史从 `item.orders`（而非 `item.bookings`）映射；label=`order.customTitle||order.orderNo`，date=`startTime`，price=`order.price??0`，status，depositPaid。同步更新 `CustomerApiDetail` 接口（`orders` 替代 `bookings`，字段按后端实际）。
- 验证：`cd technician-frontend && npm run build`。
- 提交：`fix(technician-customers): read orders for history, use backend order counts`

## Task 3（前端 part1）：客户卡片去重
**Files:** `technician-frontend/src/pages/CustomersPage.tsx`
- 删除卡片底部重复的地址行 + 「X 次服务」（约 351-353），保留名称下方地址（316-319）与统计区（347）。
- 空地址文案统一为「暂无地址」。
- 验证：build + eslint。
- 提交：`fix(technician-customers): remove duplicate address & service-count on card`

## Task 4（前端 part3+4 核心）：抽取 CreateBookingSheet + 日历时段选择 + 工作时间联动 + 地址预填
**Files:** 新建 `technician-frontend/src/components/CreateBookingSheet.tsx`；改 `technician-frontend/src/pages/OrdersPage.tsx`、`technician-frontend/src/pages/CustomerDetailPage.tsx`
- 抽取：把 OrdersPage 的 `showCreateSheet` 表单及其状态/提交逻辑（handleCreateDraft）抽成 `<CreateBookingSheet open customers? presetCustomerId? onClose onCreated />`。props 提供已加载客户列表或自身加载；`onCreated(order)` 回调刷新。
- OrdersPage：用该组件替换内嵌 sheet，行为不变（仍支持 `?customerId=` 预选）。
- CustomerDetailPage：`handleCreateOrder` 改为打开本地 `<CreateBookingSheet presetCustomerId={customer.id}>`，**不再 navigate('/orders')**；`onCreated` 后重新拉取 `customersService.getById` 刷新历史记录。
- 地址预填：sheet 打开时，若选中客户有地址（后端已回退），自动填入地址输入框。
- 日期时间重做：用日历(月视图)+下方时段网格替代 date/time input。
  - 复用/参照客户端 CreateOrder 的日历+时段写法。
  - 联动**当前登录美甲师**的 `serviceSchedule`（useAuth().technician）：
    - `restDays` 当天 → 日历该日禁选，点选提示「该美甲师休息中」。
    - 启用方案 `days` 未含的星期 → 日历该日禁选，提示「该美甲师休息中」。
    - 时段网格只显示启用方案 `startTime–endTime` 内的档；其它时段不显示/置灰提示「该时间内美甲师休息中」。
    - 旧格式 serviceSchedule 用 `normalizeSchedule` 转换后再判断（复用 `utils/workSchedule`）。
- 创建后历史：CustomerDetailPage `onCreated` 重新 getById；OrdersPage 维持原刷新。
- 验证：build + eslint；预览手测（休息日禁选、时段联动、地址预填、创建后详情历史出现）。
- 提交：`feat(technician-booking): in-place create-booking sheet with calendar picker, work-time gating, address prefill`

## Task 5：回归 + 串行部署
- 两个前端 + 后端 build 通过。
- push；服务器 `git pull`；**逐个**构建变更服务：`backend`→`tech-web`（一次一个）；`up -d`；`restart nginx`；健康检查。
- 后端有改动但**零 schema/数据变更**，prod.db 不受影响（仅 `prisma db push` 空操作）。
