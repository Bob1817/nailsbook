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

验收覆盖正常、空、错误、加载、禁用、长姓名、长地址、窄屏、安全区、选择器占位、登录回跳及重复点击。
代码检查通过不代表完成视觉或真机验收。
