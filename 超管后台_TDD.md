# 超管后台 TDD 技术设计文档**

项目名称：独立美甲师预约管理 SaaS 系统
 模块名称：超级管理后台
 版本：V1.0
 端类型：Web Admin
 适用阶段：MVP 开发阶段

------

# **1. 技术目标**

## **1.1 系统定位**

超管后台用于平台运营人员管理整个 SaaS 系统，包括：

- 美甲师账号管理
- 客户数据管理
- 报价管理
- 预约管理
- 收入统计
- 订阅管理
- 权限管理
- 系统配置
- 操作日志

系统不承担线上支付、抽佣、分账、提现能力。

------

# **2. 整体技术架构**

## **2.1 推荐架构**

```text
Admin Web
  ↓
Admin API
  ↓
Service Layer
  ↓
Database / Cache / Object Storage
```

## **2.2 技术选型建议**

### **前端**

| **项目** | **建议**                  |
| -------- | ------------------------- |
| 框架     | React / Vue               |
| UI 框架  | Ant Design / Arco Design  |
| 状态管理 | Zustand / Pinia           |
| 请求库   | Axios                     |
| 路由     | React Router / Vue Router |

### **后端**

| **项目** | **建议**                   |
| -------- | -------------------------- |
| 服务框架 | NestJS / Spring Boot       |
| 数据库   | MySQL / PostgreSQL         |
| ORM      | Prisma / TypeORM / MyBatis |
| 鉴权     | JWT                        |
| 缓存     | Redis                      |
| 文件存储 | OSS / S3                   |
| 日志     | Winston / Logback          |

------

# **3. 核心业务边界**

## **3.1 不做的能力**

```text
不做线上支付
不做平台抽佣
不做提现
不做分账
不做资金托管
```

## **3.2 必做的能力**

```text
报价管理
预约管理
定金状态记录
预约完成后自动收入统计
美甲师订阅管理
后台权限管理
操作日志
```

------

# **4. 核心状态机设计**

## **4.1 报价状态 Quote Status**

```text
pending    待客户确认
accepted   客户已接受
expired    已过期
cancelled  已取消
```

状态流：

```text
pending → accepted
pending → expired
pending → cancelled
accepted → cancelled
```

------

## **4.2 预约状态 Booking Status**

```text
pending_confirm  待美甲师确认
confirmed        已确认
in_service       服务中
completed        已完成
cancelled        已取消
```

状态流：

```text
pending_confirm → confirmed
confirmed → in_service
in_service → completed
confirmed → completed
pending_confirm → cancelled
confirmed → cancelled
```

------

## **4.3 收入状态 Revenue Status**

```text
confirmed  已确认收入
voided     已作废
```

收入生成规则：

```text
当 booking.status = completed 时：
系统自动生成 revenue
revenue.amount = quote.price
```

------

# **5. 数据库设计**

------

# **5.1 管理员表 admin_users**

```sql
CREATE TABLE admin_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  real_name VARCHAR(64),
  email VARCHAR(128),
  phone VARCHAR(32),
  role_id BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

------

# **5.2 角色表 admin_roles**

```sql
CREATE TABLE admin_roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

------

# **5.3 权限表 admin_permissions**

