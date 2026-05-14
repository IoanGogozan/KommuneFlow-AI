# KommuneFlow AI Documentation Index

This directory contains the active documentation for KommuneFlow AI. Older planning, checklist, tracker, and one-off implementation documents have been removed when their content was superseded by focused integration docs, the runbook, deployment docs, or the README.

All technical documentation, code, database entities, API routes, comments, commit messages, issue titles, pull requests, environment variables, and internal developer-facing text must be written in English.

The application UI must support:

- Norwegian Bokmal (`nb`) as the primary product language
- English (`en`) as the secondary UI language

## Start Here

| Document                                                           | Purpose                                                                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [API_REFERENCE.md](./API_REFERENCE.md)                             | Current REST API endpoint groups and auth requirements.                                                           |
| [RUNBOOK.md](./RUNBOOK.md)                                         | Operational procedures for restart, logs, migrations, backup, restore, AI provider failure, and database failure. |
| [07_DEPLOYMENT_HETZNER.md](./07_DEPLOYMENT_HETZNER.md)             | Hetzner deployment plan and verification checklist.                                                               |
| [12_PROFESSIONAL_QUALITY_BAR.md](./12_PROFESSIONAL_QUALITY_BAR.md) | Portfolio quality bar for repository polish, demo quality, documentation, deployment, and interview readiness.    |

## Product And Architecture

| Document                                                                 | Purpose                                                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| [01_PRODUCT_REQUIREMENTS.md](./01_PRODUCT_REQUIREMENTS.md)               | Product, users, MVP scope, core workflows, and final goals.                                                     |
| [02_DOMAIN_MODEL.md](./02_DOMAIN_MODEL.md)                               | Entities, roles, permissions, statuses, relationships, and tenant isolation rules.                              |
| [03_SECURITY_AND_PRIVACY.md](./03_SECURITY_AND_PRIVACY.md)               | Authentication, authorization, privacy, GDPR-style requirements, file upload security, and acceptance criteria. |
| [04_AI_GOVERNANCE.md](./04_AI_GOVERNANCE.md)                             | Responsible AI rules, human review, prompt versioning, structured output, and AI tests.                         |
| [05_TECH_STACK_AND_ARCHITECTURE.md](./05_TECH_STACK_AND_ARCHITECTURE.md) | Stack, backend/frontend architecture, database approach, code quality rules, and API conventions.               |
| [security/PRODUCTION_SECURITY_HARDENING.md](./security/PRODUCTION_SECURITY_HARDENING.md) | Implemented controls, known production gaps, target controls, and public demo safety rules. |
| [AZURE_FABRIC_EXTENSION.md](./AZURE_FABRIC_EXTENSION.md)                 | Microsoft Azure, AI Foundry, and Fabric target architecture for organizations using that stack.                 |
| [06_TESTING_STRATEGY.md](./06_TESTING_STRATEGY.md)                       | Unit, integration, API, security, RBAC, tenant isolation, AI mock, E2E, and CI test requirements.               |
| [09_DEFINITION_OF_DONE.md](./09_DEFINITION_OF_DONE.md)                   | Common feature completion criteria.                                                                             |

## Focused Implementation Docs

| Document                                                                       | Purpose                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [observability.md](./observability.md)                                         | Request IDs, structured logs, health/readiness, operations metrics, dashboard, integration events, and maintenance. |
| [analytics/elt-pipeline.md](./analytics/elt-pipeline.md)                       | Python ELT pipeline, commands, transforms, quality checks, and idempotent loading.                                  |
| [integrations/ssb.md](./integrations/ssb.md)                                   | SSB population import, local storage, idempotency, analytics enrichment, and limitations.                           |
| [integrations/kartverket-address.md](./integrations/kartverket-address.md)     | Kartverket Adresse-API usage, stored fields, privacy behavior, failure handling, tests, and manual verification.    |
| [security/negative-testing.md](./security/negative-testing.md)                 | Negative security coverage for auth, RBAC, tenant isolation, uploads, AI, external integrations, and CI.            |
| [privacy/PRIVACY_NOTICE.md](./privacy/PRIVACY_NOTICE.md)                       | Citizen-facing and deployment privacy notice baseline.                                                              |
| [privacy/DATA_PROCESSING_INVENTORY.md](./privacy/DATA_PROCESSING_INVENTORY.md) | Data categories, purpose, storage, access, retention, and privacy notes.                                            |
| [privacy/DPIA_LITE.md](./privacy/DPIA_LITE.md)                                 | Lightweight privacy risk assessment and remaining real-deployment gaps.                                             |

## Portfolio Materials

| Document                           | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | Interview-ready product walkthrough.                 |
| [SCREENSHOTS.md](./SCREENSHOTS.md) | Planned portfolio screenshots and capture filenames. |

## How To Use These Documents

Before implementing a feature:

1. Read the relevant source-of-truth document.
2. Check the README, API reference, runbook, and focused docs for the current implementation status.
3. Confirm the feature's definition of done.
4. Update the relevant source-of-truth document when behavior, commands, environment variables, or deployment steps change.
5. Implement in a small, reviewable step.
6. Add tests for security, authorization, tenant isolation, and important workflows.
7. Check observability, security release-gate, and professional quality requirements before marking a phase complete.

## Product Positioning

KommuneFlow AI is a professional portfolio project inspired by Norwegian municipal service development. It is a multi-tenant platform for citizen case intake, document handling, AI-assisted case triage, role-based access control, audit logging, privacy workflows, retention, and operational analytics. AI is used as decision support with human review. The concrete deployment documentation targets Hetzner Cloud using Docker Compose, PostgreSQL, HTTPS, firewall rules, and a documented backup strategy. The Azure/Fabric extension document shows how the same system can map to Azure Container Apps or App Service, Azure Database for PostgreSQL, Blob Storage, Key Vault, Application Insights, Azure OpenAI/AI Foundry, and Microsoft Fabric.
