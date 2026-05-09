# Hetzner Deployment

## Purpose Of This Document

This document defines the production-like Hetzner deployment for KommuneFlow AI. The repository now includes deployable runtime assets, but a public deployment is only complete after the server-specific verification steps below have been executed and recorded.

## Runtime Assets

Production deployment uses:

- `apps/api/Dockerfile` for the NestJS API
- `apps/web/Dockerfile` for the Next.js web app
- `docker-compose.prod.yml` for API, web, PostgreSQL, and Caddy
- `deploy/Caddyfile` for HTTPS reverse proxy routing
- `.env.production.example` as the production environment template
- `scripts/backup-postgres.sh` for PostgreSQL backups
- `scripts/backup-uploads.sh` for upload volume backups
- `scripts/restore-postgres.sh` for PostgreSQL restore
- `scripts/smoke-test.sh` for post-deploy verification

## Infrastructure Target

Use a Hetzner Cloud VPS located in Europe, preferably Finland if available and suitable.

Required components:

- Ubuntu LTS server
- Docker Engine and Docker Compose plugin
- domain DNS pointing to the VPS public IP
- Hetzner Cloud Firewall
- Caddy reverse proxy with automatic HTTPS
- PostgreSQL container with persistent volume
- API upload storage with persistent volume
- backup location outside the running database volume

## Runtime Architecture

```txt
Internet
  |
  v
Hetzner Cloud Firewall
  |
  v
VPS: Ubuntu LTS
  |
  v
Caddy container :80/:443
  |
  +--> web container :3000
  +--> api container :3101
        |
        +--> postgres container :5432 on private Docker network only
        +--> uploads volume mounted at /app/uploads
```

PostgreSQL is not published to the host and must not be exposed publicly.

## Required Firewall Rules

Inbound:

- TCP `80` from `0.0.0.0/0` and `::/0` for HTTP-to-HTTPS redirect and ACME challenge
- TCP `443` from `0.0.0.0/0` and `::/0` for HTTPS
- TCP `22` only from the maintainer's current IP address where possible

Do not allow inbound TCP `5432`.

Outbound:

- allow DNS, package updates, ACME certificate issuance, container image pulls, and OpenAI API access if `AI_PROVIDER=openai`

## Production Environment

Create `.env.production` on the server from `.env.production.example`.

Required values:

```txt
APP_DOMAIN=your-domain.example
APP_BASE_URL=https://your-domain.example
ACME_EMAIL=admin@your-domain.example
POSTGRES_DB=kommuneflow_ai
POSTGRES_USER=kommuneflow
POSTGRES_PASSWORD=<long random secret>
JWT_SECRET=<long random secret>
SESSION_SECRET=<long random secret>
AI_PROVIDER=mock
```

Use `AI_PROVIDER=openai` only after `OPENAI_API_KEY` is configured.

## Deployment Procedure

1. Create Hetzner Cloud project and VPS.
2. Add SSH key.
3. Attach the Hetzner firewall rules from this document.
4. Point the domain DNS `A`/`AAAA` record to the VPS.
5. Install Docker Engine and the Docker Compose plugin.
6. Clone the repository on the server.
7. Create `.env.production` from `.env.production.example`.
8. Build images:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
```

9. Start PostgreSQL first:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d postgres
```

10. Run production migrations:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint sh api -lc "./node_modules/.bin/prisma migrate deploy"
```

11. Seed demo-safe data only when deploying a demo environment:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm --entrypoint sh api -lc "./node_modules/.bin/tsx prisma/seed.ts"
```

12. Start the full stack:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

13. Check service status:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

14. Run the smoke test:

```bash
sh scripts/smoke-test.sh https://your-domain.example
```

## Post-Deploy Smoke Test

The smoke test checks:

- web home page returns HTTP `200`
- API health returns HTTP `200`
- API readiness returns HTTP `200`
- internal login page returns HTTP `200`

Manual checks after the script:

- log in with a demo user
- create a citizen case
- upload a document
- run AI triage with the configured provider
- verify Caddy issued a valid HTTPS certificate

## Security Release Gate

Run these checks before every public deployment:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm audit:deps
```

Run secret scanning from the repository root:

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest detect --source /repo --no-git --redact
```

Run container image scanning after building production images:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image kommuneflowai-api:latest
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image kommuneflowai-web:latest
```

Treat high or critical dependency, secret, and image findings as release blockers unless there is a documented false-positive rationale.

## Persistent Volumes

The production Compose file defines:

- `postgres_data` mounted to `/var/lib/postgresql/data`
- `uploads_data` mounted to `/app/uploads`
- `caddy_data` for certificates
- `caddy_config` for Caddy runtime state

These volumes must be preserved during restarts and upgrades.

## Backup Procedure

Run PostgreSQL backup from the repository root on the server:

```bash
sh scripts/backup-postgres.sh
```

The script writes compressed custom-format PostgreSQL dumps to:

```txt
backups/postgres/
```

It also writes a SHA-256 checksum next to each dump.

Upload files are stored in the Docker volume `uploads_data`. Back them up from the repository root on the server:

```bash
sh scripts/backup-uploads.sh
```

The script writes dated `.tar.gz` archives to:

```txt
backups/uploads/
```

Copy database and upload backups to storage outside the VPS after each successful backup.

Before major deployment changes, create a Hetzner snapshot in addition to application-level PostgreSQL and upload backups.

## Restore Procedure

Restore requires an explicit confirmation environment variable:

```bash
RESTORE_CONFIRM=yes sh scripts/restore-postgres.sh backups/postgres/kommuneflow_ai_YYYYMMDDTHHMMSSZ.dump
```

After restore:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart api web
sh scripts/smoke-test.sh https://your-domain.example
```

Record every restore test with:

- date
- backup file
- target environment
- result
- operator
- follow-up issues

## Operational Commands

View logs:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api web caddy
```

Restart application containers:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production restart api web
```

Pull rebuilt images and restart:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## Production Safety Rules

- Do not commit `.env.production`.
- Do not reuse local demo secrets in production.
- Do not expose PostgreSQL publicly.
- Use HTTPS only for browser traffic.
- Keep `APP_BASE_URL` aligned with the public HTTPS domain.
- Keep `JWT_SECRET`, `SESSION_SECRET`, and `POSTGRES_PASSWORD` long and random.
- Run `sh scripts/smoke-test.sh` after deploy changes.
- Run a restore test before calling the deployment backup-ready.
