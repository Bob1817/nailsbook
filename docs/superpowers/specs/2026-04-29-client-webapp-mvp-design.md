# Client WebApp MVP Design

## Context

当前仓库已经有两部分可运行实现：

- `admin-frontend`：超级管理后台
- `technician-frontend`：美甲师移动端 WebApp
- `backend`：共享后端服务，当前主要服务 admin 与 technician MVP

本轮目标是在现有项目基础上新增第三部分：面向美甲师私域客户的移动端 WebApp，并严格遵循以下文档约束：

- [美甲师用户端_PRD.md](/Users/shibo/Documents/Codex/nailBook/美甲师用户端_PRD.md)
- [美甲师用户端_TDD.md](/Users/shibo/Documents/Codex/nailBook/美甲师用户端_TDD.md)
- [CLAUDE.md](/Users/shibo/Documents/Codex/nailBook/CLAUDE.md)
- `frontedDesign/` 目录中的页面视觉风格

用户已经确认本轮仅实现 MVP 核心闭环，不扩展以下能力：

- 不做平台分发、技师搜索、多技师选择
- 不做收藏
- 不做 PWA
- 不接真实短信服务
- 不接 OSS / S3 / COS
- 不做 WebSocket，消息先用 HTTP 轮询

## Goals

- 新增客户端 WebApp，实现 `邀请绑定 -> 首页 -> 预约 -> 设计 -> 消息 -> 我的/地址` 的完整闭环。
- 在 `backend` 中新增客户端域模型和 API，而不是新开服务。
- 复用现有 `Technician` 与现有预约主链路，避免推翻 admin / technician 既有 MVP。
- 客户端页面设计保持与 `frontedDesign/` 一致，并延续技师端已有的移动优先交互规则。

## Non-Goals

- 不实现真实短信验证码服务。
- 不实现真实对象存储直传。
- 不实现实时 WebSocket 消息。
- 不实现在线支付，只保留线下定金状态记录。
- 不扩展 PRD 未要求的营销、推荐、收藏、分享裂变能力。

## Assumptions

- 当前后端使用 `Prisma + SQLite`，适合本轮 MVP 开发与本地联调。
- 现有 `Technician` 表可作为客户端绑定目标，不需要新建技师主表。
- 现有 `Booking` 仍然是履约主实体，客户端预约将写入该主链路，而不是重建第二套预约表。
- 现有 `Customer` 继续作为技师端客户管理实体存在，不直接承担客户端登录身份。
- 若技师端某些页面必须依赖 `Customer`，则在客户端首次形成有效业务关系时按需建立或补齐关联 `Customer` 记录。
- 由于当前目录不是 git 工作树，本轮只能写入 spec/plan 文件，不能按工作流要求提交 commit。

## Scope

本轮实现范围限定为一个可落地的客户端 MVP 子系统包，包含两个紧密耦合的部分：

1. `client-frontend` 移动端 WebApp
2. `backend` 中的客户端 API、鉴权和数据模型扩展

虽然涉及前后端两部分，但它们共同服务同一个业务闭环，适合放在一个设计与一个实施计划中执行。

## Architecture

### Frontend

新增 `client-frontend` 项目，技术路线与现有前端保持一致：

- React
- Vite
- TypeScript
- React Router
- Axios 或 Fetch 风格的统一请求封装

视觉与交互原则：

- 以手机 WebApp 为第一目标
- 所有核心操作按钮与输入控件高度至少 `44px`
- 保留底部安全区与固定导航可用性
- 沿用 `technician-frontend` 已存在的移动端 token 和节奏
- 页面风格对齐 `frontedDesign` 中的 `login / index / journey / client / message / me / manage`

### Backend

在现有 `backend` 中新增客户端域模块，统一挂在 `/api/client/*` 下，不拆分新服务。

客户端鉴权与 admin / technician 分离：

- admin 使用现有 admin JWT
- technician 使用现有 technician JWT
- client 使用新增 client JWT

