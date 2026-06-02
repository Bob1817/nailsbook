# NailBook Mobile-Flutter UI Review Report

> **Reviewer:** Senior iOS Human Interface Guidelines Expert & Product Designer
> **Date:** 2026-06-01
> **Scope:** Technician端 + Client端 全页面
> **Framework:** Flutter (Material 3, custom design tokens)

---

## 1. 信息层级 (Information Hierarchy)

### 高优先级

#### 1.1 首页 Dashboard 信息过载，缺少视觉引导锚点
**问题：** `TechnicianHomeScreen` 的首页包含 Hero、Status Card、Next Order、Pending Items、Today Schedule、Featured Works、Quick Actions 共 7 个内容区块，全部堆叠在一个 ScrollView 中，没有明确的视觉分组层级。用户第一眼无法判断"哪个最重要"。
**为什么是问题：** 根据 iOS HIG，Dashboard 应遵循 "one primary action per screen" 原则。当前首页所有内容块的权重几乎相等（相同的卡片圆角、相似的阴影、相同的左右边距），用户需要逐个扫描才能找到关键信息。
**优化方案：**
- 将 Next Order 卡片放大为全屏宽度的 Hero 级组件，使用更强的背景色或渐变色
- 将 Pending Items 和 Today Schedule 合并为 "今日工作" 一个区块，内部用分割线区分
- 将 Featured Works 降权为横向滑动条（非卡片容器），减少视觉占用
- 使用 4pt 字阶系统建立清晰的标题层级：大标题 28pt → 分区标题 20pt → 卡片标题 17pt → 正文 15pt

#### 1.2 订单详情页使用 Bottom Sheet 而非 Push Navigation
**问题：** `TechnicianOrdersScreen` 中点击订单卡片后，使用 `DraggableScrollableSheet` 弹出详情，而不是 push 到独立页面。
**为什么是问题：** iOS HIG 明确建议：内容详情、可滚动操作列表应使用 push navigation（全屏页面），bottom sheet 适用于临时操作或补充信息。订单详情包含完整的客户信息、时间、价格、操作按钮，是核心工作流，不应嵌套在列表页之上。
**优化方案：**
- 将 `_buildDetailSheet` 迁移到独立的 `TechnicianOrderDetailScreen`（已存在但未使用）
- 点击订单卡片时 `context.push('/technician/orders/${order['id']}')`
- 保留现有的 `technician_order_detail_screen.dart` 作为详情页实现

### 中优先级

#### 1.3 Client 端和 Technician 端使用不同的底部导航实现
**问题：** Client 端使用 Flutter 原生 `NavigationBar`（M3 组件），Technician 端使用自定义 `Row + GestureDetector` 实现。两者视觉表现不一致，且自定义实现缺少 M3 NavigationBar 的 ripple 效果、indicator 动画、语义标签。
**为什么是问题：** 同一应用内两套导航系统增加用户的认知负担，且自定义实现无法利用 iOS 原生适配（如 safe area 自动处理）。
**优化方案：**
- Technician 端统一改为使用 `NavigationBar` 或 `CupertinoTabBar`
- 如坚持自定义，需添加 `InkWell` ripple 效果、选中态指示器动画

#### 1.4 行程页面的统计信息缺乏主次
**问题：** `TechnicianScheduleScreen` 顶部的 stats row（行程数、总里程、预计收入、已完成）四个项目等宽平铺，没有突出最重要的指标。
**为什么是问题：** 对美甲师来说，"下一单时间" 和 "预计收入" 是最高频关注的信息，应该更突出。
**优化方案：**
- 将 "下一单时间" 作为大数字展示（类似 Apple Clock app）
- 其他三个指标缩小为一行辅助信息
- 或使用横向滑动的 Pill 式统计卡片

---

## 2. 视觉重心 (Visual Weight)

### 高优先级

