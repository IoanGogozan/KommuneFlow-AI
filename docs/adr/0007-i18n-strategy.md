# ADR 0007: Internationalization Strategy

## Status

Accepted and implemented for the current portfolio workflows.

## Decision

The application supports Norwegian (`nb`) and English (`en`) dictionaries for
the citizen intake and internal portfolio workflows. Locale-specific labels,
status names, analytics labels, and navigation are selected in the web layer;
the API stores stable keys and does not depend on translated display text.

## Consequences

- The public and employee demo can be shown in both supported languages.
- Stable status, department, category, and permission keys remain suitable for
  API responses and tests.
- New visible strings must be added to both dictionaries before use.
- This decision does not claim support for additional locales.
