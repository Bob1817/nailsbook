# NailBook 隔离体验版准备

目前已运行的是**本机隔离调试环境**，尚未上传微信体验版，也不能让手机通过本机回环地址访问。

## 已准备

- 后端：独立镜像 `nailbook-qa-preview:local`，Compose 项目 `nailbook-qa-preview`。
- 入口：`http://127.0.0.1:3300`，只绑定本机；原有 3001 服务未更改。
- 数据卷：`nailbook-qa-preview_database`、`nailbook-qa-preview_uploads`，不使用原有数据库或上传卷。
- 后端仅连接 Docker internal 网络；网关提供本机入口。后端外网 TCP 连接测试已被阻断。
- 首发模式、密码登录；微信登录、支付、短信、云存储、Firebase 均未配置真实凭证。开发固定验证码关闭，后端以 production 模式运行。
- 一个测试美甲师、已绑定客户 A、未绑定客户 B，一个 128 元／60 分钟的测试服务及一张明确标注 QA 的占位作品。
- 小程序副本：仓库根目录 `.qa-local/wxapp`。使用 `touristappid`，导航标题带“测试”，所有已知正式 API 与旧 localhost 回退地址替换为 QA 地址。
- 测试密码和管理员密码随机生成，位于 `.qa-local/TEST-ACCOUNTS.md`；权限 0600，整个 `.qa-local` 已忽略提交。勿将密码放入小程序包或提交到 Git。

## 启动与复现

从仓库根目录运行：

```bash
python3 deploy/qa-preview/prepare-env.py
docker compose -f deploy/qa-preview/compose.yml build
docker compose -f deploy/qa-preview/compose.yml up -d --wait
docker compose -f deploy/qa-preview/compose.yml exec -T backend node /qa/seed.cjs
docker compose -f deploy/qa-preview/compose.yml restart backend
python3 deploy/qa-preview/prepare-wxapp.py
python3 deploy/qa-preview/verify.py
```

环境脚本保留已有随机密码，种子不覆盖已有账号密码。构建脚本拒绝覆盖已有小程序目录；重新生成时指定新目录，例如 `--output .qa-local/wxapp-next`。不要直接删除后端数据卷。

在微信开发者工具中作为新项目导入 `.qa-local/wxapp`，不要替换正在使用的 `client-wxapp` 项目。游客 AppID 副本仅供本机调试，无法作为正式可分发体验版上传。域名校验仅在该本地副本中关闭；远程构建会启用校验。

测试账号：美甲师 `19900000001`；客户 A `19900000002`；客户 B `19900000003`。密码见本机私有文件；这些手机号是测试标识，不用于发送短信。

停止但保留测试数据：

```bash
docker compose -f deploy/qa-preview/compose.yml stop
```

不要使用生产 Compose 文件管理本环境，也不要执行 `down -v` 来“刷新代码”。后端代码变更后重新 build/up；小程序副本是生成时的快照，不会跟随源码自动更新。

## 已验证

2026-08-30：镜像构建、数据库迁移和启动成功；三种测试账号均登录成功；订单和收入日历可访问，客户令牌访问美甲师订单被拒绝；测试预约提交及幂等重试成功，随后取消，两个端看到取消状态一致。仅创建一笔 QA 订单（ID 1，已取消），没有触碰正式 API。

验证结果在 `.qa-local/verification.json`；`verify.py` 固定请求本机 3300 端口，先验证 QA 项目／数据卷／店名／能力，再创建测试订单。重跑会留下新的已取消测试订单。

构建保护测试：

```bash
python3 -m unittest scripts.tests.test_qa_preview
```

覆盖正式 API 地址拒绝、正式 AppID 拒绝、远程 HTTP 拒绝、不覆盖源码／现有目录，以及副本中无正式 API 回退。未完成小程序模拟器实际页面点击和双手机验收。

## 变为手机可安装的体验版，还需要

1. 明确专用测试 HTTPS 域名及部署位置，配置 TLS、访问控制和微信合法服务器域名。不要直接将本机 3300 端口暴露公网。
2. 明确测试 AppID。本方案默认使用独立 AppID 隔离正式登录缓存；构建器拒绝直接使用正式 AppID。若只能沿用原 AppID，应先补充客户端存储隔离并复测，不应直接去掉保护。
3. 测试后端与网关部署到该环境，修改 QA 环境的 UPLOAD_BASE_URL，验证所有图片、请求和 WebSocket 地址均指向 QA。
4. 通过独立测试 AppID 的权限上传并设置体验版、配置体验成员。本次未修改微信后台、DNS、TLS、服务器安全组，也未上传代码。
5. 当前后端主动阻断外网；认证后测试真实微信能力需另行提供**测试专用**凭证和经过评审的出网方案，不能把生产密钥复制进来。

具备域名和独立测试 AppID 后生成新包（替换示例值）：

```bash
python3 deploy/qa-preview/prepare-wxapp.py \
  --api-base https://qa-api.example.com \
  --appid wx0000000000000000 \
  --output .qa-local/wxapp-experience
```

这里的域名与 AppID 均为占位示例，未配置。真实体验版准备完成前，不宣称“手机扫码即可使用”。