#### 2.1 过多使用渐变和装饰性元素，分散注意力
**问题：** 项目中大量使用渐变背景（`heroGradient`、`bookingGradient`、`profileGradient`、`screenGradient`）、装饰性 blur circles、radial glow decorations。仅在 `technician_home_screen.dart` 就有 3 处装饰性 blur circle 和 1 个全幅渐变 Hero。
**为什么是问题：** iOS HIG 强调 "Content is the UI"。装饰元素不应竞争用户的注意力。过多的渐变和装饰会让核心操作（如接单、导航）不够突出。
**优化方案：**
- Hero 区域保留渐变，但移除装饰性 blur circles
- 卡片容器统一使用纯色背景 + 微阴影，取消 NBGradientCard 的使用场景
- 将渐变保留给 CTA 按钮和关键状态指示

#### 2.2 NBPillBadge 文字仅 11pt，可读性不足
**问题：** `nb_widgets.dart` 中 `NBPillBadge` 的字体大小为 11pt，且使用 `FontWeight.w600`。在状态标签、分类标签等场景中，11pt 是 iOS 可访问性的临界值。
**为什么是问题：** iOS HIG 建议正文最小 15pt，标签最小 12pt。11pt 在 iPhone mini 或降低透明度设置下几乎不可读。
**优化方案：**
- 将 PillBadge 文字提升至 12pt（DT.textSm）
- 增加 vertical padding 从 4 到 6，保持视觉平衡

### 中优先级

#### 2.3 状态 Badge 颜色语义不统一
**问题：** 不同页面中相同状态使用了不同颜色。例如 `pending_home` 在 `technician_home_screen.dart` 中使用蓝色（`DT.statusBlue`），在 `technician_orders_screen.dart` 中也使用蓝色，但在 `technician_schedule_screen.dart` 中使用绿色。
**为什么是问题：** 颜色语义不一致会导致用户在跨页面时产生困惑，降低界面的可预测性。
**优化方案：**
- 在 `design_tokens.dart` 中定义统一的状态颜色映射表
- 创建 `OrderStatusBadge` 共享组件，传入 status string 自动返回正确颜色

---

## 3. 间距系统 (Spacing System)

### 高优先级

#### 3.1 间距 token 存在重复定义和不一致
**问题：** `design_tokens.dart` 中同时存在两套间距命名：
- 数字命名：`space4`, `space8`, `space12`, `space16`, `space24`, `space32`
- 语义命名：`xs`(4), `sm`(8), `md`(12), `lg`(16), `xl`(20), `xxl`(24), `xxxl`(32)

且实际代码中大量使用硬编码数值（`const SizedBox(height: 14)`、`padding: const EdgeInsets.all(20)` 等），未遵循任何一套系统。
**为什么是问题：** 两套系统并存 + 硬编码值导致间距缺乏一致性，视觉上会出现"这里紧那里松"的破碎感。iOS 的 8pt 网格系统要求所有间距都是 4 或 8 的倍数。
**优化方案：**
- 废弃一套命名（推荐保留语义命名 xs/sm/md/lg/xl，因为更易懂）
- 建立 4pt 网格：所有间距必须为 4 的倍数（4, 8, 12, 16, 20, 24, 32, 40, 48）
- 替换所有硬编码 `SizedBox(height: 14)` → `SizedBox(height: DT.md)`（12）或 `SizedBox(height: 16)`
- 特别修正：`height: 14`（多处）、`padding: 18`、`margin: 3` 等非标准值

#### 3.2 卡片内边距不统一
**问题：** 各页面卡片的 padding 值各不相同：
- `technician_home_screen.dart`: `padding: const EdgeInsets.all(20)`
- `technician_orders_screen.dart`: `padding: const EdgeInsets.all(16)`
- `technician_schedule_screen.dart`: `padding: const EdgeInsets.all(16)`
- `technician_profile_screen.dart`: `padding: const EdgeInsets.all(18)`
**为什么是问题：** 相同类型的卡片在不同页面有不同的呼吸感，破坏了设计系统的一致性。
**优化方案：**
- 统一卡片内边距为 `DT.lg`（16pt）或 `DT.xl`（20pt），在整个应用中保持一致
- 创建 `NBCard` 共享组件，内置标准 padding

