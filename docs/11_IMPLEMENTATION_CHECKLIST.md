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
- [ ] Create initial database schema
- [ ] Add migration for tenants
- [ ] Add migration for departments
- [ ] Add migration for users
- [ ] Add migration for citizen profiles
- [ ] Add migration for cases
- [ ] Add migration for audit events
- [ ] Add seed data for demo tenants
- [ ] Add seed data for departments
- [ ] Add seed data for demo users
- [ ] Add password hashing
- [ ] Add authentication endpoint
- [ ] Add role model
- [ ] Add explicit permission map
- [ ] Add authorization guard
- [ ] Add tenant isolation helper
- [ ] Add audit event service
- [ ] Add tests for unauthenticated requests returning 401
- [ ] Add tests for unauthorized requests returning 403
- [ ] Add tests for cross-tenant access blocking
- [ ] Add tests for auditor read-only behavior

Phase completion criteria:

- [ ] Login works
- [ ] Seeded users can authenticate
- [ ] Permissions are enforced server-side
- [ ] Tenant isolation tests pass

## Phase 3: Citizen Case Intake

Goal: complete the first public citizen workflow.

- [ ] Add public intake page
- [ ] Add language switcher
- [ ] Add Norwegian translations
- [ ] Add English translations
- [ ] Add create case API endpoint
- [ ] Add request validation
- [ ] Create citizen profile during intake
- [ ] Create case during intake
- [ ] Create audit event during intake
- [ ] Add confirmation page
- [ ] Add test for successful case submission
- [ ] Add test for invalid input returning 400
- [ ] Add test for correct tenant association
- [ ] Add test for audit event creation

Phase completion criteria:

- [ ] Citizen can submit a case
- [ ] Case is stored with correct tenant
- [ ] Audit event is created
- [ ] UI works in Norwegian and English

## Phase 4: Internal Case Dashboard

Goal: make the application useful for municipal employees.

- [ ] Add internal login UI
- [ ] Add authenticated app layout
- [ ] Add case list API
- [ ] Add case list UI
- [ ] Add case filters
- [ ] Add case detail API
- [ ] Add case detail UI
- [ ] Add department-scoped case access
- [ ] Add status transition logic
- [ ] Add internal notes
- [ ] Audit status changes
- [ ] Audit internal note creation
- [ ] Add test for department case scoping
- [ ] Add test for auditor read-only access
- [ ] Add test for audited status transitions

Phase completion criteria:

- [ ] Case worker sees only allowed cases
- [ ] Auditor can read but not modify
- [ ] Status changes are audited

## Phase 5: Document Handling

Goal: support safe upload and controlled document access.

- [ ] Add document database table
- [ ] Add upload endpoint
- [ ] Validate file size
- [ ] Validate MIME type
- [ ] Validate file extension
- [ ] Generate checksum
- [ ] Store files outside public web directory
- [ ] Store document metadata
- [ ] Add document list to case detail
- [ ] Add document access authorization
- [ ] Add sensitive document flag
- [ ] Audit document upload
- [ ] Audit sensitive document access
- [ ] Add tests for valid upload
- [ ] Add tests for invalid file type rejection
- [ ] Add tests for oversized file rejection
- [ ] Add tests for document tenant isolation

Phase completion criteria:

- [ ] Valid PDFs/images can be uploaded
- [ ] Invalid files are rejected
- [ ] Document access follows RBAC
- [ ] Document actions are audited

## Phase 6: AI Triage

Goal: add AI-assisted triage without allowing AI to make final decisions.

