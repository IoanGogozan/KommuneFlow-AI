# Home-Server Portfolio Deployment

This runbook deploys KommuneFlow AI as a public-perimeter, application-protected synthetic portfolio demo on the existing home-server Docker and Caddy infrastructure. It is not a production municipal deployment and must not contain real citizen data.

Deployment status: commit `286c769bdfc2314f6ecc724444523e0588f4bef0` was deployed and live-verified on the physical home server on 2026-07-24. All services, the public/unauthenticated perimeter, restricted guest matrix, citizen-to-employee browser journey, normal staff login, two reset runs, and the six-hour reset schedule were verified. Consult `docs/VERIFICATION_LOG.md` for exact evidence.

## Architecture

```text
Internet
  -> global Caddy (public 80/443)
  -> external Docker network: proxy
  -> kommuneflow-ai gateway:8080 (routing and security headers, HTTP only)
  -> private app_internal network
       -> web:3000
       -> api:3101
       -> postgres:5432
```

Only the application gateway joins the shared `proxy` network. PostgreSQL, API, and web are reachable only on the project-private network. No KommuneFlow service publishes a host port.

The global Caddy terminates TLS. The project-local Caddy trusts forwarded headers only from private proxy ranges, preserves the public HTTPS scheme and host, applies security headers, and forwards `/api/*` to the API and all other traffic to the web application. Authentication and authorization are enforced by the application.

## Deployment Boundaries

- Use synthetic seeded data only.
- Keep `AI_PROVIDER=mock` and `OPENAI_API_KEY` empty.
- Keep the guest-session feature flag and tenant allowlist explicit; application JWT/RBAC remains the security boundary.
- Keep public uploads disabled, endpoint limits explicit, and mock AI mandatory in portfolio mode.
- Store the real `.env` only on the server with mode `600`.
- Use `prisma migrate deploy`; never use development migrations or database reset on the server.
- Seed separately and only with explicit confirmation.
- Do not run `docker compose down -v` or otherwise delete volumes.
- Hetzner deployment assets remain supported and unchanged.
- Backup and restore automation for this home deployment is future work, not a launch blocker for synthetic demo data.

## Required One-Time DNS Configuration

The selected portfolio hostname is:

```text
kommune.norvix.no
```

In Cloudflare, add an `A` record:

```text
Type:    A
Name:    kommune
Content: <current home-server public IPv4 address>
Proxy:   DNS only (initial certificate issuance)
TTL:     Auto
```

Confirm the router forwards public TCP `80` and `443` to the home server. SSH remains LAN-only. After Caddy has issued the certificate, Cloudflare proxying may be tested with SSL/TLS mode `Full (strict)`, but DNS-only is the simplest supported path.

## First Deployment

### 1. Clone the repository

Run on the home server after the deployment PR is merged:

```bash
cd /srv/projects
git clone git@github.com:IoanGogozan/KommuneFlow-AI.git kommuneflow-ai
cd /srv/projects/kommuneflow-ai
```

### 2. Create the server environment

```bash
cp .env.home.example .env
chmod 600 .env
```

Edit `.env` and set `APP_DOMAIN=kommune.norvix.no`, matching HTTPS URLs, and independent secrets. Never commit the real file.

Generate independent URL-safe random values by running `openssl rand -hex 32` separately for the PostgreSQL password, JWT secret, session secret, status-code pepper, demo password, and recruiter password.

### 3. Confirm the shared proxy network

```bash
docker network inspect proxy
```

Create it only if it is absent and that matches the server operations model:

```bash
docker network create proxy
```

### 4. Run preflight

```bash
./scripts/home-preflight.sh
```

The preflight validates Docker, Compose, Git, the environment without printing secrets, the branch, HTTPS URLs, mock AI, the proxy network, absence of host ports, the Compose model, Caddy configuration, and available disk space.

### 5. Release the stack

```bash
./scripts/home-release.sh
```

The release builds images, starts PostgreSQL, runs production migrations, starts the full stack with bounded health waiting, and checks the local gateway. A failed migration stops the release before API/web replacement.

### 6. Seed synthetic demo data once

```bash
SEED_CONFIRM=yes ./scripts/home-seed-demo.sh
```

The seed is idempotent, requires both demo passwords, and is intentionally separate from normal releases. Run it only for the first deployment or a controlled synthetic-data refresh.

### 7. Add the global Caddy route

The repository does not modify global Caddy automatically. Run once:

```bash
/srv/projects/_ops/add-caddy-docker-app.sh \
  kommune.norvix.no \
  kommuneflow-ai \
  8080
```

Global Caddy must proxy only to `kommuneflow-ai:8080`, never directly to PostgreSQL, API, or web.

### 8. Verify container and network isolation

```bash
docker compose -f compose.home.yml --env-file .env ps
docker network inspect proxy
```

Expected results:

