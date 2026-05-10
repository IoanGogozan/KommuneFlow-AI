# Demo Script

## Goal

Show KommuneFlow AI as a realistic Norwegian municipal workflow platform with citizen intake, address validation, document handling, human-reviewed AI, analytics, privacy, security, observability, and deployment discipline.

## Setup

Run locally:

```bash
docker compose up -d postgres
pnpm --filter @kommuneflow/api prisma:migrate
pnpm --filter @kommuneflow/api prisma:seed
pnpm dev
```

Open:

- citizen portal: `http://localhost:3000/nb` or `http://localhost:3000/en`
- internal login: `http://localhost:3000/internal/login`
- API health: `http://localhost:3101/api/v1/health`

Demo credentials:

```txt
department.admin@arendal.local
DemoPassword123!
```

The seed includes Arendal, Grimstad, and Kristiansand tenants, five departments per tenant, 20 realistic cases, documents, AI reviews, SSB population records, analytics snapshots, audit events, operational events, and email logs.

## Walkthrough

1. Open the citizen portal and switch between Norwegian Bokmal and English.
2. Submit a realistic citizen case with an address and a PDF/PNG/JPG document.
3. Mention that Kartverket address search validates and normalizes addresses, while CI uses mocked external APIs.
4. Explain document validation: size, extension, MIME type, magic bytes, and unsafe filename checks.
5. Log in as `department.admin@arendal.local`.
6. Switch the internal UI language between Norwegian Bokmal and English.
7. Open the case dashboard and show realistic seeded cases across statuses and departments.
8. Open the submitted case or an existing seeded case.
9. Show tenant-scoped detail, Kartverket address enrichment, status workflow, internal notes, and document list.
10. Download a document and explain that download is authenticated, tenant-scoped, permission-checked, and audited.
11. Run AI triage.
12. Explain `AIProvider`, deterministic mock AI for tests/demo, optional OpenAI provider, timeout/retry handling, and Zod output validation.
13. Accept or correct the AI suggestion.
14. Explain that official case fields change only after human review.
15. Update case status and add an internal note.
16. Open analytics and run aggregation for the current range.
17. Show effect metrics: triage time, close time, waiting cases, AI acceptance/correction, AI failures, estimated minutes saved, and cases per 1,000 inhabitants.
18. Explain SSB enrichment from table `07459` and local idempotent imports.
19. Open operations and show health, readiness, Kartverket metrics, SSB import status, AI metrics, failed logins, permission denials, rate-limit blocks, document upload failures, and maintenance status.
20. Discuss privacy features: export, anonymization, retention policy, cleanup dry-run/delete, and privacy docs.
21. Discuss deployment assets: Dockerfiles, production Compose, Caddy HTTPS, backup/restore, and smoke test.

## Interview Talking Points

- Tenant isolation is enforced server-side in database queries.
- RBAC is centralized through permissions and guards.
- Auditors are read-only.
- AI output is untrusted, validated, and human-reviewed.
- Analytics is aggregated and avoids citizen identifiers.
- Kartverket and SSB are real public-sector integrations, but CI mocks external APIs.
- Documents are private, validated, and audited.
- Operational events back the metrics dashboard instead of relying on empty counters.
- Retention cleanup is dry-run capable.
- Python ELT demonstrates data engineering work alongside the TypeScript app.
- Hetzner deployment is intentionally the final phase and is not marked complete until live HTTPS is verified.

## Short Pitch

KommuneFlow AI demonstrates how a municipal case workflow can combine secure multi-tenant backend design, bilingual citizen and internal UI, Norwegian public data integrations, privacy operations, document handling, human-reviewed AI, operational observability, and analytics in a production-like TypeScript and Python stack.
