#!/usr/bin/env bash
set -euo pipefail
repo_dir="$(cd "$(dirname "$0")/../.." && pwd)"
cert_dir="$(mktemp -d)"
trap 'rm -rf "$cert_dir"' EXIT
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj /CN=isolated-qa.invalid \
  -keyout "$cert_dir/privkey.pem" -out "$cert_dir/fullchain.pem" >/dev/null 2>&1
for domain in api.lunails.cn admin.lunails.cn tech.lunails.cn m.lunails.cn lunails.cn; do
  mkdir -p "$cert_dir/$domain"
  cp "$cert_dir/privkey.pem" "$cert_dir/$domain/privkey.pem"
  cp "$cert_dir/fullchain.pem" "$cert_dir/$domain/fullchain.pem"
  cp "$cert_dir/fullchain.pem" "$cert_dir/$domain/chain.pem"
done
docker run --rm \
  --add-host backend:127.0.0.1 --add-host client-web:127.0.0.1 \
  --add-host admin-web:127.0.0.1 --add-host tech-web:127.0.0.1 --add-host website:127.0.0.1 \
  -v "$repo_dir/deploy/nginx/conf.d:/etc/nginx/conf.d:ro" \
  -v "$cert_dir:/etc/letsencrypt/live:ro" \
  nginx:1.27-alpine nginx -t
