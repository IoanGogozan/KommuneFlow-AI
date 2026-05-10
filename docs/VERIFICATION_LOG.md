# Verification Log

Use this file as the local verification record before any deployment. Do not run live Kartverket, SSB, or OpenAI checks in CI.

## Environment

Last verified: 2026-05-10

| Item | Value |
| --- | --- |
| Machine | Local Windows / Docker Desktop |
| Node | v24.11.1 |
| pnpm | 10.28.2 |
| Python | 3.14.4 |
| Docker | 29.4.0 |

## Automated Checks

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm lint` | PASS | API and web lint passed. |
| `pnpm typecheck` | PASS | API, web, and shared packages passed. |
| `pnpm test` | PASS | API unit suite: 24 suites, 141 tests. |
| `pnpm --filter @kommuneflow/api test:e2e` | PASS | API e2e suite: 20 tests. |
| `pnpm build` | PASS | API, web, and shared packages built. |
| `cd apps/etl && python -m pytest -q` | PASS | 12 tests passed in latest full verification pass. |
| `pnpm audit:deps` | PASS | No high-severity findings in latest full verification pass; pnpm reported 2 moderate vulnerabilities. |

## Local Services

| Service | Result | Notes |
| --- | --- | --- |
| PostgreSQL | PASS | Start with `docker compose up -d postgres`. |
| Prisma migrations | PASS | Run `pnpm --filter @kommuneflow/api prisma:migrate` or deploy migrations as appropriate for the local DB. |
| Prisma seed | PASS | `pnpm --filter @kommuneflow/api prisma:seed` creates 3 tenants, 20 seed cases, documents, AI examples, analytics, audit, operations, SSB records, and email logs. |
| API readiness | PENDING | Verify `GET http://localhost:3101/api/v1/readiness` with API running. |
| Web UI | PENDING | Verify citizen intake and internal cases, analytics, operations, and privacy pages. |

## Manual Verification Checklist

Record the exact date, command, account, and result for each item.

| Workflow | Result | Evidence |
| --- | --- | --- |
| Kartverket real address lookup | PENDING | Use `docs/integrations/manual-verification.md#kartverket-real-address-lookup`. |
| SSB import | PENDING | Use `docs/integrations/manual-verification.md#ssb-population-import`. |
| OpenAI real triage | PENDING | Use `docs/integrations/manual-verification.md#openai-real-triage`. |
| Analytics rebuild | PENDING | Use `docs/integrations/manual-verification.md#analytics-rebuild`. |
| Document upload/download | PENDING | Use `docs/integrations/manual-verification.md#document-upload-and-download`. |
| Citizen status lookup | PENDING | Use `docs/integrations/manual-verification.md#citizen-status-lookup`. |

## Manual Verification Notes Template

Copy this block for each manual verification run.

```txt
Date:
Operator:
Local branch/commit:
Environment variables changed:
Command or UI path:
Account used:
External API called: yes/no
Result: PASS/FAIL
Request ID, if applicable:
Operational event evidence:
Notes:
```

## Rules

- CI and automated tests must use mock providers for Kartverket, SSB, and OpenAI.
- Do not commit real external API response payloads unless they are intentionally curated fixtures.
- Do not paste secrets, citizen PII, `OPENAI_API_KEY`, status access codes, cookies, or auth tokens into this log.
