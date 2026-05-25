# NailBook 微信小程序

## 项目简介

NailBook 微信小程序，支持用户端和美甲师端，通过角色切换使用不同功能。

## 技术栈

- 微信小程序原生开发
- JavaScript ES6+
- WXML/WXSS

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
│   │   ├── orders/     # 订单列表
│   │   └── profile/    # 个人中心
│   └── technician/     # 美甲师端
│       ├── login/      # 登录
│       ├── home/       # 首页
│       ├── orders/     # 订单管理
│       ├── customers/  # 客户管理
│       └── profile/    # 个人中心
├── services/           # API 服务
└── utils/              # 工具函数
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
- 订单管理
- 地址管理
- 个人中心

### 美甲师端
- 手机号登录
- 首页（今日统计、日程安排）
- 订单管理（报价、确认、完成）
- 客户管理
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
