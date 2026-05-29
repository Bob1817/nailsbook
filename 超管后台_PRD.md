# 超级管理后台 PRD（SaaS 运营工具）

> **版本：V2.0（基于已实现功能同步）**
> **同步日期：2026-05-29**
> **说明：本文档以项目实际已实现功能为准，与原始设计存在差异时以代码为准。**

---

## 一、产品定位

### 1.1 产品定义

面向平台运营团队的 Web 管理后台，核心职责：

- 管理美甲师（B 端用户）的注册、审核与账号
- 管理报价、预约、收入数据
- 管理订阅套餐与功能开关
- 提供数据分析与运营看板
- 控制系统规则与权限

### 1.2 产品性质

| 类型 | 说明 |
|------|------|
| SaaS 工具 | 按订阅向美甲师收费 |
| 预约管理系统 | 以订单为核心 |
| 不参与交易 | 无支付、无分账、无抽佣 |

### 1.3 系统角色与 RBAC

| 角色 | 典型权限 |
|------|---------|
| 超级管理员 | 全部权限 |
| 运营 | 用户管理 / 数据查看 |
| 财务 | 订阅管理 / 收入查看 |
| 技术 | 系统配置 / 功能开关 |

权限模型：基于角色（AdminRole）+ 细粒度权限（AdminPermission），按模块 × 操作分组管理，已实现完整 RBAC。

---

## 二、信息架构（已实现）

```
数据看板（Dashboard）
├── 业务总览
└── 业务统计数据

美甲师管理（Technicians）
├── 美甲师列表（搜索 / 状态筛选）
├── 美甲师详情
├── 创建 / 编辑美甲师
├── 账号状态管理（激活 / 停用）
└── 生成注册邀请 Key

客户管理（Customers）
├── 全平台客户列表
└── 客户详情

报价管理（Quotes）
└── 报价订单列表

预约管理（Orders / Bookings）
└── 全平台订单列表

收入管理（Revenue）
├── 收入记录列表（筛选）
├── 收入统计
└── CSV 导出

订阅管理（Subscriptions）
├── 订阅套餐 CRUD
├── 美甲师订阅状态管理
└── 变更美甲师订阅

权限管理（RBAC）
├── 角色管理（CRUD）
├── 权限列表（按模块分组）
└── 角色权限分配

邀请 Key 管理
├── 邀请 Key 列表
├── 批量生成
└── 删除未使用 Key

功能开关（Feature Flags）
├── 功能列表
├── 开关切换
└── 按订阅计划启用

美甲师申请（Artist Applications）
├── 申请列表
├── 申请详情
├── 审核通过（自动生成账号）
└── 审核拒绝

操作日志（Operation Logs）
└── 管理员操作审计记录
```

---

## 三、核心模块详情

### 3.1 认证

| 功能 | 状态 |
|------|------|
| 管理员手机号 + 密码登录 | ✅ |
| JWT 双 Token | ✅ |
| 登录频率限制（5 次/分钟）| ✅ |
| RBAC 权限校验 | ✅ |

### 3.2 数据看板（Dashboard）

| 功能 | 状态 | 备注 |
|------|------|------|
| 业务总览（美甲师数 / 客户数 / 订单数 / 收入）| ✅ | |
| 业务统计图表数据 | ✅ | |
| 趋势数据（日/周/月）| ✅ | |

### 3.3 美甲师管理

| 功能 | 状态 |
|------|------|
| 分页列表（含搜索、状态筛选）| ✅ |
| 美甲师详情 | ✅ |
| 创建美甲师账号 | ✅ |
| 编辑美甲师信息 | ✅ |
| 账号状态管理（激活 / 停用）| ✅ |
| 生成注册邀请 Key | ✅ |

### 3.4 客户管理

| 功能 | 状态 |
|------|------|
| 全平台客户列表（分页 / 搜索）| ✅ |
| 客户详情 | ✅ |

### 3.5 报价管理

| 功能 | 状态 |
|------|------|
| 待报价 / 已报价订单列表 | ✅ |
| 查看报价详情 | ✅ |

### 3.6 收入管理

| 功能 | 状态 | 备注 |
|------|------|------|
| 收入记录列表（分页 / 筛选）| ✅ | 关联已完成订单 |
| 收入统计（总额 / 本月 / 趋势）| ✅ | |
| CSV 导出 | ✅ | |
| 收入详情 | ✅ | |

### 3.7 订阅管理

