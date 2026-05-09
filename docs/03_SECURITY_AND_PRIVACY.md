# Security And Privacy

## Purpose Of This Document

This document defines security, GDPR-style privacy requirements, access control, audit logging, data minimization, retention, and sensitive data handling.

## Security Principles

The application must follow these principles:

- Deny by default.
- Least privilege.
- Server-side authorization only.
- Never trust frontend checks.
- Validate all input.
- Sanitize or safely render all output.
- Avoid logging personal data unnecessarily.
- Keep secrets out of source control.
- Treat file uploads as dangerous.
- Treat AI output as untrusted data.

## Authentication Requirements

- Passwords must be hashed with Argon2id or bcrypt.
- Plaintext passwords must never be stored.
- Login endpoint must be rate-limited.
- Failed login attempts must not reveal whether the email exists.
- Sessions or tokens must expire.
- Refresh tokens, if used, must be stored securely.
- Cookies, if used, must be `HttpOnly`, `Secure`, and `SameSite`.

## Authorization Requirements

- All protected routes must require authentication.
- All protected routes must check permissions server-side.
- All tenant-owned resources must verify tenant access.
- Department-scoped users must only access their department data unless explicitly allowed.
- Auditors must be read-only.
- Citizens must only access their own cases and documents.

## File Upload Security

Uploads must validate:

- file size
- MIME type
- allowed extensions
- storage path safety
- checksum/hash

Allowed MVP file types:

- PDF
- PNG
- JPG/JPEG

Disallowed file types:

- executable files
- scripts
- archives
- unknown binary files

Uploaded files must not be stored in a publicly accessible web directory.

## GDPR-Style Privacy Requirements

The project must demonstrate privacy by design.

Required privacy features:

1. Privacy notice on citizen intake form.
2. Data minimization.
3. Purpose limitation.
4. Configurable retention rules.
5. Citizen data export.
6. Anonymization or soft deletion.
7. Audit log for sensitive access.
8. Separation between operational data and analytics.
9. Aggregated analytics should avoid personal identifiers.

## Personal Data Categories

The app may process:

- name
- email
- phone number
- address
- case description
- uploaded documents
- IP address
- user agent
- audit events

## Retention Rules

For demo purposes:

- Closed cases: 180 days.
- Documents: 180 days after case closure.
- Audit logs: 365 days.
- Aggregated anonymized analytics: no strict deletion requirement in demo.

## Required Privacy Actions

The system must include backend services for:

- exporting citizen data by citizen profile ID or email
- anonymizing a citizen profile
- soft-deleting documents
- logging privacy-related actions in the audit log

## Security Acceptance Criteria

The project is not acceptable unless automated tests prove:

- unauthenticated requests return 401
- unauthorized requests return 403
- cross-tenant access is blocked
- citizen-to-citizen data leaks are blocked
- auditor mutation attempts are blocked
- invalid file uploads are rejected
- oversized payloads are rejected
- AI output cannot directly mutate official case decisions
