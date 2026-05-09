# KommuneFlow AI

KommuneFlow AI is a multi-tenant SaaS platform for municipal citizen case intake, AI-assisted case triage, role-based access control, audit logging, privacy workflows, and analytics.

## Documentation

Project planning documents are stored in [docs](./docs). Start with:

- [Documentation Index](./docs/00_DOCUMENTATION_INDEX.md)
- [Development Plan](./docs/10_DEVELOPMENT_PLAN.md)
- [Implementation Checklist](./docs/11_IMPLEMENTATION_CHECKLIST.md)

## Requirements

- Node.js 24+
- pnpm 10+
- Docker Desktop

## Local Setup

Install dependencies:

```bash
pnpm install
```

Copy the environment example:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

The Docker PostgreSQL service maps to local port `5433` by default to avoid conflicts with a local PostgreSQL installation.

Generate the Prisma client after schema changes:

```bash
pnpm --filter @kommuneflow/api prisma:generate
```

Run database migrations and seed demo data:

```bash
pnpm --filter @kommuneflow/api prisma:migrate
pnpm --filter @kommuneflow/api prisma:seed
```

Start the API and web app:

```bash
pnpm dev
```

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:3101/api/v1`
- Citizen intake in Norwegian: `http://localhost:3000/nb`
- Citizen intake in English: `http://localhost:3000/en`

Public citizen intake API:

```txt
POST /api/v1/public/tenants/:tenantSlug/cases
```

## Useful Commands

```bash
pnpm build
pnpm lint
pnpm test
pnpm typecheck
pnpm dev:api
pnpm dev:web
pnpm --filter @kommuneflow/api prisma:migrate
pnpm --filter @kommuneflow/api prisma:seed
```

## Workspace Structure

```txt
apps/
  api/
  web/
packages/
  shared/
docs/
```

## Development Rules

- Internal documentation, code, database names, API routes, comments, commits, and developer-facing text must be written in English.
- User-facing UI must support Norwegian Bokmal (`nb`) and English (`en`).
- Backend authorization and tenant isolation must be enforced server-side.
- AI output must be treated as untrusted data and validated before storage.
