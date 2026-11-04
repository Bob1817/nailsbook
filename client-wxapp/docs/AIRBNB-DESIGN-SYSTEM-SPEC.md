# OnlyNail (NailBook) Airbnb 设计风格全项目规范与组件标准

> **版本**：2.0.0 (全项目全量覆盖版)  
> **更新日期**：2026-10-26  
> **适用范围**：微信小程序 `client-wxapp/` 全量 79 个页面（主包 5 个、分包 74 个）及通用组件库  
> **基准约束**：严格遵循 `design-system/nailbook/COLOR-STANDARD.md` 中性色体系与 `AGENTS.md` 移动端优先原则  
> **核心原则**：**功能完全保真（零业务逻辑变更），仅对页面设计风格、骨架层级和视觉规范使用 Airbnb 风格进行全面升级改造。**

---

## 一、 产品定位与 Airbnb 设计哲学

OnlyNail 是一个连接“追求品质与个性的年轻爱美女性客户”与“独立手艺人/工作室主理人美甲师”的移动端平台。

### 1.1 设计语言核心准则 (The Airbnb Way)

1. **中性底色，作品发光 (Content is the Hero)**：
   - Airbnb 的精髓在于把页面背景与框架克制到极致，让房源图片主导视觉；
   - 在 OnlyNail 中，**真实美甲实景照片、手艺人艺术做工**是唯一的主角。UI 框架绝不使用花哨、高饱和的装饰性粉红、粉紫色渐变抢夺视线，全量采用中性白、浅灰、石墨黑构建高质感画布。
2. **纯白微边框卡片 (Pure-White Structured Cards)**：
   - 告别扁平无结构或重投影的大色块；
   - 统一采用纯白卡片表面（`background: var(--nb-surface)`）、细中性微边框（`border: 1rpx solid var(--nb-line)`）与极轻柔悬浮微阴影（`box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04)`），呈现明澈轻盈的呼吸感。
3. **Photo-First 影像画廊 (大图优先视觉体系)**：
   - 瀑布流封面、工作室环境相册、美甲记录过程图，统一采用高质感圆角（`16rpx ~ 24rpx`）与精准宽高比（1:1 正方形或 4:3 画幅），配合渐进式 CDN 缩放与骨架屏，达到杂志级排版质感。
4. **极简胶囊药丸交互 (Pill Chips & Filter Triggers)**：
   - 分类标签、状态指示、筛选器统一采用 `border-radius: 9999rpx` 全圆角胶囊药丸；
   - 选中态为石墨黑底反白字（`background: var(--nb-action); color: var(--nb-inverse)`），未选态为柔和浅灰底（`background: var(--nb-page)`）。
5. **严苛的移动端触控底线 (Touch-Friendly by Default)**：
   - 每一个可交互控件（按钮、输入框、选择器、勾选框、卡片整行）触控热区严格保证 $\ge 44$px（88rpx）；
   - 严禁低于 44px 的可点击元素，彻底消除移动端误触。
6. **吸底浮动操作栏 (Floating Action Dock)**：
   - 页面主操作固定悬浮吸附于底部，上沿带有细腻微边框或微阴影；
   - 必须严格叠加 `calc(var(--space-md) + env(safe-area-inset-bottom))`，确保全面屏 Home Bar 避让。
7. **三按钮上限与抽屉折叠 (Max 3 Actions with More Drawer)**：
   - 单屏或卡片底部并列按钮最多展示 3 个；
   - 超过 3 个时，第 3 个固定为【更多】按钮，点击唤起半屏抽屉面板（Half-sheet Modal），次要与辅助操作收进抽屉。

---

## 二、 统一色彩与排版设计令牌 (Design Tokens)

### 2.1 颜色系统（严格中性调色盘）

| 变量 Token | 颜色值 | 语义定位 | 适用元素 |
| :--- | :--- | :--- | :--- |
| `--nb-page` | `#F5F5F7` | 页面背景色 | 小程序 `page` 根节点、大背景 |
| `--nb-surface` | `#FFFFFF` | 纯白卡片表面 | 所有 Airbnb 卡片、弹窗面板、导航栏 |
| `--nb-pressed` | `#ECECEF` | 按压反馈底色 | 卡片与按钮 `:active` 状态反馈 |
| `--nb-ink` | `#1D1D1F` | 主正文/主标题 | 页面一级大标题、卡片主要文字、关键数值 |
| `--nb-secondary` | `#48484D` | 二级文本/标签 | 辅助说明、字段标签、次级信息 |
| `--nb-muted` | `#6E6E73` | 弱化/占位符 | 输入框 Placeholder、时间戳、次级备注 |
| `--nb-line` | `#E5E5EA` | 细分割线/微边框 | 卡片边框、行间分割线、组件描边 |
| `--nb-soft-surface`| `#EDF3FA` / 浅中性 | 浅色输入/卡片底 | 输入框底色、次级胶囊未选底色 |
| `--nb-action` | `#1D1D1F` | 主操作背景（石墨黑）| Primary 主按钮、选中态药丸胶囊 |
| `--nb-inverse` | `#FFFFFF` | 反白文字 | 主操作按钮文字、纯黑背景上反白字 |
| `--nb-text-link` | `#245EA8` | 文字链接语义色 | “查看更多”、“到店指引”等文字跳转链接 |
| `--nb-danger` | `#B42332` | 危险/错误语义色 | 删除、取消等高危破坏性操作 |
| `--nb-success` | `#287A4B` | 成功/进行中语义色 | 营业中状态点、开关开启绿色 |

