

# 美甲客户用户端 TDD 文档**

## **WebApp｜客户预约与沟通客户端**

------

# **1. 项目概述**

## **1.1 系统定位**

美甲客户用户端是面向美甲师私域客户的移动端 WebApp。

客户通过美甲师分享的名片链接进入系统，完成注册后自动绑定该美甲师，并可在客户端完成：

- 查看美甲师作品
- 发起预约
- 上传美甲设计图
- 等待美甲师报价
- 与美甲师沟通
- 管理上门服务地址
- 查看自己的预约订单

补充能力：

- 非邀请链接注册时输入邀请码完成注册
- 已注册用户在【我的】页面新增绑定新的美甲师
- 预约时从已绑定美甲师中选择预约对象

------

# **2. 技术目标**

## **2.1 核心目标**

- 支持移动端 WebApp 访问
- 支持分享链接注册并绑定美甲师
- 支持非邀请链接输入邀请码注册并绑定美甲师
- 支持已注册用户新增绑定多个美甲师
- 支持预约、设计、报价、消息、地址管理
- 与美甲师客户端形成业务闭环
- MVP 阶段不实现线上支付，仅记录定金与确认状态

------

# **3. 技术架构**

## **3.1 推荐技术栈**

### **前端**

| **模块**    | **技术**                       |
| ----------- | ------------------------------ |
| 框架        | Vue 3 / React                  |
| 构建工具    | Vite                           |
| UI          | Tailwind CSS / Vant / 自研组件 |
| 状态管理    | Pinia / Zustand                |
| 请求库      | Axios / Fetch                  |
| 路由        | Vue Router / React Router      |
| 图片上传    | OSS / S3 / COS                 |
| WebApp 适配 | PWA 可选                       |

------

### **后端**

| **模块** | **技术**                          |
| -------- | --------------------------------- |
| 服务框架 | Node.js NestJS / Java Spring Boot |
| 数据库   | MySQL / PostgreSQL                |
| 缓存     | Redis                             |
| 文件存储 | 阿里云 OSS / 腾讯 COS / AWS S3    |
| 消息     | WebSocket / Socket.IO / 第三方 IM |
| 鉴权     | JWT                               |
| 部署     | Docker + Nginx                    |

------

# **4. 系统角色**

## **4.1 客户用户**

客户通过美甲师分享链接注册。

权限：

- 查看绑定美甲师信息
- 查看绑定美甲师作品
- 查看已绑定美甲师列表
- 创建预约
- 上传设计
- 查看报价
- 与绑定美甲师聊天
- 管理自己的地址

------

## **4.2 美甲师**

美甲师在美甲师客户端处理客户请求。

权限：

- 查看客户预约
- 给设计或预约报价
- 确认预约
- 修改订单状态
- 与客户沟通

------

# **5. 绑定机制设计**

## **5.1 分享链接格式**

```txt
https://app.xxx.com/invite?tech_id=TECH_ID&invite_code=CODE
```

------

## **5.2 绑定流程**

```txt
客户点击链接或直接打开客户端
→ 若有邀请链接则解析 tech_id / invite_code
→ 若无邀请链接则要求输入邀请码
→ 判断客户是否登录
→ 未登录则注册 / 登录
→ 首次注册要求填写姓名
→ 注册成功后写入绑定关系
→ 进入对应美甲师主页
```

------

## **5.3 绑定规则**

| **规则**     | **说明**                           |
| ------------ | ---------------------------------- |
| 绑定方式     | 必须通过邀请链接或邀请码绑定       |
| MVP 阶段     | 一个客户可绑定多个美甲师           |
| 已绑定客户   | 再次打开其他美甲师链接时新增绑定，不自动覆盖已有绑定 |
| 预约选择     | 用户预约时必须从已绑定美甲师中选择 |
| 邀请码失效   | 提示链接无效                       |
| 美甲师被禁用 | 提示该美甲师暂不可预约             |
| 解除绑定     | 由美甲师端解除，客户端展示解除结果 |

