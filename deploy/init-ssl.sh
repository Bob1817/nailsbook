#!/bin/sh
# 首次申请 SSL 证书。已有证书后无需再运行。
# 用法: ./deploy/init-ssl.sh api.YOUR_DOMAIN.com admin@YOUR_DOMAIN.com

set -e
DOMAIN=${1:?usage: $0 <domain> <email>}
EMAIL=${2:?usage: $0 <domain> <email>}

cd "$(dirname "$0")/.."

# 启动 nginx（仅 HTTP 模式，先注释掉 HTTPS server block 或用 --staging 测试）
docker compose up -d nginx

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "证书申请完成，重启 nginx..."
docker compose restart nginx
echo "完成。之后由 renew-ssl.sh 自动续期。"
