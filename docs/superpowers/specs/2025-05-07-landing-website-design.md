# NailBook 官网功能设计文档

## 一、项目概述

### 1.1 产品定位
NailBook 官网是面向潜在用户的品牌展示和入口引导页面，作为美甲师端和客户端的统一入口。

### 1.2 核心目标
- 品牌展示：传递产品价值主张
- 用户分流：清晰引导美甲师和客户进入对应端
- 转化提升：降低用户选择成本，快速进入使用流程

### 1.3 目标用户
| 用户类型 | 特征 | 需求 |
|---------|------|------|
| 潜在美甲师 | 独立美甲师、兼职美甲师 | 了解工具价值，快速注册使用 |
| 潜在客户 | 通过美甲师分享进入 | 明确入口，快速绑定美甲师 |

---

## 二、功能需求

### 2.1 官网首页 (Landing Page)

#### Hero 区域
- 品牌 Logo + Slogan
- 主标题："NailBook - 美甲预约管理专家"
- 副标题："连接美甲师与客户的智能预约平台"
- 双 CTA 按钮："我是美甲师" / "我是客户"

#### 功能展示区域
- 美甲师端功能卡片（3个核心功能）
- 客户端功能卡片（3个核心功能）

#### 使用流程区域
- 三步流程图示：① 绑定关系 → ② 发起预约 → ③ 享受服务

#### 底部区域
- 快速入口链接
- 版权信息

### 2.2 登录引导页 (Role Selection)

用户点击任意"登录"按钮后进入角色选择页：

**页面布局**：
- 顶部：返回按钮 + 标题"选择您的身份"
- 中部：两个大卡片选项

**选项卡片设计**：

| 卡片 | 图标 | 标题 | 描述 |
|-----|------|------|------|
| 美甲师 | 工具/日历图标 | 我是美甲师 | 管理行程、客户、订单，提升工作效率 |
| 客户 | 用户/爱心图标 | 我是美甲客户 | 预约服务、沟通款式、管理地址信息 |

**交互逻辑**：
- 点击美甲师卡片 → 跳转 `/technician-frontend/login`
- 点击客户卡片 → 跳转 `/client-frontend/login`

### 2.3 角色端登录页增强

#### 美甲师登录页 (technician-frontend)
在现有登录表单底部新增：
```
还不是美甲师？我是客户 → 跳转至 client-frontend
```

#### 客户登录页 (client-frontend)
在现有登录表单底部新增：
```
我是美甲师？去美甲师端登录 → 跳转至 technician-frontend
```

---

## 三、技术架构

### 3.1 项目结构
```
landing-frontend/           # 新建官网项目
├── src/
│   ├── pages/
│   │   ├── Home.tsx       # 官网首页
│   │   └── RoleSelect.tsx # 角色选择页
│   ├── components/
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Process.tsx
│   │   └── Footer.tsx
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 3.2 技术栈
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **样式**: Tailwind CSS
- **路由**: React Router (仅用于官网内部路由)
- **图标**: Lucide React

### 3.3 路由设计
| 路由 | 页面 | 说明 |
|-----|------|------|
| `/` | Home | 官网首页 |
| `/login` | RoleSelect | 角色选择页 |

### 3.4 跨端跳转规则
```
官网登录按钮 → /login (角色选择)
  ├─ 选择美甲师 → window.location.href = '/technician-frontend/'
  └─ 选择客户 → window.location.href = '/client-frontend/'

美甲师端 → 点击"我是客户" → window.location.href = '/client-frontend/'
客户端 → 点击"我是美甲师" → window.location.href = '/technician-frontend/'
```

---

## 四、UI/UX 设计规范

### 4.1 设计系统延续
沿用现有项目设计规范：

**颜色系统**:
```css
--color-primary: #FF6B8A;
--color-primary-light: #FF8FA3;
--color-primary-soft: #FFF0F3;
--color-bg: linear-gradient(135deg, #FFF0F3 0%, #FFF8FA 50%, #FFFFFF 100%);
```

**字体规范**:
- 标题：font-bold, tracking-tight
- 正文：text-gray-600
- 小字：text-sm, text-gray-500

**组件规范**:
- 卡片：rounded-2xl, shadow-lg, bg-white
- 按钮：rounded-full, gradient bg, shadow
- 输入框：rounded-xl, border-gray-200

### 4.2 响应式设计
- **桌面端**: 最大宽度 1200px，居中布局
- **平板端**: 自适应网格，双列变单列
- **移动端**: 单列布局，触摸友好（最小点击区域 44px）

### 4.3 动画效果
- 页面进入：fade-in + slide-up
- 卡片悬停：scale(1.02) + shadow 增强
- 按钮点击：scale(0.98) 反馈

---

## 五、组件详细设计

### 5.1 Hero 组件
```typescript
interface HeroProps {
  onTechnicianClick: () => void;
  onClientClick: () => void;
}
```
**布局**: 左右分栏（桌面）/ 上下堆叠（移动）
**内容**: Logo + 标题 + 副标题 + 双按钮

### 5.2 Features 组件
```typescript
interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface FeaturesProps {
  technicianFeatures: Feature[];
  clientFeatures: Feature[];
}
```
**布局**: 双栏网格，每栏 3 个功能卡片

### 5.3 RoleSelect 组件
```typescript
interface RoleOption {
  id: 'technician' | 'client';
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  color: string;
}
```
**布局**: 居中卡片，两个选项垂直/水平排列

---

## 六、非功能需求

### 6.1 性能要求
- 首屏加载 < 2s
- 图片懒加载
- 路由预加载

### 6.2 SEO 优化
- 合理的 HTML 语义化标签
- meta 标签配置
- 静态生成支持（可选）

### 6.3 可访问性
- 支持键盘导航
- ARIA 标签
- 颜色对比度符合 WCAG 2.1 AA 标准

---

## 七、实现范围

### MVP 必做
- [x] 官网首页（Hero + Features + Process + Footer）
- [x] 角色选择页
- [x] 美甲师端登录页角色切换入口
- [x] 客户端登录页角色切换入口
- [x] 跨端跳转逻辑

### 延后优化
- [ ] 多语言支持
- [ ] 动画效果增强
- [ ] SEO 深度优化
- [ ] 数据统计埋点

---

## 八、接口与依赖

### 8.1 外部依赖
- 无后端接口依赖（纯前端跳转）
- 依赖现有两端项目部署路径

### 8.2 配置项
```typescript
interface AppConfig {
  technicianAppUrl: string;  // '/technician-frontend/'
  clientAppUrl: string;      // '/client-frontend/'
}
```

---

## 九、验收标准

1. **功能验收**
   - [ ] 首页正常展示，双 CTA 按钮可点击
   - [ ] 点击登录进入角色选择页
   - [ ] 选择角色后正确跳转到对应端
   - [ ] 两端登录页角色切换入口可用

2. **视觉验收**
   - [ ] 与现有两端设计风格一致
   - [ ] 移动端显示正常
   - [ ] 动画效果流畅

3. **性能验收**
   - [ ] Lighthouse 性能评分 > 80
   - [ ] 首屏加载时间 < 2s

---

**文档版本**: v1.0
**创建日期**: 2025-05-07
**作者**: Claude