### 低优先级

#### 3.3 Stat Tile 内部间距过紧
**问题：** `_healthStatTile` 内部 `const SizedBox(height: 10)`，不符合 4pt 网格。
**优化方案：** 改为 `SizedBox(height: DT.sm)`（8）或 `SizedBox(height: DT.md)`（12）。

---

## 4. 对齐系统 (Alignment System)

### 高优先级

#### 4.1 页面左右边距使用硬编码 20，应统一为 Token
**问题：** 几乎所有页面的左右边距都是 `padding: const EdgeInsets.symmetric(horizontal: 20)`，但 DT 中没有 `space20`，只有 `space16` 和 `space24`。
**为什么是问题：** 20px 既不是 8pt 网格的标准值，也没有对应 token，说明设计系统定义与实际使用存在偏差。
**优化方案：**
- 方案 A：在 DT 中新增 `space20 = 20`（推荐，因为 20 在应用中广泛使用）
- 方案 B：全局替换为 `DT.lg`（16）或 `DT.xxl`（24），但这需要视觉评审确认
- 无论哪种方案，都应替换所有 `horizontal: 20` 为对应 token

#### 4.2 行程页面使用固定 SizedBox(width: 66) 做对齐
**问题：** `technician_schedule_screen.dart` 中地址行和按钮行使用 `const SizedBox(width: 66)` 来对齐内容左侧，这是脆弱的对齐方式。
**为什么是问题：** 硬编码偏移量无法适应不同屏幕尺寸和字体大小，在 iPad 或大屏幕上会出现错位。
**优化方案：**
- 使用 `Row` + `SizedBox(width: 56)`（与时间列宽度一致）作为前导空间
- 或使用 `IntrinsicWidth` / `ConstrainedBox` 实现动态对齐

### 中优先级

#### 4.3 Hero 区域的 Transform.translate 负偏移
**问题：** `technician_home_screen.dart` 中 Status Card 使用 `Transform.translate(offset: const Offset(0, -24))` 让卡片与 Hero 区域重叠。
**为什么是问题：** 固定负偏移在不同屏幕尺寸下可能导致重叠量不一致，在小屏设备上可能遮挡内容。
**优化方案：**
- 使用 `Stack` + `Positioned` 实现重叠效果，更可控
- 或使用 `CustomScrollView` + `SliverAppBar` 实现标准的 Hero 重叠效果

---

## 5. 色彩系统 (Color System)

### 高优先级

#### 5.1 主色 #FF6B8A 与 iOS 系统色的对比度问题
**问题：** 品牌主色 `primary = #FF6B8A` 在白色背景上的对比度约为 3.2:1，低于 WCAG AA 标准要求的 4.5:1（正文文本）。
**为什么是问题：** 当主色用于文本（如标签、链接）时，对视力障碍用户不够友好。iOS HIG 要求文本对比度至少达到 AA 标准。
**优化方案：**
- 主色文本场景使用 `DT.primaryDark`（#E00B41），对比度约 5.8:1，符合 AA
- 或调整 primary 到更深的粉色（如 #E8557A），确保文本对比度达标
- 背景色、按钮色可以继续使用 #FF6B8A（图形元素只需 3:1）

#### 5.2 存在大量未通过 DT 定义的散落颜色
**问题：** 代码中大量使用硬编码的 Color 值，例如：
- `Color(0xFFF2E6EC)`（边框色）
- `Color(0xFF6B7280)`（文本色）
- `Color(0xFFF3F4F6)`（背景色）
- `Color(0xFFCBD5E1)`（图标色）
这些颜色在 `design_tokens.dart` 中已有对应定义但未被使用。
**为什么是问题：** 散落颜色导致后期主题切换（如深色模式）极其困难，也难以维护视觉一致性。
**优化方案：**
- 将所有硬编码 Color 替换为 DT 中的对应 token
- 建立颜色审计清单，确保每个硬编码颜色都有 token 对应

### 中优先级