------

# **6. 数据库设计**

## **6.1 客户用户表：client_users**

```sql
CREATE TABLE client_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  real_name VARCHAR(64),
  nickname VARCHAR(64),
  phone VARCHAR(32) NOT NULL UNIQUE,
  avatar_url VARCHAR(255),
  status TINYINT DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME
);
```

------

## **6.2 客户与美甲师绑定表：client_tech_bindings**

```sql
CREATE TABLE client_tech_bindings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  client_id BIGINT NOT NULL,
  tech_id BIGINT NOT NULL,
  invite_code VARCHAR(64),
  bind_source VARCHAR(32),
  status VARCHAR(32) DEFAULT 'active',
  is_default TINYINT DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE KEY uk_client_tech (client_id, tech_id)
);
```

------

## **6.3 地址表：client_addresses**

```sql
CREATE TABLE client_addresses (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  client_id BIGINT NOT NULL,
  contact_name VARCHAR(64),
  contact_phone VARCHAR(32),
  province VARCHAR(64),
  city VARCHAR(64),
  district VARCHAR(64),
  detail_address VARCHAR(255),
  door_info VARCHAR(255),
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  is_default TINYINT DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
);
```

------

## **6.4 美甲作品表：nail_works**

```sql
CREATE TABLE nail_works (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tech_id BIGINT NOT NULL,
  title VARCHAR(100),
  cover_url VARCHAR(255),
  images JSON,
  description TEXT,
  tags JSON,
  is_visible TINYINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME,
  updated_at DATETIME
);
```

------

## **6.5 设计需求表：client_design_requests**

```sql
CREATE TABLE client_design_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  client_id BIGINT NOT NULL,
  tech_id BIGINT NOT NULL,
  title VARCHAR(100),
  images JSON,
  description TEXT,
  quote_price DECIMAL(10,2),
  quote_remark TEXT,
  status VARCHAR(32),
  created_at DATETIME,
  updated_at DATETIME
);
```

状态：

```txt
pending_quote   待报价
quoted          已报价
accepted        已接受
rejected        已拒绝
converted       已转预约
cancelled       已取消
```

------

## **6.6 预约订单表：bookings**

```sql
CREATE TABLE bookings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  client_id BIGINT NOT NULL,
  tech_id BIGINT NOT NULL,
  design_request_id BIGINT NULL,
  address_id BIGINT,
  service_date DATE,
  start_time TIME,
  end_time TIME,
  service_type VARCHAR(64),
  remark TEXT,
  quote_price DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_status VARCHAR(32),
  status VARCHAR(32),
  created_at DATETIME,
  updated_at DATETIME
);
```

预约状态：

```txt
pending_quote      待报价
quoted             已报价
pending_deposit    待付定金
deposit_paid       已支付定金
confirmed          已预约
in_service         服务中
completed          已完成
cancelled          已取消
```

------

## **6.7 消息表：messages**

```sql
CREATE TABLE messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  conversation_id BIGINT NOT NULL,
  sender_type VARCHAR(32),
  sender_id BIGINT,
  receiver_type VARCHAR(32),
  receiver_id BIGINT,
  message_type VARCHAR(32),
  content TEXT,
  image_url VARCHAR(255),
  related_type VARCHAR(32),
  related_id BIGINT,
  is_read TINYINT DEFAULT 0,
  created_at DATETIME
);
```

------

## **6.8 会话表：conversations**

```sql
CREATE TABLE conversations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  client_id BIGINT NOT NULL,
  tech_id BIGINT NOT NULL,
  last_message TEXT,
  last_message_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  UNIQUE KEY uk_client_tech (client_id, tech_id)
);
```

------

# **7. 前端页面设计**

## **7.1 页面路由**

