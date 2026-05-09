# Hetzner Deployment

## Purpose Of This Document

This document defines the required production-like deployment on Hetzner Cloud using Docker Compose, PostgreSQL, HTTPS, firewall, backups, and monitoring basics.

## Deployment Requirement

The application must be deployed to Hetzner Cloud. Local-only development is not enough.

Hetzner deployment is part of the portfolio value because it proves that the application can run in a production-like environment.

## Infrastructure Target

Use a Hetzner Cloud VPS located in Europe, preferably Finland if available and suitable.

Required components:

- Ubuntu LTS server
- Docker and Docker Compose
- reverse proxy
- HTTPS certificate
- PostgreSQL
- application containers
- persistent volumes
- firewall
- backups or snapshots

Hetzner Cloud provides Firewalls that can restrict allowed inbound and outbound traffic; inbound traffic has an implicit deny for traffic not matching allowed rules. Hetzner also provides snapshots/backups for server disks and Volumes for expandable block storage. Use these features in the deployment plan and document the setup.

## Recommended Runtime Architecture

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
Caddy or Nginx reverse proxy
  |
  +--> frontend container
  +--> backend API container
  +--> PostgreSQL container or managed/separate DB
  +--> Redis container optional
  +--> storage volume for uploads
```

## Required Open Ports

- `80` HTTP for certificate challenge and redirect
- `443` HTTPS
- `22` SSH, restricted to your IP if possible

PostgreSQL must not be publicly exposed.

## Docker Compose Services

Minimum services:

- `frontend`
- `backend`
- `postgres`
- `reverse-proxy`

Optional services:

- `redis`
- `minio`
- `worker`

## Environment Variables

Required examples:

```txt
NODE_ENV=production
DATABASE_URL=postgresql://...
OPENAI_API_KEY=...
JWT_SECRET=...
SESSION_SECRET=...
APP_BASE_URL=https://...
UPLOAD_STORAGE_PATH=/app/uploads
DEFAULT_LOCALE=nb
SUPPORTED_LOCALES=nb,en
```

Secrets must never be committed to Git.

## Deployment Checklist

1. Create Hetzner Cloud project.
2. Create VPS.
3. Add SSH key.
4. Configure firewall.
5. Install Docker and Docker Compose.
6. Configure domain DNS.
7. Configure reverse proxy with HTTPS.
8. Add production `.env` file manually on server.
9. Run database migrations.
10. Seed demo-safe data.
11. Start containers.
12. Verify HTTPS.
13. Verify auth works.
14. Verify file upload works.
15. Verify AI triage works.
16. Verify logs.
17. Configure backup/snapshot strategy.
18. Document restore procedure.

## Backup Requirements

At minimum:

- database dump script
- upload folder backup strategy
- Hetzner snapshot before major deployment changes
- documented restore steps

## Production Safety Rules

- Do not expose database port publicly.
- Do not run with development secrets.
- Do not log OpenAI API keys.
- Do not log passwords or tokens.
- Do not store `.env` in Git.
- Use HTTPS only for browser traffic.
- Keep server packages updated.
