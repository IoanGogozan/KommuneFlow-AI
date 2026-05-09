# Professional Quality Bar

## Goal

This document defines what makes the project look professional to an employer.

The project should communicate that the system handles real users, real data, security, privacy, operations, testing, and deployment with engineering discipline.

## Repository Requirements

The repository must include:

- clear README
- architecture diagram
- local setup instructions
- deployment instructions
- environment variable documentation
- security model
- privacy model
- test strategy
- API documentation
- screenshots
- demo users
- known limitations
- future improvements

## README Requirements

README must explain:

- what the product does
- why it exists
- main features
- tech stack
- architecture overview
- security and privacy highlights
- AI governance highlights
- testing strategy
- local setup
- deployment overview
- demo credentials
- screenshots

## Architecture Decision Records

Use `docs/adr/` for important decisions.

Required ADRs:

- why multi-tenancy uses tenant ID filtering
- why AI suggestions require human review
- why OpenAI is wrapped behind `AIProvider`
- why Hetzner deployment uses Docker Compose
- why PostgreSQL is used
- why Norwegian and English are handled through i18n files

## API Documentation

Provide either OpenAPI/Swagger documentation or a documented REST endpoint list in Markdown.

Minimum API docs:

- auth endpoints
- case endpoints
- document endpoints
- AI triage endpoints
- audit endpoints
- analytics endpoints
- privacy endpoints

## Demo Quality

The deployed demo must include seeded realistic data:

- at least 3 tenants
- at least 5 departments
- at least 10 demo cases
- at least 3 AI triage examples
- at least 2 document examples
- at least 3 user roles
- audit log examples
- analytics data

Demo data must not contain real personal data.

## UI Quality

The UI should be clean and professional.

Required:

- language switcher
- responsive layout
- empty states
- loading states
- error states
- permission-aware navigation
- clear status badges
- accessible form labels
- confirmation after citizen submission

## Backend Quality

Required:

- modular architecture
- small files
- typed DTOs or schemas
- validation schemas
- consistent error handling
- consistent logging
- no business logic in controllers
- no duplicated permission checks scattered randomly
- clear service boundaries

## Database Quality

Required:

- migrations
- seed data
- indexes for common queries
- foreign keys where appropriate
- created/updated timestamps
- tenant ID on tenant-owned tables
- no manual database setup beyond documented commands

Recommended indexes:

- `tenantId`
- `tenantId + status`
- `tenantId + assignedDepartmentId`
- `tenantId + createdAt`
- `caseId` on documents and audit events

## Testing Quality

Required:

- tests are easy to run
- tests are deterministic
- tests do not require the real OpenAI API
- test data is isolated
- negative tests are included
- security tests are visible and clearly named

Good test names should read like requirements:

```txt
should_block_cross_tenant_case_access
should_reject_invalid_ai_category
should_prevent_auditor_from_updating_case_status
should_not_expose_password_hash_in_user_response
```

## Deployment Quality

Required:

- deployed HTTPS URL
- documented Hetzner setup
- Docker Compose production file
- backup script
- restore documentation
- firewall documentation
- no public database port
- production environment example

## Interview Talking Points

Be prepared to explain:

- how tenant isolation works
- how RBAC is enforced
- how AI is prevented from making final decisions
- how personal data is minimized
- how audit logs work
- how document uploads are secured
- how negative tests are structured
- how deployment works on Hetzner
- how backups and restore are handled
- what should be improved with more time

## Final Acceptance Criteria

The project is ready to show to an employer only when:

- it runs locally from README
- it is deployed on Hetzner over HTTPS
- it has real tests, including negative tests
- it has visible security/privacy documentation
- it has a clean architecture
- it has demo data
- it has screenshots
- it has a short demo flow
- it has a documented backup/restore approach
- it has no obvious secrets in Git
- it has no broken main flow

## Portfolio Positioning

English:

I built KommuneFlow AI, a portfolio project inspired by Norwegian municipal service development. It is a multi-tenant platform for citizen case intake, document handling, AI-assisted case triage, role-based access control, audit logging, privacy workflows, and operational analytics. The system uses human-in-the-loop review for AI suggestions and is deployed to Hetzner Cloud using Docker Compose, PostgreSQL, HTTPS, firewall rules, and a documented backup strategy.

Norwegian:

Jeg har bygget KommuneFlow AI, et portefoljeprosjekt inspirert av kommunal tjenesteutvikling i Norge. Losningen er en multi-tenant plattform for innbyggerhenvendelser, dokumenthandtering, KI-assistert saksruting, rollebasert tilgangsstyring, audit-logg, personvernflyter og operasjonell innsikt. KI brukes som beslutningsstotte med menneskelig kvalitetssikring, og losningen er deployet pa Hetzner Cloud med Docker Compose, PostgreSQL, HTTPS, brannmurregler og dokumentert backup-strategi.
