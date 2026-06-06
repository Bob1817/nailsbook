#!/bin/bash
# ============================================================
# 将本地 uploads 目录同步到 ECS 服务器
# 用法: ./deploy/sync-uploads.sh
# ============================================================
set -e

cd "$(dirname "$0")/.."

ECS_HOST="47.96.159.106"
ECS_USER="root"
REMOTE_DIR="/opt/nailbook/backend/uploads"

GREEN='\033[0;32m'
NC='\033[0m'
log() { echo -e "${GREEN}[SYNC]${NC} $1"; }

log "同步本地 uploads/ → $ECS_HOST:$REMOTE_DIR ..."
ssh "$ECS_USER@$ECS_HOST" "mkdir -p $REMOTE_DIR"
rsync -avz --progress backend/uploads/ "$ECS_USER@$ECS_HOST:$REMOTE_DIR/"
log "同步完成 ✓"
