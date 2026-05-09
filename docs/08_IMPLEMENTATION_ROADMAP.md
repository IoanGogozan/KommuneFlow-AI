# Implementation Roadmap

## Purpose Of This Document

This document defines the implementation phases in the correct order for development.

## Phase 1: Repository And Foundation

Deliverables:

- monorepo or clear frontend/backend structure
- Docker Compose local setup
- PostgreSQL running locally
- environment variable structure
- linting
- formatting
- TypeScript strict mode
- GitHub Actions CI

Acceptance criteria:

- project starts locally with one command
- CI runs lint, type check, tests, and build
- README has local setup instructions

## Phase 2: Database, Tenants, Users, RBAC

Deliverables:

- database schema
- migrations
- seed data
- tenants
- departments
- users
- roles
- permissions
- auth endpoints

Acceptance criteria:

- login works
- seeded users can authenticate
- permissions are enforced server-side
- tenant isolation tests pass

## Phase 3: Citizen Case Intake

Deliverables:

- public intake form
- language switcher
- create case endpoint
- citizen profile creation
- initial audit event
- confirmation UI

Acceptance criteria:

- citizen can submit a case
- case is stored with correct tenant
- audit event is created
- UI works in Norwegian and English

## Phase 4: Internal Case Dashboard

Deliverables:

- case list
- filters
- case detail page
- status transitions
- internal notes
- department scoping

Acceptance criteria:

- case worker sees only allowed cases
- auditor can read but not modify
- status changes are audited

## Phase 5: Document Handling

Deliverables:

- upload endpoint
- document metadata
- safe storage
- validation
- document list in case detail
- PDF text extraction if reasonable

Acceptance criteria:

- valid PDFs/images can be uploaded
- invalid files are rejected
- document access follows RBAC
- document actions are audited

## Phase 6: AI Triage

Deliverables:

- AI provider interface
- OpenAI provider
- mock provider
- prompt versioning
- structured output validation
- AI triage result storage
- human review UI

Acceptance criteria:

- AI suggestion is generated
- invalid AI output is rejected safely
- human can approve or correct suggestion
- official case data changes only after human review

## Phase 7: Privacy And GDPR Features

Deliverables:

- privacy notice
- citizen data export
- anonymization flow
- soft-delete documents
- retention configuration
- privacy audit events

Acceptance criteria:

- export works
- anonymization works
- privacy actions are audited
- personal data is not used in analytics where avoidable

## Phase 8: Analytics

Deliverables:

- aggregation job
- analytics tables
- dashboard metrics
- AI correction rate
- case volume by category/department

Acceptance criteria:

- analytics dashboard shows useful metrics
- aggregation can be rerun safely
- analytics does not expose unnecessary personal data

## Phase 9: Hetzner Deployment

Deliverables:

- production Docker Compose
- reverse proxy
- HTTPS
- environment variables
- PostgreSQL persistence
- backup script
- deployment documentation

Acceptance criteria:

- app is accessible over HTTPS
- database persists after restart
- uploads persist after restart
- backup procedure is documented
- no database port is publicly exposed

## Phase 10: Portfolio Polish

Deliverables:

- professional README
- screenshots
- architecture diagram
- demo users
- demo video script
- job application project description

Acceptance criteria:

- a recruiter or technical interviewer can understand the project in under 5 minutes
- a developer can run the project locally from README
- the deployed demo is stable enough to show
