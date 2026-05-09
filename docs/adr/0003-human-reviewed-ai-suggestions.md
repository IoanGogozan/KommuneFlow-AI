# ADR 0003: Human-Reviewed AI Suggestions

## Status

Accepted

## Context

AI triage can help classify municipal cases, suggest urgency, summarize requests, and identify missing information. However, municipal case decisions must remain accountable and reviewable.

## Decision

AI output is stored as a suggestion in `AITriageResult`. It does not mutate official case category, department, urgency, or status.

A human reviewer creates an `AIReview`. Only after this review does the system update official case fields.

## Consequences

- AI is decision support, not automatic decision-making.
- Human corrections can be measured through AI correction rate analytics.
- Audit events can show who reviewed the suggestion and what was accepted or corrected.
- The UI must clearly present AI suggestions as reviewable recommendations.
