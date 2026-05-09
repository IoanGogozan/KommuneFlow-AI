# DPIA-Lite Risk Assessment

## Purpose

This document is a lightweight privacy risk assessment for KommuneFlow AI. It is suitable for portfolio documentation, not a replacement for a formal DPIA required by a real municipality.

## Processing Summary

KommuneFlow AI processes citizen requests, documents, internal case handling data, audit events, AI triage suggestions, privacy actions, and aggregated analytics.

The processing includes potentially sensitive free-text and uploaded documents because citizens may include health, financial, family, or other personal information in case descriptions and attachments.

## Necessity And Proportionality

The core processing is necessary to:

- receive citizen requests
- route cases to departments
- allow employees to review documents
- provide traceability for internal actions
- support privacy export, anonymization, and retention
- monitor operational volumes through aggregated analytics

The system reduces unnecessary processing by:

- using tenant and department scoping
- requiring permissions for sensitive document access
- using aggregated analytics instead of personal-data reports
- requiring human review before AI suggestions affect official case fields
- validating uploads and avoiding public file storage
- supporting retention cleanup

## Main Risks And Controls

| Risk | Impact | Likelihood | Controls | Residual Risk |
| --- | --- | --- | --- | --- |
| Cross-tenant data exposure | high | medium | tenant filtering, RBAC guards, negative tests | low to medium |
| Unauthorized internal mutation | high | medium | permissions guard, auditor read-only tests | low |
| Cookie-based CSRF | high | medium | SameSite cookie, strict Origin/Referer validation | low |
| File upload abuse | high | medium | size, extension, MIME, magic-byte, filename validation; private storage | low to medium |
| Sensitive document overexposure | high | medium | `document:read:sensitive`, audit events | medium |
| AI sends too much personal data | high | medium | provider abstraction, human review, planned minimization/redaction | medium |
| AI suggestion treated as final decision | high | medium | official fields change only after human review | low |
| Personal data in analytics | medium | medium | aggregated daily snapshots without citizen identifiers | low |
| Excessive retention | high | medium | configurable retention policy, dry-run cleanup, audited delete mode | medium |
| Backup data leakage | high | medium | documented backup/restore scripts; needs real storage controls | medium |
| Logs exposing secrets or PII | high | medium | safe request logging, structured errors, no cookie/auth logging | low to medium |

## AI-Specific Assessment

AI is limited to decision support. The system stores suggestions and requires human review before official case values change.

Remaining AI privacy work:

- explicit redaction/minimization before provider calls
- AI cost/latency/error metrics
- documented provider data retention behavior
- evaluation dataset for demo cases

## Retention Assessment

Implemented retention controls:

- per-tenant retention policy
- dry-run cleanup
- confirmed deletion mode
- audit trail for retention policy changes and cleanup runs

Risks that remain:

- real archive/legal hold rules are not modeled
- backup deletion must be enforced operationally
- physical uploaded files should be removed when metadata is deleted in a future storage cleanup enhancement

## Data Subject Rights

Implemented demo capabilities:

- citizen data export
- citizen profile anonymization
- document soft-delete
- retention cleanup

Real deployment gaps:

- identity verification for requesters
- formal deadline handling
- exception handling for legal/archival obligations
- UI for privacy actions

## Deployment And Operations Privacy

The target production deployment uses:

- HTTPS through Caddy
- private PostgreSQL Docker network
- persistent PostgreSQL and upload volumes
- documented backups and restore
- firewall rules with no public database port

Before public deployment, verify:

- HTTPS certificate issuance
- no public PostgreSQL exposure
- backup storage access control
- restore test
- secret scanning
- container image scanning
- deployment smoke test

## Conclusion

The project demonstrates a credible privacy-by-design baseline for a portfolio system. It includes tenant isolation, RBAC, auditability, privacy export, anonymization, retention configuration, and aggregated analytics without citizen identifiers.

The project should still be treated as a demo until real legal basis, controller/processor roles, archival requirements, identity verification, AI provider terms, backup retention, and production deployment controls are reviewed.
