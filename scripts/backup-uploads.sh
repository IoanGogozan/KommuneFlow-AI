#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-backups/uploads}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

BACKUP_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
BACKUP_NAME="$(basename "$BACKUP_FILE")"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps \
  -v "$(pwd)/$BACKUP_DIR:/backup" api \
  sh -c "cd /app/uploads && tar -czf /backup/$BACKUP_NAME ."

sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"

echo "Created uploads backup: $BACKUP_FILE"
echo "Created checksum: $BACKUP_FILE.sha256"
