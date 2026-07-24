# Production Security Hardening

## Purpose

This document separates the controls implemented in the portfolio demo from the controls still required before real municipal production use.

KommuneFlow AI demonstrates security and privacy engineering patterns. It is not a GDPR-complete production system until legal basis, archival obligations, processor agreements, production operations, and security assurance have been completed for a real municipality.

## Implemented Controls

- `HttpOnly`, `SameSite`, and production `Secure` auth cookie handling.
- JWT expiry, issuer/audience validation, and payload validation before request user hydration.
- Server-side RBAC and permission guards.
- Tenant-scoped access checks for tenant-owned case, document, privacy, analytics, AI, and operational data.
- Auditor read-only behavior.
- Bcrypt password hashing.
- Configurable login, public intake, public status lookup, public address-search, and demo-session rate limiting.
- Helmet security headers with explicit CSP defaults, `frame-ancestors 'none'`, denied framing, strict CORS allowlist, and Origin/Referer validation for cookie-authenticated mutations.
- Safe error responses with request IDs and no stack traces in API responses.
- JSON/form body limits in the API.
- Multipart upload limits in Multer and request body limits in Caddy.
- Public web access without infrastructure Basic Auth; internal data remains behind application JWT authentication, RBAC, and tenant scoping.
- A disabled-by-default, tenant-allowlisted portfolio guest session with a shorter TTL, shared cookie helper, Origin/Referer validation, and no token in JSON.
- A least-privilege `portfolio_guest` permission set: tenant case read/update, AI run/review, seeded document read, and analytics read; no upload/delete, aggregation, audit, privacy, operations, or administration.
- API-enforced public upload disablement in portfolio mode while retaining the full upload security pipeline for explicitly enabled local tests.
- Upload validation for size, extension, MIME type, magic bytes, unsafe filenames, checksums, and private storage paths.
- Private document storage and audited document downloads.
- Soft-delete for documents and retention cleanup that removes expired physical files before deleting document metadata.
- Audit events for case, document, AI review, privacy, and retention actions.
- Operational events for failed logins, successful logins, logout, permission denials, rate-limit blocks, upload failures, integration failures, API errors, and maintenance runs.
- Tenant-scoped operations metrics where the underlying data model is tenant-aware.
- Citizen profile export, citizen profile identifier anonymization, retention policy, dry-run cleanup, and confirmed cleanup.
- Human-reviewed AI suggestions; AI output is validated before storage and does not directly mutate official case fields.
- Mock AI provider for local demos and tests.
- Basic AI input minimization/redaction for obvious email, phone, and Norwegian national-identity-like patterns.
- GitHub Actions checks for CodeQL static analysis and Gitleaks secret scanning.
- Production-like Docker Compose, Caddy HTTPS reverse proxy, smoke test, backup scripts, and restore documentation.
- A CLI-only demo reset with explicit mode/confirmation/database/storage/retention guards, deterministic seed restoration, and documented host scheduling.

## Known Production Gaps

- No Entra ID / Azure AD OIDC integration yet.
- No MFA, conditional access, group-to-role mapping, or centralized session revocation.
- Demo users are seed data and must be local/demo only.
- No PostgreSQL row-level security yet; tenant isolation is enforced in application code and tests.
- Malware scanning is not implemented for uploaded files.
- Uploaded documents do not have a `pending_scan -> clean -> blocked` lifecycle yet.
- No object storage adapter with server-side encryption, lifecycle policies, and separate access controls.
- Backup scripts support optional GPG encryption before offsite transfer, but offsite copy, retention, deletion, access review, and restore test cadence are not automated.
- No formal DPIA, legal basis assessment, archival/legal-hold analysis, or DPO review.
- No formal processor/subprocessor review for hosting, observability, backup, email, or AI providers.
- No complete incident response workflow in the product UI.
- No container image scanning gate is enforced in CI yet.
- AI provider calls are synchronous in the request path.
- AI redaction is basic and should not be treated as complete PII anonymization.
- Citizen profile anonymization does not fully erase/anonymize free text, documents, audit records, filenames, email logs, AI summaries, or archive-bound records.

## Production Target Controls

- Entra ID / Azure AD OIDC for employees.
- MFA and conditional access.
- Role mapping from identity-provider groups.
- Session revocation and login/logout audit events.
- ID-porten or equivalent strong identity for real citizen portal flows.
- PostgreSQL row-level security for tenant-owned tables.
- Object storage with encryption, signed access, malware scan status, retention lifecycle rules, and audit logs.
- Asynchronous malware scanning with ClamAV or equivalent before documents become available to case workers.
- Background workers for AI triage, analytics rebuild, SSB import, notification delivery, and retention jobs.
- Secret management outside `.env` files for production.
- Automated encrypted, access-controlled, offsite backups with documented restore tests.
- Dependency, container image, and secret scanning in CI/CD.
- Centralized logging/monitoring with PII-safe log policies.
- Formal DPIA, treatment protocol, legal basis assessment, archival/legal-hold review, processor agreements, and subprocessor review.

## Public Demo Rules

- Use synthetic data only.
- No account is required for the citizen or public guest journey. Do not expose seeded staff credentials publicly.
- Do not show demo passwords in the login form.
- Require `AI_PROVIDER=mock` and `PUBLIC_DEMO_ALLOW_UPLOADS=false` for public portfolio production configuration.
- Treat the demo as shared: another visitor can affect synthetic state and scheduled reset may remove visitor-created cases.
- Keep the reset command private to operators; it must never become an HTTP endpoint.
- Do not send real personal data to external AI providers.
- Keep `.env`, `.env.production`, API keys, cookies, and backup artifacts out of screenshots and logs.

## AI And Provider Privacy Notes

The project supports `AI_PROVIDER=mock` and `AI_PROVIDER=openai`. For real personal data, the municipality would need to review what data is sent, why it is necessary, provider retention, data processing terms, subprocessors, transfer mechanisms, and logging behavior.

The current minimization/redaction is intentionally basic. It reduces common obvious identifiers before AI provider calls, but it is not full anonymization and cannot guarantee removal of all personal data from free text or documents.

## Recommended Interview Positioning

KommuneFlow AI should be described as a privacy-by-design portfolio system with implemented controls for tenant isolation, RBAC, audit logging, document controls, retention workflows, and human-reviewed AI. It should not be described as a legal GDPR-complete municipal production system.
