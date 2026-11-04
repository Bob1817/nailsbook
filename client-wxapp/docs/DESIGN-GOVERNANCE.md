# 小程序基础设计治理标准

功能字段配色以根目录 `design-system/nailbook/COLOR-STANDARD.md` 的“功能字段统一规则（2026-09-07）”为准。金额、文字导航、状态、分类标签和操作按钮必须分别使用语义色；不可因同为可点击元素就混用。颜色修改需运行 `node client-wxapp/scripts/test-semantic-color-contract.js`。

“统一风格”按本标准执行；颜色遵循根目录 COLOR-STANDARD.md。
历史 UI-DESIGN-GUIDELINES.md 的大字号胶囊按钮不作为所有操作的默认样式。

- 卡片操作以全部预约 technician-booking-card 为基准；不得直接套用旧 30rpx 胶囊主按钮。
- 导航使用 nav-bar；不逐页另设标题字号。
- 文字复用 tokens.wxss：区域标题 font-md、正文与表单 font-sm、辅助标签 font-xs。
- 输入与选择器使用相同内容和占位字号；高度 input-height 且触控不低于 44px，圆角 input-radius，内边距 input-padding-h。
- 表单底部操作采用正文级字号、统一圆角与安全区；点击区域扩大不等于字号增大。
- 链接使用 nb-text-link；开关复用 nb-switch。保留错误、禁用、加载及按压反馈。
- 间距沿用现有间距变量，避免逐元素叠加临时补丁。

先比较标准组件，再修改页面。已治理预约表单显式导入 styles/booking-form.wxss。
预约入口按钮显式使用 booking-action 并导入 styles/booking-actions.wxss：最小高度 44px、圆角 8px、font-sm、weight-semibold，无装饰阴影。已接入一键预约分享/客户操作和美甲师主页底部操作。
不通过全局 text/input/button 选择器覆盖未知页面。生成文件由同步脚本产生。

## 预约卡片与预约详情底部操作按钮规范（最多三按钮+更多折叠契约）

1. **数量与排布上限**：
   - 底部固定区域或卡片底部，最多并列展示 3 个操作按钮。
   - 按钮数量 $\le 3$ 时：水平并列展示全部可用操作（1 个满宽、2 个对分、3 个等分三列）。
   - 按钮数量 $> 3$ 时：仅展示前 2 个核心操作，第 3 个固定为【更多】（`isMore: true`），点击展开抽屉面板展示剩余操作。
2. **权重排序与主次分流**：
   - 必须按业务重要性（`priority` 升序）定义操作权重：
     - `priority: 1`：当前推进业务主流程的核心操作（如客户端“同意报价”、美甲师端“确认排期”），优先采用 Primary 样式（黑底白字）；
     - `priority: 2`：次核心操作（如客户端“我再想想/拒绝”、美甲师端“修改预约”），采用 Secondary 样式（浅灰底）；
     - `priority: 3+`：低频、辅助或破坏性操作（如“取消预约”、“删除订单”），在超过 3 个操作时自动收进【更多】抽屉面板。
3. **工程落地机制**：
   - 必须接入各自分包 `utils/action-layout-resolver.js` 的 `resolveActionLayout(actions)` 纯函数统一计算 `visibleActions` 与 `overflowActions`；两个分包实现由交互契约测试保证一致；
   - 所有按钮触控高度必须 $\ge 44$px（88rpx），单行三按钮文字统一使用 `var(--font-sm)` 配合 `white-space: nowrap` 避免窄屏折行或截断；
   - 严格禁止“3 个以上直接折叠为单一更多操作”掩盖主流程推进动作的负向交互。

验收覆盖正常、空、错误、加载、禁用、长姓名、长地址、窄屏、安全区、选择器占位、登录回跳及重复点击。
代码检查通过不代表完成视觉或真机验收。