```sql
CREATE TABLE admin_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  code VARCHAR(128) NOT NULL UNIQUE,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

------

# **5.4 角色权限表 admin_role_permissions**

```sql
CREATE TABLE admin_role_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_role_permission (role_id, permission_id)
);
```

------

# **5.5 美甲师表 technicians**

```sql
CREATE TABLE technicians (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(32) NOT NULL UNIQUE,
  avatar_url VARCHAR(255),
  city VARCHAR(64),
  service_area VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  invitation_code VARCHAR(64),
  invited_at DATETIME NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

状态：

```text
active    正常
disabled  禁用
pending   待启用
```

------

# **5.6 客户表 customers**

```sql
CREATE TABLE customers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  technician_id BIGINT NOT NULL,
  name VARCHAR(64) NOT NULL,
  phone VARCHAR(32),
  avatar_url VARCHAR(255),
  gender VARCHAR(16),
  birthday DATE,
  address VARCHAR(255),
  tags JSON,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_technician_id (technician_id),
  INDEX idx_phone (phone)
);
```

------

# **5.7 报价表 quotes**

```sql
CREATE TABLE quotes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  quote_no VARCHAR(64) NOT NULL UNIQUE,
  technician_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  title VARCHAR(128),
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  expired_at DATETIME NULL,
  accepted_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_technician_id (technician_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

------

# **5.8 预约表 bookings**

```sql
CREATE TABLE bookings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  booking_no VARCHAR(64) NOT NULL UNIQUE,
  quote_id BIGINT NOT NULL,
  technician_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  address VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'pending_confirm',
  is_deposit_paid BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_confirmed_at DATETIME NULL,
  confirmed_at DATETIME NULL,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancel_reason VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_quote_id (quote_id),
  INDEX idx_technician_id (technician_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status),
  INDEX idx_start_time (start_time)
);
```

------

# **5.9 收入表 revenues**

```sql
CREATE TABLE revenues (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  revenue_no VARCHAR(64) NOT NULL UNIQUE,
  booking_id BIGINT NOT NULL UNIQUE,
  quote_id BIGINT NOT NULL,
  technician_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'confirmed',
  recognized_at DATETIME NOT NULL,
  voided_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_technician_id (technician_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_recognized_at (recognized_at)
);
```

------

# **5.10 订阅套餐表 subscription_plans**

```sql
CREATE TABLE subscription_plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  billing_cycle VARCHAR(32) NOT NULL,
  max_customers INT DEFAULT NULL,
  max_monthly_bookings INT DEFAULT NULL,
  features JSON,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

billing_cycle：

```text
monthly
yearly
trial
free
```

------

# **5.11 美甲师订阅表 technician_subscriptions**

```sql
CREATE TABLE technician_subscriptions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  technician_id BIGINT NOT NULL,
  plan_id BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  started_at DATETIME NOT NULL,
  expired_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_technician_id (technician_id),
  INDEX idx_status (status),
  INDEX idx_expired_at (expired_at)
);
```

状态：

```text
trial
active
expired
cancelled
```

------

# **5.12 功能开关表 feature_flags**

```sql
CREATE TABLE feature_flags (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  feature_code VARCHAR(128) NOT NULL UNIQUE,
  feature_name VARCHAR(128) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_plans JSON,
  description VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

------

# **5.13 操作日志表 operation_logs**

```sql
CREATE TABLE operation_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  admin_user_id BIGINT NOT NULL,
  module VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64),
  target_id BIGINT,
  before_data JSON,
  after_data JSON,
  ip VARCHAR(64),
  user_agent VARCHAR(255),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_user_id (admin_user_id),
  INDEX idx_module (module),
  INDEX idx_target (target_type, target_id),
  INDEX idx_created_at (created_at)
);
```

------

# **6. 后端模块设计**

```text
admin-auth
admin-users
rbac
technicians
customers
quotes
bookings
revenues
subscriptions
dashboard
system-config
operation-logs
```

------

# **7. API 设计**

接口统一前缀：

```http
/api/admin
```

------

# **7.1 登录认证**

## **登录**

```http
POST /api/admin/auth/login
```

请求：

```json
{
  "username": "admin",
  "password": "123456"
}
```

响应：

```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "username": "admin",
    "real_name": "超级管理员",
    "permissions": []
  }
}
```

------

## **获取当前用户信息**

```http
GET /api/admin/auth/me
```

------

# **7.2 美甲师管理**

## **获取美甲师列表**

```http
GET /api/admin/technicians
```

Query：

```text
keyword
status
subscription_status
page
page_size
```

------

## **创建美甲师账号**

```http
POST /api/admin/technicians
```

请求：

```json
{
  "name": "Anna",
  "phone": "13800000000",
  "city": "上海",
  "service_area": "徐汇区、静安区"
}
```

------

## **更新美甲师状态**

```http
PATCH /api/admin/technicians/{id}/status
```

请求：

```json
{
  "status": "disabled",
  "reason": "违规操作"
}
```

------

## **查看美甲师详情**

```http
GET /api/admin/technicians/{id}
```

------

# **7.3 客户管理**

## **获取客户列表**

```http
GET /api/admin/customers
```

Query：

```text
technician_id
keyword
tag
page
page_size
```

------

## **查看客户详情**

```http
GET /api/admin/customers/{id}
```

------

# **7.4 报价管理**

## **获取报价列表**

```http
GET /api/admin/quotes
```

Query：

```text
technician_id
customer_id
status
start_date
end_date
page
page_size
```

------

## **查看报价详情**

```http
GET /api/admin/quotes/{id}
```

------

## **后台取消报价**

```http
PATCH /api/admin/quotes/{id}/cancel
```

请求：

```json
{
  "reason": "异常报价"
}
```

------

# **7.5 预约管理**

## **获取预约列表**

```http
GET /api/admin/bookings
```

Query：

```text
technician_id
customer_id
status
start_date
end_date
page
page_size
```

------

## **查看预约详情**

```http
GET /api/admin/bookings/{id}
```

------

## **强制确认预约**

```http
PATCH /api/admin/bookings/{id}/confirm
```

------

## **手动完成预约**

```http
PATCH /api/admin/bookings/{id}/complete
```

业务规则：

```text
1. booking.status 必须为 confirmed 或 in_service
2. 完成后自动生成 revenue
3. 如果 revenue 已存在，不重复生成
```

------

## **取消预约**

```http
PATCH /api/admin/bookings/{id}/cancel
```

请求：

```json
{
  "reason": "客户取消"
}
```

------

# **7.6 收入管理**

## **获取收入列表**

```http
GET /api/admin/revenues
```

Query：

```text
technician_id
customer_id
start_date
end_date
page
page_size
```

------

## **收入统计**

```http
GET /api/admin/revenues/statistics
```

响应：

```json
{
  "total_revenue": 120000,
  "monthly_revenue": 30000,
  "average_order_value": 320,
  "completed_bookings": 94
}
```

------

# **7.7 订阅管理**

## **获取套餐列表**

```http
GET /api/admin/subscription-plans
```

------

## **创建套餐**

```http
POST /api/admin/subscription-plans
```

请求：

```json
{
  "name": "Pro",
  "code": "pro",
  "price": 29,
  "billing_cycle": "monthly",
  "max_customers": null,
  "max_monthly_bookings": null,
  "features": ["customer_tags", "analytics", "unlimited_bookings"]
}
```

------

## **更新美甲师订阅**

```http
PATCH /api/admin/technicians/{id}/subscription
```

请求：

```json
{
  "plan_id": 2,
  "status": "active",
  "expired_at": "2026-05-31 23:59:59"
}
```

------

# **7.8 Dashboard**

## **获取数据看板**

```http
GET /api/admin/dashboard/overview
```

响应：

```json
{
  "technicians": {
    "total": 120,
    "active": 98,
    "paid": 36
  },
  "subscription": {
    "mrr": 1044,
    "paid_conversion_rate": 0.3
  },
  "business": {
    "quotes": 800,
    "bookings": 360,
    "conversion_rate": 0.45,
    "recorded_revenue": 128000
  }
}
```

------

# **8. 核心业务逻辑设计**

------

# **8.1 报价转预约**

触发条件：

```text
客户接受报价
客户线下支付定金
美甲师在系统中确认定金
```

系统行为：

```text
1. quote.status = accepted
2. 创建 booking
3. booking.status = pending_confirm
4. booking.is_deposit_paid = true
```

------

# **8.2 预约确认**

```text
booking.status: pending_confirm → confirmed
booking.confirmed_at = now()
```

------

# **8.3 预约完成**

```text
booking.status: confirmed / in_service → completed
booking.completed_at = now()
```

完成后执行：

```text
查询 quote.price
创建 revenue
revenue.amount = quote.price
revenue.status = confirmed
```

------

# **8.4 防重复收入生成**

必须加唯一约束：

```sql
UNIQUE KEY booking_id
```

伪代码：

```ts
async function completeBooking(bookingId: number) {
  const booking = await bookingRepo.findById(bookingId);

  if (!['confirmed', 'in_service'].includes(booking.status)) {
    throw new Error('当前预约状态不可完成');
  }

  await transaction(async () => {
    await bookingRepo.update(bookingId, {
      status: 'completed',
      completed_at: new Date()
    });

    const existingRevenue = await revenueRepo.findByBookingId(bookingId);

    if (!existingRevenue) {
      const quote = await quoteRepo.findById(booking.quote_id);

      await revenueRepo.create({
        booking_id: booking.id,
        quote_id: quote.id,
        technician_id: booking.technician_id,
        customer_id: booking.customer_id,
        amount: quote.price,
        status: 'confirmed',
        recognized_at: new Date()
      });
    }
  });
}
```

------

# **8.5 自动完成预约**

MVP 可先不做，后期通过定时任务实现。

规则：

```text
当预约结束时间超过 N 小时，且状态为 confirmed/in_service：
自动完成预约
```

推荐：

```text
N = 24 小时
```

定时任务：

```text
每小时扫描一次
```

------

# **9. 权限设计**

## **9.1 RBAC 权限模型**

```text
管理员 → 角色 → 权限
```

------

## **9.2 权限编码示例**

```text
dashboard:view