- [ ] Add AI triage result database table
- [ ] Add AI review database table
- [ ] Add `AIProvider` interface
- [ ] Add `MockAIProvider`
- [ ] Add `OpenAIProvider`
- [ ] Add prompt template `case_triage_v1`
- [ ] Add structured output schema
- [ ] Validate AI output with Zod
- [ ] Store raw AI response safely
- [ ] Store short reasoning summary only
- [ ] Add AI triage API endpoint or worker
- [ ] Add AI suggestion UI on case detail
- [ ] Add human review API
- [ ] Add human review UI
- [ ] Audit AI triage result creation
- [ ] Audit human review
- [ ] Add test for valid AI response parsing
- [ ] Add test for invalid AI response rejection
- [ ] Add test for AI provider failure
- [ ] Add test proving AI does not mutate official case fields before review
- [ ] Add test proving human review creates audit event

Phase completion criteria:

- [ ] AI suggestion is generated
- [ ] Invalid AI output is rejected safely
- [ ] Human can approve or correct suggestion
- [ ] Official case data changes only after human review

## Phase 7: Privacy And GDPR Features

Goal: demonstrate privacy-by-design behavior.

- [ ] Add privacy notice to intake form
- [ ] Add citizen data export service
- [ ] Add citizen data export endpoint
- [ ] Add citizen anonymization service
- [ ] Add citizen anonymization endpoint
- [ ] Add document soft-delete behavior
- [ ] Add retention configuration
- [ ] Add privacy audit events
- [ ] Add tests for citizen data export
- [ ] Add tests for anonymization
- [ ] Add tests for document soft-delete
- [ ] Add tests for privacy audit events

Phase completion criteria:

- [ ] Export works
- [ ] Anonymization works
- [ ] Privacy actions are audited
- [ ] Analytics avoids personal identifiers where possible

## Phase 8: Analytics

Goal: provide operational insight without exposing unnecessary personal data.

- [ ] Add analytics database tables
- [ ] Add aggregation job
- [ ] Add case volume metrics
- [ ] Add category metrics
- [ ] Add department metrics
- [ ] Add AI correction rate metric
- [ ] Add analytics API
- [ ] Add analytics dashboard UI
- [ ] Add tests for aggregation job
- [ ] Add tests for rerunnable aggregation
- [ ] Add tests ensuring analytics avoids unnecessary personal data

Phase completion criteria:

- [ ] Analytics dashboard shows useful metrics
- [ ] Aggregation can be rerun safely
- [ ] Analytics does not expose unnecessary personal data

## Phase 9: Hetzner Deployment

Goal: deploy the application in a production-like environment.

- [ ] Create production Dockerfiles
- [ ] Create production Docker Compose file
- [ ] Add reverse proxy configuration
- [ ] Add HTTPS configuration
- [ ] Add production environment variable documentation
- [ ] Add persistent PostgreSQL volume
- [ ] Add persistent upload storage
- [ ] Add migration command for production
- [ ] Add seed command for demo-safe production data
- [ ] Add database backup script
- [ ] Add upload backup strategy
- [ ] Document Hetzner firewall rules
- [ ] Document restore procedure
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

## Phase 10: Portfolio Polish

Goal: make the project easy to understand and show in interviews.

- [ ] Add professional README
- [ ] Add architecture diagram
- [ ] Add screenshots
- [ ] Add demo users section
- [ ] Add demo video script
- [ ] Add deployment notes
- [ ] Add security and privacy highlights
- [ ] Add English job application project description
- [ ] Add Norwegian job application project description

Phase completion criteria:

- [ ] A recruiter or technical interviewer can understand the project in under 5 minutes
- [ ] A developer can run the project locally from README
- [ ] The deployed demo is stable enough to show

## Current Focus

Update this section manually whenever work starts on a new task.

```txt
Current phase: Phase 2: Database, Tenants, Users, RBAC
Current task: Not started
Next task: Create initial database schema
Blocked by: None
Last updated: 2026-05-09
```

## Notes And Decisions

Use this section for short implementation notes. Longer architectural decisions should be added as ADRs in `docs/adr/`.

- Initial documentation created before implementation.
- Phase 1 foundation completed with pnpm monorepo, NestJS API, Next.js web app, shared package, Docker PostgreSQL, Prisma baseline, CI, and README setup.
- Prisma is the selected database ORM and migration tool.
