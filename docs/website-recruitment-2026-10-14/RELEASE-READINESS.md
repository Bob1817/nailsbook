# 官网邀请入驻版发布准备记录

日期：2026-10-15
结论：**有条件可发布（Conditional Go）**。官网代码、申请接口、本地生产镜像及官网 GHCR 发布配置已经通过本地验证；正式上线前仍需让 CI 产出远程镜像，并完成生产数据库备份与迁移预检。

## 本次发布范围

必须成套发布：

1. `website/`：官网页面、入驻表单、小程序与公众号入口、响应式及折叠屏渐进适配。
2. `backend/src/artist-applications/`：申请校验、隐私保护、重复申请处理与审批服务方式兼容。
3. `backend/prisma/schema.prisma` 与 `backend/prisma/migrations/20261014000000_add_artist_application_followed_mp/`：可选公众号关注状态。
4. `admin-frontend/src/pages/ArtistApplications.tsx` 与 `admin-frontend/src/services/artistApplication.ts`：后台显示公众号关注状态。
5. 本目录下的调研、实施与发布记录。

工作区同时存在大量其他端改动。提交时必须逐路径暂存，禁止使用 `git add -A`。

## 已完成验证

| 检查项 | 结果 |
|---|---|
| 官网单元测试 | 3 个文件、11 项通过 |
| 官网生产构建 | 通过，包含颜色同步和颜色规范检查 |
| 官网生产依赖审计 | `npm audit --omit=dev`：0 个漏洞 |
| 开发依赖审计 | 剩余 3 个 Vitest 相关 moderate 告警，不进入 Nginx 运行镜像 |
| 官网 Docker 构建 | 通过；修复了容器内错误触发仓库级 Python `prebuild` 的问题 |
| 候选镜像 | `nailbook-website:rc-20261015` |
| 候选镜像摘要 | `sha256:8d31be52aa11b1b303916f07f42fa1c59ca2276325d3cb820fa8211a1f13fad3` |
| 镜像大小 / 运行内存 | 约 105 MB / 10.2 MiB |
| Nginx 配置 | `nginx -t` 通过 |
| SPA 路由 | `/`、`/apply`、`/faq`、`/contact`、`/application-info` 均返回 200；未知前端路由回退到首页 |
| 静态资源 | 哈希资源 30 天 immutable 缓存；缺失资源返回 404 |
| 入驻申请后端 | 2 个测试文件、15 项通过；生产构建通过 |
| Prisma schema 漂移 | 检查通过 |
| 管理后台生产构建 | 通过 |
| 当前线上可用性 | `https://lunails.cn/` 返回 200；`https://lunails.cn/api/health` 返回 `{"status":"ok"}` |

## 正式发布前动作

### 1. 官网镜像发布链路

本轮已经为常规 CI 和手动 release-from-ref 工作流增加官网 GHCR 镜像任务；`docker-compose.yml` 改为读取 `WEBSITE_IMAGE`，部署脚本对官网只执行拉取和启动，不再在 ECS 执行 `npm ci` 或 Vite 构建。

发布前仍需：

- 提交本次变更并让 CI 将镜像推送到 `ghcr.io/bob1817/nailsbook-website:sha-<commit>`。
- 在生产根目录 `.env` 设置 `WEBSITE_IMAGE=ghcr.io/bob1817/nailsbook-website:sha-<完整提交 SHA>`。
- 确认 ECS 已登录 GHCR 且具备 `read:packages` 权限。
- 对 CI 实际产出的 digest 再做一次记录；本地候选镜像 digest 只能证明同一工作区构建结果。

不得把本地 `rc-20261015` 标签当作生产可拉取镜像；它目前只存在于本机 Docker。

### 2. 数据库备份和迁移

官网申请字段依赖迁移 `20261014000000_add_artist_application_followed_mp`。部署后端前必须：

1. 检查 ECS 磁盘与内存。
2. 备份生产 SQLite 数据库并记录备份文件路径和校验值。
3. 在生产镜像中执行 `prisma migrate status`，确认待执行迁移集合。
4. 使用 `prisma migrate deploy`；禁止使用 `prisma db push`。
5. 验证旧申请可读取、新申请可写入、重复手机号不会泄露申请状态。

本地 `dev.db` 显示多项历史迁移未应用，这不能代表生产状态；生产必须单独只读核查。

### 3. 运营承接

- 确认 NailBook 公众号消息由明确人员接收。
- 确认申请审核、联系、开通和激活信息交付责任人。
- 不对外承诺尚未确认的回复时间。

## 推荐发布顺序

1. 将本次范围文件单独提交，记录完整 commit SHA。
2. CI 重新运行官网测试、官网构建、后端申请测试、后端构建、管理后台构建。
3. 构建并推送三个不可变镜像：backend、admin-web、website；记录 digest。
4. ECS 发布前检查资源并备份数据库。
5. 串行更新 backend，确认迁移与 `/health` 正常。
6. 更新 admin-web，确认申请列表和详情可打开。
7. 更新 website，确认首页、申请页、FAQ、咨询页和申请说明页。
8. 通过隔离测试手机号提交一条申请，确认后台可见后清理测试数据或明确标记为测试。
9. 检查移动端、微信内置浏览器、小程序码与公众号二维码。
10. 观察 Nginx 与后端错误日志，再决定是否扩大邀请范围。

## 回滚准备

- 保留发布前 backend、admin-web、website 三个镜像标签和 digest。
- 保留发布前数据库备份；应用回滚与数据库回滚必须分别判断，不直接覆盖生产库。
- 官网异常时优先将 `WEBSITE_IMAGE` 切回上一 digest 并重建 website 容器。
- 后端迁移后如需回滚，先评估新列兼容性；本次只新增带默认值的布尔列，旧应用读取不依赖该列，但仍须以生产备份为最终恢复点。

## 发布后验收

- `https://lunails.cn/`、`/apply`、`/faq`、`/contact`、`/application-info` 返回 200。
- 首页 280px 无横向溢出；390px 首屏无固定 CTA，离开主视觉后 CTA 出现。
- 小程序码和公众号二维码可识别，品牌名称与文案一致。
- 申请接口成功时展示明确下一步；失败时可以重试，不产生重复有效申请。
- 管理后台能看到新申请及可选公众号关注状态。
- Nginx、backend 在观察窗口内没有新增 5xx 或持续异常日志。

折叠屏铰链媒体查询已完成源码和构建验证；支持双视口分段的真机验证可在扩大招募前完成，不阻断小范围邀请发布。
