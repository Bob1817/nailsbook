# NailBook - 美甲师预约管理 SaaS 系统

## 项目概述

这是一个面向独立美甲师的预约与客户管理 SaaS 系统的后台管理平台。

## 项目结构

```
nailBook/
├── backend/           # NestJS 后端服务
│   ├── src/          # 源代码
│   ├── prisma/       # Prisma ORM 配置
│   └── package.json
├── admin-frontend/    # React + Ant Design 前端管理后台
│   ├── src/          # 源代码
│   └── package.json
├── .trae/            # Trae 项目配置
├── 超管后台_PRD.md   # 超管后台需求文档
├── 超管后台_TDD.md   # 超管后台技术文档
└── CLAUDE.md        # 项目规范
```

## 技术栈

### 后端
- **框架**: NestJS 10.x
- **ORM**: Prisma
- **数据库**: SQLite (开发) / MySQL/PostgreSQL (生产)
- **认证**: JWT
- **语言**: TypeScript

### 前端
- **框架**: React 18 + TypeScript
- **UI**: Ant Design
- **路由**: React Router
- **图表**: ECharts
- **构建**: Vite

## 快速开始

### 后端启动

```bash
cd backend
npm install
npm run start:dev
```

后端服务运行在 `http://localhost:3000`

### 前端启动

```bash
cd admin-frontend
npm install
npm run dev
```

前端服务运行在 `http://localhost:5173`

## 功能模块

- ✅ 登录认证
- ✅ RBAC 权限管理
- ✅ 美甲师管理
- ✅ 客户管理
- ✅ 报价管理
- ✅ 预约管理
- ✅ 收入管理
- ✅ 订阅管理
- ✅ Dashboard 数据看板
- ✅ 操作日志

## 默认账号

```
用户名: admin
密码: 123456
```

## 开发流程

1. 后端开发: `cd backend && npm run start:dev`
2. 前端开发: `cd admin-frontend && npm run dev`
3. 数据库迁移: `cd backend && npx prisma migrate dev`

## 核心业务流程

```
报价 → 定金确认 → 预约确认 → 服务完成 → 收入自动沉淀
```

## 相关文档

- [超管后台 PRD](超管后台_PRD.md) - 产品需求文档
- [超管后台 TDD](超管后台_TDD.md) - 技术设计文档
- [CLAUDE.md](CLAUDE.md) - 项目规范
