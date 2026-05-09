# Tech Stack And Architecture

## Purpose Of This Document

This document defines the concrete technology stack, folder structure, backend architecture, frontend architecture, database approach, integrations, and code quality rules.

## Required Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query
- i18n support for Norwegian and English

### Backend

Recommended stack:

- Node.js
- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Zod for validation
- Pino for structured logging
- OpenAI API integration through an internal provider interface

NestJS is recommended because the goal is to look more enterprise and public-sector ready. Express is acceptable only if the module structure is very clean.

### Database

- PostgreSQL
- Prisma as the selected ORM and migration tool
- Migrations required
- Seed data required
- No manual schema changes outside migrations

### Local Development

- Docker Desktop
- Docker Compose
- PostgreSQL container
- Optional Redis container
- Optional MinIO container for S3-compatible local storage

### AI

- OpenAI API
- Internal `AIProvider` interface
- `OpenAIProvider` implementation
- `MockAIProvider` for tests

### Deployment

Deployment to Hetzner Cloud is mandatory.

The production-like deployment must use:

- Hetzner Cloud VPS
- Docker Compose
- PostgreSQL
- Reverse proxy with HTTPS
- Environment variables
- Firewall
- Backups or snapshots
- Basic monitoring/logging

## Recommended Monorepo Structure

```txt
apps/
  api/
  web/
packages/
  shared/
docs/
docker-compose.yml
README.md
.env.example
```

## Backend Module Structure

Recommended NestJS structure:

```txt
src/
  main.ts
  app.module.ts
  config/
  database/
  modules/
    auth/
    tenants/
    users/
    departments/
    cases/
    documents/
    ai-triage/
    audit/
    analytics/
    privacy/
    notifications/
  shared/
    errors/
    guards/
    middleware/
    validation/
    logging/
    security/
    types/
```

If using Express instead of NestJS:

```txt
src/
  app.ts
  server.ts
  config/
  db/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.repository.ts
      auth.schemas.ts
      auth.test.ts
    cases/
    documents/
    ai-triage/
    audit/
  shared/
```

## Code Quality Rules

- TypeScript strict mode must be enabled.
- Avoid `any` unless justified.
- Controllers must not contain business logic.
- Services must contain business workflows.
- Repositories must contain database access.
- Validation schemas must be explicit.
- Errors must be handled consistently.
- File names must be clear and English.
- Large files must be split.

## File Size Guidelines

- Controller files: preferably under 150 lines.
- Service files: preferably under 300 lines.
- Repository files: preferably under 250 lines.
- Utility files: preferably under 150 lines.
- Tests can be longer, but should be organized clearly.

## API Design Rules

- Use REST endpoints for MVP.
- Use versioned API prefix: `/api/v1`.
- Use consistent response format.
- Use pagination for list endpoints.
- Use filtering for case lists.
- Use structured error responses.

Example error response:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to access this resource.",
    "requestId": "req_123"
  }
}
```

## Internationalization Rules

- UI strings must not be hardcoded directly in components.
- Use translation keys.
- Supported locales: `nb`, `en`.
- Backend enum values must stay English.
- Database values must stay English.
- User-facing labels are translated in frontend.

Example:

```txt
case.status.in_progress = "Under behandling" // nb
case.status.in_progress = "In progress" // en
```
