#!/usr/bin/env bash
set -Eeuo pipefail

pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1" >&2; exit 1; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

[ -f package.json ] && [ -d apps/api ] && [ -d apps/web ] \
  || fail "run this script from the KommuneFlow AI repository"
pass "repository root detected"

command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker info >/dev/null 2>&1 || fail "Docker daemon is not available"
pass "Docker available"

docker compose version >/dev/null 2>&1 || fail "Docker Compose is not available"
pass "Docker Compose available"

command -v git >/dev/null 2>&1 || fail "Git is not installed"
pass "Git available"

[ -f .env ] || fail ".env is missing"
[ -f compose.home.yml ] || fail "compose.home.yml is missing"
[ -f deploy/home/Caddyfile ] || fail "deploy/home/Caddyfile is missing"
pass "deployment files exist"

docker network inspect proxy >/dev/null 2>&1 || fail "Docker network proxy does not exist"
pass "proxy network exists"

set -a
# shellcheck disable=SC1091
. ./.env
set +a

required_variables=(
  APP_DOMAIN APP_BASE_URL API_BASE_URL CORS_ALLOWED_ORIGINS
  POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD JWT_SECRET SESSION_SECRET
  STATUS_CODE_PEPPER DEMO_BASIC_AUTH_USER DEMO_BASIC_AUTH_HASH
  SEED_DEMO_PASSWORD SEED_RECRUITER_PASSWORD
  PORTFOLIO_DEMO_ENABLED PORTFOLIO_DEMO_ALLOWED_TENANTS
  PORTFOLIO_DEMO_DEFAULT_TENANT PORTFOLIO_DEMO_SESSION_TTL_SECONDS
)

for variable_name in "${required_variables[@]}"; do
  [ -n "${!variable_name:-}" ] || fail "$variable_name is missing or empty"
  case "${!variable_name}" in
    *replace-with-*) fail "$variable_name still contains a placeholder" ;;
  esac
done
pass "required environment variables are configured"

[ "${AI_PROVIDER:-}" = "mock" ] || fail "AI_PROVIDER must equal mock"
[ -z "${OPENAI_API_KEY:-}" ] || fail "OPENAI_API_KEY must be empty"
pass "mock AI configuration enforced"

case "$APP_BASE_URL" in https://*) ;; *) fail "APP_BASE_URL must use HTTPS" ;; esac
case "$API_BASE_URL" in https://*) ;; *) fail "API_BASE_URL must use HTTPS" ;; esac
case "$CORS_ALLOWED_ORIGINS" in https://*) ;; *) fail "CORS_ALLOWED_ORIGINS must use HTTPS" ;; esac

[ "$APP_BASE_URL" = "https://$APP_DOMAIN" ] \
  || fail "APP_BASE_URL must match APP_DOMAIN"
[ "$API_BASE_URL" = "https://$APP_DOMAIN/api/v1" ] \
  || fail "API_BASE_URL must match APP_DOMAIN"
[ "$CORS_ALLOWED_ORIGINS" = "https://$APP_DOMAIN" ] \
  || fail "CORS_ALLOWED_ORIGINS must match APP_DOMAIN"
pass "public URLs use the expected HTTPS domain"

expected_branch="${EXPECTED_DEPLOY_BRANCH:-main}"
current_branch="$(git branch --show-current)"
[ "$current_branch" = "$expected_branch" ] \
  || fail "expected Git branch $expected_branch"
pass "Git branch is $expected_branch"

compose=(docker compose -f compose.home.yml --env-file .env)
"${compose[@]}" config --quiet || fail "Compose model is invalid"
pass "Compose model validates"

if "${compose[@]}" config | grep -Eq '^[[:space:]]+ports:'; then
  fail "host port publication is not allowed"
fi
pass "no service publishes host ports"

"${compose[@]}" run --rm --no-deps --entrypoint caddy gateway \
  validate --config /etc/caddy/Caddyfile >/dev/null \
  || fail "application gateway Caddyfile is invalid"
pass "application gateway Caddyfile validates"

available_kb="$(df -Pk . | awk 'NR == 2 {print $4}')"
minimum_kb=$((10 * 1024 * 1024))
[ "${available_kb:-0}" -ge "$minimum_kb" ] \
  || fail "less than 10 GiB is available for the build"
pass "at least 10 GiB disk space is available"

pass "home-server deployment preflight completed"
