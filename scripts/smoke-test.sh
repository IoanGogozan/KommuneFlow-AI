#!/usr/bin/env sh
set -eu

BASE_URL="${1:-${APP_BASE_URL:-}}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: scripts/smoke-test.sh https://your-domain.example" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
SMOKE_INTERNAL_EMAIL="${SMOKE_INTERNAL_EMAIL:-${DEMO_EMAIL:-}}"
SMOKE_INTERNAL_PASSWORD="${SMOKE_INTERNAL_PASSWORD:-${DEMO_PASSWORD:-}}"

if [ -n "$SMOKE_INTERNAL_EMAIL" ] && [ -z "$SMOKE_INTERNAL_PASSWORD" ]; then
  echo "SMOKE_INTERNAL_PASSWORD is required when SMOKE_INTERNAL_EMAIL is set" >&2
  exit 1
fi

if [ -z "$SMOKE_INTERNAL_EMAIL" ] && [ -n "$SMOKE_INTERNAL_PASSWORD" ]; then
  echo "SMOKE_INTERNAL_EMAIL is required when SMOKE_INTERNAL_PASSWORD is set" >&2
  exit 1
fi

COOKIE_JAR="$(mktemp)"
LOGIN_BODY="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$LOGIN_BODY"' EXIT INT TERM

status_allowed() {
  actual="$1"
  expected_csv="$2"
  old_ifs="$IFS"
  IFS=","
  for expected in $expected_csv; do
    if [ "$actual" = "$expected" ]; then
      IFS="$old_ifs"
      return 0
    fi
  done
  IFS="$old_ifs"
  return 1
}

request_status() {
  method="$1"
  url="$2"
  body="${3:-}"

  if [ -n "$body" ]; then
    status="$(curl -sS -X "$method" -H "Origin: $BASE_URL" -H "Content-Type: application/json" \
      --data "$body" -o /dev/null -w "%{http_code}" "$url" || true)"
  else
    status="$(curl -sS -X "$method" -o /dev/null -w "%{http_code}" "$url" || true)"
  fi
  printf '%s' "${status:-000}"
}

check() {
  name="$1"
  method="$2"
  url="$3"
  expected="$4"
  body="${5:-}"

  status="$(request_status "$method" "$url" "$body")"
  if ! status_allowed "$status" "$expected"; then
    echo "FAIL $name: expected HTTP $expected, got $status for $url" >&2
    exit 1
  fi

  echo "OK $name: HTTP $status"
}

check_authenticated() {
  name="$1"
  url="$2"
  expected="${3:-200}"

  status="$(curl -sS -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$url" || true)"
  status="${status:-000}"
  if ! status_allowed "$status" "$expected"; then
    echo "FAIL $name: expected HTTP $expected, got $status for $url" >&2
    exit 1
  fi

  echo "OK $name: HTTP $status"
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

login_internal_user() {
  if [ -z "$SMOKE_INTERNAL_EMAIL" ]; then
    echo "SKIP authenticated API checks: set SMOKE_INTERNAL_EMAIL and SMOKE_INTERNAL_PASSWORD to enable them"
    return
  fi

  email_json="$(json_escape "$SMOKE_INTERNAL_EMAIL")"
  password_json="$(json_escape "$SMOKE_INTERNAL_PASSWORD")"
  printf '{"email":"%s","password":"%s"}' "$email_json" "$password_json" >"$LOGIN_BODY"

  status="$(curl -sS -c "$COOKIE_JAR" -H "Origin: $BASE_URL" -H "Content-Type: application/json" \
    -d "@$LOGIN_BODY" -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/login" || true)"
  status="${status:-000}"
  if ! status_allowed "$status" "200,201"; then
    echo "FAIL internal login: expected HTTP 200 or 201, got $status" >&2
    exit 1
  fi

  echo "OK internal login: HTTP $status"
  check_authenticated "auth me" "$BASE_URL/api/v1/auth/me"
  check_authenticated "internal cases API" "$BASE_URL/api/v1/cases"
  check_authenticated "AI status API" "$BASE_URL/api/v1/ai/status"
}

echo "Running smoke test for $BASE_URL"

# The web perimeter is public. Application authentication protects internal data.
check "portfolio landing" GET "$BASE_URL/" "200,307,308"
check "demo instructions" GET "$BASE_URL/demo" "200,307,308"
check "Norwegian citizen portal" GET "$BASE_URL/nb" "200"
check "English citizen portal" GET "$BASE_URL/en" "200"
check "internal login shell" GET "$BASE_URL/internal/login" "200"
check "internal workspace shell" GET "$BASE_URL/internal" "200,307,308"

# Public API operations reach application validation rather than an infrastructure gate.
check "API health" GET "$BASE_URL/api/v1/health" "200"
check "API readiness" GET "$BASE_URL/api/v1/readiness" "200,503"
check "public intake perimeter" POST "$BASE_URL/api/v1/public/tenants/kristiansand/cases" "400" '{}'
check "public status perimeter" POST "$BASE_URL/api/v1/public/tenants/kristiansand/cases/status" "400" '{}'
check "public address perimeter" GET "$BASE_URL/api/v1/public/tenants/kristiansand/integrations/kartverket/address-search" "400"

# Representative protected APIs must reject requests without an application cookie.
check "unauthenticated auth me" GET "$BASE_URL/api/v1/auth/me" "401"
check "unauthenticated cases" GET "$BASE_URL/api/v1/cases" "401"
check "unauthenticated analytics" GET "$BASE_URL/api/v1/analytics/summary" "401"
check "unauthenticated administration" GET "$BASE_URL/api/v1/admin/users" "401"

login_internal_user

echo "Smoke test completed for $BASE_URL"
