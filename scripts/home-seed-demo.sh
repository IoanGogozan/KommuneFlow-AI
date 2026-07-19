#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

[ -f .env ] || { echo "FAIL .env is missing" >&2; exit 1; }

set -a
# shellcheck disable=SC1091
. ./.env
set +a

[ "${SEED_CONFIRM:-}" = "yes" ] \
  || { echo "FAIL set SEED_CONFIRM=yes to seed synthetic demo data" >&2; exit 1; }
[ -n "${SEED_DEMO_PASSWORD:-}" ] \
  || { echo "FAIL SEED_DEMO_PASSWORD is missing" >&2; exit 1; }
[ -n "${SEED_RECRUITER_PASSWORD:-}" ] \
  || { echo "FAIL SEED_RECRUITER_PASSWORD is missing" >&2; exit 1; }

case "$SEED_DEMO_PASSWORD$SEED_RECRUITER_PASSWORD" in
  *replace-with-*) echo "FAIL seed passwords still contain placeholders" >&2; exit 1 ;;
esac

compose=(docker compose -f compose.home.yml --env-file .env)
# Variables in this command expand inside the postgres container.
# shellcheck disable=SC2016
"${compose[@]}" exec -T postgres sh -lc \
  'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null \
  || { echo "FAIL PostgreSQL is not healthy" >&2; exit 1; }

"${compose[@]}" run --rm --no-deps \
  --entrypoint sh api \
  -lc "./node_modules/.bin/tsx prisma/seed.ts"

echo "PASS synthetic demo seed completed"
