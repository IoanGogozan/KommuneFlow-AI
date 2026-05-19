# Verification Log

Use this file as a lightweight record of the latest local verification baseline. Do not paste secrets, cookies, API keys, status access codes, or real citizen data into this log.

## Environment

Last verified: 2026-05-19

| Item    | Value                          |
| ------- | ------------------------------ |
| Machine | Local Windows / Docker Desktop |
| Node    | v24-compatible local runtime   |
| pnpm    | 10.28.2                        |
| Python  | 3.14.4                         |

## Automated Checks

Latest full local release gate:

```bash
pnpm test:all
```

Result: PASS

Included checks:

| Check                                      | Result | Notes                                                                 |
| ------------------------------------------ | ------ | --------------------------------------------------------------------- |
| `pnpm lint`                                | PASS   | API and web lint passed.                                              |
| `pnpm typecheck`                           | PASS   | API, web, and shared packages passed.                                 |
| `pnpm --filter @kommuneflow/api test:cov:ci` | PASS | API Jest suite: 35 suites, 209 tests; coverage thresholds passed.      |
| `pnpm --filter @kommuneflow/api test:e2e:ci` | PASS | API e2e suite: 20 tests with `AI_PROVIDER=mock`.                      |
| `pnpm --filter @kommuneflow/web test`      | PASS   | Web Vitest suite: 2 files, 6 tests.                                   |
| `pnpm --filter @kommuneflow/web test:e2e`  | PASS   | Playwright browser smoke suite: 3 tests.                              |
| `pnpm test:etl`                            | PASS   | Python ELT pytest suite: 22 tests.                                    |

Last recorded API coverage:

| Metric     | Value  |
| ---------- | ------ |
| Statements | 82.34% |
| Branches   | 69.76% |
| Functions  | 87.32% |
| Lines      | 82.10% |

## Manual Verification Checklist

Record exact date, command, account, environment, and result when manual checks are performed.

| Workflow                       | Result  | Evidence                                                                       |
| ------------------------------ | ------- | ------------------------------------------------------------------------------ |
| Kartverket real address lookup | PENDING | Use `docs/integrations/manual-verification.md#kartverket-real-address-lookup`. |
| SSB import                     | PENDING | Use `docs/integrations/manual-verification.md#ssb-population-import`.          |
| OpenAI real triage             | PENDING | Use `docs/integrations/manual-verification.md#openai-real-triage`.             |
| Analytics rebuild              | PENDING | Use `docs/integrations/manual-verification.md#analytics-rebuild`.              |
| Document upload/download       | PENDING | Use `docs/integrations/manual-verification.md#document-upload-and-download`.   |
| Citizen status lookup          | PENDING | Use `docs/integrations/manual-verification.md#citizen-status-lookup`.          |
| Hetzner live smoke test        | PASS    | 2026-05-19: HTTPS demo checked for web root, `/nb`, health, readiness, internal login page, internal demo login, `/auth/me`, `/cases`, and `/ai/status`. |

## Manual Verification Notes Template

```txt
Date:
Operator:
Local branch/commit:
Environment variables changed:
Command or UI path:
Account used:
External API called: yes/no
Result: PASS/FAIL
Request ID, if applicable:
Operational event evidence:
Notes:
```

## Rules

- CI and automated tests must use mock providers for Kartverket, SSB, and OpenAI.
- Do not commit real external API response payloads unless they are intentionally curated fixtures.
- Do not paste secrets, citizen PII, `OPENAI_API_KEY`, status access codes, cookies, or auth tokens into this log.