| 功能 | 状态 |
|------|------|
| 订阅套餐列表 | ✅ |
| 创建 / 编辑套餐（名称、价格、周期、限制）| ✅ |
| 美甲师订阅状态列表 | ✅ |
| 变更美甲师订阅套餐 | ✅ |

### 3.8 权限管理（RBAC）

| 功能 | 状态 |
|------|------|
| 角色列表 | ✅ |
| 创建 / 编辑 / 删除角色 | ✅ |
| 权限列表（按模块分组展示）| ✅ |
| 角色权限分配 | ✅ |
| 权限校验中间件 | ✅ |

### 3.9 邀请 Key 管理

| 功能 | 状态 |
|------|------|
| Key 列表（含状态：未使用 / 已使用）| ✅ |
| 批量生成 Key | ✅ |
| 删除未使用 Key | ✅ |
| Key 与美甲师关联 | ✅ |

### 3.10 功能开关（Feature Flags）

| 功能 | 状态 |
|------|------|
| 功能列表 | ✅ |
| 开关切换（全局启用 / 禁用）| ✅ |
| 按订阅计划启用（enabledPlans 字段）| ✅ |

### 3.11 美甲师申请（Artist Applications）

> 原始 PRD 未包含此模块，实际已实现。

| 功能 | 状态 |
|------|------|
| 申请表单（公开路由，无需登录）| ✅ |
| 申请列表（admin 查看）| ✅ |
| 申请详情 | ✅ |
| 审核通过（可自动生成账号）| ✅ |
| 审核拒绝 | ✅ |

### 3.12 操作日志

| 功能 | 状态 |
|------|------|
| 管理员操作记录（模块 / 操作 / IP / 时间）| ✅ |
| 操作前后数据对比（beforeData / afterData）| ✅ |
| 列表查询 | ✅ |

---

## 四、数据模型（关键表）

| 表名 | 用途 |
|------|------|
| AdminUser | 管理员账号 |
| AdminRole | 角色定义 |
| AdminPermission | 细粒度权限 |
| AdminRolePermission | 角色权限关联 |
| TechnicianInviteKey | 注册邀请 Key |
| ArtistApplication | 美甲师入驻申请 |
| SubscriptionPlan | 订阅套餐定义 |
| TechnicianSubscription | 美甲师当前订阅 |
| FeatureFlag | 功能开关（含 enabledPlans）|
| Revenue | 收入记录（关联 Order）|
| OperationLog | 管理员操作审计 |

---

## 五、API 接口（前缀 `/api/v1/admin/`，需 Bearer Token + 权限校验）

| 模块 | 典型接口 |
|------|---------|
| 认证 | POST /auth/login · POST /auth/refresh · GET /auth/me |
| 看板 | GET /dashboard/overview · GET /dashboard/business-stats |
| 美甲师 | GET /technicians · POST /technicians · PATCH /technicians/:id/status |
| 客户 | GET /customers · GET /customers/:id |
| 收入 | GET /revenues · GET /revenues/statistics · GET /revenues/export |
| 订阅套餐 | GET /subscription-plans · POST /subscription-plans |
| 美甲师订阅 | GET /technician-subscriptions · PATCH /technician-subscriptions/technicians/:id |
| 角色 | GET /roles · POST /roles · DELETE /roles/:id |
| 权限 | GET /permissions · GET /permissions/grouped |
| 邀请 Key | GET /technician-invite-keys · POST /technician-invite-keys |
| 功能开关 | GET /feature-flags · PATCH /feature-flags/:id/toggle |
| 申请 | POST /artist-applications（公开）· GET /artist-applications · PATCH /artist-applications/:id/approve |
| 操作日志 | GET /operation-logs |

---

## 六、非功能要求

| 项目 | 状态 |
|------|------|
| RBAC 权限控制 | ✅ |
| JWT 认证 | ✅ |
| 登录频率限制 | ✅ |
| 操作审计日志 | ✅ |
| CSV 数据导出 | ✅ |
| 线上支付 | ❌ 设计决策 |
| 二次验证（2FA）| ❌ 未实现 |
| 数据备份策略 | ❌ 未实现 |

---

## 七、延后功能

| 功能 | 状态 |
|------|------|
| 超管端邮件通知 | 未实现 |
| 精细化数据报表（复购率 / 客单价）| 未实现 |
| 批量操作（批量停用美甲师等）| 未实现 |
| 管理员 2FA | 未实现 |
| 数据库定时备份 | 未实现 |
