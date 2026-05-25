#!/bin/sh
# 续期 SSL 证书（crontab 每天跑一次）
# crontab: 0 3 * * * /path/to/nailBook/deploy/renew-ssl.sh >> /var/log/certbot-renew.log 2>&1
set -e
cd "$(dirname "$0")/.."
docker compose run --rm certbot renew --quiet
docker compose exec nginx nginx -s reload
