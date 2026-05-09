# Development Plan

## Purpose Of This Document

This document adds practical planning guidance for starting and managing development. It translates the roadmap into an execution plan with recommended milestones, early backlog, and working rules.

## Recommended Development Strategy

Build the application in vertical slices, but start with a strong technical foundation. The project's portfolio value depends on security, tenant isolation, auditability, AI governance, and deployment discipline.

Do not start with AI or visual polish. Start with the system foundations that make the rest credible.

## Release Readiness Implementation Plan

This plan defines the concrete remaining work before the project should be treated as deploy-ready or portfolio-final. The order is intentional: first prove the current codebase is healthy, then make production runtime safe, then add the data/AI features that make the project credible for a data and AI role.

### 1. Baseline Verification

Goal: keep the main branch in a known-good state before larger changes.

Deliverables:

- run `pnpm lint`
- run `pnpm typecheck`
- run `pnpm test`
- run `pnpm build`
- fix all failures before starting deployment or analytics work
- record verification results in `docs/14_IMPLEMENTATION_CHECKLIST.md`

Acceptance criteria:

- lint, typecheck, tests, and production build all pass locally
- failing checks are treated as blockers

### 2. Production Runtime And Hetzner Deployment

Goal: make the app deployable to a Hetzner VPS without relying on local-development assumptions.

Deliverables:

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- production `docker-compose.prod.yml`
- reverse proxy configuration using Caddy or Nginx
- HTTPS-ready domain configuration
- persistent PostgreSQL volume
- persistent upload volume
- production environment variable documentation
- production migration command
- deploy smoke test procedure
- Hetzner firewall rules
- backup script for PostgreSQL
- upload backup strategy
- restore procedure with test notes

Acceptance criteria:

- API, web, PostgreSQL, and reverse proxy run from production Compose
- database port is not publicly exposed
- uploads persist across container restarts
- HTTPS, auth, upload, and AI triage are verified after deploy
- backup and restore steps are documented and testable

### 3. Security Hardening Release Gate

Goal: close the highest-risk gaps for cookie-based authentication, file handling, and API abuse.

Deliverables:

- Helmet/security headers
- strict production CORS
- explicit body size limit
- CSRF protection or strict Origin/Referer validation for cookie-authenticated state-changing requests
- file magic-byte validation
- empty file rejection
- fake extension/MIME upload tests
- path traversal filename tests
- malformed token tests
- expired token tests where deterministic
- disabled user login test
- unknown email generic-message test
- cross-tenant update-by-guessed-ID tests
- invalid JSON and oversized body tests
- dependency audit command in CI or release checklist
- secret scanning release step, for example Gitleaks
- container image scanning release step, for example Trivy

Acceptance criteria:

- negative security tests are visible and pass
- browser security headers are enabled in production
- file upload validation does not trust only extension or MIME type
- release checklist includes dependency, secret, and image scanning

### 4. Analytics And Data Platform MVP

Goal: make the project demonstrate operational analytics, not only case management.

Deliverables:

- analytics database tables
- rerunnable aggregation service/job
- case volume metrics
- department volume metrics
- category metrics
- AI correction rate metric
- analytics API
- internal analytics dashboard
- tests for aggregation idempotency
- tests proving analytics avoids unnecessary personal data

Acceptance criteria:

- dashboard shows case volume by time, department, and category
- dashboard shows AI correction rate
- aggregation can be rerun safely
- analytics data does not expose citizen personal identifiers

### 5. Document Workflow Completion

Goal: make documents usable and secure across internal and citizen workflows.

Deliverables:

- secure document download endpoint
- document download/view audit events
- citizen document upload during public intake
- magic-byte validation shared by internal and citizen uploads
- PDF text extraction where reasonable
- document summary placeholder or AI-assisted summary behind human-visible limitations
- malware scan mock or provider placeholder
- storage adapter abstraction for local storage now and object storage later
- retention-aware document cleanup

Acceptance criteria:

- authorized users can download documents securely
- unauthorized and cross-tenant document access is blocked
- citizen intake supports document upload
- document view/download actions are audited

### 6. AI Production Hardening

Goal: keep AI useful while making provider calls operationally safe and privacy-aware.

Deliverables:

- explicit OpenAI timeout and retry policy
- redaction/minimization before sending case data to AI
- safe prompt/input logging without unnecessary PII
- AI cost tracking fields or metrics
- AI latency and error metrics
- background worker or documented synchronous limitation
- real use of `triage_pending` status if a worker is added
- UI copy that AI can be wrong and requires human review
- demo evaluation set for representative cases

Acceptance criteria:

- provider failures are observable
- AI calls do not send more personal data than required
- cost, latency, and error behavior can be reviewed
- human review remains mandatory

### 7. Privacy, Retention, And GDPR Completion

Goal: make privacy workflows complete enough to discuss professionally.

Deliverables:

- retention configuration
- retention cleanup command/job
- document deletion/anonymization tied to retention policy
- detailed privacy notice on citizen intake
- data processing inventory
- DPIA-lite / risk assessment document
- legal basis and purpose documented per data category
- internal UI for privacy actions if time allows

Acceptance criteria:

- retention policy is configurable
- cleanup can be run safely and audited
- privacy documentation maps data categories to purpose and legal basis

### 8. Demo Data And Portfolio Polish

Goal: make the project feel alive during interviews and demos.

Deliverables:

- 3 demo tenants
- 5 or more departments
- 10 to 20 realistic demo cases
- Norwegian and English cases
- demo documents
- AI triage results
- audit logs
- analytics demo data
- README sections for demo users, deployment status, limitations, and screenshots
- architecture diagram

Acceptance criteria:

- demo flow works without manual database editing
- a reviewer can understand the product and architecture quickly
- documentation describes implemented behavior accurately

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
