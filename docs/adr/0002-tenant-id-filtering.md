# ADR 0002: Tenant ID Filtering For Multi-Tenancy

## Status

Accepted

## Context

KommuneFlow AI is a multi-tenant application. Cases, citizen profiles, documents, audit events, AI results, analytics snapshots, and retention policies are tenant-owned data.

The application needs a simple, explicit tenant isolation model suitable for a portfolio project and Docker Compose deployment.

## Decision

Tenant isolation is enforced with explicit `tenantId` filtering in backend service queries.

Controllers do not trust tenant identifiers from the frontend for protected resources. The authenticated user context provides `tenantId`, and services include it in reads and writes.

Cross-tenant misses return `404` where appropriate, rather than revealing that a resource exists in another tenant.

## Consequences

- The isolation model is easy to inspect in code and tests.
- Negative tests can prove guessed IDs do not cross tenant boundaries.
- The approach works with standard PostgreSQL and Prisma.
- Future high-scale or higher-assurance deployments could add PostgreSQL Row-Level Security as a defense-in-depth layer.
