# WebSocket 消息系统设计

**日期**：2026-05-15
**状态**：设计完成，待实现

## 目标

将现有的 REST + 3 秒轮询消息系统升级为基于 Socket.IO 的实时消息系统，支持：
- 实时消息推送（替换轮询）
- 实时已读状态同步
- 输入中状态提示
- 全局在线状态显示

## 现状

- **后端**：REST API 完整（`client/messages` 和 `technician/messages` 各 4 个端点）
- **前端**：Client 和 Technician 两个前端均用 `setInterval(3s)` 轮询拉取消息
- **数据模型**：`Conversation`（clientId-techId 唯一约束）+ `Message` 模型已完善，无需改动
- **WebSocket 基础设施**：零，需从零搭建

## 方案

**单 Gateway + 双认证**：一个 `ChatGateway` 处理所有消息事件，认证中间件自动识别 ClientJWT 或 TechnicianJWT。

## 事件协议

### 客户端 → 服务端

| 事件 | 数据 | 说明 |
|------|------|------|
| `message:send` | `{ conversationId?, techId?, clientId?, messageType, content?, imageUrl?, relatedType?, relatedId? }` | 发送消息。提供 `conversationId` 发送到已有会话；提供 `techId`（客户端用）或 `clientId`（技师端用）自动创建新会话 |
| `message:read` | `{ conversationId }` | 标记会话已读 |
| `typing:start` | `{ conversationId }` | 开始输入 |
| `typing:stop` | `{ conversationId }` | 停止输入 |

### 服务端 → 客户端

| 事件 | 数据 | 说明 |
|------|------|------|
| `message:new` | `{ message, conversation }` | 新消息（完整 Message 对象 + 会话摘要） |
| `message:read` | `{ conversationId, readerType, readerId, readAt }` | 对方已读 |
| `typing:start` | `{ conversationId, userId, userType }` | 对方开始输入 |
| `typing:stop` | `{ conversationId, userId, userType }` | 对方停止输入 |
| `presence:online` | `{ userId, userType }` | 某用户上线 |
| `presence:offline` | `{ userId, userType }` | 某用户下线 |
| `presence:sync` | `{ onlineUsers: [{userId, userType}] }` | 连接后首次同步在线列表 |

### 房间机制

- 每个会话一个房间：`conversation:{conversationId}`
- 用户连接后加入自己所有会话的房间
- `presence:online/offline` 广播给**所有与该用户有会话的在线用户**（通过房间机制：遍历该用户的会话房间，向房间内其他 socket 广播）
- `presence:sync` 仅发送给**刚连接的用户自己**（包含当前所有在线用户列表）

## 后端模块结构

```
src/chat/
├── chat.gateway.ts          # WebSocket 网关（事件处理器）
├── chat.module.ts           # 模块定义
├── chat.service.ts          # 业务逻辑（消息持久化、会话管理）
├── chat.auth.guard.ts       # WebSocket 鉴权守卫（支持双JWT）
├── presence.service.ts      # 在线状态管理（内存 Map）
└── typing.service.ts        # 输入状态防抖管理
```

### 认证流程

1. 客户端连接时发送 `auth: { token: "Bearer xxx" }`
2. `ChatAuthGuard` 同时尝试 ClientJWT 和 TechnicianJWT 验证
3. 成功后挂载 `userType`（`'client'` 或 `'technician'`）和 `userId` 到 socket
4. 失败则断开连接，返回 `401 Unauthorized`

### 在线状态存储

```typescript
// presence.service.ts
// Map<userId, { userType: 'client'|'technician', connectionCount: number }>
private onlineUsers = new Map<number, UserPresence>();
```

- 连接：`connectionCount++`，若从 0→1 广播 `presence:online`
- 断开：`connectionCount--`，若从 1→0 广播 `presence:offline`
- 新用户连接后收到 `presence:sync`（当前全量在线列表）

### 与现有 REST 的关系

- REST 端点保留不删，作为 fallback
- 前端优先用 WebSocket 发消息；REST 仅在 WebSocket 断线时降级使用
- WebSocket `message:send` 复用现有 `ChatService` 逻辑写入数据库

## 前端集成

### 新增依赖

```
backend:             @nestjs/websockets @nestjs/platform-socket.io
client-frontend:     socket.io-client
technician-frontend: socket.io-client
```

### 前端模块结构（两个前端相同模式）

```
src/
├── services/socket.ts       # Socket.IO 单例连接管理
├── hooks/useSocket.ts       # 连接、断线重连、事件监听
├── hooks/usePresence.ts     # 在线状态全局 store（Context）
└── hooks/useTyping.ts       # 输入状态防抖 hook
```

### 连接与降级

- 组件挂载时连接 Socket.IO，auth 传入 JWT token
- Socket.IO 内置自动重连（指数退避）
- 断线时降级为 REST 轮询模式（保留 3 秒 `setInterval` 作为 fallback）
- 重连成功后切回 WebSocket 模式，取消轮询

### 已读状态同步

**发送方**：发送消息后显示未读 → 收到 `message:read` 事件 → 更新为已读

**接收方**：打开聊天页 → 自动 emit `message:read` + REST fallback `PATCH /messages/read`

### 输入状态

- 用户开始打字 → `typing:start`，停止 2 秒后 → `typing:stop`
- 接收方聊天页顶部显示"对方正在输入..."
- 收到 `typing:stop` 或 5 秒超时后消失

### 浏览器通知

```
新消息到达 (message:new)
    │
    ├── 用户在当前聊天页 → 直接显示，发 message:read
    │
    └── 用户不在当前聊天页
            ├── 页面可见（其他页面）→ 页面内 toast + 更新未读角标
            └── 页面不可见（后台/最小化）→ Notification API 弹通知
                └── 点击通知 → 跳转到对应聊天页
```

`Notification.requestPermission()` 在用户首次进入消息页时请求。

### 在线状态 UI

- 用户头像右下角绿色圆点表示在线
- `usePresence()` hook 提供 `isOnline(userId, userType)` 查询
- 连接时 `presence:sync` 全量加载，后续 `presence:online/offline` 增量更新

## 依赖清单

### 后端新增

```json
{
  "@nestjs/websockets": "^10.x",
  "@nestjs/platform-socket.io": "^10.x"
}
```

### 前端新增（client-frontend + technician-frontend）

```json
{
  "socket.io-client": "^4.x"
}
```

## 不做的事

- 不改 Prisma schema（Conversation + Message 模型已够用）
- 不引入 Redis（单机部署，内存 Map 足够）
- 不实现群聊（当前只有 1:1 会话）
- 不实现端到端加密
- 不删除现有 REST 端点（保留作为 fallback）