这样可以保证权限边界清晰，避免客户端越权访问 technician 或 admin 资源。

## Data Model Strategy

客户端按 TDD 新增独立数据域，而不是复用 `Customer` 作为登录主体。

### New Models

- `ClientUser`
- `ClientTechBinding`
- `ClientAddress`
- `NailWork`
- `ClientDesignRequest`
- `Conversation`
- `Message`

这些模型承担以下职责：

- `ClientUser`：客户端登录身份
- `ClientTechBinding`：一个客户绑定一个美甲师的 MVP 关系
- `ClientAddress`：上门服务地址管理
- `NailWork`：客户端首页和作品页展示的数据源
- `ClientDesignRequest`：客户上传设计图并等待报价
- `Conversation` / `Message`：客户端与绑定技师的单会话消息系统

### Existing Model Reuse

- `Technician`：直接复用，作为客户端的绑定目标和主页展示来源
- `Booking`：继续作为预约履约主表
- `Customer`：保留给技师侧客户视图使用，必要时与 `ClientUser` 建立弱关联

### Booking Extension

为了让客户端预约能接入现有技师端与后台主链路，需要对 `Booking` 做最小扩展，而不是新建并行预约体系。扩展字段包括：

- `clientUserId`
- `addressId`
- `serviceType`
- `remark`
- `quotePrice`
- `depositAmount`
- `depositStatus`

必要时还可补充：

- `designRequestId`
- `source`，用于标记来源为 `client_webapp`

这些字段的目标是让同一条预约记录既能服务客户端页面，也能被技师端继续消费。

## Binding Rules

客户端绑定严格遵循 TDD 中的规则：

- 客户通过 `invite?tech_id=TECH_ID&invite_code=CODE` 进入
- 未登录时先注册/登录
- 注册成功后写入绑定关系
- 一个客户只能绑定一个美甲师
- 已绑定客户再次打开其他美甲师邀请链接时，不自动切换绑定
- 邀请码失效时返回明确错误
- 技师被禁用时禁止绑定与预约

绑定成功后，首页的所有数据都围绕绑定技师展开，不提供技师搜索或切换。

## User Experience

### 1. Invite / Login

入口页负责解析 `tech_id` 与 `invite_code`，并引导登录或注册。

MVP 登录机制：

- 手机号 + 固定验证码
- 不接真实短信
- 成功后签发 client JWT

页面职责：

- 识别邀请上下文
- 展示技师基础信息，增强信任
- 完成手机号登录/注册并绑定

### 2. Home

首页是绑定后第一屏，聚焦三个目标：

- 建立对技师的信任
- 浏览作品
- 快速发起预约或设计沟通

主要模块：

- 技师名片
- 推荐作品列表
- 最近预约摘要
- 快捷入口：预约 / 发起设计 / 联系美甲师

### 3. Bookings

客户端预约模块包含：

- `我的预约列表`
- `新建预约`
- `预约详情`

预约创建字段最小集：

- 服务日期
- 开始时间
- 地址
- 服务类型
- 备注

本轮不在客户端做复杂排期冲突演算，排期是否合法主要由技师侧后续确认。

### 4. Designs

设计模块包含：

- 上传设计图
- 填写描述
- 查看设计历史
- 查看报价状态

该模块承载“先沟通款式，再决定是否转预约”的轻流程，不要求本轮在客户端内直接完成报价支付。

### 5. Chat

消息模块只面向当前绑定技师，采用单会话模式：

- 文本消息
- 图片消息
- 系统消息
- 报价通知
- 预约通知

MVP 不做会话列表页复杂形态，不做多会话切换，因为一个客户只绑定一个技师。

### 6. Profile / Address

`我的` 页面提供：

- 个人信息展示
- 地址管理入口
- 我的订单入口
- 退出登录

地址管理支持：

- 新增地址
- 编辑地址
- 删除地址
- 设置默认地址

## Routing

客户端首轮路由按 TDD 执行，但只实现 MVP 所需页面：

