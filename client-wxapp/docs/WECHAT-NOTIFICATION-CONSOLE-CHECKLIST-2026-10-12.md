# 微信小程序通知后台配置任务清单

日期：2026-10-12  
分工：你负责微信公众平台中的模板配置；开发侧负责模板接入、事件触发、发送审计和测试。

## 一、先核对四个现有模板

登录 [微信公众平台](https://mp.weixin.qq.com/)，选择 OnlyNail 小程序，进入“功能 → 订阅消息 → 我的模板”。确认下列四个模板仍在“我的模板”中，且字段没有变化。

- [ ] 预约临近提醒
  - 模板 ID：`UnS_YwQEI9yhQnEv2poRg4nA25ZxRDPXJlLoVllerTc`
  - 预约产品：`thing32`
  - 预约时间：`time2`
  - 预约门店：`thing8`
  - 温馨提示：`thing9`
- [ ] 预约日前提醒
  - 模板 ID：`UnS_YwQEI9yhQnEv2poRg5FwBARszXHtVXKvfP50cF4`
  - 预约项目：`thing7`
  - 预约时间：`time2`
  - 预约门店：`thing8`
  - 温馨提示：`thing9`
- [ ] 客户预约成功通知
  - 模板 ID：`UnS_YwQEI9yhQnEv2poRg3kQrzJfC5ti5fjXCNES_qY`
  - 预约项目：`thing7`
  - 预约时间：`time2`
  - 预约门店：`thing8`
  - 地址：`thing4`
  - 温馨提示：`thing9`
- [ ] 美甲师新预约通知
  - 模板 ID：`UnS_YwQEI9yhQnEv2poRg_KleGknzepSet_aNnES2v4`
  - 预约项目：`thing7`
  - 预约时间：`time2`
  - 预约客户：`name6`
  - 温馨提示：`thing9`

若任一模板 ID 或字段编号与上面不同，不要直接修改现有线上配置，先把该模板详情截图发给开发侧。

## 二、已提供的新模板

- [x] 客户端预约状态变更通知
  - 模板 ID：`UnS_YwQEI9yhQnEv2poRg5B4debIRW06faveJmZe9WA`
  - 预约项目：`thing7`
  - 预约时间：`time2`
  - 预约状态：`phrase11`
  - 美甲师：`thing38`
  - 温馨提示：`thing9`
- [x] 美甲师端预约状态变更通知
  - 模板 ID：`UnS_YwQEI9yhQnEv2poRgx1FzUJsu7JpK8YQvFTmoKw`
  - 预约项目：`thing7`
  - 预约时间：`time2`
  - 预约状态：`phrase11`
  - 预约客户：`name6`
  - 温馨提示：`thing9`
- [x] 客户/美甲师咨询回复通知
  - 模板 ID：`DQHAs7L5URU9pNlrhyh7dcxLV5GrbMH_bYf4rFItXH4`
  - 发送者：`thing2`
  - 发送时间：`time3`
  - 消息内容：`thing1`
  - 温馨提示：`thing4`

开发侧按上述精确字段发送。聊天通知只显示“N 条新消息，含图片”等摘要，不发送完整聊天内容。

## 三、部署后在 OnlyNail 管理后台填写模板 ID

进入管理后台“首期上线配置”，填写并保存：

- [ ] “客户端预约状态模板 ID”：`UnS_YwQEI9yhQnEv2poRg5B4debIRW06faveJmZe9WA`
- [ ] “美甲师预约状态模板 ID”：`UnS_YwQEI9yhQnEv2poRgx1FzUJsu7JpK8YQvFTmoKw`
- [ ] “咨询回复通知模板 ID”：`DQHAs7L5URU9pNlrhyh7dcxLV5GrbMH_bYf4rFItXH4`
- [ ] 点击保存后重新打开该页面，确认三个值仍存在。

如暂时不能使用管理后台，也可在后端环境变量中填写对应的 `WECHAT_BOOKING_CLIENT_STATUS_TEMPLATE_ID`、`WECHAT_BOOKING_TECHNICIAN_STATUS_TEMPLATE_ID`、`WECHAT_CONSULTATION_REPLY_TEMPLATE_ID`，两种方式任选一种，管理后台配置优先。

## 四、检查小程序通知基础设置

- [ ] “开发 → 开发管理 → 开发设置”中的 AppID 与当前项目 `wx05644a205a1844a0` 一致。
- [ ] 当前用于测试的微信号已添加为项目成员或体验成员。
- [ ] 微信公众平台没有显示订阅消息能力被封禁、模板被删除或类目不匹配。
- [ ] 微信客户端中已允许该小程序发送订阅消息；若曾选择“不再询问”，进入小程序右上角“…”→“设置”检查订阅消息开关。
- [ ] 不开启“长期订阅消息”作为本项目依赖。丽人服务通常使用一次性订阅，每同意一次只能消费一次。

## 五、把剩余配置结果发给开发侧

部署完成后请提供：四个现有模板核对结果、三个新模板在管理后台保存成功的截图、测试微信号是否为体验成员，以及微信中是否关闭过 OnlyNail 的订阅消息总开关。

## 六、配置完成后的联合验收

- [ ] 美甲师在首页点击“开启/补充接单提醒”，微信弹出授权面板。
- [ ] 客户提交预约后，美甲师收到新预约卡片，点击进入对应预约详情。
- [ ] 客户确认或拒绝报价、取消或改期后，美甲师收到状态变更卡片。
- [ ] 已确认预约在日前和临近时间各触发对应提醒（每个模板需有可用授权次数）。
- [ ] 同一业务事件因接口重试不会重复推送。
- [ ] 授权次数不足时首页显示“补充接单提醒”，不会显示虚假的“提醒正常”。
- [ ] 微信返回模板字段错误、模板失效或无授权时，后台能查询失败原因。

注意：四个现有模板的标题均为“预约提醒”。微信会过滤同一次授权请求中的同名模板，因此小程序已改为每次业务点击申请一个模板，并在后续操作中轮换补充，避免看似申请三个但实际只获得一个授权。
