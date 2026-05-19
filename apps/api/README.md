# KommuneFlow API

NestJS API for KommuneFlow AI, the municipal case workflow demo.

## Responsibilities

- Public citizen intake, document upload, and case status lookup
- Internal case handling with RBAC, tenant isolation, audit logging, and notes
- Human-reviewed KI/AI triage through a provider abstraction
- Kartverket address validation and SSB population enrichment
- Analytics, operational metrics, privacy export, profile identifier anonymization, and retention cleanup

## Local Commands

Run from the repository root:

```bash
pnpm --filter @kommuneflow/api start:dev
pnpm --filter @kommuneflow/api test
pnpm --filter @kommuneflow/api test:cov:ci
pnpm --filter @kommuneflow/api test:e2e
pnpm --filter @kommuneflow/api prisma:seed
```

The API expects PostgreSQL and the environment variables documented in the root `.env.example`.
