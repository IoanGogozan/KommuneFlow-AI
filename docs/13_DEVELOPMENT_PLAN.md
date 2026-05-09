# Development Plan

## Purpose Of This Document

This document adds practical planning guidance for starting and managing development. It translates the roadmap into an execution plan with recommended milestones, early backlog, and working rules.

## Recommended Development Strategy

Build the application in vertical slices, but start with a strong technical foundation. The project's portfolio value depends on security, tenant isolation, auditability, AI governance, and deployment discipline.

Do not start with AI or visual polish. Start with the system foundations that make the rest credible.

## Recommended Initial Stack Decision

Use:

- monorepo
- Next.js for `apps/web`
- NestJS for `apps/api`
- PostgreSQL
- Prisma as the selected ORM and migration tool
- Docker Compose
- TypeScript strict mode
- Zod for API and AI validation
- shadcn/ui for frontend components
- Pino for backend logging
- OpenAI behind an internal provider interface

## First Milestone: Foundation

Goal: create a professional repository that can run locally and pass baseline checks.

Deliverables:

- repository structure
- `apps/api`
- `apps/web`
- `packages/shared`
- Docker Compose with PostgreSQL
- `.env.example`
- TypeScript strict mode
- linting and formatting
- README with local setup
- initial GitHub Actions CI

Suggested completion test:

- install succeeds
- frontend builds
- backend builds
- database starts locally
- CI commands are documented

## Second Milestone: Secure Backend Core

Goal: implement the security-sensitive foundation before building complex features.

Deliverables:

- Prisma schema for tenants, departments, users, citizen profiles, cases, and audit events
- seed data for demo tenants and users
- authentication endpoint
- password hashing
- role and permission mapping
- authorization guard
- tenant isolation helpers
- audit event service

Required tests:

- unauthenticated request returns 401
- unauthorized request returns 403
- tenant A cannot access tenant B resources
- auditor cannot mutate protected resources

## Third Milestone: Citizen Case Intake

Goal: complete the first real product workflow.

Deliverables:

- public citizen intake page
- language switcher for `nb` and `en`
- create case endpoint
- citizen profile creation
- case creation
- audit event on case creation
- confirmation page

Required tests:

- valid case submission creates citizen profile and case
- invalid input returns 400
- case is associated with the correct tenant
- audit event is created

## Fourth Milestone: Internal Case Work

Goal: make the application useful for municipal employees.

Deliverables:

- internal login
- case dashboard
- case filters
- case detail page
- status transitions
- department-scoped access
- auditor read-only access

Required tests:

- case worker sees only allowed department cases
- auditor can read but cannot mutate
- status changes are audited

## Fifth Milestone: AI Triage

Goal: add AI safely after the case workflow exists.

Deliverables:

- `AIProvider` interface
- `MockAIProvider`
- `OpenAIProvider`
- prompt templates with version names
- structured output validation
- AI triage result storage
- human review UI

Required tests:

- valid AI output is stored
- invalid AI output is rejected
- provider failure does not break case creation
- AI does not mutate official case classification before human review
- human review creates an audit event

## Planning Rules

- Keep each development step small enough to review.
- Do not mix unrelated features in the same change.
- Add or update tests with every backend feature.
- Treat tenant isolation failures as release blockers.
- Treat authorization failures as release blockers.
- Keep user-facing UI strings in translation files.
- Keep backend enums and database values in English.
- Keep secrets out of source control.
- Update documentation when commands, environment variables, architecture, or deployment steps change.

## Suggested Initial Backlog

1. Create monorepo skeleton.
2. Add `apps/api` NestJS project.
3. Add `apps/web` Next.js project.
4. Add Docker Compose with PostgreSQL.
5. Add Prisma to backend.
6. Create initial schema and migration.
7. Add seed data for demo municipalities, departments, and users.
8. Add auth module.
9. Add permission map and authorization guard.
10. Add tenant isolation tests.
11. Add audit module.
12. Add citizen case creation endpoint.
13. Add public intake UI with `nb` and `en` translations.

## Suggested Demo Tenants

- Arendal Kommune
- Grimstad Kommune
- Kristiansand Kommune

## Suggested Demo Users

Use deterministic demo users for local development and portfolio walkthroughs. Demo credentials must never be reused in production.

Recommended roles:

- super admin
- tenant admin
- department admin
- case worker
- auditor

## Suggested Architectural Decision Records

Create ADRs later when these decisions are implemented:

- choice of NestJS for backend architecture
- choice of Prisma for database access and migrations
- tenant isolation strategy
- authentication/session strategy
- file storage strategy
- AI provider abstraction
- deployment architecture on Hetzner

Store ADRs in:

```txt
docs/adr/
```

## Portfolio Polish Plan

After the MVP works, add:

- professional README
- architecture diagram
- screenshots
- demo user list
- demo video script
- deployment notes
- privacy/security highlights
- job application project description in English and Norwegian
