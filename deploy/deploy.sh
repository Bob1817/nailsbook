#!/bin/bash
# ============================================================
# NailBook 一键部署脚本（在 ECS 服务器上运行）
#
# 用法:
#   ./deploy/deploy.sh              # 自动检测变更，按需构建
#   ./deploy/deploy.sh all          # 全量重建所有服务
#   ./deploy/deploy.sh backend      # 仅重建后端
#   ./deploy/deploy.sh client-web   # 仅重建用户端
#   ./deploy/deploy.sh admin-web    # 仅重建管理后台
#   ./deploy/deploy.sh tech-web     # 仅重建美甲师端
#   ./deploy/deploy.sh nginx        # 仅重启 nginx（配置变更）
# ============================================================
set -e

cd "$(dirname "$0")/.."

BRANCH=${DEPLOY_BRANCH:-feature/booking-flow-optimization}
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ---------- 1. 拉取最新代码 ----------
log "拉取最新代码 (branch: $BRANCH) ..."
BEFORE=$(git rev-parse HEAD 2>/dev/null || echo "none")
git pull origin "$BRANCH" 2>&1 || err "git pull 失败，请检查网络或分支"
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ] && [ -z "$1" ]; then
    log "代码无变更，无需部署 ✓"
    exit 0
fi

# ---------- 2. 确定要重建的服务 ----------
TARGET=$1

if [ -n "$TARGET" ] && [ "$TARGET" != "all" ]; then
    # 手动指定服务
    SERVICES="$TARGET"
elif [ "$TARGET" = "all" ]; then
    SERVICES="backend client-web admin-web tech-web website"
else
    # 自动检测变更文件（排除 client-wxapp / mobile-flutter / docs 等非 Web 目录）
    ALL_CHANGED=$(git diff --name-only "$BEFORE" "$AFTER" 2>/dev/null || echo "")
    CHANGED=$(echo "$ALL_CHANGED" | grep -v "^client-wxapp/" | grep -v "^mobile-flutter/" | grep -v "^docs/" || true)

    # 如果过滤后无 Web 相关变更，跳过部署
    if [ -z "$CHANGED" ] && [ -n "$ALL_CHANGED" ]; then
        log "本次变更仅涉及 client-wxapp / mobile-flutter / docs，无需更新 ECS ✓"
        exit 0
    fi

    SERVICES=""

    echo "$CHANGED" | grep -q "^backend/"              && SERVICES="$SERVICES backend"
    echo "$CHANGED" | grep -q "^client-frontend/"      && SERVICES="$SERVICES client-web"
    echo "$CHANGED" | grep -q "^admin-frontend/"       && SERVICES="$SERVICES admin-web"
    echo "$CHANGED" | grep -q "^technician-frontend/"  && SERVICES="$SERVICES tech-web"
    echo "$CHANGED" | grep -q "^website/"              && SERVICES="$SERVICES website"

    # docker-compose 或 nginx 配置变更 → 全量重建
    echo "$CHANGED" | grep -q "^docker-compose.yml"    && SERVICES="backend client-web admin-web tech-web website"
    echo "$CHANGED" | grep -q "^deploy/nginx/"         && SERVICES="$SERVICES nginx-restart"

    # 如果过滤后仍无具体 Web 服务变更，跳过
    if [ -z "$SERVICES" ]; then
        log "未检测到 Web 服务相关变更，跳过部署 ✓"
        exit 0
    fi
fi

# 去重
SERVICES=$(echo "$SERVICES" | tr ' ' '\n' | sort -u | tr '\n' ' ' | xargs)

log "变更服务: $SERVICES"

# ---------- 3. 拉取外部构建镜像并逐个构建其余服务（避免 OOM）----------
NEED_NGINX_RESTART=false

for SVC in $SERVICES; do
    if [ "$SVC" = "nginx-restart" ]; then
        NEED_NGINX_RESTART=true
        continue
    fi
    if [ "$SVC" = "admin-web" ]; then
        log "拉取外部构建的 $SVC 镜像 ..."
        docker compose pull "$SVC" 2>&1 || err "$SVC 镜像拉取失败"
        log "$SVC 镜像拉取完成 ✓"
        continue
    fi
    log "构建 $SVC ..."
    docker compose build "$SVC" 2>&1 || err "$SVC 构建失败"
    log "$SVC 构建完成 ✓"
done

# ---------- 4. 重启服务 ----------
RESTART_LIST=""
for SVC in $SERVICES; do
    [ "$SVC" = "nginx-restart" ] && continue
    RESTART_LIST="$RESTART_LIST $SVC"
done

if [ -n "$RESTART_LIST" ]; then
    log "重启服务:$RESTART_LIST ..."
    docker compose up -d $RESTART_LIST 2>&1
fi

if $NEED_NGINX_RESTART; then
    log "重启 nginx ..."
    docker compose restart nginx 2>&1
fi

# ---------- 5. 健康检查 ----------
log "等待服务启动 (8s) ..."
sleep 8

log "健康检查:"
check() {
    local name=$1 url=$2 expect=$3
    code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || echo "000")
    if [ "$code" = "$expect" ]; then
        echo -e "  ${GREEN}✓${NC} $name -> $code"
    else
        echo -e "  ${RED}✗${NC} $name -> $code (期望 $expect)"
    fi
}

check "api.lunails.cn   " "https://api.lunails.cn/api/admin/feature-flags" "401"
check "m.lunails.cn     " "https://m.lunails.cn/"                          "200"
check "admin.lunails.cn " "https://admin.lunails.cn/"                      "200"
check "tech.lunails.cn  " "https://tech.lunails.cn/"                       "200"
check "lunails.cn       " "https://lunails.cn/"                            "200"

# ---------- 6. 容器状态 ----------
log "容器状态:"
docker compose ps --format 'table {{.Name}}\t{{.Status}}' 2>&1

echo ""
log "部署完成 ✓  ($TIMESTAMP)"
