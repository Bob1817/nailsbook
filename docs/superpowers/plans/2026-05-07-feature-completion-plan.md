# NailBook 功能补全开发计划

## Context

NailBook 已完成 MVP 核心功能开发（后端 24 个 Service 全部真实实现，三个主前端共 42 个页面几乎全部功能完备）。当前目标是**补全 PRD 中未实现的功能**，不涉及基础设施（SMS、云存储、Docker、数据库迁移）。

基于项目分析，共识别 24 个功能项，按 P0/P1/P2/P3 四级优先级分层，组织为 6 个可独立交付的阶段。

---

## Phase 1: 核心预约闭环补全 (P0)

### Item 1: 修复技师端预约创建 API 路径
- **复杂度**: S
- **问题**: 后端 `TechnicianBookingsController` 路由为 `technician/bookings`，但前端 `bookings.ts:243` 调用 `/bookings` 而非 `/technician/bookings`，导致请求失败回退到本地草稿
- **改动**:
  - `technician-frontend/src/services/bookings.ts` — 修正 API 路径
  - `backend/src/bookings/dto/create-technician-booking.dto.ts` — 验证字段对齐
- **依赖**: 无

### Item 2: 预约状态流程 — 前端操作完整性
- **复杂度**: M
- **问题**: 后端支持完整状态转换，但客户端 BookingDetail 需确认在 `pending_confirm` 状态下正确展示确认/接受操作按钮
- **改动**:
  - `client-frontend/src/pages/BookingDetail.tsx` — 验证并补充状态操作按钮
  - `technician-frontend/src/pages/BookingDetailPage.tsx` — 验证所有状态操作渲染
- **依赖**: Item 1

### Item 3: 消息未读计数实现
- **复杂度**: M
- **问题**: 两个 message service 均硬编码 `unreadCount: 0`（有 TODO 注释），`Message` 模型已有 `isRead` 字段
- **改动**:
  - `backend/src/client-messages/client-messages.service.ts` — 用 Prisma count 替换硬编码 0
  - `backend/src/technician-messages/client-messages.service.ts` — 同上
- **依赖**: 无

### Item 4: 消息已读标记接口
- **复杂度**: S
- **问题**: 无接口将消息标记为已读，用户打开会话后无法清除未读
- **改动**:
  - `backend/src/client-messages/` — 新增 `PATCH /client/messages/read` 端点 + `markAsRead()` 方法
  - `backend/src/technician-messages/` — 新增 `PATCH /technician/messages/read` 端点
  - `client-frontend/src/pages/ChatDetail.tsx` — 打开会话时调用 markAsRead
  - `technician-frontend/src/pages/ChatPage.tsx` — 同上
- **依赖**: Item 3

### Item 5: 清理死代码 — 技师端 Dashboard.tsx
- **复杂度**: S
- **改动**: 删除 `technician-frontend/src/pages/Dashboard.tsx`（未被路由引用，已被 HomePage 取代）
- **依赖**: 无

---

## Phase 2: 消息与通知增强 (P1)

### Item 6: 消息提醒接入真实未读数
- **复杂度**: M
- **改动**:
  - `technician-frontend/src/pages/MessagesPage.tsx` — 用 API 返回的真实 unreadCount 替换
  - `technician-frontend/src/services/message.ts` — 确保 getConversations 返回未读数
- **依赖**: Items 3, 4

### Item 7: 客户端聊天未读角标
- **复杂度**: S
- **改动**:
  - `client-frontend/src/pages/Chat.tsx` — 验证 totalUnread 渲染
  - `client-frontend/src/components/MainLayout.tsx` — 在聊天 Tab 添加/验证角标
- **依赖**: Items 3, 4

### Item 8: 预约状态变更通过聊天通知
- **复杂度**: M
- **改动**:
  - `backend/src/bookings/bookings.service.ts` — 在 `confirm()`、`complete()`、`cancel()` 方法中添加系统消息（参考 `review()` 已有模式）
- **依赖**: Item 4

---

## Phase 3: 技师端日程与工作流 (P1)

### Item 9: 日历页状态筛选模式
- **复杂度**: S
- **改动**:
  - `technician-frontend/src/pages/SchedulePage.tsx` — 在日期选择器下方添加筛选 pill（today/confirmed/pending），复用已有 filter 逻辑
- **依赖**: 无

### Item 10: /orders 路由合并到 /schedule
- **复杂度**: S
- **改动**:
  - `technician-frontend/src/App.tsx` — `/orders` 改为重定向到 `/schedule?mode=list`
  - `technician-frontend/src/pages/SchedulePage.tsx` — 支持 `mode=list` 查询参数
- **依赖**: 无

### Item 11: 客户详情直接预约
- **复杂度**: S
- **改动**:
  - `technician-frontend/src/pages/CustomersPage.tsx` — 更新导航目标（适配 Item 10 路由变更）
- **依赖**: Item 10

### Item 12: 分享名片增强
- **复杂度**: M
- **改动**:
  - `technician-frontend/src/pages/HomePage.tsx` — 优化名片固定比例、防溢出
  - 可选: 添加"保存为图片"功能（需引入 html2canvas）
- **依赖**: 无

---

## Phase 4: 落地页与公开功能 (P1)