```txt
/invite
/login
/register
/home
/works
/works/:id
/bookings
/bookings/create
/bookings/:id
/design/create
/designs
/designs/:id
/chat
/profile
/profile/address
/profile/address/edit
/profile/technicians
```

------

# **8. 核心接口设计**

## **8.1 注册并绑定美甲师**

```http
POST /api/client/auth/register-by-invite
```

请求：

```json
{
  "real_name": "小美",
  "phone": "13800000000",
  "code": "123456",
  "tech_id": 10001,
  "invite_code": "abc123"
}
```

返回：

```json
{
  "token": "jwt_token",
  "client": {
    "id": 1,
    "nickname": "小美"
  },
  "tech": {
    "id": 10001,
    "name": "Anna"
  }
}
```

------

## **8.1.1 根据邀请码查询美甲师**

```http
GET /api/client/auth/find-by-invite-code?code=abc123
```

返回：

```json
{
  "id": 10001,
  "name": "Anna",
  "avatar_url": "",
  "bio": "独立上门美甲师",
  "service_area": "东京新宿区"
}
```

------

## **8.1.2 已注册用户新增绑定美甲师**

```http
POST /api/client/auth/bind-technician
```

请求：

```json
{
  "invite_code": "abc123"
}
```

规则：

- 只能通过邀请码绑定
- 若已绑定该美甲师，则提示无需重复绑定
- 若美甲师已禁用，则禁止绑定

------

## **8.2 获取绑定美甲师主页**

```http
GET /api/client/home
```

返回：

```json
{
  "tech": {
    "id": 10001,
    "name": "Anna",
    "avatar_url": "",
    "bio": "独立上门美甲师",
    "service_area": "东京新宿区"
  },
  "works": [],
  "latest_booking": {}
}
```

------

## **8.3 获取作品列表**

```http
GET /api/client/works
```

要求：

- 作品详情返回中需包含所属美甲师名称
- 客户端点击作品详情时展示对应美甲师名称与基础信息

------

## **8.4 创建预约**

```http
POST /api/client/bookings
```

请求：

```json
{
  "tech_id": 10001,
  "service_date": "2026-05-01",
  "start_time": "14:00",
  "address_id": 12,
  "service_type": "手部美甲",
  "remark": "想做粉色渐变"
}
```

规则：

- `tech_id` 必须属于当前用户已绑定的美甲师
- 如果无地址，则前端必须先引导新增地址
- 如果已有地址，则允许从地址簿选择

------

## **8.5 上传设计需求**

```http
POST /api/client/designs
```

请求：

```json
{
  "images": ["https://cdn.xxx.com/1.jpg"],
  "description": "想做类似图片的猫眼款式"
}
```

------

## **8.6 获取消息列表**

```http
GET /api/client/messages?conversation_id=1
```

返回中应包含当前会话对应美甲师信息，供消息列表展示。

------

## **8.7 发送消息**

```http
POST /api/client/messages
```

请求：

```json
{
  "conversation_id": 1,
  "message_type": "text",
  "content": "这个款式大概多少钱？"
}
```

------

# **9. 状态机设计**

## **9.1 设计需求状态流**

```txt
待报价
→ 已报价
→ 用户接受
→ 转为预约
→ 完成
```

------

## **9.2 预约订单状态流**

```txt
待报价
→ 已报价
→ 待付定金
→ 定金已支付
→ 美甲师确认
→ 已预约
→ 服务中
→ 已完成
```

MVP 阶段定金不做支付，只做状态标记：

```txt
客户线下支付定金
→ 美甲师手动标记已收定金
→ 美甲师确认预约
```

------

# **10. 消息系统设计**

## **10.1 MVP 推荐方案**

优先使用：

```txt
HTTP 轮询 + 消息表
```

适合 MVP，开发成本低。



后续升级：

```txt
WebSocket / Socket.IO / 第三方 IM
```

------

## **10.2 消息类型**

```txt
text       文本
image      图片
system     系统消息
quote      报价消息
booking    预约消息
```