#### 5.3 缺少深色模式支持
**问题：** 整个应用只有 `AppTheme.light`，没有 `AppTheme.dark`。所有颜色都是硬编码的浅色模式值。
**为什么是问题：** iOS 用户对深色模式的期望很高，iOS HIG 建议所有应用都支持深色模式。
**优化方案：**
- 为每个 DT 颜色定义对应的 dark variant
- 使用 `Theme.of(context).brightness` 或 `ColorScheme` 自动适配
- 优先适配核心页面：首页、订单、个人中心

---

## 6. 字体系统 (Typography System)

### 高优先级

#### 6.1 大量页面未使用 DT 中定义的文字样式
**问题：** `design_tokens.dart` 定义了完整的文字样式系统（`displayLarge`、`titleLarge`、`bodyMedium` 等），但几乎所有页面都使用内联 `TextStyle(fontSize: XX, fontWeight: XXX)` 而非引用 DT 样式。
**为什么是问题：** 这导致字体系统形同虚设，不同页面可能出现相同的语义（如"卡片标题"）使用不同的字号和字重。
**优化方案：**
- 全局搜索并替换内联 TextStyle 为 DT 样式引用
- 例如：`TextStyle(fontSize: 17, fontWeight: FontWeight.w600)` → `DT.titleMedium`
- 建立文字样式使用规范，确保每个场景都有对应的语义样式

#### 6.2 缺少 Dynamic Type（iOS 字体大小自适应）支持
**问题：** 所有字体大小使用固定数值（如 `fontSize: 17`），没有使用 Flutter 的 `MediaQuery.textScaler` 或 `AccessibilityMetrics`。
**为什么是问题：** iOS 用户可以在系统设置中调整字体大小，应用应该响应这些设置。固定字号对视障用户不友好。
**优化方案：**
- 在文本组件外包裹 `MediaQuery` 的 text scaling 支持
- 或使用 `flutter_screenutil` / `responsive_framework` 等方案
- 至少确保核心文本（状态、价格、时间）支持放大

### 中优先级

#### 6.3 数字显示未使用等宽字体
**问题：** 时间显示（如 `14:30`）、价格（如 `¥288`）等数字内容使用系统默认字体，不是等宽字体。
**为什么是问题：** 数字在倒计时、价格比较、时间轴等场景中需要对齐，非等宽字体会导致视觉跳动。
**优化方案：**
- 为数字显示创建专用样式 `DT.monospace`，使用 `fontFamily: 'SF Mono'` 或 `Courier`
- 或在 `TextStyle` 中添加 `fontFeatures: [FontFeature.tabularFigures()]`

---

## 7. 可点击区域 (Tap Target Size)

### 高优先级

#### 7.1 部分交互元素小于 44x44pt 最小触控区域
**问题：** 
- `NBPillBadge` 仅 `padding: EdgeInsets.symmetric(horizontal: 10, vertical: 4)`，高度约 20pt
- 底部导航的单个 tab 区域 `padding: EdgeInsets.symmetric(vertical: 8)`，总高度约 42pt（不含 safe area）
- `_tabButton` 在行程页面中仅 `padding: const EdgeInsets.only(bottom: 10)`，垂直触控区域不足
- `NBPillBadge` 在 `nb_widgets.dart` 中内部 padding 过小
**为什么是问题：** iOS HIG 明确要求所有交互元素的最小触控区域为 44x44pt。小于此尺寸会导致误触和操作困难，尤其对指甲较长的美甲师用户。
**优化方案：**
- 为所有 `GestureDetector` 添加 `behavior: HitTestBehavior.opaque` 并扩大 padding
- 底部导航使用 `SizedBox` 确保每个 tab 最小高度为 44pt + safe area
- Tab 按钮增加垂直 padding 至 12pt

#### 7.2 分享名片 Bottom Sheet 中的 "立即分享" 按钮使用 `DT.errorDark`
**问题：** `_showShareSheet` 中 "立即分享" 按钮的背景色使用 `DT.errorDark`（红色系），这通常表示破坏性操作。
**为什么是问题：** 颜色语义错误。分享是正向操作，不应使用错误/警告色。
**优化方案：**
- 改为 `DT.primary` 或 `DT.primaryGradient`

