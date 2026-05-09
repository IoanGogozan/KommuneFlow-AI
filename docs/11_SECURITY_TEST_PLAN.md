# Security Test Plan

## Goal

The project must include serious security testing, including negative tests and abuse-case tests. The goal is to demonstrate that security was designed, implemented, and verified.

OWASP ASVS and the OWASP Web Security Testing Guide should be used as inspiration for authentication, authorization, session, input validation, and abuse-case testing.

## Test Categories

The security test suite must cover:

- authentication negative tests
- authorization negative tests
- tenant isolation tests
- role-based access tests
- input validation tests
- file upload abuse tests
- API abuse tests
- AI output safety tests
- privacy/GDPR workflow tests
- audit logging tests
- rate limiting tests
- error handling tests

## Authentication Negative Tests

Required tests:

- login with wrong password fails
- login with unknown email fails with a generic message
- login response does not reveal whether an email exists
- password is never returned by API
- password hash is never returned by API
- protected endpoint without token returns 401
- expired token/session returns 401
- malformed token returns 401
- disabled user cannot login
- repeated failed login attempts trigger rate limiting or throttling

## Authorization Negative Tests

Required tests:

- citizen cannot access internal case dashboard
- citizen cannot access another citizen's case
- case worker cannot access tenant admin endpoints
- case worker cannot access another tenant's cases
- case worker cannot access another department's cases unless allowed
- auditor cannot create case notes
- auditor cannot update case status
- auditor cannot approve AI suggestions
- department admin cannot manage another tenant
- super admin actions are audited

## Tenant Isolation Tests

Required tests:

- tenant A user cannot read tenant B cases
- tenant A user cannot read tenant B documents
- tenant A user cannot read tenant B audit events
- tenant A user cannot update tenant B case by guessing IDs
- tenant A analytics does not include tenant B data
- cross-tenant document storage keys cannot be accessed through API

Tenant isolation tests are release-blocking.

## Input Validation Negative Tests

Required tests:

- empty required fields are rejected
- invalid email is rejected
- too-long description is rejected
- invalid enum values are rejected
- invalid UUID or ID format is rejected where applicable
- unexpected fields are ignored or rejected intentionally
- invalid pagination is rejected
- invalid date filters are rejected
- script tags in text fields do not execute in the UI
- SQL injection payloads do not alter queries

## File Upload Abuse Tests

Required tests:

- executable files are rejected
- files with fake extensions are rejected if MIME or magic validation fails
- oversized files are rejected
- empty files are rejected
- unsupported MIME types are rejected
- path traversal filenames are sanitized
- duplicate filenames do not overwrite files
- uploaded documents are not publicly accessible without auth
- citizens cannot download documents from another case
- sensitive documents require the correct permission

## API Abuse Tests

Required tests:

- unsupported HTTP methods return safe errors
- invalid JSON bodies return 400
- very large bodies are rejected
- missing content type is handled safely
- repeated sensitive requests trigger rate limits
- CORS does not allow arbitrary origins in production

## AI Safety Negative Tests

Required tests:

- malformed AI JSON is rejected
- missing AI fields are rejected
- AI category outside the allowed enum is rejected
- AI confidence outside `0..1` is rejected
- AI output containing HTML or script is safely rendered
- AI provider timeout is handled safely
- AI provider error does not crash case creation
- AI suggestion does not update official case category without human review
- AI suggestion does not bypass RBAC

## Privacy Workflow Tests

Required tests:

- citizen data export includes expected personal data
- citizen data export does not include other citizens' data
- anonymization removes or masks personal identifiers
- anonymization does not delete audit integrity
- privacy export action creates an audit event
- anonymization action creates an audit event
- analytics does not expose unnecessary personal identifiers

## Audit Logging Tests

Required audit tests:

- successful login creates an audit event if login auditing is implemented
- failed login creates a security event or security log
- case creation creates an audit event
- document upload creates an audit event
- sensitive document view creates an audit event
- AI triage run creates an audit event
- AI review creates an audit event
- status change creates an audit event
- permission change creates an audit event
- privacy export creates an audit event
- anonymization creates an audit event

## Rate Limiting Tests

Required tests:

- login endpoint rate limit works
- AI triage endpoint cannot be spammed by unauthorized users
- upload endpoint has reasonable limits
- public case intake has anti-abuse protection

## Dependency And Supply Chain Checks

CI should include:

- dependency audit command
- dependency vulnerability check
- no known critical vulnerabilities without documented exception
- committed lockfile
- Docker image build that does not include unnecessary dev secrets

Recommended commands:

```txt
pnpm audit
```

Optional additions:

- Dependabot or Renovate
- Trivy container image scan
- secret scanning with gitleaks

## Security Release Gate

A release cannot be considered ready if any of these fail:

- tenant isolation tests
- RBAC tests
- authentication negative tests
- file upload abuse tests
- AI safety tests
- privacy workflow tests
- production build
- deployment smoke test
