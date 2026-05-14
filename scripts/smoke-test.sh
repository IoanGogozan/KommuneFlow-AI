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
SMOKE_PUBLIC_LOCALE="${SMOKE_PUBLIC_LOCALE:-nb}"
SMOKE_INTERNAL_EMAIL="${SMOKE_INTERNAL_EMAIL:-${DEMO_EMAIL:-}}"
SMOKE_INTERNAL_PASSWORD="${SMOKE_INTERNAL_PASSWORD:-${DEMO_PASSWORD:-}}"

if [ -n "$SMOKE_BASIC_AUTH_USER" ] && [ -z "$SMOKE_BASIC_AUTH_PASSWORD" ]; then
  echo "SMOKE_BASIC_AUTH_PASSWORD is required when SMOKE_BASIC_AUTH_USER is set" >&2
  exit 1
fi

if [ -z "$SMOKE_BASIC_AUTH_USER" ] && [ -n "$SMOKE_BASIC_AUTH_PASSWORD" ]; then
  echo "SMOKE_BASIC_AUTH_USER is required when SMOKE_BASIC_AUTH_PASSWORD is set" >&2
  exit 1
fi

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

curl_status() {
  url="$1"
  output_file="${2:-/dev/null}"

  if [ -n "$SMOKE_BASIC_AUTH_USER" ]; then
    status="$(curl -sS -u "$SMOKE_BASIC_AUTH_USER:$SMOKE_BASIC_AUTH_PASSWORD" -o "$output_file" -w "%{http_code}" "$url" || true)"
  else
    status="$(curl -sS -o "$output_file" -w "%{http_code}" "$url" || true)"
  fi
  printf '%s' "${status:-000}"
}

curl_status_with_cookies() {
  url="$1"

  if [ -n "$SMOKE_BASIC_AUTH_USER" ]; then
    status="$(curl -sS -u "$SMOKE_BASIC_AUTH_USER:$SMOKE_BASIC_AUTH_PASSWORD" -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$url" || true)"
  else
    status="$(curl -sS -b "$COOKIE_JAR" -o /dev/null -w "%{http_code}" "$url" || true)"
  fi
  printf '%s' "${status:-000}"
}

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

check() {
  name="$1"
  url="$2"
  expected="${3:-200}"

  status="$(curl_status "$url")"
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

  status="$(curl_status_with_cookies "$url")"
  if ! status_allowed "$status" "$expected"; then
    echo "FAIL $name: expected HTTP $expected, got $status for $url" >&2
    exit 1
  fi

  echo "OK $name: HTTP $status"
}

login_internal_user() {
  if [ -z "$SMOKE_INTERNAL_EMAIL" ]; then
    echo "SKIP authenticated API checks: set SMOKE_INTERNAL_EMAIL and SMOKE_INTERNAL_PASSWORD to enable them"
    return
  fi

  email_json="$(json_escape "$SMOKE_INTERNAL_EMAIL")"
  password_json="$(json_escape "$SMOKE_INTERNAL_PASSWORD")"
  printf '{"email":"%s","password":"%s"}' "$email_json" "$password_json" >"$LOGIN_BODY"

  if [ -n "$SMOKE_BASIC_AUTH_USER" ]; then
    status="$(curl -sS -u "$SMOKE_BASIC_AUTH_USER:$SMOKE_BASIC_AUTH_PASSWORD" -c "$COOKIE_JAR" -H "Content-Type: application/json" -d "@$LOGIN_BODY" -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/login" || true)"
  else
    status="$(curl -sS -c "$COOKIE_JAR" -H "Content-Type: application/json" -d "@$LOGIN_BODY" -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/auth/login" || true)"
  fi
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

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

echo "Running smoke test for $BASE_URL"
check "web home" "$BASE_URL/" "200,307,308"
check "public intake $SMOKE_PUBLIC_LOCALE" "$BASE_URL/$SMOKE_PUBLIC_LOCALE" "200"
check "api health" "$BASE_URL/api/v1/health" "200"
check "api readiness" "$BASE_URL/api/v1/readiness" "200"
check "internal login" "$BASE_URL/internal/login" "200"
login_internal_user

echo "Smoke test completed for $BASE_URL"