### 中优先级

#### 7.3 订单详情 sheet 底部按钮密集排列
**问题：** `_buildDetailActions` 中当按钮超过 2 个时，使用 `Wrap` 排列，按钮之间 `spacing: 8, runSpacing: 8`。在 3 个以上按钮时，垂直间距仅为 8pt，触控区域可能重叠。
**优化方案：**
- 增加 `runSpacing` 至 12pt
- 或限制每行最多 2 个按钮，多余按钮垂直排列

---

## 8. iOS 原生设计一致性

### 高优先级

#### 8.1 自定义 Toggle Switch 而非使用系统组件
**问题：** `technician_home_screen.dart` 中的接单开关使用自定义 `Container` + `AnimatedAlign` 实现，而非 Flutter 的 `Switch` 或 `CupertinoSwitch`。
**为什么是问题：** 自定义 toggle 缺少 iOS 原生的触感反馈（haptic feedback）、动画曲线和语义信息。用户期望 toggle 的行为与系统设置中的开关一致。
**优化方案：**
- 使用 `CupertinoSwitch` 替换自定义实现
- 添加 `HapticFeedback.lightImpact()` 在状态切换时
- 或保留自定义样式但添加 `Semantics` 标签和触感反馈

#### 8.2 使用 Material 3 组件而非 Cupertino 组件
**问题：** 应用使用了 `useMaterial3: true`，但目标平台包含 iOS。大量使用 `AppBar`、`NavigationBar`、`ElevatedButton` 等 Material 组件，而非 `CupertinoNavigationBar`、`CupertinoTabBar`、`CupertinoButton`。
**为什么是问题：** iOS 用户对 Material Design 组件有违和感。iOS HIG 建议使用原生风格的组件。
**优化方案：**
- 方案 A：使用 `flutter_platform_widgets` 或 `adaptive_breakpoints` 实现平台自适应
- 方案 B：如果优先考虑开发效率，至少将以下组件替换为 Cupertino 版本：
  - `AlertDialog` → `CupertinoAlertDialog`
  - `Switch` → `CupertinoSwitch`
  - `SlidingSegmentedControl`（用于 Tab 切换）
  - `CupertinoPageTransitionsBuilder` 作为页面过渡动画

#### 8.3 页面过渡动画为 Material 默认，非 iOS 风格
**问题：** 使用 `go_router` 但配置了 Material 页面过渡动画（从右向左滑入），而非 iOS 的带标题栏联动滑入。
**为什么是问题：** iOS 用户期望页面过渡有弹性动画、大标题联动滑出等效果。
**优化方案：**
- 在 `GoRouter` 中配置 `pageBuilder` 使用 `CustomTransitionPage` + `CupertinoPageTransitionsBuilder`
- 或使用 `cupertino_back_gesture` 包支持 iOS 边缘返回手势

### 中优先级

#### 8.4 缺少 Haptic Feedback
**问题：** 整个应用中没有任何触感反馈（`HapticFeedback`）调用。
**为什么是问题：** iOS HIG 推荐在关键交互（确认操作、状态切换、导航）中添加触感反馈，增强用户的操作确认感。
**优化方案：**
- 在按钮点击（特别是 CTA）、toggle 切换、bottom sheet 弹出时添加 `HapticFeedback.lightImpact()`
- 在操作成功/失败时添加 `HapticFeedback.selectionSuccess()` / `HapticFeedback.selectionError()`

#### 8.5 下拉刷新使用 Material 风格的 RefreshIndicator
**问题：** 所有列表页面使用 `RefreshIndicator`（Material 圆形加载动画），而非 iOS 风格的刷新控件。
**优化方案：**
- 使用 `CupertinoSliverRefreshControl` 替代
- 或在 iOS 平台使用 `CustomScrollView` + `SliverList` + `CupertinoSliverRefreshControl`

---

## 9. 用户操作路径 (User Flow)

### 高优先级

