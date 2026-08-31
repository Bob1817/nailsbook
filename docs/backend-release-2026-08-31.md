# 后端发布记录 · 2026-08-31

- 用户授权：推送并部署已修改的后端更新。
- 后端提交：`bf5eca2e095b115b6fc69fd1dd837acbdfe13040`，分支 `codex/backend-staged-release-202608`，已推送 GitHub。
- 运维修复提交：`2b489ec1`，Certbot 内存限制由16MB改为256MB。
- 发布目录：`/opt/nailbook-releases/bf5eca2e095b115b6fc69fd1dd837acbdfe13040`。
- 运行镜像：`nailbook-backend:sha-bf5eca2e095b115b6fc69fd1dd837acbdfe13040`；镜像ID前缀 `3967532c73c3`。
- 范围：快捷预约与日期接单设置、客户预约卡片数据、月份经营统计、本人互动记录、专属邀请链接和微信邀请注册绑定，以及相关回归修复。未上传小程序、更新其他前端或开启快捷预约灰度名单。

## 验证

- 当前工作区后端全量测试：93套件、408测试通过（含引用小程序源码的契约检查）；已提交后端快照单独编译通过。
- 与上一版运行镜像的package-lock校验和一致，复用已有依赖，清除旧dist/prisma后复制候选编译产物及迁移，并在linux/amd64镜像内重新生成Prisma客户端。服务器未执行npm安装或TypeScript编译。
- 首次切换前停写并备份数据库；backup/prod.db及校验和保留。迁移20260830080000_quick_booking_days执行成功。
- 最终77项迁移全部完成，migrate diff无差异，完整性检查ok，外键检查通过，核心记录数未减少。
- HTTPS /api/health返回200；互动记录、日期接单设置、邀请链接接口未登录均返回401；应用running、重启0、OOM=false。
- 其他五个服务容器ID及镜像保持不变，Nginx仅重载。
- 未执行真实客户注册、预约、微信邀请链接生成、短信或支付；鉴权后业务和真机验收仍不能由上述健康检查替代。

## 发布中修复的证书故障

首次切换因API证书于2026-08-31到期而未通过HTTPS校验，脚本自动恢复上一版应用，未回滚数据库。Certbot被16MB限制终止（退出137）；已提高为256MB。前两次续期遇到证书机构DNS查询/DNSSEC校验故障，第三次成功，API证书有效至2026-11-29。

生产原定时任务在Certbot容器内调用宿主机hook，改为每天03:00执行已有deploy/renew-ssl.sh，在宿主机完成续期与Nginx重载；原crontab及Compose均已备份到发布目录。未关闭TLS校验或修改DNS安全设置。

第二次切换成功（activation-retry.log含ACTIVATION_SUCCEEDED），另存backup-retry/prod.db，第一次迁移前备份未覆盖。

## 运维

使用发布目录Compose与ecs.override.yml维护当前服务，不能使用会git add -A的旧一键发布脚本。

旧版本发布目录：`/opt/nailbook-releases/f76c3fd2656fdd80f575cc178c79fd5c8187a91a`。当前快捷预约灰度名单未开启；紧急应用回退可使用该目录Compose仅重建backend并重载Nginx，保留数据库最新写入。一旦启用新预约流程或日期停单，不可直接回退到忽略新规则的旧后端，应先评估兼容性。

服务器证据：source.tar、build.log、activation.log、activation-retry.log、cert-renew.log、containers-before.txt、containers-after.txt、health.json、备份及checksum.txt。

## 证书入口补充检查

用户报告ERR_CERT_DATE_INVALID后再次验证：API已提供有效新证书，本机及服务器检查通过；admin/m/tech三处仍引用各自过期副本。确认新API证书SAN覆盖四个域名后，将三处SSL配置及仓库模板统一引用该证书（含证书链），备份旧配置并通过nginx -t后重载。四个HTTPS入口严格校验证书均返回200。未关闭微信域名或TLS校验；用户端旧连接缓存或设备时间仍需在重新打开后确认，不能据此认定此次API报错一定来自其他三个入口。
