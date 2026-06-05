# 超管后台内容审查与运营能力 — 设计文档

**日期：** 2026-06-05  
**状态：** 已确认，待实施  
**范围：** admin-frontend + backend + client-frontend（举报入口）

---

## 一、背景与目标

当前超管后台缺少对平台内容（作品、评论）的可见性与干预能力。具体缺口：

- 无法查看或管理全平台作品，无法为官网推广选品
- 评论的隐藏/删除权只在美甲师手中，超管无法干预违规内容
- 美甲师申请审核后端已实现，但超管前端无对应页面
- 无举报机制，用户发现违规内容无法反馈给平台

本次新增四个模块，构建平台内容治理的基础能力，同时为官网精选展示提供数据源。

---

## 二、新增模块清单

| 模块 | 前端页面 | 后端模块 | 说明 |
|------|---------|---------|------|
| 作品管理 | Works.tsx | admin-works/ | 查看+下架+删除+编辑标签+官网精选 |
| 评论管理 | Comments.tsx | admin-comments/ | 查看+强制隐藏+删除 |
| 举报队列 | Reports.tsx | admin-reports/ | 查看待处理举报+删除评论/驳回举报 |
| 美甲师申请 | ArtistApplications.tsx | artist-applications/（已有）| 仅补前端页面 |

---

## 三、数据库变更

### 3.1 NailWork 新增字段

```prisma
model NailWork {
  // ... 现有字段 ...
  isHomepageFeatured Boolean @default(false)  // 超管标记为官网精选
}
```

### 3.2 新增 NailWorkReport 表

```prisma
model NailWorkReport {
  id           Int      @id @default(autoincrement())
  commentId    Int
  reporterId   Int
  reporterType String   // "client" | "technician"
  reason       String   // "spam" | "inappropriate" | "harassment" | "other"
  status       String   @default("pending")  // "pending" | "resolved" | "dismissed"
  createdAt    DateTime @default(now())
  updatedAt    DateTime @default(now()) @updatedAt

  comment      NailWorkComment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([commentId, reporterId, reporterType])  // 同一用户对同一评论只能举报一次
  @@index([status])
  @@index([commentId])
}
```

---

## 四、后端架构（独立 admin 子模块，方案 A）

遵循现有 `admin-invite-keys`、`admin-roles`、`admin-permissions` 的独立模块约定。

### 4.1 admin-works 模块

**路由前缀：** `/api/v1/admin/works`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | / | 全平台作品列表（分页+筛选）| work:view |
| GET | /:id | 作品详情 | work:view |
| PATCH | /:id/visibility | 切换可见性（上架/下架）| work:manage |
| PATCH | /:id/homepage-featured | 切换官网精选 | work:manage |
| PATCH | /:id/tags | 编辑标签 | work:manage |
| DELETE | /:id | 删除作品 | work:manage |

**列表筛选参数：** `page`、`pageSize`、`technicianId`、`keyword`（标题/标签）、`isVisible`、`isHomepageFeatured`

### 4.2 admin-comments 模块

**路由前缀：** `/api/v1/admin/comments`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | / | 全平台评论列表（分页+筛选）| comment:view |
| PATCH | /:id/hide | 切换隐藏状态 | comment:manage |
| DELETE | /:id | 删除评论（超管强制硬删除，无视是否有回复）| comment:manage |

**列表筛选参数：** `page`、`pageSize`、`keyword`、`status`（normal/hidden）、`authorType`（client/technician）

### 4.3 admin-reports 模块

**路由前缀：** `/api/v1/admin/reports`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | / | 举报列表（默认 pending 在前）| report:view |
| PATCH | /:id/resolve | 处置：删除被举报评论，status→resolved | report:manage |
| PATCH | /:id/dismiss | 驳回举报，status→dismissed | report:manage |

### 4.4 公开精选作品 API

**路由：** `GET /api/v1/public/featured-works`（无需认证）

- 条件：`isHomepageFeatured=true` AND `isVisible=true`
- 返回字段：id、title、coverUrl、imageUrls、tags、technicianName、technicianAvatarUrl、likeCount
- 排序：`updatedAt DESC`
- 参数：`?limit=`（默认 20，最大 50）

