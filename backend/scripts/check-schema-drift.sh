#!/usr/bin/env bash
# ============================================================
# 检测 Prisma schema 漂移：schema.prisma 的改动是否都已生成迁移。
#
# 背景：`prisma migrate status` 只报告「迁移是否都已 applied」，查不出
# 「schema 里加了字段但没人建迁移」。这类漂移在生产环境跑旧镜像时不报错，
# 一旦重新部署就会爆 "The column ... does not exist"，属于上线后才暴露的 P0。
#
# 用法：
#   npm run check:schema-drift      # 在本机 / CI 发布前执行
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT
# 每次 diff 都要用全新的 shadow DB，复用会被 prisma 判定为非空而失败
touch "$WORK_DIR/check.db" "$WORK_DIR/print.db"

BANNER='Update available|major update|pris\.ly|prisma@latest|npm i |^\s*[│┌└·]|^\s*$'

set +e
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "file:$WORK_DIR/check.db" \
  --exit-code >/dev/null 2>&1
RESULT=$?
set -e

if [ "$RESULT" -eq 0 ]; then
  echo "✓ schema 漂移检查通过：prisma/migrations 与 schema.prisma 一致"
  exit 0
fi

echo "✗ 检测到 schema 漂移：schema.prisma 存在尚未生成迁移的变更"
echo ""
echo "缺失对应迁移文件的 SQL："
echo "------------------------------------------------------------"
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "file:$WORK_DIR/print.db" \
  --script 2>/dev/null | grep -vE "$BANNER" || true
echo "------------------------------------------------------------"
echo ""
echo "修复：运行 npx prisma migrate dev --name <描述> 生成迁移并提交入库。"
echo "禁止用 prisma migrate resolve 谎报或用 prisma db push 代替生产迁移。"
exit 1
