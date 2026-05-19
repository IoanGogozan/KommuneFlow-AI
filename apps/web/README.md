# KommuneFlow Web

Next.js frontend for KommuneFlow AI.

## Responsibilities

- Bilingual citizen intake portal for Norwegian and English users
- Public case status lookup
- Internal dashboards for cases, KI/AI triage review, analytics, operations, and privacy workflows
- Public tenant selector for Arendal, Grimstad, and Kristiansand, with submissions stored under the selected municipality

## Local Commands

Run from the repository root:

```bash
pnpm --filter @kommuneflow/web dev
pnpm --filter @kommuneflow/web lint
pnpm --filter @kommuneflow/web typecheck
pnpm --filter @kommuneflow/web test
pnpm --filter @kommuneflow/web test:e2e
pnpm --filter @kommuneflow/web build
```

Set `NEXT_PUBLIC_API_BASE_URL` when the API is not running on the default local URL.
