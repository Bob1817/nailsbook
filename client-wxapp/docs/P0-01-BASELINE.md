# P0-01 项目基线与改造保护

记录时间：2026-08-12（Asia/Shanghai）

## 1. Git 与运行环境

- 仓库状态：detached HEAD（当前没有分支名）
- 基准提交：`f986b68902a4a7317263708551eeaddb25643988`
- 提交时间：`2026-08-12T21:29:25+08:00`
- 提交说明：`feat(backend): prepare WeChat mini program services for deployment`
- Node.js：`v25.6.0`
- npm：`11.8.0`
- Prisma CLI / Client：`5.22.0`
- 数据库：SQLite
- 小程序：微信原生小程序
- 后端：NestJS + Prisma

## 2. 改造保护边界

执行 P0-01 前，工作区已有 57 个已跟踪文件发生修改，共约 1134 行新增、315 行删除，并存在未跟踪页面、脚本、工具和文档。这些修改均视为用户已有工作，本批未修改。

既有修改主要分布在：

- `admin-frontend/src/pages` 与 `admin-frontend/src/services`；
- `client-wxapp/app.json`；
- `client-wxapp/components`；
- 客户端主页、作品、订单、登录、推荐等页面；
- 美甲师经营数据、主页配置、作品编辑等页面；
- `client-wxapp/services/api.js` 和 `utils/request.js`；
- iOS 工作区用户状态文件。

既有未跟踪内容包括：

- `docs/PRODUCTION-CONTENT-DATA-CHECKLIST.md`；
- `pages/technician/binding-applications/`；
- `scripts/test-artist-navigation.js`；
- `scripts/test-conversion-tracking.js`；
- `scripts/test-work-entry.js`；
- `utils/artist-navigation.js`；
- `utils/conversion-tracking.js`；
- 仓库外层的 WorkBuddy 与 iOS 共享工作区文件。

本批新增范围仅限：

- `client-wxapp/docs/P0-01-BASELINE.md`；
- `client-wxapp/docs/P0-01-TRACEABILITY.md`；
- `client-wxapp/docs/P0-01-SMOKE-AND-METRICS.md`；
- 本地忽略目录 `backups/20260812-p0-01/`。

后续批次开始前必须重新记录 `git status --short`，不得格式化、回滚或提交上述既有改动。

## 3. 数据与上传资源备份

备份目录：`/Users/shibo/Documents/Codex/nailBook/backups/20260812-p0-01`

| 文件 | 内容 | SHA-256 |
|---|---|---|
| `dev.db` | `backend/dev.db` 的 SQLite `.backup` | `ae4273a27a4553f467380cf666a19d6ac70905471855af96e9c7c95dabf12582` |
| `prod.db` | `backend/prod.db` 的 SQLite `.backup` | `ae4273a27a4553f467380cf666a19d6ac70905471855af96e9c7c95dabf12582` |
| `uploads.tar.gz` | `backend/uploads`，归档内 408 个条目 | `d68270b377391f9b22e13be4941f07b5b876404b5ef45b44494b18d6f5e5eebe` |

两份数据库备份的 `PRAGMA integrity_check` 均为 `ok`。

重要限制：仓库中的 `backend/dev.db` 与 `backend/prod.db` 原文件均为 0 字节空文件，不是包含历史业务数据的运行库。生产配置使用 OSS，本地 `uploads` 归档不能替代 OSS bucket 的版本化或云端备份。

恢复本地数据库时，应先停止后端写入，将失败数据库另存用于排查，再把备份复制到新的明确路径并修改 `DATABASE_URL` 指向该路径。恢复后执行：

```bash
sqlite3 /absolute/path/to/restored.db "PRAGMA integrity_check; PRAGMA foreign_key_check;"
```

恢复上传资源：

```bash
mkdir -p /absolute/path/to/restore-root
tar -xzf /Users/shibo/Documents/Codex/nailBook/backups/20260812-p0-01/uploads.tar.gz \
  -C /absolute/path/to/restore-root
```

不得在未备份数据库上执行 `prisma migrate reset`、`prisma db push --force-reset` 或手工删除 `_prisma_migrations`。

## 4. 自动化检查基线

### 小程序

- 静态检查：通过，69 个页面、91 个 JavaScript 文件、80 个 JSON 文件；
- 转化追踪检查：通过；
- 美甲师主页导航检查：通过；
- 作品持续入口检查：通过；
- 订阅用量边界检查：通过。

复现命令：

```bash
cd /Users/shibo/Documents/Codex/nailBook/client-wxapp
node scripts/validate-miniprogram.js
node scripts/test-conversion-tracking.js
node scripts/test-artist-navigation.js
node scripts/test-work-entry.js
node scripts/test-subscription-usage.js
```

### 后端

- `npm run build`：通过；
- Jest：63 个测试套件、263 项测试全部通过；
- 测试日志中的临时提醒通道错误为测试覆盖场景，未造成测试失败。

复现命令：

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
npm run build
npm test -- --runInBand
```

## 5. 数据库迁移基线

全新临时数据库验证结果：

- 50 个迁移全部成功应用；
- `_prisma_migrations` 中 50 个迁移完成；
- `PRAGMA foreign_key_check` 无异常；
- `PRAGMA integrity_check` 返回 `ok`；
- 生成数据库约 900KB。

但 schema diff 返回退出码 `2`，存在两项差异：

- `MarketingMaterial` 需要重建；
- `SubscriptionResourceUsage` 需要重建。

因此当前结论是：全新数据库迁移链可执行，但迁移结果与 `schema.prisma` 不是严格零差异。该问题应在新增业务迁移前修复，不能把当前迁移链标记为生产零差异基线。

复现命令：

```bash
cd /Users/shibo/Documents/Codex/nailBook/backend
baseline_dir=$(mktemp -d /tmp/nailbook-migration.XXXXXX)
baseline_db="$baseline_dir/fresh.db"
touch "$baseline_db"
DATABASE_URL="file:$baseline_db" npx prisma migrate deploy
DATABASE_URL="file:$baseline_db" npx prisma migrate status
DATABASE_URL="file:$baseline_db" npx prisma migrate diff \
  --from-url "file:$baseline_db" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
sqlite3 "$baseline_db" "PRAGMA foreign_key_check; PRAGMA integrity_check;"
```

历史数据库迁移状态：**未验证**。原因是工作区没有非空历史数据库副本。取得匿名化生产副本后，必须按照 `backend/docs/DATABASE-MIGRATION-DEPLOYMENT.md` 执行历史结构预检、备份、迁移、schema diff、外键检查、完整性检查和核心数据数量对账。

## 6. 当前阻断项与风险

1. 当前处于 detached HEAD；进入业务开发前应创建或切换到明确的 `codex/` 分支，但不能在未确认既有修改归属前直接提交。
2. 缺少非空历史数据库副本，历史迁移验收尚未完成。
3. 全新迁移后存在两张表的 schema diff，新增迁移前应先修复。
4. 本地上传备份不包含 OSS 云端对象的独立备份证明。
5. 公开主页和作品接口存在字段暴露风险，详见 `P0-01-TRACEABILITY.md`。

## 7. P0-01 完成结论

已建立可复现的 Git、环境、备份、构建、测试、全新迁移、冒烟与指标基线。P0-01 可以作为审计阶段完成，但进入涉及数据模型的 P0-03/P0-04 前，必须先处理 schema diff，并取得历史数据库副本完成迁移验证。
