# P0-06 公开品牌主页 API

## 公开接口

以美甲师 ID 为 `:id`，以下接口均不需要登录：

- `GET /api/public/brands/:id`：品牌资料、公开服务区域、环境、规则、FAQ 和分享资料。
- `GET /api/public/brands/:id/services`：可预约且未归档的服务、时长和价格。
- `GET /api/public/brands/:id/works`：已授权、已审核、已公开且未归档的作品列表。
- `GET /api/public/brands/:id/works/:workId`：公开作品详情。
- `GET /api/public/brands/:id/reviews`：已完成服务的匿名评价和评分摘要。
- `GET /api/public/brands/:id/availability`：接单就绪状态、服务方式和未来可预约日期摘要。

## 通用参数

- `page` / `pageSize`：页码和每页条数，`pageSize` 限制在 1–50。
- `imageSize`：`thumbnail`、`medium` 或 `original`，默认 `medium`。
- `source` / `campaign` / `content`：来源、活动和内容标识，最长保留 100 字符，在 `attribution` 中原样返回供前端继续传递。

## 缓存、限流与错误

- 稳定内容返回 `Cache-Control: public, max-age=60, stale-while-revalidate=300`。
- 可预约摘要使用 30 秒缓存。
- 品牌资料在服务内使用 60 秒、最多 500 个 key 的有界内存缓存。
- 公开品牌接口限制为每 IP 每分钟 30 次，超限返回 429。
- 品牌、作品不存在或已下架时统一返回 404，不暴露内部状态。
- 非法数字 ID 由 Nest 参数校验返回 400。

## 公开字段边界

- 仅返回 `publicServiceArea`，旧数据才回退到粗粒度 `serviceArea`。
- 不查询也不返回手机号、微信、精确门牌地址、内部排期、客户 ID、预约 ID、审核人和审核备注。
- 评价作者统一显示为“匿名客户”；只有已获图片使用授权的评价才返回照片。
- 公开 DTO 快照测试锁定字段结构，并单独断言精确地址和联系方式不会泄露。