- `/invite`
- `/login`
- `/home`
- `/bookings`
- `/bookings/create`
- `/bookings/:id`
- `/designs`
- `/design/create`
- `/designs/:id`
- `/chat`
- `/profile`
- `/profile/address`
- `/profile/address/edit`

说明：

- `/register` 可由 `/login` 合并承载，不必强制拆独立页面
- `/works` 与 `/works/:id` 可在首页作品区与设计详情需求权衡后决定是否首轮独立成页；若首轮不独立，首页作品区至少要具备完整浏览能力

## API Shape

后端在 `/api/client/*` 下新增这些核心能力：

### Client Auth

- `POST /api/client/auth/register-by-invite`
- `POST /api/client/auth/login`
- `GET /api/client/auth/me`

### Client Home

- `GET /api/client/home`
- `GET /api/client/works`
- `GET /api/client/works/:id`

### Client Bookings

- `POST /api/client/bookings`
- `GET /api/client/bookings`
- `GET /api/client/bookings/:id`

### Client Designs

- `POST /api/client/designs`
- `GET /api/client/designs`
- `GET /api/client/designs/:id`

### Client Messages

- `GET /api/client/messages`
- `POST /api/client/messages`
- `POST /api/client/messages/upload-image`

### Client Addresses

- `GET /api/client/addresses`
- `POST /api/client/addresses`
- `PATCH /api/client/addresses/:id`
- `DELETE /api/client/addresses/:id`
- `POST /api/client/addresses/:id/default`

### Client Upload

- `POST /api/client/uploads/image`

## Upload Strategy

本轮上传采用本地静态文件方案，而不是对象存储直传。

流程：

- 前端通过 multipart 上传图片到 `backend`
- 后端将文件保存到本地 `uploads/` 目录
- 后端返回可访问 URL
- 业务接口保存 URL 到设计图、聊天图片或头像字段

该方案成本低，适合 MVP，本地联调简单。后续如果要切到 OSS/S3，只需要替换上传模块，不影响业务表结构。

## Message Strategy

消息系统采用 HTTP 轮询，不上 WebSocket。

原因：

- 符合 TDD 的 MVP 推荐方案
- 实现成本低
- 对当前单技师绑定场景足够

消息类型支持：

- `text`
- `image`
- `system`
- `quote`
- `booking`

首轮只做“当前客户与绑定技师的单会话消息页”，不做完整 IM 基础设施。

## Status Mapping

### Design Request Status

设计需求状态按 TDD 直接落地：

- `pending_quote`
- `quoted`
- `accepted`
- `rejected`
- `converted`
- `completed`
- `cancelled`

### Booking Status

客户端展示层遵循 TDD 的预约语义：

- `pending_quote`
- `quoted`
- `pending_deposit`
- `deposit_paid`
- `confirmed`
- `in_service`
- `completed`
- `cancelled`

考虑到现有 `Booking.status` 已有 technician MVP 语义，客户端接口层需要一层状态映射逻辑：

- 对客户端暴露统一的客户端状态文案
- 在内部兼容已有技师端状态值
- 避免旧状态直接泄漏给新客户端页面

这样可以在不大改 technician 现有代码的前提下完成新客户端接入。

## Authorization Rules

客户端所有接口必须校验以下边界：

- 当前 JWT 对应的 `clientUserId`
- 当前 client 是否已绑定目标 `techId`
- 被访问资源是否属于当前 client
- 消息是否发生在当前 client 与绑定技师的会话中

客户端不能访问：

- 其他客户的地址
- 其他客户的预约
- 其他客户的设计需求
- 非绑定技师的消息

## Integration With Existing MVP

### Admin Side

超管侧本轮不要求新增复杂页面，但新增的数据模型和预约来源不能破坏现有后台构建和运行。若超管已有预约/客户统计页读取 `Booking`，新增字段必须保持兼容。

### Technician Side

客户端预约创建后，技师端必须能够继续处理这些预约。

