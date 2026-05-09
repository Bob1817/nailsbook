# **一、技术架构设计**

## **1.1 总体架构**

```
[ WebApp (PWA) ]
        ↓
[ API Gateway / BFF ]
        ↓
[ Backend Service (Node.js) ]
        ↓
[ MySQL + Redis ]
        ↓
[ Third Party Services ]
（地图 / 推送）
```

------

## **1.2 技术选型（推荐）**

### **前端**

- 框架：Vue 3 / React（推荐 React + Next.js）
- UI：TailwindCSS + Headless UI
- 状态管理：Zustand / Pinia
- 地图：高德地图（中国）/ Google Maps（海外）
- PWA：Workbox

------

### **后端**

- Node.js（NestJS 推荐）
- ORM：Prisma / TypeORM
- 鉴权：JWT

------

### **数据库**

- MySQL（主库）
- Redis（缓存 + 状态）

------

### **部署**

- 前端：Vercel / CDN
- 后端：Docker + 云服务器（AWS / 阿里云）

------

# **二、前端架构设计**

## **2.1 页面结构**

```
/pages
  /dashboard
  /schedule
  /customers
  /orders
  /messages
  /profile
```

------

## **2.2 组件拆分**

### **通用组件**

```
/components
  ├── Navbar
  ├── TabBar
  ├── Card
  ├── Button
  ├── Modal
```

------

### **业务组件**

```
/components/business
  ├── OrderCard
  ├── CustomerCard
  ├── ScheduleItem
  ├── IncomeCard
```

------

## **2.3 状态管理**

```js
// 示例（Zustand）
const useOrderStore = create((set) => ({
  orders: [],
  fetchOrders: async () => {}
}));
```

------

# **三、后端设计**

------

## **3.1 模块划分**

```
/modules
  ├── auth
  ├── users
  ├── customers
  ├── orders
  ├── schedule
  ├── notifications
```

------

## **3.2 核心逻辑**

------

### **订单冲突检测**

```ts
function isConflict(newOrder, existingOrders) {
  return existingOrders.some(order => {
    return (
      newOrder.start_time < order.end_time &&
      newOrder.end_time > order.start_time
    );
  });
}
```

------

### **状态流控制**

```ts
const allowedTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress'],
  in_progress: ['completed'],
  completed: [],
};
```

------

# **四、数据库设计（可直接建表）**

------

## **4.1 users（美甲师）**

```sql
CREATE TABLE users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  phone VARCHAR(20),
  created_at DATETIME
);
```

------

## **4.2 customers**

```sql
CREATE TABLE customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  phone VARCHAR(20),
  tags JSON,
  preferences JSON,
  created_at DATETIME
);
```

------

## **4.3 orders**

```sql
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50),
  start_time DATETIME,
  end_time DATETIME,
  address TEXT,
  price DECIMAL(10,2),
  status VARCHAR(20),
  created_at DATETIME,
  INDEX idx_time (start_time, end_time)
);
```

------

## **4.4 services（服务配置）**

```sql
CREATE TABLE services (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  price DECIMAL(10,2)
);
```

------

# **五、API设计（完整）**

------

## **5.1 认证**

### **登录**

```
POST /auth/login
```

返回：

```json
{
  "token": "jwt_token"
}
```

------

## **5.2 客户**

### **获取客户列表**

```
GET /customers
```

------

### **创建客户**

```
POST /customers
```

------

## **5.3 订单**

------

### **获取订单列表**

```
GET /orders?date=YYYY-MM-DD
```

------

### **创建订单**

```
POST /orders
```

请求体：

```json
{
  "customer_id": "xxx",
  "start_time": "2026-04-28 14:00",
  "end_time": "2026-04-28 16:00",
  "address": "xxx",
  "price": 300
}
```

------

### **更新订单状态**

```
PATCH /orders/{id}/status
```

------

# **六、关键业务逻辑**

------

## **6.1 行程生成**

逻辑：

1. 获取当天订单
2. 按时间排序
3. 显示列表

------

## **6.2 收入统计**

```sql
SELECT SUM(price)
FROM orders
WHERE status = 'completed'
AND DATE(start_time) = CURDATE();
```

------

## **6.3 通知系统（MVP）**

触发：

- 新订单
- 提前1小时提醒

------

# **七、安全设计**

------

## **鉴权**

- JWT
- Token过期机制

------

## **数据安全**

- HTTPS
- 参数校验（DTO）

------

# **八、性能优化**

------

## **前端**

- 懒加载
- PWA缓存

------

## **后端**

- Redis缓存订单列表
- 数据库索引优化

------

# **九、部署方案**

------

## **前端**

```
Vercel / CDN
```

------

## **后端**

```
Docker + Node
```

------

## **数据库**

```
云数据库（RDS）
```

------

# **十、开发排期建议**

------

## **第1阶段（1-2周）**

- 用户 / 客户 / 订单 CRUD
- 首页 / 行程页面

------

## **第2阶段（2周）**

- 冲突检测
- 状态流
- 收入统计

------

## **第3阶段（优化）**

- 地图
- 通知
- PWA

