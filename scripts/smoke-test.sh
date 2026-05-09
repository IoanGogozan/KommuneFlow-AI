#!/usr/bin/env sh
set -eu

BASE_URL="${1:-${APP_BASE_URL:-}}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: scripts/smoke-test.sh https://your-domain.example" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"

check() {
  name="$1"
  url="$2"
  expected="$3"

  status="$(curl -fsS -o /dev/null -w "%{http_code}" "$url")"
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