technician:view
technician:create
technician:update
technician:disable

customer:view

quote:view
quote:cancel

booking:view
booking:confirm
booking:complete
booking:cancel

revenue:view

subscription:view
subscription:update

system:config

log:view
```

------

## **9.3 订阅权限模型**

订阅权限主要作用于美甲师客户端，不直接限制超管后台。

但后台需要展示：

```text
当前套餐
功能权限
使用额度
是否过期
是否需要续费
```

------

# **10. 功能限制与额度设计**

## **10.1 套餐额度**

| **套餐** | **客户数** | **月预约数** | **数据分析** | **客户标签** |
| -------- | ---------- | ------------ | ------------ | ------------ |
| Free     | 50         | 30           | 否           | 基础         |
| Pro      | 不限       | 不限         | 是           | 是           |
| Premium  | 不限       | 不限         | 是           | 是           |

------

## **10.2 额度检查逻辑**

在美甲师客户端创建客户、创建预约时检查。

伪代码：

```ts
function checkQuota(technicianId, action) {
  const subscription = getActiveSubscription(technicianId);
  const plan = getPlan(subscription.plan_id);

  if (action === 'create_customer') {
    const count = countCustomers(technicianId);
    if (plan.max_customers !== null && count >= plan.max_customers) {
      throw new Error('客户数量已达到套餐上限');
    }
  }

  if (action === 'create_booking') {
    const count = countMonthlyBookings(technicianId);
    if (plan.max_monthly_bookings !== null && count >= plan.max_monthly_bookings) {
      throw new Error('本月预约数量已达到套餐上限');
    }
  }
}
```

------

# **11. 操作日志设计**

## **11.1 必须记录的操作**

```text
管理员登录
创建美甲师
禁用美甲师
修改订阅
取消报价
确认预约
完成预约
取消预约
修改系统配置
```

------

## **11.2 日志内容**

```json
{
  "admin_user_id": 1,
  "module": "booking",
  "action": "complete",
  "target_type": "booking",
  "target_id": 10001,
  "before_data": {},
  "after_data": {},
  "ip": "127.0.0.1"
}
```

------

# **12. Dashboard 统计口径**

## **12.1 美甲师总数**

```sql
SELECT COUNT(*) FROM technicians;
```

## **12.2 付费美甲师数**

```sql
SELECT COUNT(DISTINCT technician_id)
FROM technician_subscriptions
WHERE status = 'active';
```

## **12.3 MRR**

```sql
SELECT SUM(sp.price)
FROM technician_subscriptions ts
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE ts.status = 'active'
AND sp.billing_cycle = 'monthly';
```

## **12.4 报价数**

```sql
SELECT COUNT(*) FROM quotes;
```

## **12.5 预约数**

```sql
SELECT COUNT(*) FROM bookings;
```

## **12.6 成交率**

```text
预约数 / 报价数
```

## **12.7 收入统计**

```sql
SELECT SUM(amount)
FROM revenues
WHERE status = 'confirmed';
```

------

# **13. 前端页面设计**

## **13.1 页面路由**

```text
/login

