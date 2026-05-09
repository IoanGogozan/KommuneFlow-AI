# Implementation Checklist

## Purpose Of This Document

This document tracks implementation progress for KommuneFlow AI. It should be updated after each meaningful development step.

Use this checklist to see:

- what has been completed
- what is currently in progress
- what is blocked
- what still needs to be implemented

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[!]` Blocked or needs decision

Markdown checkboxes do not support `[~]` or `[!]` natively in every viewer, but they are useful as plain text status markers.

## Phase 1: Repository And Foundation

Goal: create a professional repository that can run locally and pass baseline checks.

- [x] Create monorepo structure
- [x] Create `apps/api`
- [x] Create `apps/web`
- [x] Create `packages/shared`
- [x] Add root package manager configuration
- [x] Enable TypeScript strict mode
- [x] Add ESLint
- [x] Add Prettier
- [x] Add Docker Compose
- [x] Add PostgreSQL service
- [x] Add `.env.example`
- [x] Add local setup instructions to `README.md`
- [x] Add GitHub Actions CI
- [x] Verify install command works
- [x] Verify backend build works
- [x] Verify frontend build works
- [x] Verify database starts locally

Phase completion criteria:

- [x] Project starts locally with documented commands
- [x] CI runs lint, type check, tests, and build
- [x] README explains local development setup

## Phase 2: Database, Tenants, Users, RBAC

Goal: implement the secure backend core.

- [x] Add Prisma as the selected database ORM and migration tool
- [x] Create initial database schema
- [x] Add migration for tenants
- [x] Add migration for departments
- [x] Add migration for users
- [x] Add migration for citizen profiles
- [x] Add migration for cases
- [x] Add migration for audit events
- [x] Add seed data for demo tenants
- [x] Add seed data for departments
- [x] Add seed data for demo users
- [x] Add password hashing
- [x] Add authentication endpoint
- [x] Add role model
- [x] Add explicit permission map
- [x] Add authorization guard
- [x] Add tenant isolation helper
- [x] Add audit event service
- [x] Add tests for unauthenticated requests returning 401
- [x] Add tests for unauthorized requests returning 403
- [x] Add tests for cross-tenant access blocking
- [x] Add tests for auditor read-only behavior

Phase completion criteria:

- [x] Login works
- [x] Seeded users can authenticate
- [x] Permissions are enforced server-side
- [x] Tenant isolation tests pass

## Phase 3: Citizen Case Intake

Goal: complete the first public citizen workflow.

- [x] Add public intake page
- [x] Add language switcher
- [x] Add Norwegian translations
- [x] Add English translations
- [x] Add create case API endpoint
- [x] Add request validation
- [x] Create citizen profile during intake
- [x] Create case during intake
- [x] Create audit event during intake
- [x] Add confirmation page
- [x] Add test for successful case submission
- [x] Add test for invalid input returning 400
- [x] Add test for correct tenant association
- [x] Add test for audit event creation

Phase completion criteria:

- [x] Citizen can submit a case
- [x] Case is stored with correct tenant
- [x] Audit event is created
- [x] UI works in Norwegian and English

## Phase 4: Internal Case Dashboard

Goal: make the application useful for municipal employees.

- [x] Add internal login UI
- [x] Add authenticated app layout
- [x] Add case list API
- [x] Add case list UI
- [x] Add case filters
- [x] Add case detail API
- [x] Add case detail UI
- [x] Add department-scoped case access
- [x] Add status transition logic
- [x] Add internal notes
- [x] Audit status changes
- [x] Audit internal note creation
- [x] Add test for department case scoping
- [x] Add test for auditor read-only access
- [x] Add test for audited status transitions

Phase completion criteria:

- [x] Case worker sees only allowed cases
- [x] Auditor can read but not modify
- [x] Status changes are audited

## Phase 5: Document Handling

Goal: support safe upload and controlled document access.

- [x] Add document database table
- [x] Add upload endpoint
- [x] Validate file size
- [x] Validate MIME type
- [x] Validate file extension
- [x] Generate checksum
- [x] Store files outside public web directory
- [x] Store document metadata
- [x] Add document list to case detail
- [x] Add document access authorization
- [x] Add sensitive document flag
- [x] Audit document upload
- [x] Audit sensitive document access
- [x] Add citizen document upload during public intake
- [x] Audit citizen document upload
- [x] Add tests for valid upload
- [x] Add tests for invalid file type rejection
- [x] Add tests for oversized file rejection
- [x] Add tests for document tenant isolation

Phase completion criteria:

- [x] Valid PDFs/images can be uploaded
- [x] Invalid files are rejected
- [x] Citizens can upload documents during intake
- [x] Document access follows RBAC
- [x] Document actions are audited

## Phase 6: AI Triage

Goal: add AI-assisted triage without allowing AI to make final decisions.

- [x] Add AI triage result database table
- [x] Add AI review database table
- [x] Add `AIProvider` interface
- [x] Add `MockAIProvider`
- [x] Add `OpenAIProvider`
- [x] Add prompt template `case_triage_v1`
- [x] Add structured output schema
- [x] Validate AI output with Zod
- [x] Store raw AI response safely
- [x] Store short reasoning summary only
- [x] Add AI triage API endpoint or worker
- [x] Add AI suggestion UI on case detail
- [x] Add human review API
- [x] Add human review UI
- [x] Audit AI triage result creation
- [x] Audit human review
- [x] Add test for valid AI response parsing
- [x] Add test for invalid AI response rejection
- [x] Add test for AI provider failure
- [x] Add test proving AI does not mutate official case fields before review
- [x] Add test proving human review creates audit event

Phase completion criteria:

- [x] AI suggestion is generated
- [x] Invalid AI output is rejected safely
- [x] Human can approve or correct suggestion
- [x] Official case data changes only after human review

## Phase 7: Privacy And GDPR Features

Goal: demonstrate privacy-by-design behavior.

- [x] Add privacy notice to intake form
- [x] Add privacy backend module
- [x] Add citizen data export service
- [x] Add citizen data export endpoint
- [x] Add citizen anonymization service
- [x] Add citizen anonymization endpoint
- [x] Add document soft-delete behavior
- [x] Add retention configuration
- [x] Add retention cleanup command
- [x] Add privacy audit events
- [x] Add tests for citizen data export
- [x] Add tests for anonymization
- [x] Add tests for document soft-delete
- [x] Add tests for privacy audit events
- [x] Add tests for retention cleanup dry-run and confirmed delete
- [x] Add data processing inventory
- [x] Add DPIA-lite risk assessment

Phase completion criteria:

- [x] Export works
- [x] Anonymization works
- [x] Privacy actions are audited
- [x] Analytics avoids personal identifiers where possible

## Phase 8: Observability And Operations

Goal: make the application observable and operable in a production-like environment.

- [x] Add request ID middleware
- [x] Accept safe `X-Request-Id` values
- [x] Return request ID in response headers
- [x] Include request ID in structured error responses
- [x] Add structured JSON logging
- [x] Add safe request logging
- [x] Add safe error logging
- [x] Add `/api/v1/health`
- [x] Add `/api/v1/readiness`
- [x] Verify database dependency in readiness check
- [x] Verify upload storage path in readiness check
- [ ] Add metrics-friendly tracking for key operations
- [ ] Add operations dashboard basics
- [ ] Add backup logs or documented backup logging behavior
- [x] Create `docs/RUNBOOK.md`
- [x] Add tests for health endpoint
- [x] Add tests for readiness endpoint
- [x] Add tests for request ID propagation
- [x] Add tests proving secrets are not exposed in health/readiness responses

Phase completion criteria:

- [x] `/api/v1/health` works
- [x] `/api/v1/readiness` verifies required dependencies
- [x] Request IDs exist in responses, logs, and error responses
- [x] Logs avoid secrets and unnecessary personal data
- [x] Runbook documents core operational actions

## Phase 9: Analytics

Goal: provide operational insight without exposing unnecessary personal data.

- [x] Add analytics database tables
- [x] Add aggregation job
- [x] Add case volume metrics
- [x] Add category metrics
- [x] Add department metrics
- [x] Add AI correction rate metric
- [x] Add analytics API
- [x] Add analytics dashboard UI
- [x] Add tests for aggregation job
- [x] Add tests for rerunnable aggregation
- [x] Add tests ensuring analytics avoids unnecessary personal data

Phase completion criteria:

- [x] Analytics dashboard shows useful metrics
- [x] Aggregation can be rerun safely
- [x] Analytics does not expose unnecessary personal data

## Phase 10: Security Hardening And Release Gate

Goal: expand negative testing and make security release criteria explicit.

- [x] Add login wrong-password test
- [x] Add unknown-email generic-message test
- [x] Add disabled-user login test
- [x] Add malformed token test
- [x] Add expired token/session test if token expiry can be tested deterministically
- [x] Add auditor mutation tests for notes, status, and AI review
- [x] Add cross-tenant update-by-guessed-ID tests
- [x] Add cross-tenant document storage key access test
- [x] Add invalid JSON body test
- [x] Add oversized body test
- [ ] Add unsupported HTTP method safe-error test
- [x] Add CORS production configuration test or documented manual check
- [x] Add executable upload rejection test
- [x] Add fake extension/MIME upload rejection test
- [x] Add empty file upload rejection test
- [x] Add path traversal filename test
- [ ] Add malformed AI JSON test
- [x] Add missing AI fields test
- [x] Add invalid AI enum test
- [x] Add AI confidence range test
- [ ] Add AI output safe-rendering test
- [ ] Add privacy workflow tests after privacy module exists
- [x] Add dependency audit command to CI or release checklist

Phase completion criteria:

- [x] Tenant isolation tests pass
- [x] RBAC tests pass
- [x] Auth negative tests pass
- [x] File upload abuse tests pass
- [x] AI safety tests pass
- [ ] Privacy workflow tests pass
- [x] Production build passes

## Phase 11: Hetzner Deployment

Goal: deploy the application in a production-like environment.

- [x] Create production Dockerfiles
- [x] Create production Docker Compose file
- [x] Add reverse proxy configuration
- [x] Add HTTPS configuration
- [x] Add production environment variable documentation
- [x] Add persistent PostgreSQL volume
- [x] Add persistent upload storage
- [x] Add migration command for production
- [x] Add seed command for demo-safe production data
- [x] Add database backup script
- [x] Add upload backup strategy
- [x] Document Hetzner firewall rules
- [x] Document restore procedure
- [ ] Verify app over HTTPS
- [ ] Verify auth in deployed environment
- [ ] Verify file upload in deployed environment
- [ ] Verify AI triage in deployed environment

Phase completion criteria:

- [ ] App is accessible over HTTPS
- [ ] Database persists after restart
- [ ] Uploads persist after restart
- [ ] Backup procedure is documented
- [ ] No database port is publicly exposed

## Phase 12: Portfolio Polish

Goal: make the project easy to understand and show in interviews.

- [x] Add professional README
- [x] Add architecture diagram
- [ ] Add screenshots
- [x] Add demo users section
- [x] Add demo video script
- [x] Add deployment notes
- [x] Add security and privacy highlights
- [x] Add API documentation
- [x] Add ADR for tenant ID filtering
- [x] Add ADR for human-reviewed AI suggestions
- [x] Add ADR for `AIProvider`
- [x] Add ADR for Docker Compose on Hetzner
- [x] Add ADR for PostgreSQL
- [x] Add ADR for i18n strategy
- [x] Add known limitations section
- [x] Add future improvements section
- [x] Add English job application project description
- [x] Add Norwegian job application project description

Phase completion criteria:

- [ ] A recruiter or technical interviewer can understand the project in under 5 minutes
- [ ] A developer can run the project locally from README
- [ ] The deployed demo is stable enough to show
- [ ] Repository satisfies `docs/12_PROFESSIONAL_QUALITY_BAR.md`

## Current Focus

Update this section manually whenever work starts on a new task.

```txt
Current phase: Phase 12 Portfolio Polish
Current task: README, API reference, demo script, ADRs, architecture diagrams, limitations, future improvements, and portfolio descriptions completed
Next task: Capture screenshots or verify production Hetzner deployment
Blocked by: None
Last updated: 2026-05-09
```

## Notes And Decisions

Use this section for short implementation notes. Longer architectural decisions should be added as ADRs in `docs/adr/`.

- Initial documentation created before implementation.
- Phase 1 foundation completed with pnpm monorepo, NestJS API, Next.js web app, shared package, Docker PostgreSQL, Prisma baseline, CI, and README setup.
- Prisma is the selected database ORM and migration tool.
- Phase 2 completed with Prisma core schema, initial migration, seed data, JWT login, password hashing, explicit permission map, authorization guard, tenant-filtered case access, audit service, and security-focused tests.
- Phase 3 completed with public citizen intake API, tenant lookup, citizen profile creation, case creation, intake audit event, Norwegian and English intake UI, language switcher, confirmation state, and validation tests.
- Phase 4 completed with internal login UI, authenticated case dashboard, case filters, case detail view, department-scoped case list, status updates, internal notes, audit events for status/note changes, and backend tests for scoping and read-only auditor behavior.
- Security hardening added after Phase 4: internal auth moved from browser token storage to `HttpOnly` cookie, login and public intake rate limiting added, production JWT secret enforcement added, and standardized API error shape introduced.
- Phase 5 completed with case document metadata, safe local upload storage via `UPLOAD_STORAGE_PATH`, PDF/image validation, checksums, sensitive document filtering, upload and sensitive-access audit events, case detail document UI, and backend tests for upload validation and tenant isolation.
- Phase 6 database foundation started with `AITriageResult`, `AIReview`, and `AITriageStatus` models plus tenant-scoped indexes and relations to cases, departments, users, and reviews.
- Phase 6 provider foundation added with `AIProvider`, deterministic `MockAIProvider`, OpenAI Responses API provider using Structured Outputs, `case_triage_v1` prompt helpers, and Zod validation for AI triage output.
- Phase 6 backend workflow added with tenant-scoped AI triage endpoints, safe failed-result storage on provider errors, raw response storage, short reasoning summaries, human review API, official case updates only after review, and audit events for triage creation/failure and review.
- Phase 6 UI completed on case detail with AI suggestion generation, visible suggested classification, confidence, missing information, reasoning summary, and human accept/correct review controls.
- Documentation aligned with the updated blueprint by adding observability and operations, security test plan, and professional quality bar source-of-truth documents.
- Request ID middleware added with safe `X-Request-Id` reuse, generated fallback IDs, response header propagation, and structured error response reuse.
- Operations endpoints added for `/api/v1/health` and `/api/v1/readiness`, with readiness checks for PostgreSQL through Prisma and upload storage availability.
- Pino structured request logging added with method, path, status code, duration, request ID, and safe optional actor metadata.
- Safe error logging added in the global exception filter with request ID, error code, path, status, and safe actor metadata.
- Initial runbook added with restart, logs, migrations, backup, restore, AI provider failure, and database failure procedures.
- Privacy backend module added with super-admin-only citizen data export, tenant-scoped lookup by citizen profile ID or email, safe document metadata export, relevant audit event export, and privacy export audit event.
- Citizen anonymization added with super-admin-only access, tenant-scoped profile lookup, personal identifier masking, and privacy anonymization audit event.
- Document soft-delete added with `deletedAt`, tenant-scoped delete endpoint, operational list filtering, privacy export metadata, and `document.soft_deleted` audit event.
- Release readiness implementation plan added to `docs/13_DEVELOPMENT_PLAN.md` with ordered work for baseline verification, Hetzner deployment, security hardening, analytics, document workflow completion, AI hardening, privacy retention, demo data, and portfolio polish.
- Baseline local verification completed on 2026-05-09: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass locally.
- Phase 11 deployment assets added with API and web Dockerfiles, Next.js standalone output, production Compose for PostgreSQL/API/web/Caddy, Caddy HTTPS reverse proxy config, production env example, persistent database/upload/Caddy volumes, production migration and demo seed commands, PostgreSQL and uploads backup scripts, restore script, smoke test script, and concrete Hetzner firewall/deployment documentation.
- Phase 11 local verification completed on 2026-05-09: production Compose config validates, Caddyfile validates with `caddy validate`, API and web Docker images build, production migration command applies all migrations on a clean PostgreSQL volume, API health/readiness pass inside the production container, and the web container becomes healthy.
- Phase 10 security hardening added with Helmet headers, explicit JSON/form body size limits, CORS allowlist, Origin/Referer validation for cookie-authenticated state-changing requests, magic-byte upload validation, empty file rejection, unsafe filename rejection, negative auth/token tests, cross-tenant mutation tests, invalid JSON and oversized body e2e tests, dependency audit in CI, and documented Gitleaks/Trivy release scans.
- Secure document download added with `GET /api/v1/cases/:caseId/documents/:documentId/download`, tenant-scoped case and document lookup, sensitive-document permission filtering, upload-root path containment, no-store response caching, attachment headers, `document.downloaded` audit event, internal UI download link, and tests for successful download, guessed document IDs, sensitive access blocking, and unsafe storage keys.
- Citizen document upload added to public intake with optional multipart `documents` files, `payload` JSON support, `uploadedByCitizenProfileId` document ownership, `document.uploaded_by_citizen` audit events, internal document list support for citizen uploaders, and bilingual file input labels.
- Phase 9 Analytics MVP added with `AnalyticsDailySnapshot` table, rerunnable tenant/day aggregation service, protected `/api/v1/analytics/aggregate` and `/api/v1/analytics/summary` endpoints, case volume by status/category/department, AI correction rate, `/internal/analytics` dashboard, RBAC controller tests, aggregation idempotency tests, and privacy tests proving analytics snapshots avoid citizen personal identifiers.
- Retention policy added with per-tenant `RetentionPolicy`, default periods for closed cases, soft-deleted documents, audit events, and analytics snapshots, privacy API endpoints for read/update/cleanup, dry-run-by-default cleanup, confirmed delete mode, and audit events for policy update, cleanup dry-run, and cleanup execution.
- Privacy documentation completed with detailed intake privacy text, `docs/privacy/PRIVACY_NOTICE.md`, `docs/privacy/DATA_PROCESSING_INVENTORY.md`, and `docs/privacy/DPIA_LITE.md`, covering data categories, purpose, legal basis assumptions, AI processing, retention, security controls, risk assessment, and remaining real-deployment gaps.
- Portfolio polish added with professional README, Mermaid architecture diagrams, demo users, demo walkthrough, API reference, screenshot capture plan, deployment status notes, security/privacy highlights, known limitations, future improvements, English/Norwegian portfolio descriptions, and ADRs for tenant filtering, human-reviewed AI, AIProvider, Docker Compose on Hetzner, PostgreSQL, and i18n.
