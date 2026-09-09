# NailBook 小程序通用组件规范

本目录是小程序 UI 的唯一通用组件入口。页面应优先组合这里的组件；相同交互不得在页面中重新定义另一套尺寸、颜色或状态。

## 组件分层

- foundation：输入框、按钮、筛选器、开关等基础控件，视觉和交互 API 必须稳定。
- navigation：导航栏和底部导航，负责安全区及系统胶囊适配。
- pattern：跨页面复用的内容结构，不包含具体业务请求。
- business：包含 NailBook 业务语义的复合组件，可依赖基础组件。

所有组件必须登记在 component-registry.json。组件目录使用 kebab-case，并完整包含 index.js、index.json、index.wxml、index.wxss。

## 视觉基线

| 项目 | 标准 |
| --- | --- |
| 最小触控区域 | var(--touch-min)，等价于 44px |
| 输入框高度 | var(--input-height)，88rpx |
| 输入框圆角 | var(--input-radius)，14rpx |
| 按钮高度 | var(--btn-height)，88rpx |
| 按钮圆角 | var(--btn-radius) |
| 正文字号 | var(--font-md) 或 var(--font-sm) |
| 颜色 | 仅使用 --nb-* 或语义令牌，作品图片除外 |
| 安全区 | 固定底部组件必须叠加 env(safe-area-inset-bottom) |

### 高度等级

组件统一的是尺寸等级和触控规则，不是把所有视觉元素强制成同一高度。

| 等级 | 视觉高度 | 触控区域 | 适用组件 |
| --- | --- | --- | --- |
| 紧凑展示 | 48–64rpx | 不可点击；可点击时外层扩展至44px | 状态标签、数量徽标 |
| 紧凑操作 | var(--control-visual-height)，64rpx | var(--control-hit-height)，44px | 筛选标签、轻量下拉触发器、图标操作 |
| 标准操作 | var(--input-height) 或 var(--btn-height)，44px | 同视觉高度 | 输入框、选择框、主次按钮 |
| 导航操作 | 不小于44px | 不小于44px | 顶部返回、Tab 菜单项、底部导航项 |
| 大型复合 | 由内容决定 | 内部每个操作不小于44px | 预约卡片、日期卡片、业务面板 |

输入框、下拉框和主要按钮应保持同一标准高度。状态标签只传达信息，不应为了与按钮对齐而膨胀到44px；一旦标签可点击，就必须通过透明外层或内边距提供44px触控区域。Tab 菜单按内容排布，但每个菜单项的可点击区域不能低于44px。

### 按钮风格统一规则

后续页面提出“按钮风格统一”时，必须先按使用位置选择以下等级，不得把页面级主按钮样式直接套到卡片操作：

| 类型 | 高度 | 圆角 | 字号 / 字重 | 适用场景 |
| --- | --- | --- | --- | --- |
| 页面主按钮 | `var(--btn-height)` | `var(--btn-radius)` | `var(--btn-font-size)` / `var(--btn-font-weight)` | 提交表单、保存、确认等单一主要操作 |
| 卡片操作按钮 | `44px` | `8px` | `24rpx` / `var(--weight-semibold)` | 卡片底部并列的导航、联系、编辑、删除、查看详情 |
| 紧凑轻操作 | 视觉 `var(--control-visual-height)`，外层热区 `44px` | `var(--radius-sm)` | `var(--font-xs)` 或 `var(--font-sm)` | 筛选、轻量下拉、局部辅助操作 |
| 文字链接 | 视觉随文字，外层热区不低于 `44px` | 无容器圆角 | `var(--font-xs)` 或 `var(--font-sm)` / `var(--weight-medium)` | 查看更多、到店指引、编辑内容等跳转入口 |
| 图标按钮 | 视觉图标按组件定义，外层热区 `44px × 44px` | 圆形或组件标准 | 无正文 | 返回、关闭、更多、单一图标操作 |

卡片操作按钮以 `technician-booking-card` 的 `compact` 变体为基准：按钮并列等宽、间距 `12rpx`，次操作使用中性浅底，当前流程主操作使用深色底，危险操作使用危险语义色。按钮文字保持单行；按钮数量过多时应减少次要操作或分行，不得通过缩小至 24rpx 以下解决。

禁止在通用组件中使用 ID、标签名或属性选择器。交互状态统一使用 .is-active、.is-focused、.is-disabled、.has-error 和 .is-pressed。

## API 规则

- 属性使用 camelCase，并提供明确默认值。
- 用户操作通过 triggerEvent 对外暴露，组件不得直接调用业务接口。
- 布尔属性必须同时影响视觉状态与实际交互。
- 图标使用命名插槽 slot="icon" 或 slot="suffix"，不可在页面里覆盖组件内部尺寸。
- 可点击控件必须提供可读的 aria-label。
- 加载中和禁用状态不得重复触发事件。

## 基础组件

### form-field

统一标签、输入框、占位符、聚焦、禁用、错误、辅助说明及验证码等尾部操作。页面只管理字段值和校验逻辑。

### action-button

variant 仅允许 primary、secondary、text、danger。默认块级展示，加载或禁用时不会发送点击事件。

### filter-trigger

用于列表筛选，必须通过 active 表达已筛选状态，不允许页面复制箭头或自行修改触控高度。

### nb-switch

用于即时布尔设置。整块触控区域保持 44px，轨道尺寸只负责视觉表达。

## 页面层级模式

二三级设置、资料、帮助和记录页面统一使用 `secondary-page-header` 作为主信息区。主信息区必须横向铺满并使用 `--nb-surface`，承载页面标题、说明及少量状态；下方内容区使用 `--nb-page`，表单、状态和业务内容再以白色卡片承载。禁止把页面标题和说明散放在灰色页面背景上。集合型页面继续使用 `collection-overview`。

## 变更流程

1. 先确认现有组件能否组合解决。
2. 新增组件时同步登记注册表和使用说明。
3. 只在语义不同且至少有两个复用场景时新增组件。
4. 修改基础组件后运行 node scripts/check-component-standards.js。
5. 提交前运行 node scripts/release-gate.js。
