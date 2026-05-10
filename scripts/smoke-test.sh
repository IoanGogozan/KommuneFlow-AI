#!/usr/bin/env sh
set -eu

BASE_URL="${1:-${APP_BASE_URL:-}}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: scripts/smoke-test.sh https://your-domain.example" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
SMOKE_BASIC_AUTH_USER="${SMOKE_BASIC_AUTH_USER:-}"
SMOKE_BASIC_AUTH_PASSWORD="${SMOKE_BASIC_AUTH_PASSWORD:-}"

if [ -n "$SMOKE_BASIC_AUTH_USER" ] && [ -z "$SMOKE_BASIC_AUTH_PASSWORD" ]; then
  echo "SMOKE_BASIC_AUTH_PASSWORD is required when SMOKE_BASIC_AUTH_USER is set" >&2
  exit 1
fi

if [ -z "$SMOKE_BASIC_AUTH_USER" ] && [ -n "$SMOKE_BASIC_AUTH_PASSWORD" ]; then
  echo "SMOKE_BASIC_AUTH_USER is required when SMOKE_BASIC_AUTH_PASSWORD is set" >&2
  exit 1
fi

check() {
  name="$1"
  url="$2"
  expected="$3"

  if [ -n "$SMOKE_BASIC_AUTH_USER" ]; then
    status="$(curl -fsS -u "$SMOKE_BASIC_AUTH_USER:$SMOKE_BASIC_AUTH_PASSWORD" -o /dev/null -w "%{http_code}" "$url")"
  else
    status="$(curl -fsS -o /dev/null -w "%{http_code}" "$url")"
  fi
  if [ "$status" != "$expected" ]; then
    echo "FAIL $name: expected HTTP $expected, got $status for $url" >&2
    exit 1
  fi

  echo "OK $name: HTTP $status"
}

check "web home" "$BASE_URL/" "200"
check "api health" "$BASE_URL/api/v1/health" "200"
check "api readiness" "$BASE_URL/api/v1/readiness" "200"
check "internal login" "$BASE_URL/internal/login" "200"

echo "Smoke test completed for $BASE_URL"
