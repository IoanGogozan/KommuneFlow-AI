# Verification Log

No secrets, cookies, API keys, deployed access codes, or real citizen data are recorded here.

## 2026-07-23 UX remediation baseline

| Item | Value |
| --- | --- |
| Verified source commit | `573d6c94e1e1c82ed142e93663127f799ce97a34` |
| Environment | Local Windows 11 / PowerShell / Docker Desktop |
| Node | `v26.2.0` |
| pnpm | `10.28.2` |
| Python | `3.14.4` |
| AI provider | deterministic mock |
| Data | local synthetic seed only |

## Automated release gate

| Command | Exact result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS — lockfile current, dependencies already up to date |
| `pnpm lint` | PASS — API and web lint completed |
| `pnpm typecheck` | PASS — API, web, and shared package type checks completed |
| `pnpm --filter @kommuneflow/api test:cov:ci` | PASS — 37 suites, 218 tests; statements 82.95%, branches 71.03%, functions 87.60%, lines 82.78% |
| `pnpm --filter @kommuneflow/api test:e2e:ci` | PASS — 3 suites passed, 1 skipped; 29 tests passed, 1 skipped |
| `pnpm --filter @kommuneflow/web test` | PASS — 3 files, 14 tests |
| `pnpm --filter @kommuneflow/web test:e2e` | PASS — 5 Chromium tests |
| `pnpm --filter @kommuneflow/web test:e2e:fullstack` | PASS on clean rerun — 1 Chromium workflow test |
| `pnpm test:etl` | PASS — 22 tests |
| `pnpm audit:deps` | PASS — no known vulnerabilities |
| `pnpm build` | PASS — API, web, and shared builds completed |
| `docker compose -f compose.home.yml --env-file .env.home.example config --quiet` | PASS |
| Caddy `validate --config /etc/caddy/Caddyfile` in `caddy:2-alpine` | PASS — valid configuration |
| `docker compose -f compose.home.yml --env-file .env.home.example build` | PASS — API and web images built |
| `pnpm screenshots:demo` | PASS — nine required UX screenshots generated from local synthetic data |

The first full-stack attempt was not a product assertion: Playwright correctly refused to start while the screenshot API occupied port 3101. After stopping that local stack, a second attempt reached login but received `401` because its default password differed from the local seed override. The exact command then passed with `FULLSTACK_DEMO_PASSWORD` supplied from the local ignored `.env`; the value was not printed, logged, or committed.

## UX verification

| Workflow | Result | Evidence |
| --- | --- | --- |
| Landing page | PASS | Browser tests plus `01-landing.png` |
| Protected-route gate | PASS | Deployment smoke assertions cover public `/` and protected `/nb`, `/en`, `/internal/login`; Caddy config validated |
| Citizen intake | PASS | Component/browser tests plus English and Norwegian captures |
| Address selection | PASS | Component tests cover multiple results, non-first selection, no-address mode, and tenant-change reset |
| Document upload | PASS | Component/browser tests cover list, remove, multipart submission, and existing API validation |
| Submission success | PASS | Copy/fallback tests plus `04-submission-success.png` |
| Status lookup | PASS | Automatic prefill/lookup browser test plus `05-status-lookup.png` |
| Employee login | PASS | Browser test and local screenshot workflow |
| Case Overview | PASS | Default-tab browser assertion plus `07-case-overview.png` |
| AI review | PASS | Full-stack official-before/after assertion plus `08-ai-review.png` |
| Workflow update | PASS | Browser status mutation plus `09-workflow-activity.png` |

## Deployment status

The modified version has not yet been deployed in this record. Live verification must be appended only after the final branch is deployed to the home server and the unauthenticated/authenticated smoke checks and manual UX walkthrough pass.
