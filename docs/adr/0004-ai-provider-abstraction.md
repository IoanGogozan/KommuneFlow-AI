# ADR 0004: AIProvider Abstraction

## Status

Accepted

## Context

The project needs deterministic tests and local demo behavior without requiring a real OpenAI API key. It also needs a path to real AI integration.

## Decision

AI integration is hidden behind an `AIProvider` interface.

Implemented providers:

- `MockAIProvider` for deterministic local development and tests
- `OpenAIProvider` for real model calls through the OpenAI Responses API

AI output is validated with Zod before storage.

## Consequences

- Tests do not call external AI services.
- Provider failures can be handled consistently.
- Future providers can be added without changing case workflow code.
- The OpenAI provider uses bounded timeout handling, limited retry for temporary failures, schema validation, safe failure classification, input minimization, and observability events for latency/failure metrics.
