#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

if [ "$(git branch --show-current)" != "main" ]; then
  echo "FAIL home-server releases must run from main" >&2
  exit 1
fi

if [ "${HOME_RELEASE_SKIP_GIT_PULL:-false}" != "true" ]; then
  git pull --ff-only origin main
fi

./scripts/home-preflight.sh

set -a
# shellcheck disable=SC1091
. ./.env
set +a

compose=(docker compose -f compose.home.yml --env-file .env)

"${compose[@]}" config --quiet
"${compose[@]}" build --pull
"${compose[@]}" up -d --wait --wait-timeout 120 postgres

"${compose[@]}" run --rm --no-deps \
  --entrypoint sh api \
  -lc "./node_modules/.bin/prisma migrate deploy"

# Recreate the gateway so bind-mounted Caddyfile changes are loaded on every
# release. Docker Compose does not detect changes to mounted file contents.
"${compose[@]}" up -d --force-recreate --wait --wait-timeout 120 gateway
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 180
"${compose[@]}" ps

"${compose[@]}" exec -T gateway \
  wget -qO- http://127.0.0.1:8080/_gateway/health | grep -qx 'ok'
echo "PASS local gateway health check"

if [ -n "${SMOKE_BASIC_AUTH_USER:-}" ] && \
   [ -n "${SMOKE_BASIC_AUTH_PASSWORD:-}" ] && \
   [ -n "${APP_BASE_URL:-}" ]; then
  ./scripts/smoke-test.sh "$APP_BASE_URL"
else
  echo "SKIP public smoke test: set SMOKE_BASIC_AUTH_USER and SMOKE_BASIC_AUTH_PASSWORD to enable it"
fi

echo "PASS home-server release completed"
