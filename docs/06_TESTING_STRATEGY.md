# Testing Strategy

## Purpose Of This Document

This document defines required unit, integration, API, security, RBAC, tenant isolation, AI mock, end-to-end, and CI tests.

## Testing Goal

The test suite must prove that the application is secure, tenant-safe, permission-safe, and functionally correct.

## Required Test Types

### Unit Tests

Required areas:

- permission logic
- tenant access logic
- case status transitions
- AI output parsing
- validation schemas
- retention logic
- utility functions

### Integration Tests

Required areas:

- authentication flow
- create citizen case
- document metadata creation
- AI triage with mock provider
- human review of AI suggestion
- audit log creation
- analytics aggregation

### API Tests

Required checks:

- unauthenticated requests return 401
- authenticated but unauthorized requests return 403
- invalid input returns 400
- successful case creation returns 201
- case lists are tenant-filtered
- department users only see department cases
- auditors cannot mutate resources

### Security Tests

Required checks:

- tenant A cannot access tenant B data
- citizen A cannot access citizen B case
- invalid file type rejected
- oversized upload rejected
- malformed AI response rejected
- HTML/script content is safely handled

### E2E Smoke Tests

Required flow:

1. Citizen submits a case.
2. AI mock generates triage suggestion.
3. Case worker opens the case.
4. Case worker approves or corrects suggestion.
5. Case status is updated.
6. Audit log contains all important events.
7. Analytics job updates metrics.

## CI Requirements

GitHub Actions must run:

- install
- lint
- format check
- type check
- unit tests
- integration tests
- build

A pull request must not be considered complete if CI fails.

## Testing Priority

For early development, prioritize:

1. permission logic
2. tenant isolation
3. authentication
4. case creation
5. audit event creation
6. AI structured output parsing with a mock provider

UI polish can move quickly, but backend security tests must not be skipped.
