# Security Negative Testing

## Purpose

This document tracks the negative security coverage used to keep KommuneFlow AI suitable for a public-sector portfolio context. The tests focus on tenant isolation, RBAC, authentication failure modes, upload abuse, safe error handling, and external integration failure behavior.

## Authentication And Session Abuse

Covered by backend tests:

- unknown email returns a generic login error
- wrong password returns a generic login error
- disabled users cannot log in
- malformed bearer tokens are rejected
- expired cookie tokens are rejected
- tokens with invalid user payloads are rejected
- cookie-authenticated state-changing requests from invalid origins are rejected
- invalid JSON bodies return safe standardized errors
- oversized JSON bodies are rejected

Relevant test files:

- `apps/api/src/modules/auth/auth.service.spec.ts`
- `apps/api/src/modules/auth/auth.guard.spec.ts`
- `apps/api/test/app.e2e-spec.ts`

## RBAC And Tenant Isolation

Covered by backend tests:

- tenant A cannot read tenant B case
- tenant A cannot update tenant B case by guessed ID
- tenant A cannot add internal notes to tenant B case by guessed ID
- tenant A cannot read tenant B document
- tenant A cannot download tenant B document by guessed ID or storage key path
- citizen/public callers cannot access internal analytics or operations endpoints without authentication
- case workers cannot access analytics or operations metrics
- auditors can read permitted internal data but cannot mutate cases, notes, documents, or AI reviews

Relevant test files:

- `apps/api/src/modules/cases/cases.service.spec.ts`
- `apps/api/src/modules/documents/documents.service.spec.ts`
- `apps/api/src/modules/analytics/analytics.controller.spec.ts`
- `apps/api/src/modules/operations/operations.controller.spec.ts`
- `apps/api/src/modules/ai/ai.service.spec.ts`

## File Upload Abuse

Covered by backend tests:

- empty files are rejected
- oversized files are rejected
- unsupported MIME types are rejected
- fake extension/MIME combinations are rejected through magic-byte checks
- path traversal filenames are rejected
- auditors cannot upload or delete documents
- sensitive documents are filtered unless the role has the required permission

Relevant test file:

- `apps/api/src/modules/documents/documents.controller.spec.ts`
- `apps/api/src/modules/documents/documents.service.spec.ts`

## AI Negative Tests

Covered by backend tests:

- malformed AI JSON is rejected at the OpenAI provider boundary
- AI responses missing required fields are rejected
- invalid AI enum values are rejected
- out-of-range confidence scores are rejected
- provider timeouts are handled safely
- provider upstream errors are handled safely
- schema validation failures are classified safely
- AI does not mutate official case fields before human review
- AI observability events are created for both success and failure

Relevant test files:

- `apps/api/src/modules/ai/ai.schemas.spec.ts`
- `apps/api/src/modules/ai/openai.provider.spec.ts`
- `apps/api/src/modules/ai/ai.service.spec.ts`

## External Integration Failures

Covered by backend tests:

- Kartverket timeout returns a safe address lookup error
- Kartverket HTTP 500 returns a safe address lookup error
- malformed Kartverket responses are handled safely
- SSB HTTP failure creates a failed import run and safe error
- malformed SSB responses are handled safely
- e2e error responses do not expose stack traces or upstream raw payloads

Relevant test files:

- `apps/api/src/modules/integrations/kartverket-address/kartverket-address.service.spec.ts`
- `apps/api/src/modules/integrations/ssb/ssb.service.spec.ts`
- `apps/api/test/app.e2e-spec.ts`

## CI Coverage

CI runs:

- install
- Prisma client generation
- lint
- typecheck
- API and web unit/integration tests
- Playwright browser smoke tests for public and internal browser flows
- Python ELT tests
- database migrations against a CI PostgreSQL service
- API e2e tests
- dependency audit
- CodeQL static analysis
- Gitleaks secret scanning
- build

The API e2e job uses mocked external API behavior in tests and `AI_PROVIDER=mock`. CI must not call real Kartverket, SSB, or OpenAI services. Local release verification should run `pnpm test:all`, which also includes Playwright browser smoke tests.

## Remaining Watch Items

- Full browser-level citizen dashboard isolation is not present because the current product exposes status lookup, not a richer authenticated citizen portal.
- Playwright covers public intake/status lookup, internal login, and internal case detail actions, but it uses deterministic network mocks rather than a live database-backed stack.
- Future production hardening can add PostgreSQL Row-Level Security as defense in depth, but current tenant isolation is enforced through tenant-scoped application queries and tests.
