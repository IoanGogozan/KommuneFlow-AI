# ADR 0007: I18n Strategy

## Status

Accepted

## Context

The product is inspired by Norwegian municipal services. Citizen-facing UI must support Norwegian Bokmal and English. Developer-facing code and docs should remain English for maintainability.

## Decision

Use explicit frontend dictionaries for UI copy, with `nb` and `en` locales.

Backend enums, database names, API routes, source code, tests, and documentation stay in English.

## Consequences

- Citizen intake can be presented in Norwegian and English.
- Internal developer artifacts remain consistent and searchable.
- The current internal dashboard is mostly English and should be expanded to full i18n in a future polish pass.