> [!IMPORTANT]
> **绝对禁令**：全项目任何页面禁止使用硬编码色值；禁止使用历史设计的粉红、粉紫、高饱和渐变（如 `--brand-gradient` 现已映射为 `--nb-action`）。色彩舞台只保留给真实作品照片与必要的状态语义。

### 2.2 字号与行高阶梯 (Typography)

| 级别 | 字号 (rpx) | 行高 | 字重 | 适用场景 |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | `56rpx` | `1.15` | `700` (Bold) | 看板总营收、大数字、Hero 主标题 |
| **Page Title** | `40rpx ~ 44rpx` | `1.25` | `700` (Bold) | 页面一级标题、二三级页面全宽头标题 |
| **Section Title** | `32rpx` | `1.3` | `650` (Semibold) | 卡片模块分组标题（如“基本信息”、“服务方案”） |
| **Card Primary** | `28rpx` (`--font-md`) | `1.4` | `600` (Medium/Semibold) | 列表项标题、店铺名称、客户姓名、表单输入值 |
| **Body / Form** | `26rpx` (`--font-sm`) | `1.5` | `400` / `500` | 正文段落、表单输入框文本、按钮文本 |
| **Caption / Note** | `22rpx` (`--font-xs`) | `1.45` | `400` (Regular) | 时间戳、字数统计、字段下方辅助提示 |

---

## 三、 标准组件库设计与规范 (Component Standards)

### 3.1 基础与容器组件

#### 1. Airbnb 纯白卡片容器 (`.card` / `.section-card`)
- **视觉属性**：
  ```css
  background: var(--nb-surface);
  border: 1rpx solid var(--nb-line);
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  padding: 32rpx;
  box-sizing: border-box;
  ```
- **内边距与间距**：模块间距统一采用 `20rpx ~ 24rpx`。

#### 2. 全圆角胶囊药丸与筛选标签 (Airbnb Filter Chips & Segmented Pills)
- **紧凑型筛选药丸 (`.tab-item` / `.tab-pill` / `.filter-chip`)**：
  - **视觉规格**：视觉高度 `54rpx ~ 56rpx`，消除臃肿笨重感；水平内边距 `22rpx ~ 24rpx`；圆角 `var(--radius-full)` (9999rpx)；细微边框 `1rpx solid rgba(0, 0, 0, 0.08)`。
  - **触控热区保证**：通过 `::after` 伪元素扩展上下各 `16rpx`，严格保障移动端触控热区 $\ge 44$px。
  - **双态高反差切换**：
    - 默认未选：浅灰底 `background: var(--nb-page); border: 1rpx solid rgba(0, 0, 0, 0.08); color: var(--nb-secondary);`，徽标为低饱和度微底 `background: rgba(0, 0, 0, 0.06); color: var(--nb-muted);`
    - 选中激活：石墨黑底 `background: var(--nb-action); border-color: var(--nb-action); color: var(--nb-inverse); font-weight: 600;`，徽标反转为纯白高亮底 `background: #FFFFFF; color: var(--nb-action);`
    - 按压动效：`:active` 带有 `background: var(--nb-pressed); transform: scale(0.97);` 细腻微弹性。
- **实体胶囊操作按钮 (`.btn-invite` 等次级行动胶囊)**：
  - 必须具备独立实体边框 `1rpx solid rgba(0, 0, 0, 0.08)` 与浅中性底色 `background: var(--nb-page)`，禁止无边框白底导致文字裸奔隐形。

