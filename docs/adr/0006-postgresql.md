# ADR 0006: PostgreSQL

## Status

Accepted

## Context

KommuneFlow AI needs relational integrity for tenants, departments, users, cases, documents, audit events, AI reviews, retention policies, and analytics snapshots.

## Decision

Use PostgreSQL as the primary database with Prisma for schema and migrations.

## Consequences

- Relational constraints protect important domain relationships.
- JSON fields support audit metadata, AI raw response storage, and analytics count maps.
- PostgreSQL works well with Docker Compose and Hetzner VPS deployment.
- Future improvements could add Row-Level Security, read replicas, or managed PostgreSQL.
