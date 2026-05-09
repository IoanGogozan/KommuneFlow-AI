# Data Processing Inventory

## Purpose

This inventory maps data categories, purposes, storage locations, retention, access controls, and privacy notes for KommuneFlow AI.

## Inventory

| Data Category | Examples | Purpose | Stored In | Access | Retention | Privacy Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Citizen identity | name, email, phone, address | create and process municipal requests | `citizen_profiles` | tenant-scoped case workers/admins, auditors, super admins | tied to case and retention policy | export and anonymization supported |
| Case content | title, description, source language | case handling and routing | `cases` | tenant and department scoped | closed case retention policy | may contain personal data entered by citizen |
| Case status/classification | status, category, urgency, assigned department | workflow and operational reporting | `cases` | tenant and department scoped | closed case retention policy | used in aggregated analytics |
| Uploaded documents | file content, original filename, MIME, checksum, size | support document-based case handling | upload volume + `case_documents` metadata | tenant/department scoped, sensitive permission for sensitive documents | soft-deleted document retention policy | downloads are audited |
| Internal notes | note body, author, timestamp | internal case processing | `internal_notes` | authorized internal users | tied to case retention | may contain personal data and should be minimized |
| User account data | name, email, role, department, password hash | authentication and authorization | `users` | admins and auth system | account lifecycle policy | password hashes only, no plaintext passwords |
| Audit events | action, entity type/id, actor, metadata, timestamp | security, compliance, traceability | `audit_events` | auditors and super admins | audit event retention policy | metadata must avoid unnecessary PII |
| AI triage result | suggested category, department, urgency, summary, confidence, reasoning summary | decision support | `ai_triage_results` | authorized internal users | tied to case retention | AI output is untrusted and human-reviewed |
| AI review | approved category, department, urgency, acceptance/correction flag | human review and AI correction rate | `ai_reviews` | authorized internal users | tied to case retention | supports AI correction analytics |
| Analytics snapshots | daily counts by status/category/department, AI correction rate | operational insight | `analytics_daily_snapshots` | users with `analytics:read` | analytics retention policy | no citizen identifiers or case descriptions |
| Retention policy | retention periods by data area | privacy governance | `retention_policies` | super admins/privacy roles | active tenant policy | updates are audited |
| Operational metadata | request ID, health/readiness status, safe logs | debugging and operations | logs/runtime | operators | deployment log policy | secrets and unnecessary PII should not be logged |
| Backups | database dumps, upload archives | disaster recovery | backup location outside app volume | operators | backup policy | must be protected and tested through restore |

## External Processing

Potential processors/sub-processors in a real deployment:

- Hetzner Cloud for VPS, volumes, snapshots, and network firewall
- OpenAI or another AI provider if `AI_PROVIDER=openai`
- backup storage provider if backups are copied off-server
- monitoring/logging tools if added

Each real processor requires review for:

- location of processing
- data categories processed
- retention behavior
- access controls
- incident response
- processor/sub-processor terms

## Data Minimization Rules

- Do not put citizen personal identifiers into analytics snapshots.
- Do not log passwords, tokens, cookies, API keys, or raw uploaded documents.
- Keep AI prompt input as small as possible for the task.
- Store short AI reasoning summaries rather than broad unstructured reasoning.
- Prefer metadata and aggregated counts for reporting.
- Use audit metadata only for operationally necessary facts.

## Retention Configuration

Current configurable tenant policy:

- `closedCaseRetentionDays`
- `deletedDocumentRetentionDays`
- `auditEventRetentionDays`
- `analyticsRetentionDays`

Cleanup supports:

- dry-run mode for candidate counts
- confirmed delete mode
- audit events for both modes

## Open Implementation Gaps

Before using real personal data, the project still needs:

- verified production deployment controls
- real identity verification for privacy requests
- archive-law and legal hold handling
- documented backup retention and deletion
- reviewed AI provider data processing terms
- full privacy UI for internal privacy actions
