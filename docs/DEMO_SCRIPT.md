# Demo Script

## Goal

Show KommuneFlow AI as a realistic municipal case workflow platform with AI, data, privacy, security, and deployment discipline.

## Setup

Run locally:

```bash
docker compose up -d postgres
pnpm --filter @kommuneflow/api prisma:migrate
pnpm --filter @kommuneflow/api prisma:seed
pnpm dev
```

Open:

- citizen portal: `http://localhost:3000/en`
- internal login: `http://localhost:3000/internal/login`

Demo credentials:

```txt
department.admin@arendal.local
DemoPassword123!
```

## Walkthrough

1. Open the citizen portal.
2. Switch language between English and Norwegian.
3. Submit a new case with realistic text and attach a PDF/PNG/JPG document.
4. Explain that upload validation checks file size, extension, MIME type, magic bytes, and unsafe filenames.
5. Log in as department admin.
6. Open the case dashboard.
7. Open the submitted case.
8. Show tenant-scoped case detail, internal notes, status workflow, and document list.
9. Download the uploaded document and explain that download is authenticated, tenant-scoped, permission-checked, and audited.
10. Run AI triage.
11. Explain `AIProvider`, mock provider for deterministic tests, OpenAI provider for real integration, and Zod validation.
12. Accept or correct the AI suggestion.
13. Explain that official case fields change only after human review.
14. Open analytics.
15. Run aggregation for the current date range.
16. Show case volume by department/category/status and AI correction rate.
17. Explain analytics snapshots avoid citizen identifiers.
18. Discuss privacy features: export, anonymization, retention policy, cleanup dry-run/delete, privacy docs.
19. Discuss deployment assets: Dockerfiles, production Compose, Caddy HTTPS, backup/restore, smoke test.

## Interview Talking Points

- Tenant isolation is enforced in database queries, not the frontend.
- RBAC is centralized through permissions and guards.
- Auditors are read-only.
- AI output is untrusted and human-reviewed.
- Analytics is aggregated and avoids personal identifiers.
- Documents are private, validated, and audited.
- Retention cleanup is dry-run by default.
- Production deployment is planned for Hetzner and already has Compose/Caddy/backup assets, but public HTTPS verification still needs a real host.

## Short Pitch

KommuneFlow AI demonstrates how a municipal case management workflow can combine secure multi-tenant backend design, privacy operations, document handling, human-reviewed AI, and aggregated analytics in a production-like TypeScript stack.
