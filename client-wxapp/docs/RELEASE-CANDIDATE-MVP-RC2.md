# luanails MVP RC2 发布候选说明

候选版本：`luanails-mvp-rc.2`

整理日期：2026-08-03

状态：候选已冻结、完成生产部署并通过 CI；小程序 2.1.10 已上传，待设为体验版、双账号及真机验收

冻结提交：`8f3a009 feat: freeze luanails mvp rc2`

部署流程修正：`6b35e1a fix(deploy): use migrations and external admin image`

预约时区生产修复：`25114af fix(orders): make booking validation timezone-safe`

## 1. 候选目标

RC2 在 RC1 的预约、作品和客户管理基线上，补齐一期 MVP 的非微信支付业务闭环，并为微信登录和微信支付提供可安全降级的配置基础。

## 2. 候选范围

### 包含

- `backend/`：NestJS 服务、Prisma schema、37 个数据库迁移和测试。
- `admin-frontend/`：微信登录和微信支付配置管理页面。
- `client-wxapp/`：微信小程序 61 个注册页面、服务和工具。
- 本次相关产品、技术、迁移、验收及发布文档。

### 明确排除

- `mobile-flutter/`
- `client-frontend/`
- `technician-frontend/`
- `landing-frontend/`
- `website/`

上述目录不进入 RC2 冻结提交。

## 3. RC2 主要增量

- 客户来源、生命周期、跟进任务和经营指标。
- 预约提醒、工作时间完整区间校验和预约冲突复查。
- 单层客户推荐、首个有效订单资格、5% 美甲基金奖励、基金抵扣和取消冲正。
- 独立支付单、定金和尾款金额及幂等状态基础；真实微信支付仍等待商户资质。
- 订阅权益、用量、额度和免费版自动降级。
- 微信授权登录、手机号登录切换、账号绑定及数据库验证码限流。
- 后台微信能力加密配置和在线校验；配置无效时小程序隐藏微信登录和支付入口。

## 4. 自动化验证基线

- Prisma schema：通过。
- 全新 SQLite 数据库顺序执行 37 个迁移：通过。
- SQLite 外键检查：无异常；完整性检查：`ok`。
- Backend：47 个测试套件、210 项测试在 UTC 环境通过；生产构建通过。预约工作时间统一按 `Asia/Shanghai` 业务时区解析，不再依赖运行主机时区。
- Admin Frontend：生产构建通过。
- 微信小程序：61 个页面静态检查通过；全部 JavaScript 语法检查通过。
- `git diff --check`：通过。

冻结提交后，必须在该提交上重新运行以上检查，并以 CI 结果作为最终自动化门槛。

## 5. 部署前人工门槛

- [x] GitHub Actions Backend 检查通过（47 个测试套件、210 项测试及生产构建）。
- [x] Cloudflare `lunails` 和 `nailsbook` 已确认不属于仅包含 Backend、Admin Frontend 和微信小程序的 RC2 候选范围。
- [x] 生产数据库已备份并通过 `prisma migrate deploy` 完成 37 个迁移；外键检查无异常，完整性检查为 `ok`。
- [ ] 客户、美甲师和管理员账号完成注册、登录、刷新及找回密码验收。
- [ ] 完成美甲师绑定、客户邀请、预约、报价、基金抵扣、订单完成和奖励发放闭环。
- [ ] 验证重叠预约、重复请求和订单取消冲正。
- [ ] 微信配置为空和校验失败时，登录及支付入口保持隐藏。
- [ ] 使用真实 AppID 验证微信登录、手机号账号合并和绑定冲突。
- [ ] iOS、Android 各完成一次图片、位置、分享、弱网和安全区真机冒烟。

真实微信预下单、支付回调验签、退款和订阅线上支付不属于当前无商户资质候选的完成项，相关入口必须保持关闭。

## 6. 生产配置门槛

- 设置并备份长期固定、至少 32 位的 `SYSTEM_CONFIG_ENCRYPTION_KEY`。
- 配置数据库、JWT、验证码 Pepper、短信、存储、CORS、WebSocket 和各端生产 API 地址。
- 不在仓库、构建日志或发布文档中保存生产密钥。
- 微信配置只能通过管理后台保存；修改后必须重新在线校验。

## 7. 部署与回滚

部署顺序：停止写入 → 完整备份 → 执行迁移 → 部署 Backend → 只读冒烟 → 部署 Admin Frontend → 上传小程序体验版 → 双账号真机验收 → 发布。

截至 2026-08-03，完整备份、迁移、Backend 和 Admin Frontend 部署及只读 HTTP 冒烟已完成；预约时区修复也已部署，37 个迁移无待执行项，公网健康及微信能力接口均为 200，数据库完整性为 `ok`、外键异常为 0。小程序 `2.1.10` 已成功上传，开发校验脚本已通过 `packOptions.ignore` 排除；下一发布门槛为在微信公众平台将该版本设为体验版。

完整数据库步骤以 [DATABASE-MIGRATION-DEPLOYMENT.md](../../backend/docs/DATABASE-MIGRATION-DEPLOYMENT.md) 为准。SQLite 不执行未验证的逆向 SQL；迁移失败时停止服务并恢复升级前完整备份。当前档期互斥只支持单 Backend 实例，多实例部署前必须更换为具备数据库级并发约束的方案。