#### 9.1 订单创建入口分散且不一致
**问题：** 
- Technician 端首页的 Quick Actions 中有 "新建预约"
- Technician 订单列表页头部有 "新建预约" 按钮
- 但两个入口的路径和体验不一致
**为什么是问题：** 同一功能的多个入口应保持一致性，且最重要的操作应该出现在最显眼的位置。
**优化方案：**
- 统一所有 "新建预约" 入口到同一个路由
- 在首页将 "新建预约" 提升为浮动操作按钮（FAB）或固定在底部导航中间
- 移除订单列表页头部的新建按钮（减少页面认知负担）

#### 9.2 缺少全局搜索
**问题：** 应用缺少全局搜索功能。客户管理页有搜索，但订单、作品、行程等页面没有。
**为什么是问题：** 对于拥有大量客户和订单的美甲师，搜索是高频操作。当前需要进入对应页面才能搜索，操作路径过长。
**优化方案：**
- 在首页顶部添加搜索入口，支持跨模块搜索（客户、订单、作品）
- 或使用 iOS 风格的 Spotlight 搜索（下拉首页触发）

#### 9.3 导航到地址和联系客户功能未实现
**问题：** `_navigateToAddress` 和 `_contactCustomer` 仅显示 SnackBar 提示，未实际调用地图导航或电话拨打功能。
**为什么是问题：** 对上门美甲师来说，导航和联系客户是核心工作流。停留在 SnackBar 提示会让用户感到困惑（以为功能已实现但实际不能操作）。
**优化方案：**
- `_navigateToAddress`: 使用 `url_launcher` 打开高德/Apple Maps
- `_contactCustomer`: 使用 `url_launcher` 的 `tel:` scheme 拨打电话
- 在功能未完成时，按钮应显示为 disabled 或标注 "即将上线"

### 中优先级

#### 9.4 接单状态切换缺少二次确认的后果说明
**问题：** 暂停接单时只有简单的弹窗确认，没有说明对已有订单的影响范围。
**为什么是问题：** 美甲师可能担心暂停接单会影响正在进行的订单。应该明确告知用户"已有预约不受影响"。
**优化方案：**
- 在确认弹窗中分条列出影响：
  - ✅ 已有预约正常进行
  - ⚠️ 新客户将无法创建预约
  - ℹ️ 您可以随时重新开启

#### 9.5 作品管理缺少批量操作
**问题：** 作品管理页面只能逐个操作（编辑、删除、切换可见性），没有批量选择功能。
**为什么是问题：** 当作品数量较多时，逐个操作效率极低。
**优化方案：**
- 添加长按进入批量选择模式
- 支持批量删除、批量设置可见性

### 低优先级

#### 9.6 缺少空状态引导操作
**问题：** 部分空状态页面（如暂无行程、暂无作品）只展示提示文字，没有引导用户执行操作的按钮。
**优化方案：**
- 在 "暂无行程" 页面添加 "查看明日行程" 按钮
- 在 "暂无作品" 页面添加 "上传第一个作品" 按钮
- 遵循 "empty state = opportunity" 的设计原则

---

## 总结：优先级矩阵

| 优先级 | 数量 | 关键领域 |
|--------|------|----------|
| 高优先级 | 15 项 | 信息层级、视觉重心、间距系统、对齐、色彩对比度、字体系统、触控区域、iOS 一致性、操作路径 |
| 中优先级 | 12 项 | 状态颜色统一、深色模式、页面组件统一、触感反馈、搜索、操作确认 |
| 低优先级 | 3 项 | 微调间距、批量操作、空状态引导 |

## 建议实施顺序

1. **第一周：** 间距系统统一 + 色彩 Token 清理（问题 3.1, 3.2, 5.2）
2. **第二周：** iOS 原生组件替换 + 触控区域修复（问题 8.1, 8.2, 7.1, 7.2）
3. **第三周：** 信息层级重构 + 导航流程优化（问题 1.1, 1.2, 9.1, 9.3）
4. **第四周：** 字体系统 + 对齐系统 + 深色模式（问题 6.1, 6.2, 4.1, 5.3）
