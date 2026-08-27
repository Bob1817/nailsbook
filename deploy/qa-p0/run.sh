#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "$0")/../.." && pwd)"
project="nailbook-p0-qa-$$"
output_dir="$repo_dir/deploy/qa-p0/artifacts"
stats_pid=""
mkdir -p "$output_dir"
compose() { docker compose -p "$project" -f "$repo_dir/deploy/qa-p0/compose.yml" "$@"; }
cleanup() {
  if [ -n "$stats_pid" ]; then kill "$stats_pid" 2>/dev/null || true; fi
  compose logs --no-color > "$output_dir/containers.log" 2>&1 || true
  compose down --volumes --remove-orphans || true
}
trap cleanup EXIT

git -C "$repo_dir" rev-parse HEAD > "$output_dir/base-commit.txt"
git -C "$repo_dir" status --porcelain > "$output_dir/worktree-status.txt"
bash "$repo_dir/deploy/qa-p0/validate-nginx.sh" 2>&1 | tee "$output_dir/nginx-config.log"
docker build -t nailbook-p0-validation:20260827 "$repo_dir/backend" 2>&1 | tee "$output_dir/build.log"
docker image inspect nailbook-p0-validation:20260827 --format '{{.Id}}' > "$output_dir/image-id.txt"
compose up -d --wait backend nginx
compose exec -T backend node < "$repo_dir/deploy/qa-p0/auth.cjs" 2>&1 | tee "$output_dir/authorization.log"
docker stats --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' $(compose ps -q backend nginx) > "$output_dir/resources.log" &
stats_pid=$!
compose run --rm load-a > "$output_dir/client-a.log" 2>&1 &
client_a_pid=$!
compose run --rm load-b > "$output_dir/client-b.log" 2>&1 &
client_b_pid=$!
result=0
wait "$client_a_pid" || result=1
wait "$client_b_pid" || result=1
cat "$output_dir/client-a.log" "$output_dir/client-b.log"
exit "$result"
