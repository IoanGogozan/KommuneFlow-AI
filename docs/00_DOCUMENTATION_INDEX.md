# KommuneFlow AI Documentation Index

This directory contains the source-of-truth planning documents for KommuneFlow AI.

All technical documentation, code, database entities, API routes, comments, commit messages, issue titles, pull requests, environment variables, and internal developer-facing text must be written in English.

The application UI must support:

- Norwegian Bokmal (`nb`) as the primary product language
- English (`en`) as the secondary UI language

## Document Map

| Document | Purpose |
| --- | --- |
| [01_PRODUCT_REQUIREMENTS.md](./01_PRODUCT_REQUIREMENTS.md) | Defines the product, users, MVP scope, core workflows, and final product goals. |
| [02_DOMAIN_MODEL.md](./02_DOMAIN_MODEL.md) | Defines entities, roles, permissions, statuses, relationships, and tenant isolation rules. |
| [03_SECURITY_AND_PRIVACY.md](./03_SECURITY_AND_PRIVACY.md) | Defines authentication, authorization, privacy, GDPR-style requirements, file upload security, and acceptance criteria. |
| [04_AI_GOVERNANCE.md](./04_AI_GOVERNANCE.md) | Defines allowed AI usage, forbidden AI actions, human review, prompt versioning, structured output, and AI tests. |
| [05_TECH_STACK_AND_ARCHITECTURE.md](./05_TECH_STACK_AND_ARCHITECTURE.md) | Defines the chosen stack, backend/frontend architecture, database approach, code quality rules, and API conventions. |
| [06_TESTING_STRATEGY.md](./06_TESTING_STRATEGY.md) | Defines unit, integration, API, security, RBAC, tenant isolation, AI mock, E2E, and CI test requirements. |
| [07_DEPLOYMENT_HETZNER.md](./07_DEPLOYMENT_HETZNER.md) | Defines the production-like Hetzner deployment, Docker Compose runtime, HTTPS, firewall, backups, and restore expectations. |
| [08_IMPLEMENTATION_ROADMAP.md](./08_IMPLEMENTATION_ROADMAP.md) | Defines the implementation phases and acceptance criteria in recommended delivery order. |
| [09_DEFINITION_OF_DONE.md](./09_DEFINITION_OF_DONE.md) | Defines what must be true before a feature is considered complete. |
| [10_OBSERVABILITY_AND_OPERATIONS.md](./10_OBSERVABILITY_AND_OPERATIONS.md) | Defines logging, request IDs, health checks, readiness checks, metrics, backups, restore verification, and runbook requirements. |
| [11_SECURITY_TEST_PLAN.md](./11_SECURITY_TEST_PLAN.md) | Defines concrete security, abuse-case, tenant isolation, RBAC, AI safety, privacy, audit, and rate limiting tests. |
| [12_PROFESSIONAL_QUALITY_BAR.md](./12_PROFESSIONAL_QUALITY_BAR.md) | Defines the final portfolio quality bar for repository polish, demo quality, documentation, deployment, and interview readiness. |
| [13_DEVELOPMENT_PLAN.md](./13_DEVELOPMENT_PLAN.md) | Adds practical execution guidance, first milestones, planning rules, and recommended initial backlog. |
| [14_IMPLEMENTATION_CHECKLIST.md](./14_IMPLEMENTATION_CHECKLIST.md) | Tracks implementation progress across all roadmap phases with clear checkboxes and current focus. |
| [RUNBOOK.md](./RUNBOOK.md) | Documents operational procedures for restart, logs, migrations, backup, restore, AI provider failure, and database failure. |

## How To Use These Documents

Before implementing a feature:

1. Read the relevant source-of-truth document.
2. Check the implementation roadmap for phase order.
3. Confirm the feature's definition of done.
4. Check the implementation checklist and update the current focus.
5. Implement in a small, reviewable step.
6. Add tests for security, authorization, tenant isolation, and important workflows.
7. Update documentation when architecture, commands, environment variables, or behavior changes.
8. Check observability, security release-gate, and professional quality requirements before marking a phase complete.
9. Mark completed checklist items after verification.

## Product Positioning

KommuneFlow AI is a professional portfolio project inspired by Norwegian municipal service development. It is a multi-tenant platform for citizen case intake, document handling, AI-assisted case triage, role-based access control, audit logging, privacy workflows, and operational analytics. AI is used as decision support with human review, and the system is deployed to Hetzner Cloud using Docker Compose, PostgreSQL, HTTPS, firewall rules, and a documented backup strategy.
