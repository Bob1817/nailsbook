# 预约变更实时刷新

## 实现与范围

- 客户创建预约（含设计/报价来源）、修改预约、接受/拒绝报价、取消或重新发起后，提交成功再向 `account:technician:<id>` 推送 `booking:changed`，仅携带 `orderId`。
- 美甲师预约接口成功写入后通过拦截器通知；支付确认在事务提交后通知。公开确认与定时任务也有对应通知调用。
- 小程序通过 `wx.connectSocket` 复用 `/socket.io/?EIO=4&transport=websocket`，令牌放在连接认证消息中，不放 URL。
- 当前实现是仅接收默认命名空间 JSON 事件的 Socket.IO v5 / Engine.IO v4 子集，支持认证、服务端 ping/pong、关闭与重连；不承担聊天发送、二进制和 ACK。
- 后端完成账号校验并加入房间后发 `booking:ready`；客户端在初次连接和重连成功后重新拉数据，补偿断线期间的事件。
- 首页、行程、全部预约、全部行程、日程和消息页实现 `onBookingChanged`。250ms 内事件合并，加载中事件延后处理。保留筛选和当前日期，静默刷新不显示整页 loading。
- 报价、编辑等表单页面不自动加载，避免覆盖输入；返回列表时仍走原有 onShow 加载。
- 切后台、退出登录关闭连接与计时器；回前台连接。重连退避 1–30 秒加随机抖动。认证拒绝停止重试；会话过期由现有登录流程处理。

## 上线条件

1. 部署包含预约事件的新后端，再上传小程序版本。仅修改本地文件不会更新线上服务。
2. 微信公众平台的 socket 合法域名需要包含 `wss://api.lunails.cn`。不要通过关闭域名校验替代配置。
3. 仓库 `deploy/nginx/conf.d/nailbook.conf` 已有 `/socket.io/` Upgrade 转发；发布时核实实际运行配置一致。
4. 当前房间投递使用 Socket.IO 进程内适配器。若后端扩容为多个实例，需要共享消息适配器，否则跨实例不能保证投递。
5. 前台实时通道不替代微信订阅消息；小程序关闭后仍依赖原有订阅消息通知。

## 验证

- `node client-wxapp/scripts/test-booking-realtime.js`：握手、心跳、合并刷新、加载中补拉、旧连接隔离、重连、后台停止、鉴权失败。
- `cd backend && npx jest --runInBand src/chat/booking-realtime.spec.ts src/orders/booking-events.interceptor.spec.ts`：实际 Socket.IO 服务与小程序传输模块对接、账号房间隔离、断线补拉、失败写入不推送。
- 真机验收：美甲师停留首页，另一账号提交预约；不操作美甲师端应更新待办。再验证取消、修改、后台恢复、弱网重连；报价输入时不应重载表单。

协议参考：https://socket.io/docs/v4/engine-io-protocol/ 、https://socket.io/docs/v4/socket-io-protocol/
