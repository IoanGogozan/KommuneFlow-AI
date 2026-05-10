#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
BACKUP_DIR="${BACKUP_DIR:-backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

write_checksum() {
  file="$1"
  sha256sum "$file" > "$file.sha256"
  echo "Created checksum: $file.sha256"
}

encrypt_if_configured() {
  file="$1"

  if [ -n "${BACKUP_GPG_RECIPIENT:-}" ]; then
    require_command gpg
    encrypted_file="$file.gpg"
    gpg --batch --yes --recipient "$BACKUP_GPG_RECIPIENT" --encrypt --output "$encrypted_file" "$file"
    write_checksum "$encrypted_file"

    if [ "${BACKUP_KEEP_PLAINTEXT:-no}" != "yes" ]; then
      rm -f "$file" "$file.sha256"
    fi

    echo "Created encrypted backup: $encrypted_file"
    return 0
  fi

  if [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
    require_command gpg
    encrypted_file="$file.gpg"
    gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_GPG_PASSPHRASE" \
      --symmetric --cipher-algo AES256 --output "$encrypted_file" "$file"
    write_checksum "$encrypted_file"

    if [ "${BACKUP_KEEP_PLAINTEXT:-no}" != "yes" ]; then
      rm -f "$file" "$file.sha256"
    fi

    echo "Created encrypted backup: $encrypted_file"
  fi
}

require_command docker
require_command sha256sum
mkdir -p "$BACKUP_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

BACKUP_FILE="$BACKUP_DIR/${POSTGRES_DB}_${TIMESTAMP}.dump"

docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$BACKUP_FILE"

write_checksum "$BACKUP_FILE"
encrypt_if_configured "$BACKUP_FILE"

echo "Created PostgreSQL backup: $BACKUP_FILE"
