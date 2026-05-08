# 美甲师用户端 WebApp

基于 React + TypeScript + Tailwind CSS 的移动端 WebApp，为美甲客户提供预约、设计上传、消息沟通等功能。

## 功能模块

### 1. 登录注册
- 手机号验证码登录
- 邀请链接自动绑定美甲师
- 微信登录（预留）

### 2. 首页
- 美甲师名片展示
- 今日行程预览
- 快捷操作（预约、设计、联系）
- 精选作品展示

### 3. 预约模块
- 预约列表（进行中/已完成/已取消）
- 新建预约（选择时间、地址、服务类型）
- 预约详情

### 4. 设计模块
- 设计需求列表
- 上传设计图片
- 查看报价状态

### 5. 消息模块
- 与美甲师实时聊天
- 支持文本和图片消息
- 轮询获取新消息（MVP方案）

### 6. 我的模块
- 个人信息管理
- 地址管理（增删改查、设置默认）
- 退出登录

## 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite 8
- **样式**: Tailwind CSS 4
- **路由**: React Router DOM 7
- **HTTP客户端**: Axios
- **日期处理**: Day.js

## 项目结构

```
client-frontend/
├── src/
│   ├── components/          # 公共组件
│   │   ├── MainLayout.tsx   # 主布局（含底部导航）
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx  # 认证上下文
│   ├── pages/               # 页面组件
│   │   ├── Login.tsx
│   │   ├── Home.tsx
│   │   ├── BookingList.tsx
│   │   ├── CreateBooking.tsx
│   │   ├── BookingDetail.tsx
│   │   ├── DesignList.tsx
│   │   ├── CreateDesign.tsx
│   │   ├── DesignDetail.tsx
│   │   ├── Chat.tsx
│   │   ├── Profile.tsx
│   │   ├── AddressList.tsx
│   │   └── EditAddress.tsx
│   ├── services/            # API服务
│   │   ├── api.ts           # Axios实例
│   │   ├── auth.ts
│   │   ├── home.ts
│   │   ├── booking.ts
│   │   ├── design.ts
│   │   ├── address.ts
│   │   ├── message.ts
│   │   └── upload.ts
│   ├── App.tsx              # 路由配置
│   ├── main.tsx
│   └── index.css             # Tailwind配置
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## 开发环境配置

### 1. 安装依赖

```bash
cd client-frontend
npm install
```

### 2. 配置代理

vite.config.ts 已配置代理，将 `/api` 和 `/uploads` 转发到后端服务（默认 http://localhost:3000）

### 3. 启动开发服务器

```bash
npm run dev
```

默认端口：5174

### 4. 构建生产版本

```bash
npm run build
```

## API接口

所有API请求通过 `/api/client` 前缀访问：

- `POST /api/client/auth/register-by-invite` - 邀请注册
- `POST /api/client/auth/login` - 登录
- `GET /api/client/auth/me` - 获取用户信息
- `GET /api/client/home` - 首页数据
- `GET /api/client/home/works` - 作品列表
- `GET /api/client/bookings` - 预约列表
- `POST /api/client/bookings` - 创建预约
- `GET /api/client/bookings/:id` - 预约详情
- `GET /api/client/designs` - 设计列表
- `POST /api/client/designs` - 创建设计
- `GET /api/client/designs/:id` - 设计详情
- `GET /api/client/addresses` - 地址列表
- `POST /api/client/addresses` - 创建地址
- `PATCH /api/client/addresses/:id` - 更新地址
- `DELETE /api/client/addresses/:id` - 删除地址
- `POST /api/client/addresses/:id/default` - 设置默认地址
- `GET /api/client/messages` - 消息列表
- `POST /api/client/messages` - 发送消息
- `POST /api/client/uploads/image` - 上传图片

## 设计规范

### 颜色系统
- 主色: `#FF6B8A` (粉色)
- 主色浅: `#FF8FA3`
- 主色深: `#E85A75`
- 背景: `#F8F9FA`
- 表面: `#FFFFFF`
- 文字主色: `#333333`
- 文字次要: `#666666`
- 文字辅助: `#999999`

### 移动端适配
- 使用 viewport-fit=cover 支持刘海屏
- 底部安全区域处理 (safe-area-bottom)
- 触摸目标最小 44px
- 禁用用户缩放

## 注意事项

1. MVP阶段使用HTTP轮询获取消息，后续可升级为WebSocket
2. 图片上传使用本地存储，生产环境需配置OSS/COS
3. 验证码在开发环境使用固定值 `123456`
