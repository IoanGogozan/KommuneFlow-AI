# Testing Strategy

## Purpose

This document describes the active test strategy for KommuneFlow AI: what each layer proves, which commands are authoritative, and what must stay deterministic.

## Release Gate

Run the full local release gate from the repository root:

```bash
pnpm test:all
```

`pnpm test:all` runs:

- `pnpm lint`
- `pnpm typecheck`
- API Jest coverage with thresholds
- API e2e tests with `AI_PROVIDER=mock`
- web Vitest component/integration tests
- web Playwright browser smoke tests
- Python ELT pytest tests

Use narrower commands while developing:

```bash
pnpm --filter @kommuneflow/api test
pnpm --filter @kommuneflow/api test:cov:ci
pnpm --filter @kommuneflow/api test:e2e:ci
pnpm --filter @kommuneflow/web test
pnpm --filter @kommuneflow/web test:e2e
pnpm test:etl
```

GitHub Actions also runs CodeQL static analysis and Gitleaks secret scanning as separate security workflows.

## API Tests

The API test suite must protect the server-side trust boundaries:

- authentication and generic login failure behavior
- RBAC and permission guards
- tenant-scoped reads and mutations
- case status transitions
- citizen status lookup secrecy
- document upload validation and download access
- safe error responses and request IDs
- rate-limit operational events
- AI provider failures, schema validation, and human review
- privacy export, anonymization, retention, and audit events
- analytics aggregation and operations metrics
- external integration failure handling for Kartverket and SSB

API e2e tests use deterministic mock providers. They must not call real Kartverket, SSB, or OpenAI services.

## Web Tests

Vitest covers important component behavior with DOM-level assertions and mocked `fetch` calls:

- public intake submission and status lookup
- safe error states
- internal login success/failure

Playwright covers browser-level smoke flows with deterministic network mocks:

- public citizen intake, address search, document upload, and status lookup
- internal login and redirect to case list
- internal case detail status update, document upload, AI triage, and AI review

Playwright tests are intentionally fast and deterministic. They verify browser wiring and expected API contracts, not live database behavior.

## Python ELT Tests

The ELT pytest suite covers:

- transform rules
- data quality checks
- idempotent loading
- extract query mapping
- database commit/rollback lifecycle
- SSB import success/failure behavior
- CLI orchestration

ELT tests are pure Python and must not call external APIs.

## Coverage Gates

The API Jest config enforces global minimum coverage:

- statements: 75%
- branches: 65%
- functions: 80%
- lines: 75%

Coverage is a regression guard, not a substitute for risk-based tests. Security, privacy, tenant isolation, and upload/AI failure tests are mandatory even when coverage is above threshold.

## CI Expectations

GitHub Actions currently runs install, Prisma client generation, lint, typecheck, recursive unit/integration tests, Python ELT tests, database migrations, API e2e tests, dependency audit, and build.

Local `pnpm test:all` is stricter than CI because it also runs Playwright browser smoke tests. If CI is extended to run Playwright, it must install browser dependencies explicitly and keep external providers mocked.

## Rules

- Tests must be deterministic.
- Tests must not require a real OpenAI key.
- Tests must not call real Kartverket or SSB endpoints in CI.
- Test data must be synthetic.
- Security and tenant-isolation regressions must be covered by explicit negative tests.
- Browser tests should assert user-visible outcomes and important API contracts, not implementation details.
