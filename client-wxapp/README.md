# luanails 微信小程序

## 项目简介

luanails 是面向自由美甲师的个人商业经营系统，支持客户端和美甲师端。产品围绕客户资产、预约效率、单层推荐增长和经营分析建设，不定位为美甲交易撮合平台。

产品和开发基线：

- [产品需求文档](docs/LUANAILS-PRD.md)
- [MVP 技术方案](docs/LUANAILS-TECHNICAL-DESIGN.md)
- [MVP 开发任务与优先级](docs/PRODUCT-UPGRADE-DEVELOPMENT-PLAN.md)

## 技术栈

- 微信小程序原生开发
- JavaScript ES6+
- WXML/WXSS

## UI 设计规范

项目 UI 设计与页面优化以 [NailBook 小程序 UI 设计规范与准则](docs/UI-DESIGN-GUIDELINES.md) 为准。

后续新增或调整页面时，应优先遵循该规范中的移动端优先、标题层级、颜色系统、表单、按钮、卡片、一屏布局密度和禁用模式要求。

## 项目结构

```
client-wxapp/
├── app.js              # 应用入口
├── app.json            # 应用配置
├── app.wxss            # 全局样式
├── pages/
│   ├── role-select/    # 角色选择页
│   ├── client/         # 用户端
│   │   ├── login/      # 登录
│   │   ├── home/       # 首页
│   │   ├── works/      # 作品列表
│   │   ├── orders/     # 预约列表
│   │   └── profile/    # 个人中心
│   └── technician/     # 美甲师端
│       ├── login/      # 登录
│       ├── home/       # 首页
│       ├── orders/     # 预约管理
│       ├── customers/  # 客户管理
│       └── profile/    # 个人中心
├── services/           # API 服务
├── utils/              # 工具函数
└── docs/
    └── UI-DESIGN-GUIDELINES.md  # 项目 UI 设计规范
```

## 快速开始

1. 克隆项目
2. 打开微信开发者工具
3. 导入项目目录
4. 修改 `project.config.json` 中的 `appid` 为你的小程序 AppID
5. 在 `app.js` 中修改 `apiBaseUrl` 为你的后端地址

## 后端配置

在 `app.js` 中配置后端地址：

```javascript
globalData: {
  apiBaseUrl: 'http://your-backend-url:3000'
}
```

## 功能模块

### 用户端
- 角色选择
- 手机号登录/注册
- 邀请码绑定
- 首页（推荐作品、最近预约）
- 作品浏览
- 预约管理
- 地址管理
- 个人中心

### 美甲师端
- 手机号登录
- 首页（今日统计、日程安排和经营待办）
- 预约管理（报价、确认、完成）
- 客户资产管理
- 经营概览
- 个人中心
- 服务状态切换

## 开发说明

### API 路径

- 用户端 API：`/api/client/*`
- 美甲师端 API：`/api/technician/*`

### Token 存储

登录后 token 存储在 `wx.storage`，通过 `getApp().globalData` 全局访问。

### 角色切换

用户可以在个人中心切换身份，每次切换会加载对应角色的 token 和用户信息。

## 注意事项

1. 项目中使用占位图片，需要替换为实际图片资源
2. 部分页面需要根据实际 API 调整数据字段
3. 聊天功能需要在后端开启 Socket.IO 支持

## 许可证

MIT
