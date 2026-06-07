#!/bin/sh
# 首次申请 SSL 证书（支持多域名）。
# 用法: ./deploy/init-ssl.sh <email>
# 子域名各一张证书：api/m/admin/tech.lunails.cn
# 官网 apex 一张证书同时覆盖：lunails.cn + www.lunails.cn

set -e
EMAIL=${1:?usage: $0 <email>}

cd "$(dirname "$0")/.."

SUBDOMAINS="api.lunails.cn m.lunails.cn admin.lunails.cn tech.lunails.cn"

# 启动 nginx（HTTP 模式，用于 ACME 验证）
docker compose up -d nginx

for DOMAIN in $SUBDOMAINS; do
    echo "===== 申请证书: $DOMAIN ====="
    docker compose run --rm certbot certonly \
      --webroot \
      --webroot-path /var/www/certbot \
      --email "$EMAIL" \
      --agree-tos \
      --no-eff-email \
      -d "$DOMAIN"
    echo ""
done

echo "===== 申请官网证书: lunails.cn + www.lunails.cn ====="
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d lunails.cn -d www.lunails.cn

echo "===== 所有证书申请完成，启用 HTTPS 配置 ====="

# 去掉所有 .disabled 后缀
for DOMAIN in m.lunails.cn admin.lunails.cn tech.lunails.cn lunails.cn; do
    DISABLED="deploy/nginx/conf.d/${DOMAIN}-ssl.conf.disabled"
    ENABLED="deploy/nginx/conf.d/${DOMAIN}-ssl.conf"
    if [ -f "$DISABLED" ]; then
        mv "$DISABLED" "$ENABLED"
        echo "已启用: $ENABLED"
    fi
done

echo "重启 nginx..."
docker compose restart nginx
echo "完成。之后由 renew-ssl.sh 自动续期。"
