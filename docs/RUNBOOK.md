# Runbook

## Purpose

This runbook documents the minimum operational procedures for KommuneFlow AI. It is intentionally practical and can be extended as deployment, backup automation, monitoring, and alerting mature.

## Local Service Overview

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3101/api/v1`
- Health: `http://localhost:3101/api/v1/health`
- Readiness: `http://localhost:3101/api/v1/readiness`

Core services:

- Next.js web app in `apps/web`
- NestJS API in `apps/api`
- PostgreSQL through Docker Compose
- Local upload storage from `UPLOAD_STORAGE_PATH`

## Restart Services

Restart PostgreSQL:

```bash
docker compose restart postgres
```

Restart the API and web app during local development:

```bash
pnpm dev
```

Run only the API:

```bash
pnpm dev:api
```

Run only the web app:

```bash
pnpm dev:web
```

After a production Docker Compose setup is added, this section should include the exact production restart command and rollback notes.

## View Logs

View PostgreSQL logs locally:

```bash
docker compose logs -f postgres
```

View API logs in local development from the terminal running:

```bash
pnpm dev:api
```

The API emits structured JSON logs. Request logs include `requestId`, `method`, `path`, `statusCode`, and `durationMs`. Error logs include `requestId`, `errorCode`, `safeMessage`, `method`, `path`, and safe actor metadata when available.

Do not log or paste secrets, cookies, authorization headers, passwords, OpenAI API keys, uploaded file contents, or full document text into issues or incident notes.

## Run Migrations

Start PostgreSQL first:

```bash
docker compose up -d postgres
```

Run development migrations:

```bash
pnpm --filter @kommuneflow/api prisma:migrate
```

Regenerate the Prisma client after schema changes:

```bash
pnpm --filter @kommuneflow/api prisma:generate
```

Seed local demo data:

```bash
pnpm --filter @kommuneflow/api prisma:seed
```

Production migration steps must be documented before deployment. Production migrations should be run intentionally, with a recent database backup available.

## Backup

Application-level PostgreSQL dumps are required even if infrastructure snapshots are enabled.

Create a local PostgreSQL dump from the Docker container:

```bash
docker compose exec postgres pg_dump -U kommuneflow -d kommuneflow_ai > backup.sql
```

If custom database credentials are used, replace `kommuneflow` and `kommuneflow_ai` with the values from `.env`.

Back up uploaded files by copying the directory configured by `UPLOAD_STORAGE_PATH`:

```bash
cp -r ./storage/uploads ./backup-uploads
```

For production, backup scripts should:

- write timestamped database dumps
- back up upload storage
- encrypt database dumps and upload archives before offsite transfer with `BACKUP_GPG_RECIPIENT` or `BACKUP_GPG_PASSPHRASE`
- store backups outside the VPS and outside the running application volumes
- restrict backup access to named operators
- avoid including `.env` files in backup artifacts
- log success or failure
- document retention rules
- document deletion of expired backups
- produce checksums and verify them before restore tests

The upload backup script excludes `.env*` files and fails if such files are found in the archive listing.

## Restore

Restore a local PostgreSQL dump into the Docker database:

```bash
docker compose exec -T postgres psql -U kommuneflow -d kommuneflow_ai < backup.sql
```

For encrypted production backups, decrypt first and verify the checksum before restoring:

```bash
sha256sum -c backup.dump.gpg.sha256
gpg --output backup.dump --decrypt backup.dump.gpg
```

Restore uploaded files by copying the backup directory back to `UPLOAD_STORAGE_PATH`:

```bash
cp -r ./backup-uploads ./storage/uploads
```

After restore:

```bash
pnpm --filter @kommuneflow/api prisma:generate
pnpm --filter @kommuneflow/api test
```

Then verify:

- `GET /api/v1/health`
- `GET /api/v1/readiness`
- internal login
- case list
- document listing on a known case

Record the date and result of each restore test in deployment notes once production deployment exists.

Production restore tests should be scheduled and documented. A backup strategy is not complete until a restore from encrypted offsite storage has been tested.

## AI Provider Failure

Symptoms:

- AI triage endpoint returns a failed triage result
- `ai.triage_result_failed` audit events increase
- logs include `http_error` or AI provider failure messages

Immediate checks:

```bash
curl http://localhost:3101/api/v1/health
curl http://localhost:3101/api/v1/readiness
```

Check environment variables:

- `AI_PROVIDER`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Safe fallback:

- Use `AI_PROVIDER=mock` for local demo and test environments.
- Keep case creation available even if AI triage fails.
- Do not allow failed AI triage to mutate official case fields.

Follow-up:

- review provider logs with `requestId`
- verify OpenAI API key validity outside the application if needed
- document whether the failure was provider outage, invalid config, timeout, or validation rejection

## Database Failure

Symptoms:

- `GET /api/v1/readiness` returns `503`
- API requests that need persistence fail
- PostgreSQL container is unhealthy or stopped

Immediate checks:

```bash
docker compose ps postgres
docker compose logs --tail=100 postgres
curl http://localhost:3101/api/v1/readiness
```

Try local restart:

```bash
docker compose restart postgres
```

If the database does not recover:

- verify `DATABASE_URL`
- verify Docker volume availability
- check disk space
- restore from the latest known-good backup if data is corrupted

Never expose PostgreSQL publicly in production. Production access should go through the application network or secure administrative access.

## Health And Readiness

Use health to confirm the API process is running:

```bash
curl http://localhost:3101/api/v1/health
```

Use readiness to confirm required dependencies are available:

```bash
curl http://localhost:3101/api/v1/readiness
```

Readiness currently checks:

- PostgreSQL connectivity through Prisma
- upload storage path availability

The endpoints must not expose secrets, database connection strings, storage paths, API keys, or infrastructure internals.

## Incident Notes

When investigating an incident, record:

- start time
- affected environment
- symptom
- relevant `requestId`
- observed status codes
- readiness result
- likely cause
- action taken
- follow-up task

Keep incident notes free from secrets and unnecessary personal data.

## Personal Data Breach / Avvik

Treat a suspected personal data breach as an incident immediately. Examples include unauthorized tenant access, exposed backups, leaked credentials, public upload files, logs containing personal data, or accidental disclosure of citizen case data.

Immediate steps:

1. Preserve evidence without copying unnecessary personal data.
2. Contain the issue, for example revoke credentials, disable public access, stop a leaking job, or isolate the affected host.
3. Identify affected data categories, tenants, users, cases, documents, and time window.
4. Check audit events, operational events, request IDs, deployment history, backup access, and relevant provider logs.
5. Notify the data controller decision-maker. For a real municipal deployment, the municipality is normally the controller.
6. Decide whether the breach is notifiable to Datatilsynet and whether affected persons must be informed.
7. If notification is required, prepare notification as soon as possible and normally within 72 hours after becoming aware of the breach. If all facts are not ready, use phased notification.
8. Record timeline, containment, impact assessment, notification decision, remediation, and follow-up tasks.

Incident notes must not include full document contents, full citizen identifiers, passwords, cookies, API keys, status access codes, or raw AI prompts/responses containing personal data.
