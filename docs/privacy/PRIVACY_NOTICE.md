# Privacy Notice

## Purpose

This notice describes how KommuneFlow AI processes personal data in the demo application.

KommuneFlow AI is a portfolio project inspired by Norwegian municipal case handling. It is not connected to a real municipality and must not be used with real citizen data unless a real controller, processor agreement, and production privacy assessment are in place.

## Who The Service Is For

The service supports:

- citizens submitting municipal requests
- municipal employees processing cases
- auditors reviewing case handling and access
- administrators managing privacy and retention workflows

## Data Controller And Processor

For the portfolio demo:

- data controller: demo tenant / project owner
- data processor: KommuneFlow AI application operator

For a real deployment, the municipality would normally be the data controller. Hosting, application operation, AI providers, backup storage, and observability tooling would need processor agreements and documented sub-processor review.

## Personal Data Processed

Citizen intake may process:

- name
- email address
- phone number
- address
- case title
- case description
- uploaded document content and metadata
- selected language
- timestamps

Internal workflows may process:

- municipal employee name and email
- role and department
- internal notes
- case status changes
- document access events
- AI triage suggestions and human review decisions
- audit events

Operational processing may include:

- request IDs
- safe request metadata
- IP address or user agent if configured by deployment logging
- backup metadata

## Purpose Of Processing

The application processes personal data to:

- register citizen requests
- route cases to the right department
- support municipal case handling
- allow document review
- provide human-reviewed AI triage suggestions
- maintain auditability and security
- support privacy export and anonymization workflows
- produce aggregated operational analytics without citizen identifiers

## Legal Basis

For a real public-sector deployment, legal basis must be confirmed by the municipality. Typical legal bases may include:

- public task or official authority for municipal case processing
- legal obligation for audit, archive, and compliance records
- legitimate interest or contractual necessity for operational security in non-public-sector deployments

The demo does not establish a real legal basis for processing real personal data.

## AI Processing

AI is used only as decision support. AI suggestions do not change official case fields until a human reviewer approves or corrects them.

The system should minimize the personal data sent to AI providers. A real deployment must document:

- which AI provider is used
- whether data leaves the EEA
- whether prompts or outputs are retained by the provider
- what personal data is included in prompts
- how citizens and employees are informed

## Document Handling

Uploaded documents are stored outside the public web directory. The system validates:

- file size
- MIME type
- file extension
- magic bytes
- unsafe filenames

Document downloads require authenticated, tenant-scoped, role-checked access and are audited.

## Analytics

Analytics are aggregated by tenant and day. The analytics snapshot stores counts by:

- status
- category
- department
- AI review/correction totals

Analytics snapshots must not include citizen names, emails, phone numbers, addresses, case descriptions, document content, or raw AI prompts.

## Retention

Retention is configurable per tenant. The current policy model supports:

- closed case retention
- soft-deleted document retention
- audit event retention
- analytics snapshot retention

Retention cleanup supports dry-run mode and confirmed deletion mode. Cleanup actions are audited.

## Citizen Rights

The project demonstrates backend support for:

- data export by citizen profile ID or email
- anonymization of citizen profile identifiers
- document soft-delete
- retention cleanup

A real deployment would also need a formal process for identity verification, request intake, deadlines, exceptions, appeals, and archive-law constraints.

## Security Measures

Implemented controls include:

- `HttpOnly` authentication cookie
- server-side RBAC
- tenant isolation checks
- request validation
- rate limiting
- security headers
- strict CORS allowlist
- Origin/Referer validation for cookie-authenticated state-changing requests
- structured error responses
- safe logging
- audit events for sensitive actions
- encrypted HTTPS target deployment through Caddy
- PostgreSQL and upload persistent volumes
- backup and restore procedures

## Contact

For the portfolio demo, contact the project owner. For a real deployment, the municipality must publish controller contact details and data protection officer contact details where required.