#### 3. 按钮系统 (`action-button` / `styles/booking-actions.wxss`)
- **Primary 主操作**：石墨黑底反白字（`background: var(--nb-action); color: var(--nb-inverse)`），圆角 16rpx 或全圆角胶囊，高度 88rpx（44px）。
- **Secondary 次操作**：浅灰底黑字（`background: var(--nb-page); color: var(--nb-ink); border: 1rpx solid var(--nb-line)`）。
- **Danger 危险操作**：浅粉红底红字（`background: var(--nb-danger-surface); color: var(--nb-danger)`）。
- **Text Link 文字链接**：无边框底色，直接使用 `--nb-text-link`，触控高度扩充至 44px。

#### 4. 输入框与选择器 (`form-field` / `styles/booking-form.wxss`)
- **输入框统一结构**：
  ```css
  height: var(--input-height); /* 88rpx / 44px */
  min-height: 44px;
  background: var(--nb-soft-surface);
  border: 2rpx solid transparent;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: var(--font-sm);
  color: var(--nb-ink);
  box-sizing: border-box;
  ```
- **聚焦反馈**：`border-color: var(--border-focus); background: var(--nb-surface);`。

#### 5. 二三级页面全宽主信息区 (`secondary-page-header`)
- **规格**：横向铺满 100%，纯白表面 `background: var(--nb-surface)`，底边 `border-bottom: 1rpx solid var(--nb-line)`。
- **信息承载**：大字阶页面标题（`36rpx` 粗体） + 一句简短的灰字辅助描述，让页面意图清晰可读。

#### 6. 统一通用状态卡片 (`state-card`)
- **空状态 (Empty)**：纯白或透明背景，精美单色中性图标，清晰的居中文案，以及一个居中的石墨黑胶囊行动按钮。
- **错误状态 (Error)**：网络离线或加载失败时的轻量居中重试卡片，禁止生硬的系统弹窗阻塞用户。

---

## 四、 全项目 79 个页面全景分类与改造清单 (All 79 Pages Matrix)

全项目 79 个页面按照交互模型分类为 7 大原型（Archetypes）：

### 类别 A：账号认证与入口流 (6 个页面)
> 目标：去除所有旧彩度背景渐变，统一为 Airbnb 极简石墨胶囊与纯白卡片，隔离微信官方元素。
1. `pages/login/index` (统一主登录)
2. `pages/register/index` (统一主注册)
3. `pages/role-select/index` (角色选择入口)
4. `pages/setup-password/index` (设置密码)
5. `pages/client/profile-completion/index` (客户微信资料补全)
6. `pages/client/welcome/index` (客户欢迎页)

### 类别 B：美甲师工作台与经营看板 (12 个页面)
> 目标：房东级 Host Dashboard，大字阶中性数据，滑动待办卡片，极简胶囊日历。
7. `pages/technician/home/index` (美甲师首页与待办滑块)
8. `pages/technician/schedule/index` (排期日历与接单时间)
9. `pages/technician/service-time/index` (接单设置与容量步进器)
10. `pages/technician/business-data/index` (经营数据与趋势图表)
11. `pages/technician/business-metric-detail/index` (经营指标下钻详情)
12. `pages/technician/all-bookings/index` (全部预约大厅)
13. `pages/technician/all-itineraries/index` (全部行程流)
14. `pages/technician/orders/index` (订单管理中心)
15. `pages/technician/trade-orders/index` (交易记录)
16. `pages/technician/leads/index` (咨询线索池)
17. `pages/technician/lead-create/index` (新建客源线索)
18. `pages/technician/lead-detail/index` (线索跟进详情)

### 类别 C：客户发现、作品与沙龙展示 (13 个页面)
> 目标：大图画廊瀑布流，CDN 动态按需缩放，骨架屏，纯白手艺人主页。
19. `pages/client/home/index` (客户首页与常约美甲师)
20. `pages/client/discover/index` (发现作品广场)
21. `pages/client/artist-home/index` (美甲师沙龙主页)
22. `pages/client/works/index` (作品分类列表)
23. `pages/client/work-detail/index` (作品大图详情与方案)
24. `pages/client/public-work/index` (公开分享作品落地页)
25. `pages/client/brand-works/index` (品牌作品精选)
26. `pages/client/brand-services/index` (品牌特色服务)
27. `pages/client/designs/index` (设计款型库)
28. `pages/client/design-detail/index` (款型详情)
29. `pages/client/customize-design/index` (定制选款)
30. `pages/client/ai-photo/index` (AI 美甲试色相册)
31. `pages/client/my-technicians/index` (我的美甲师绑定列表)