### 4.5 客户端举报接口（新增）

**路由：** `POST /api/v1/client/reports`（需客户端 JWT）

```json
{
  "commentId": 123,
  "reason": "spam"
}
```

美甲师端举报接口（`POST /api/v1/technician/reports`）留到下一期，本次不实现。

---

## 五、前端（admin-frontend）

### 5.1 新增页面

| 文件 | 路由 | 权限 |
|------|------|------|
| Works.tsx | /works | work:view |
| Comments.tsx | /comments | comment:view |
| Reports.tsx | /reports | report:view |
| ArtistApplications.tsx | /applications | application:view |

### 5.2 Works.tsx 功能

- 列表：封面缩略图、标题、标签、美甲师、点赞数、评论数、可见状态、官网精选标记
- 筛选：关键词、美甲师、可见性、是否官网精选
- 操作：上架/下架切换、官网精选切换、删除（二次确认）
- 详情抽屉：图片轮播、编辑标签、官网精选开关

### 5.3 Comments.tsx 功能

- 列表：评论内容、作者（类型+名称）、所属作品（可跳转）、美甲师、状态、时间
- 筛选：关键词、状态（正常/已隐藏）、作者类型
- 操作：隐藏/恢复、删除（二次确认）

### 5.4 Reports.tsx 功能

- Tab：待处理（pending） / 已处理（resolved+dismissed）
- 列表：被举报评论内容、举报原因、举报人、举报时间
- 操作：删除评论（resolve）、驳回举报（dismiss）
- 待处理数量显示为侧边栏红点角标

### 5.5 ArtistApplications.tsx 功能

- Tab：待审核 / 已通过 / 已拒绝
- 列表：姓名、手机号、城市、申请时间
- 详情弹窗：资质描述、联系方式、审核备注输入框
- 操作：一键通过（自动创建美甲师账号）、拒绝（填写原因）

### 5.6 导航菜单更新（MainLayout.tsx）

在"客户管理"之后插入：
```
作品管理（/works）
评论管理（/comments）
举报队列（/reports）— 带待处理角标
美甲师申请（/applications）
```

### 5.7 新增 service 文件

```
src/services/adminWork.ts
src/services/adminComment.ts
src/services/adminReport.ts
src/services/artistApplication.ts
```

---

## 六、前端（client-frontend webapp）

### 6.1 评论举报入口

在评论组件（评论列表的每条评论）长按或点击"..."菜单新增"举报"选项：
- 弹出举报原因选择：广告/垃圾信息、不雅内容、骚扰、其他
- 确认后调用 `POST /api/v1/client/reports`
- 成功提示："已举报，我们将尽快处理"
- 同一评论已举报过则显示"已举报"（禁用状态）

---

## 七、RBAC 权限注册

通过 seed 脚本写入 AdminPermission 表，超管角色自动获得全部权限：

| 权限码 | 模块 | 说明 |
|-------|------|------|
| work:view | 作品 | 查看全平台作品 |
| work:manage | 作品 | 下架/删除/设置精选 |
| comment:view | 评论 | 查看全平台评论 |
| comment:manage | 评论 | 强制隐藏/删除评论 |
| report:view | 举报 | 查看举报队列 |
| report:manage | 举报 | 处置举报 |
| application:view | 申请 | 查看美甲师申请 |
| application:manage | 申请 | 审核通过/拒绝 |

---

## 八、实施边界说明

**本次包含：**
- 全部后端 admin 接口（works / comments / reports / featured-works / 客户端举报接口）
- 全部 admin-frontend 新页面（4 个）
- client-frontend 评论举报入口（React webapp）
- Prisma schema 变更 + migration
- RBAC 权限 seed

**本次不包含：**
- 美甲师端 app 的举报入口（technician-frontend）
- 邮件通知（举报处置结果通知举报人）
- 消息/对话监控
- 官网对接（官网读取 featured-works API 留给官网开发时对接）