/dashboard

/technicians
/technicians/:id

/customers
/customers/:id

/quotes
/quotes/:id

/bookings
/bookings/:id

/revenues

/subscriptions/plans
/subscriptions/users

/system/config

/admin-users
/roles
/permissions

/logs
```

------

# **13.2 通用列表能力**

所有列表页需要支持：

```text
分页
筛选
搜索
排序
导出 MVP 可延后
```

------

# **13.3 页面权限控制**

前端根据后端返回 permissions 控制菜单展示。

示例：

```json
{
  "permissions": [
    "technician:view",
    "booking:complete",
    "subscription:update"
  ]
}
```

------

# **14. 异常处理设计**

## **14.1 通用错误码**

```text
400 参数错误
401 未登录
403 无权限
404 数据不存在
409 状态冲突
500 系统错误
```

------

## **14.2 业务错误码**

```text
QUOTE_STATUS_INVALID
BOOKING_STATUS_INVALID
REVENUE_ALREADY_EXISTS
SUBSCRIPTION_EXPIRED
QUOTA_EXCEEDED
ADMIN_PERMISSION_DENIED
```

------

# **15. 安全设计**

## **15.1 登录安全**

```text
密码加密存储
JWT 有效期控制
登录失败次数限制
```

## **15.2 接口安全**

```text
所有后台接口必须登录
所有写操作必须校验权限
敏感操作必须记录日志
```

## **15.3 数据安全**

```text
手机号脱敏展示
日志不记录密码
管理员不可直接查看密码
```

------

# **16. 定时任务设计**

## **16.1 订阅过期任务**

频率：

```text
每天 00:10 执行
```

逻辑：

```text
扫描 expired_at < now()
将 active 订阅改为 expired
```

------

## **16.2 报价过期任务**

频率：

```text
每小时执行
```

逻辑：

```text
扫描 expired_at < now()
将 pending 报价改为 expired
```

------

## **16.3 预约自动完成任务**

MVP 可延后。

频率：

```text
每小时执行
```

逻辑：

```text
end_time + 24h < now()
且 status in confirmed / in_service
自动完成预约
```

------

# **17. MVP 开发范围**

## **17.1 后台必做**

```text
登录
管理员权限
美甲师管理
客户查看
报价管理
预约管理
收入统计
订阅管理
Dashboard
操作日志
```

## **17.2 后台延后**

```text
数据导出
高级风控
自动完成预约
多城市运营
复杂报表
系统通知中心
```

------

# **18. 推荐开发顺序**

## **第一阶段：基础后台**

```text
1. 登录认证
2. RBAC权限
3. 管理员账号
4. 操作日志
```

## **第二阶段：核心业务**

```text
5. 美甲师管理
6. 客户管理
7. 报价管理
8. 预约管理
9. 收入生成
```

## **第三阶段：商业化**

```text
10. 订阅套餐
11. 美甲师订阅状态
12. 功能开关
13. 使用额度
```

## **第四阶段：数据能力**

```text
14. Dashboard
15. 收入统计
16. 成交率分析
17. 客单价分析
```

------

# **19. 核心技术风险**

## **19.1 收入重复生成**

解决：

```text
revenues.booking_id 加唯一索引
完成预约逻辑放入事务
```

## **19.2 状态流混乱**

解决：

```text
统一状态机
后端强校验状态转换
```

## **19.3 订阅权限与角色权限混淆**

解决：

```text
后台管理员权限使用 RBAC
美甲师功能权限使用 Subscription + Feature Flag
```

## **19.4 报价金额被修改导致收入不准**

解决：

```text
预约生成后锁定报价
已完成后禁止修改报价金额
所有修改写入操作日志
```

------

# **20. 技术总结**

本后台系统的核心技术重点不是支付，而是：

```text
报价状态流
预约状态流
收入自动生成
订阅权限控制
后台运营管理
```

最终系统应围绕以下链路实现：

```text
报价 → 定金确认 → 预约确认 → 服务完成 → 收入入账 → 数据统计
```

这就是该项目超管后台的核心技术闭环。