### 类别 D：预约流程与履约记录 (12 个页面)
> 目标：极简选时间槽（Time-slot），票据化报价单，连续流美甲记录。
32. `pages/client/create-order/index` (选时间与极简预约)
33. `pages/client/quick-booking/index` (快捷选款预约)
34. `pages/client/quote-booking/index` (报价快速预约)
35. `pages/client/quote-confirm/index` (确认报价单与定金)
36. `pages/client/order-detail/index` (客户预约详情与三按钮操作栏)
37. `pages/client/orders/index` (客户订单列表)
38. `pages/client/booking-success/index` (预约完成确认页)
39. `pages/technician/create-order/index` (美甲师代客下单)
40. `pages/technician/order-detail/index` (美甲师预约详情与履约准备)
41. `pages/technician/complete-service/index` (美甲记录录入与详情档案)
42. `pages/technician/quick-quote/index` (快捷选款报价单生成)
43. `pages/technician/quote-records/index` (历史报价记录)

### 类别 E：作品管理、门店与资产配置 (12 个页面)
> 目标：平铺大图相册管理，有序到店指引内容块，微边框编辑表单。
44. `pages/technician/works/index` (作品集平铺管理)
45. `pages/technician/work-edit/index` (发布作品与私密制作方案)
46. `pages/technician/work-detail/index` (美甲师端作品详情)
47. `pages/technician/shop-management/index` (门店环境与营业时间管理)
48. `pages/technician/shop-guidance-edit/index` (到店指引有序内容块编辑)
49. `pages/client/shop-guidance/index` (公开到店路线指引)
50. `pages/technician/services/index` (服务项目与加价项管理)
51. `pages/technician/home-service-settings/index` (上门接单范围设置)
52. `pages/technician/homepage-settings/index` (主页展示与特色定制)
53. `pages/technician/tag-management/index` (常用作品标签管理)
54. `pages/technician/marketing-materials/index` (宣传素材生成与海报)
55. `pages/technician/referral-campaign/index` (推荐返现获客配置)

### 类别 F：客户档案与关系沉淀 (8 个页面)
> 目标：移除冗余催记，美甲记录真实时间轴，偏好与禁忌高亮卡片。
56. `pages/technician/customers/index` (客户档案列表与分类)
57. `pages/technician/customer-detail/index` (客户私密档案与历史服务流水)
58. `pages/technician/binding-applications/index` (客户直接绑定申请审核)
59. `pages/technician/artist-interactions/index` (手艺人互动记录)
60. `pages/client/beauty-archive/index` (客户个人美甲历史故事集)
61. `pages/client/my-favorites/index` (客户我的收藏)
62. `pages/client/my-likes/index` (客户我的点赞)
63. `pages/client/referrals/index` (客户邀请好友与优惠奖励)

### 类别 G：即时沟通、账号中心与支撑 (16 个页面)
> 目标：对话列表时间分组，双态对话气泡，全宽信息区设置中心。
64. `pages/client/chat/index` (客户消息列表与未读提醒)
65. `pages/client/chat-detail/index` (客户即时沟通对话页)
66. `pages/technician/chat/index` (美甲师消息列表与会话管理)
67. `pages/technician/chat-detail/index` (美甲师即时沟通对话页)
68. `pages/client/profile/index` (客户个人中心)
69. `pages/technician/profile/index` (美甲师个人中心)
70. `pages/client/settings/index` (客户个人资料修改)
71. `pages/technician/profile-settings/index` (美甲师账号信息设置)
72. `pages/technician/account-security/index` (账号安全与手机号换绑)
73. `pages/account-deletion/index` (账号注销合规流程)
74. `pages/client/help-feedback/index` (客户帮助与常见问题)
75. `pages/technician/help-feedback/index` (美甲师帮助与客服支持)
76. `pages/client/feedback/index` (意见反馈提交)
77. `pages/client/agreement/index` (服务协议与隐私条款)
78. `pages/technician/about/index` (关于产品与版本)
79. `pages/technician/subscription/index` (订阅通知引导与设置)

---

## 五、 重构执行原则与防线守护

在推进全项目改造的过程中，坚决执行以下防线守护：

1. **外观升级，逻辑保真 (Surgical Changes)**：
   - 严禁触动任何页面 JS/TS 代码的 Page 方法、网络请求、本地 Storage 键名与事件绑定；
   - 仅对 WXML 骨架结构（如无障碍属性、外层容器类名）与 WXSS 视觉表现层进行 Airbnb 级升级重构。
2. **测试驱动防劣化 (Test-Driven Gate)**：
   - 每次重构完成后，立即执行 `node client-wxapp/scripts/release-gate.js`；
   - 保证全量 94 项自动化回归测试 100% 保持绿灯通过。
3. **色彩与触控零容忍 (Zero Color/Touch Violation)**：
   - 每次修改后执行 `python3 scripts/check-colors.py`，保持 0 色彩违规；
   - 每一个新增的可点击按钮、输入框、勾选框与卡片行，确保最小高度 $\ge 44$px（88rpx）。
