# Product Requirements

## Purpose Of This Document

This document defines what KommuneFlow AI is, who it is for, the MVP scope, core workflows, out-of-scope items, and final product goals.

## Product Name

KommuneFlow AI

## Product Summary

KommuneFlow AI is a multi-tenant SaaS platform for municipalities. It allows citizens to submit requests, upload documents, and follow case status. Municipal employees use the internal dashboard to review, classify, route, and process cases.

AI assists with classification, summarization, missing-information detection, and suggested routing, but humans remain responsible for final decisions.

## Product Goal

Build a professional portfolio project that demonstrates:

- backend engineering
- secure data handling
- AI-assisted workflows
- public-sector service design
- privacy awareness
- security and auditability
- automated testing
- production-like deployment

The project must look like a realistic internal tool or SaaS product that could be discussed seriously in a job interview for a role involving data, AI, cloud, and municipal digital services.

## Target Users

### Citizen

A citizen submits a request to a municipality, uploads documents if needed, and follows the status of the case.

### Case Worker

A municipal employee who reviews cases assigned to their department, checks AI suggestions, corrects them if needed, updates case status, adds internal notes, and communicates with the citizen.

### Department Admin

A department-level administrator who manages department users, routing rules, and department-level reporting.

### Auditor

A read-only role that can inspect cases, documents, AI suggestions, and audit logs for compliance and quality control.

### Super Admin

A platform administrator who manages tenants, departments, global settings, feature flags, and system-level configuration.

## Language Requirements

The user interface must support:

- Norwegian Bokmal (`nb`) as the primary language
- English (`en`) as the secondary language

All code, database schema, comments, documentation, and internal developer-facing naming must be English only.

## MVP Scope

The MVP must include:

1. Multi-tenant architecture.
2. Authentication.
3. Role-based access control.
4. Citizen case intake form.
5. Internal case dashboard.
6. Case detail page.
7. Case status workflow.
8. Document upload and document metadata.
9. AI-assisted case triage.
10. Human review of AI suggestions.
11. Audit log.
12. Basic GDPR/privacy functionality.
13. Analytics dashboard.
14. Automated tests.
15. Docker-based local development.
16. Hetzner Cloud deployment.

## Out Of Scope For MVP

The following must not be implemented before the MVP is stable:

- Full OCR for scanned documents.
- Real ID-porten authentication.
- Real Altinn integration.
- Real municipal archive system integration.
- Advanced Microsoft Fabric integration.
- Kubernetes.
- Complex workflow engine.
- Mobile app.

These can be documented as future improvements.

## Core User Flow

1. Citizen opens the public portal.
2. Citizen selects language: Norwegian or English.
3. Citizen submits a request with optional documents.
4. The system creates a case.
5. The system creates an audit event.
6. The system runs AI triage asynchronously or semi-asynchronously.
7. AI suggests category, department, urgency, summary, and missing information.
8. Case worker reviews the case.
9. Case worker approves or corrects the AI suggestion.
10. Case worker updates the case status.
11. The system logs all important actions.
12. Aggregated analytics are updated.

## Final Product Goals

The finished project must clearly demonstrate:

- Practical AI usage in a real workflow.
- Human-in-the-loop decision-making.
- Secure multi-tenant backend design.
- Strong authorization and tenant isolation.
- Privacy and GDPR-aware thinking.
- Document workflow handling.
- Auditability.
- Data and analytics pipeline thinking.
- Clean code and maintainable architecture.
- Production-like deployment on Hetzner Cloud.
