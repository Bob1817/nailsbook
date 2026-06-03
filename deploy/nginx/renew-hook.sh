#!/bin/sh
# Certbot deploy hook: reload nginx after successful certificate renewal
cd /opt/nailbook
docker compose exec nginx nginx -s reload 2>&1
echo "[$(date)] Cert renewed, nginx reloaded" >> /var/log/certbot-renew.log
