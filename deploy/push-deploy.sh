#!/bin/bash
# ============================================================
# NailBook 本地一键发布脚本（在本地 Mac 上运行）
#
# 用法:
#   ./deploy/push-deploy.sh                    # 提交并部署（自动检测变更）
#   ./deploy/push-deploy.sh -m "修复XX问题"     # 带 commit message
#   ./deploy/push-deploy.sh all                # 提交并全量重建
#   ./deploy/push-deploy.sh backend            # 提交并仅重建后端
# ============================================================
set -e

cd "$(dirname "$0")/.."

ECS_HOST="47.96.159.106"
ECS_USER="root"
BRANCH=$(git branch --show-current)

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log()  { echo -e "${GREEN}[PUSH]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# ---------- 解析参数 ----------
COMMIT_MSG=""
DEPLOY_TARGET=""

while [ $# -gt 0 ]; do
    case $1 in
        -m|--message) COMMIT_MSG="$2"; shift 2 ;;
        *)            DEPLOY_TARGET="$1"; shift ;;
    esac
done

# ---------- 1. 检查变更 ----------
if git diff --quiet && git diff --cached --quiet; then
    warn "本地无变更，跳过 commit，直接触发远程部署"
else
    # 生成默认 commit message
    if [ -z "$COMMIT_MSG" ]; then
        CHANGED_FILES=$(git diff --name-only; git diff --cached --name-only)
        FIRST_FILE=$(echo "$CHANGED_FILES" | head -1)
        COUNT=$(echo "$CHANGED_FILES" | wc -l | xargs)
        COMMIT_MSG="update: $FIRST_FILE (+$((COUNT-1)) files)"
    fi

    log "提交变更: $COMMIT_MSG"
    git add -A
    git commit -m "$COMMIT_MSG"
fi

# ---------- 2. 推送到远程 ----------
log "推送到 origin/$BRANCH ..."
git push origin "$BRANCH" 2>&1

# ---------- 3. SSH 触发远程部署 ----------
log "SSH 连接 ECS ($ECS_HOST) ..."

if [ -n "$DEPLOY_TARGET" ]; then
    REMOTE_CMD="cd /opt/nailbook && DEPLOY_BRANCH=$BRANCH ./deploy/deploy.sh $DEPLOY_TARGET"
else
    REMOTE_CMD="cd /opt/nailbook && DEPLOY_BRANCH=$BRANCH ./deploy/deploy.sh"
fi

ssh -o ConnectTimeout=10 "$ECS_USER@$ECS_HOST" "$REMOTE_CMD"

echo ""
log "发布完成 ✓"
