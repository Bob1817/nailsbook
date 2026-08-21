# P0-01 页面、接口、模型与 PRD 映射

## 1. 核心能力映射

| PRD 能力 | 当前页面 | 当前接口/服务 | 当前模型 | 处理决定 | 主要差距 |
|---|---|---|---|---|---|
| 专业品牌主页 | `client/artist-home`、`technician/homepage-settings` | `public/artist`、`technician/auth/profile` | `Technician` | 改造 | 品牌、保障、环境、规则、FAQ 均未结构化 |
| 服务与价格 | `technician/services`、`client/create-order` | `technician/services` | `Technician.serviceItems` JSON | 改造并迁移 | 缺少正式 Service 实体、归档和可靠关联 |
| 作品资产库 | `client/works`、`client/work-detail`、`technician/works`、`technician/work-edit` | `public/works`、`client/works`、`technician/works` | `NailWork`、访问/分享/互动模型 | 保留并改造 | 缺少统一授权、案例关联、内容任务与细分标签 |
| 咨询线索 | `client/chat`、`technician/chat`、定制需求页面 | 消息、定制需求接口 | `Conversation`、`CustomServiceRequest`、`ClientDesignRequest` | 新增并合并入口 | 没有 Lead、状态机、跟进与未成交原因 |
| 预约申请 | `client/create-order`、`client/order-detail` | `client/orders` | `Order` | 改造 | 申请/正式预约语义不够清晰，期望时段字段不足 |
| 预约经营 | `technician/orders`、`schedule`、`all-bookings`、`all-itineraries` | `technician/orders` | `Order`、`BlockedTimeSlot`、`OrderReminder` | 保留、改造、合并 | 多入口重复，状态需映射 PRD，服务结果不足 |
| 客户档案 | `technician/customers`、`customer-detail` | `technician/customers` | `Customer`、`CustomerFollowUp` | 保留并改造 | 缺少偏好、健康提醒、阶段、复购和完整时间线 |
| 评价 | 客户订单详情、反馈页面 | 订单评价相关接口 | `ServiceReview` | 改造 | 缺少审核、匿名、回复、邀请 token 与统一授权 |
| 今日行动中心 | `technician/home` | 多接口前端聚合 | Order、FollowUp 等 | 改造 | 缺少统一任务实体、完成/忽略/稍后与去重 |
| 经营数据 | `technician/business-data` | `technician/insights/overview` | Revenue、Order、Customer、ConversionEvent | 保留并扩展 | 漏斗、渠道、复购、成本口径需统一且可下钻 |
| 渠道归因 | 公开主页、作品、预约入口 | `public/conversion-events` | `ConversionEvent`、分享事件 | 保留并扩展 | 事件类型有限，尚未贯通 Lead/Order/Revenue |
| 转介绍 | `client/referrals`、`technician/referral-campaign` | referrals 接口 | Referral、RewardAccount/Ledger | P1 保留 | 当前复杂度高于首阶段核心闭环 |
| 数据导出 | 经营数据页面 | revenue/export 等 | `DataExportAudit` | P1 改造 | 导出范围和敏感字段策略需统一 |

## 2. 页面处理清单

### 保留

- 客户端登录、订单列表和订单详情；
- 美甲师登录；
- 客户列表和客户详情；
- 预约日历、预约列表和预约详情；
- 作品列表、作品编辑和作品详情；
- 服务项目管理；
- 经营数据页面；
- 账户安全、帮助反馈和关于页面。

### 改造

- `pages/client/artist-home`：升级为可信专业主页；
- `pages/client/works`、`work-detail`、`public-work`：升级为公开案例资产；
- `pages/client/create-order`：改成“申请 + 人工确认”；
- `pages/technician/home`：改成真实行动中心；
- `pages/technician/customer-detail`：增加时间线、偏好、健康提醒和复购；
- `pages/technician/homepage-settings`：增加品牌、环境、保障、规则和 FAQ；
- `pages/technician/services`：迁移到结构化服务；
- `pages/technician/business-data`：统一指标并支持明细追溯。