最小联动要求：

- 技师端订单/行程能看到客户端创建的预约
- 能看到地址、服务类型、备注、报价和定金状态等关键信息
- 技师端对预约状态的更新能反映到客户端预约列表与详情
- 技师端对设计需求或报价的后续处理，可以通过系统消息或状态变化反馈给客户端

这里的原则是“补充读取能力”，而不是重做技师端页面。

## File Shape

### New Frontend Project

新增：

- `client-frontend/package.json`
- `client-frontend/src/*`

推荐结构：

- `src/main.tsx`
- `src/App.tsx`
- `src/index.css`
- `src/contexts/AuthContext.tsx`
- `src/components/*`
- `src/layouts/*`
- `src/pages/*`
- `src/services/*`

### Backend Changes

新增模块预计包括：

- `backend/src/client-auth/*`
- `backend/src/client-home/*`
- `backend/src/client-bookings/*`
- `backend/src/client-designs/*`
- `backend/src/client-messages/*`
- `backend/src/client-addresses/*`
- `backend/src/client-upload/*`

以及：

- `backend/prisma/schema.prisma`
- 对应 migration
- 必要的 DTO、guard、decorator 与 service

## Verification Criteria

### Binding And Login

- 邀请链接能够解析 `tech_id` 与 `invite_code`
- 用户可通过手机号 + 固定验证码完成注册/登录
- 首次成功后建立绑定关系
- 已绑定用户再次打开其他技师邀请链接时不会改绑

### Home

- 首页能展示绑定技师名片
- 首页能展示作品列表
- 首页能展示最近预约摘要
- 首页的预约、设计、联系入口可正常跳转

### Booking Flow

- 客户端可以新建地址
- 客户端可以基于地址创建预约
- 预约列表和详情能看到状态、时间、地址、报价信息
- 技师端能读到客户端创建的预约核心信息

### Design Flow

- 客户端可以上传多张设计图
- 可以提交描述并生成设计需求
- 设计历史页能看到报价状态变化

### Messaging

- 客户端可以向绑定技师发送文本消息
- 客户端可以发送图片消息
- 系统消息可在聊天页显示

### Profile And Address

- 客户端可以新增、编辑、删除地址
- 可以设置默认地址
- `我的` 页面可以查看个人信息与退出登录

### Build And Test

- `client-frontend` 能成功构建
- `backend` Prisma schema 与 migration 可运行
- `backend` 相关模块测试或最小回归验证通过
- 现有 `technician-frontend` 与 `admin-frontend` 不因本轮改动而构建失败

## Risks And Mitigations

### Risk: 新客户端模型与现有 `Customer/Booking` 语义冲突

Mitigation:

- 明确 `ClientUser` 是登录身份，`Customer` 是技师侧视图实体
- 只在必要处建立弱关联，避免强行合表

### Risk: 现有 `Booking` 结构不够承载客户端预约字段

Mitigation:

- 仅做最小字段扩展
- 状态映射由 service 层处理，避免全站替换旧状态语义

### Risk: 技师端页面受新字段影响

Mitigation:

- 技师端只做最小读取补充
- 不重构技师端路由和页面结构

### Risk: 本地文件上传后续不可扩展

Mitigation:

- 将上传逻辑封装在独立模块
- 业务层只消费 URL，后续替换存储实现时不影响业务接口

## Simplicity Check

本设计遵循最小可用原则：

- 只实现一个绑定技师的单会话客户端
- 不接真实短信、不接真实支付、不接 WebSocket
- 不重建第二套预约主链路
- 不为未来扩展提前做复杂抽象

## Open Choices Resolved

以下关键选择已确认，不再留作实现时自由发挥：

- 使用独立客户端数据模型，而不是复用 `Customer` 登录
- 登录不接真实短信，使用开发态固定验证码
- 上传使用本地静态文件，而不是 OSS/S3
- 本轮范围只做 MVP 核心闭环
- 预约继续复用现有 `Booking` 主链路