### Item 13: 技师入驻表单对接 API
- **复杂度**: M
- **改动**:
  - 新建 `backend/src/artist-applications/` 模块（controller + service）
  - `backend/prisma/schema.prisma` — 新增 `ArtistApplication` 模型 + migration
  - `landing-frontend/src/pages/ArtistJoinPage.tsx` — 替换 `setIsSubmitted(true)` 为 API 调用
- **依赖**: 无

### Item 14: 作品展示页动态数据
- **复杂度**: M
- **改动**:
  - `backend/src/technician-works/` — 新增公开 `GET /public/works/featured` 端点（无需认证）
  - `landing-frontend/src/pages/ShowcasePage.tsx` — 从 API 获取替代硬编码数据
- **依赖**: 无

### Item 15: 收入数据导出 (CSV)
- **复杂度**: M
- **改动**:
  - `backend/src/revenues/revenues.controller.ts` — 新增 `GET /admin/revenues/export`
  - `backend/src/revenues/revenues.service.ts` — 新增 `exportCsv()` 方法
  - `admin-frontend/src/pages/Revenues.tsx` — 添加导出按钮
- **依赖**: 无

---

## Phase 5: UX 打磨与表单质量 (P2)

### Item 16: 技师端表单验证增强
- **复杂度**: M
- **改动**:
  - `technician-frontend/src/pages/OrdersPage.tsx`、`BookingDetailPage.tsx`、`ProfileSettingsPage.tsx` — 增强验证
  - 可选: 新建 `technician-frontend/src/utils/validation.ts` 共享验证器
- **依赖**: 无

### Item 17: 客户端表单验证增强
- **复杂度**: M
- **改动**:
  - `client-frontend/src/pages/CreateBooking.tsx`、`CreateDesign.tsx`、`EditAddress.tsx`、`Profile.tsx`
  - 可选: 添加 ToastProvider 统一反馈
- **依赖**: 无

### Item 18: UI Token 统一
- **复杂度**: L
- **改动**:
  - 三个前端的 `tailwind.config.js` + `index.css` — 以技师端为基准对齐色彩和间距 token
  - 渐进式逐组件替换，不做大爆炸重写
- **依赖**: 无

### Item 19: 排班配置管理 UI
- **复杂度**: L
- **改动**:
  - `backend/prisma/schema.prisma` — 新增 `ScheduleConfig` 和 `DailyOverride` 模型 + migration
  - `backend/src/schedules/` — 新增 CRUD 端点
  - `technician-frontend/src/pages/` — 新建 `ScheduleConfigPage.tsx`
  - `technician-frontend/src/App.tsx` — 添加路由
- **依赖**: 无

---

## Phase 6: 高阶与实验功能 (P2/P3)

### Item 20: 月报查看 UI (P2)
- **改动**: 持久化 `generateMonthlyReport()` 结果到新 `MonthlyReport` 模型，新增 admin 查看页
- **依赖**: 无

### Item 21: 入驻申请审核 (P2)
- **改动**: admin 端新增申请列表页，审核通过自动创建技师记录
- **依赖**: Item 13

### Item 22: 微信登录 (P3)
- **说明**: 需微信开发者账号，当前仅准备代码骨架
- **依赖**: 外部（微信开发者账号）

### Item 23: AI 美甲预览 (P3)
- **说明**: 需图像生成 API，当前仅准备数据流和 UI 骨架
- **依赖**: 外部（AI 图像生成 API）

### Item 24: PWA Push 通知 (P3)
- **说明**: 需 Service Worker + Push 服务 + VAPID 密钥，推迟到功能全部完成后
- **依赖**: 外部

---

## 依赖关系

```
Item 1 (预约API修复) ──> Item 2 (状态流程)
Item 3 (未读计数) ──> Item 4 (已读标记) ──> Items 6, 7, 8 (通知)
Item 10 (路由合并) ──> Item 11 (客户预约)
Item 13 (入驻提交) ──> Item 21 (入驻审核)
```

## 关键文件清单

| 文件 | 涉及 Items |
|------|-----------|
| `backend/src/bookings/bookings.service.ts` | 2, 8 |
| `backend/src/client-messages/client-messages.service.ts` | 3, 4 |
| `backend/src/technician-messages/technician-messages.service.ts` | 3, 4 |
| `technician-frontend/src/services/bookings.ts` | 1 |
| `technician-frontend/src/pages/SchedulePage.tsx` | 9, 10, 11 |
| `technician-frontend/src/pages/MessagesPage.tsx` | 6 |
| `client-frontend/src/pages/BookingDetail.tsx` | 2 |
| `client-frontend/src/pages/ChatDetail.tsx` | 4, 7 |
| `backend/prisma/schema.prisma` | 13, 19, 20 |
| `landing-frontend/src/pages/ArtistJoinPage.tsx` | 13 |
| `landing-frontend/src/pages/ShowcasePage.tsx` | 14 |

## 验证方式

每个 Phase 完成后：
1. 运行 `cd backend && npm run build` 确认后端编译通过
2. 运行 `cd backend && npm test` 确认已有测试不被破坏
3. 对涉及的前端运行 `cd <frontend> && npm run build` 确认编译通过
4. 手动验证核心流程：技师创建预约 → 客户确认 → 技师完成 → 收入生成