### 合并

- `all-bookings`、`all-itineraries` 合入统一预约模块；
- `design-requests` 和定制服务需求合入线索/预约意向；
- `profile-settings`、`homepage-settings`、`home-service-settings`、`shop-management` 归入“我的经营”；
- 聊天仅作为线索跟进补充，不作为经营主入口。

### 隐藏

- AI 试甲和 AI 图片；
- 点赞、收藏、评论等社区化主入口；
- 订阅套餐；
- 多美甲师绑定和绑定申请；
- 复杂营销素材和奖励基金；
- 店铺化管理；
- 平台型注册、游客美甲师和通用角色选择入口。

### 删除候选

本阶段不物理删除代码或数据。待 8–12 周验证后，再评估长期无人使用且维护成本高的 AI、社区、订阅和平台化模块。

## 3. 数据模型处理清单

### 直接复用

- `Technician`：暂作为 owner 和旧品牌资料来源；
- `Customer`；
- `Order`；
- `NailWork`；
- `ServiceReview`；
- `Revenue`；
- `ConversionEvent`；
- `BlockedTimeSlot`；
- 现有推荐模型。

### 需要迁移或扩展

- `Technician.serviceItems` JSON → 正式 `Service`；
- `Technician.shopAddresses`、`serviceSchedule`、`socialMedia` → 明确经营配置与公开 DTO；
- `NailWork` → 案例关系、授权、内容状态和结构化标签；
- `Order` → 线索、服务记录、金额、取消/爽约与维护日期；
- `Customer` → 偏好、健康提醒、阶段和复购；
- `ServiceReview` → 审核、公开身份、回复与邀请。

### 需要新增

- `BrandProfile` / 品牌规则和 FAQ；
- `Service`；
- `Lead` 与线索状态历史；
- `ServiceRecord`；
- `Consent`；
- `FollowUpTask`；
- `ContentTask`。

## 4. 公开接口敏感字段检查

### 高风险

1. `public/artist` 返回完整 `shopAddresses`。如果其中包含门牌号、经纬度或私人住宅地址，会违反“确认预约前只公开大致区域”的要求。
2. `public/works/:id` 返回评论客户的稳定数据库 ID、昵称和头像；当前没有评价/评论公开授权模型。
3. `NailWorkShareGrant.token` 以明文保存。数据库泄漏时，未过期 token 可以直接用于访问授权作品；后续应只存 token 哈希。

### 中风险

1. `public/artist` 返回完整 `serviceSchedule`，可能暴露不必要的私人工作安排。
2. `public/artist` 返回完整 `socialMedia`，需要字段级控制，不能直接透传任意后台 JSON。
3. `public/artist` 返回 `invitationCode`，公开展示不一定必要，且该值同时参与客户绑定流程。
4. `public/artist` 返回 `bookingReadinessIssues`，可能暴露内部配置缺失原因。
5. `public/works/shared/:token` 只要求作品 `isVisible`，没有要求作品仍为已审核公开；这是授权分享的合理例外还是越权边界，需要明确产品规则。
6. 转化事件端点允许匿名写入，DTO 有长度和枚举校验，但需确认全局限流是否覆盖该公开端点。

### 已有正向控制

- 公开作品流要求美甲师 active、作品 visible、public 且 approved；
- 公开作品返回对象大部分为手工映射，没有直接返回完整 Prisma 对象；
- 转化事件限制事件类型、来源格式和字段长度，并使用 eventId 幂等；
- 推荐公开解析明确不返回推荐人身份；
- 微信公开能力接口仅返回能力状态，不回显敏感配置。

### P0 后续修复要求

- 所有公开接口使用独立 DTO/mapper；
- 地址只返回城市和大致区域；
- 社交联系方式采用允许列表；
- 不返回内部 readiness issue；
- 客户公开身份必须基于明确授权，默认匿名；
- 分享 token 改为数据库仅存哈希；
- 为公开表单和事件配置明确限流测试。