------

# **11. 文件上传设计**

## **11.1 上传内容**

- 用户头像
- 美甲设计图
- 聊天图片
- 美甲作品图片

------

## **11.2 上传流程**

```txt
前端请求上传凭证
→ 后端生成临时上传 Token
→ 前端直传 OSS / COS / S3
→ 返回图片 URL
→ 业务接口保存 URL
```

------

# **12. 鉴权设计**

## **12.1 登录方式**

MVP 推荐：

```txt
手机号 + 验证码 + 邀请码（首次注册或新增绑定时）
```

------

## **12.2 Token**

使用 JWT。

Header：

```http
Authorization: Bearer <token>
```

------

## **12.3 权限校验**

所有客户端接口必须校验：

```txt
当前 client_id 是否绑定当前 tech_id
当前资源是否属于该 client_id
```

扩展要求：

- 预约创建时校验 `tech_id` 是否属于当前用户绑定列表
- 消息列表和作品详情返回中要带上关联美甲师基础信息
- 绑定新增时仅允许通过邀请码完成

------

# **13. 安全设计**

## **13.1 防越权**

客户只能访问：

- 自己的预约
- 自己的设计
- 自己的地址
- 自己与绑定美甲师的消息

------

## **13.2 防刷**

- 短信验证码限频
- 登录失败限频
- 上传图片大小限制
- 消息发送频率限制

------

# **14. 性能要求**

| **指标**     | **要求**               |
| ------------ | ---------------------- |
| 首屏加载     | ≤ 2.5 秒               |
| 接口响应     | ≤ 500ms                |
| 图片懒加载   | 必须支持               |
| 移动端适配   | iPhone / Android       |
| WebView 兼容 | 微信 / Safari / Chrome |

------

# **15. 部署架构**

```txt
用户浏览器
→ CDN
→ Nginx
→ WebApp 静态资源

用户请求 API
→ API Gateway / Nginx
→ Backend Service
→ MySQL / Redis / OSS
```

------

# **16. MVP 开发优先级**

## **P0 必做**

- 邀请链接注册绑定
- 登录 / 注册
- 首页
- 美甲师作品展示
- 新建预约
- 预约列表 / 详情
- 设计上传
- 地址管理
- 基础消息
- 客户与美甲师绑定关系

------

## **P1 次优先**

- 报价消息卡片
- 预约状态通知
- 图片消息
- 默认地址
- 作品详情页
- 订单取消

------

## **P2 后续**

- 收藏作品
- AI 设计
- WebSocket 实时聊天
- 多美甲师绑定
- 线上支付
- 优惠券 / 会员卡

------

# **17. 推荐开发顺序**

```txt
1. 数据库表结构
2. 鉴权与注册绑定
3. 首页与美甲师信息
4. 作品模块
5. 地址模块
6. 预约模块
7. 设计上传模块
8. 消息模块
9. 状态通知
10. 联调美甲师客户端
```

------

# **18. 关键风险**

## **18.1 绑定关系风险**

必须确保客户从分享链接注册后，准确绑定对应美甲师。

## **18.2 预约确认风险**

客户提交预约不等于预约成功，必须经过：

```txt
报价 → 定金确认 → 美甲师确认
```

## **18.3 支付边界风险**

MVP 不做支付能力，只做定金状态记录，避免交易平台化。

## **18.4 消息实时性风险**

MVP 可用轮询，后续如沟通频率增加，再升级 WebSocket。

------

# **19. 总结**

该客户端的技术核心不是复杂交易系统，而是围绕美甲师私域客户建立一套轻量闭环：

```txt
分享链接获客
→ 注册绑定
→ 浏览作品
→ 提交预约 / 设计
→ 报价沟通
→ 美甲师确认
→ 上门服务
→ 完成记录
```

MVP 阶段应优先保证：

```txt
绑定准确
预约可用
沟通顺畅
地址清晰
状态闭环
```