- `postgres`, `api`, `web`, and `gateway` are healthy;
- only `gateway` appears on `proxy` with alias `kommuneflow-ai`;
- `postgres`, `api`, and `web` do not appear on `proxy`;
- no service shows a host port mapping.

From the global Caddy container:

```bash
docker exec caddy wget -qO- http://kommuneflow-ai:8080/_gateway/health
```

Expected response: `ok`.

### 9. Verify the public deployment

```bash
SMOKE_INTERNAL_EMAIL='recruiter.demo@kristiansand.local' \
SMOKE_INTERNAL_PASSWORD='<recruiter-password>' \
sh scripts/smoke-test.sh https://kommune.norvix.no
```

Also verify manually:

1. `/`, `/demo`, `/nb`, `/en`, and `/internal/login` load without infrastructure credentials;
2. protected APIs return `401` without an application cookie;
3. API health and readiness succeed;
4. internal login and seeded cases work;
5. text-only citizen intake and status lookup work, while public multipart uploads are rejected;
6. mock AI triage creates a suggestion without changing official fields before review;
7. human review updates official fields;
8. guest Analytics is readable but aggregation and administrative APIs are denied;
9. normal staff login remains usable;
10. Operations reports provider `mock` through a controlled staff account;
11. no OpenAI key is configured;
12. API logs preserve the public HTTPS scheme and distinguish real client IPs.

## Normal Updates

The current global `/srv/projects/_ops/deploy-project.sh` detects the repository's existing `docker-compose.yml`, which is the local-development stack. Do not use that script unchanged for KommuneFlow AI.

Update the server operations script once so that, after `git pull --ff-only`, it prefers an executable project-local `scripts/home-release.sh`:

```bash
if [ -x ./scripts/home-release.sh ]; then
  HOME_RELEASE_SKIP_GIT_PULL=true ./scripts/home-release.sh
  exit 0
fi
```

Place that block before generic Compose-file detection. Then normal updates are:

```bash
git push
ssh server@192.168.50.23 \
  "/srv/projects/_ops/deploy-project.sh kommuneflow-ai"
```

If the global script is not updated, use the safe direct command:

```bash
ssh server@192.168.50.23 \
  "cd /srv/projects/kommuneflow-ai && git pull --ff-only origin main && HOME_RELEASE_SKIP_GIT_PULL=true ./scripts/home-release.sh"
```

Do not reseed on routine updates. Do not rebuild or restart global Caddy unless its route configuration changed.

## Portfolio Demo Reset

The public portfolio deployment disables citizen uploads with
`PUBLIC_DEMO_ALLOW_UPLOADS=false`. Seeded employee cases still include safe
document examples. Visitor-created cases older than
`PORTFOLIO_DEMO_RESET_AFTER_HOURS` can be removed with the guarded reset
command:

```bash
docker compose -f compose.home.yml --env-file .env run --rm \
  -e PORTFOLIO_DEMO_RESET_CONFIRM=true \
  --entrypoint sh api -lc './node_modules/.bin/tsx prisma/demo-reset.ts'
```

The command refuses to run unless portfolio mode is enabled, confirmation is
explicit, the database name exactly matches
`PORTFOLIO_DEMO_RESET_DATABASE_NAME`, and the upload directory passes its
storage safety checks. It preserves deterministic `seed_*` cases, removes
expired visitor case relations and physical files, and idempotently restores
missing seed cases.

Schedule the host command rather than installing a scheduler in the
application container. Example root crontab entry for a six-hour interval:

```cron
17 */6 * * * cd /srv/projects/kommuneflow-ai && docker compose -f compose.home.yml --env-file .env run --rm -e PORTFOLIO_DEMO_RESET_CONFIRM=true --entrypoint sh api -lc './node_modules/.bin/tsx prisma/demo-reset.ts' >> /var/log/kommuneflow-demo-reset.log 2>&1
```

Run it manually once and inspect the safe summary before enabling the schedule.
Never point `PORTFOLIO_DEMO_RESET_DATABASE_NAME` at a non-demo database.

## Troubleshooting

```bash
docker compose -f compose.home.yml --env-file .env ps
docker compose -f compose.home.yml --env-file .env logs --tail=100 gateway api web postgres
docker compose -f compose.home.yml --env-file .env config --quiet
docker exec caddy wget -qO- http://kommuneflow-ai:8080/_gateway/health
docker network inspect proxy
docker compose -f /srv/proxy/compose.yml logs --tail=100 caddy
```

Do not paste resolved Compose configuration into issues or PRs because a real `.env` injects secrets.

## Known Limitations

- No automated PostgreSQL or uploads backup/restore is included in this phase.
- No automated rollback, blue/green deployment, registry publishing, or GitHub Actions deployment is included.
- The demo uses mock AI; real OpenAI verification remains in the manually triggered protected GitHub workflow.
- Email remains mocked, malware scanning is not implemented, and real citizen data is prohibited.
- The home-server public IP and Cloudflare DNS record require operational monitoring if the ISP address changes.
