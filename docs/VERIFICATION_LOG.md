# Verification Log

No secrets, cookies, API keys, deployed access codes, or real citizen data are recorded here.

## 2026-07-24 public guest portfolio release candidate

| Item                | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Source              | PR 6 working tree on `agent/public-guest-demo`, stacked on PR #23          |
| Environment         | Local Windows / PowerShell / Docker Desktop                                |
| Node                | `v26.2.0`                                                                  |
| pnpm                | `10.28.2`                                                                  |
| Python              | `3.14.4`                                                                   |
| AI provider         | deterministic mock                                                         |
| Data                | dedicated local `kommuneflow_screenshot` database with synthetic seed only |
| Deployment evidence | **not verified** for the PR 6 commit                                       |

### Automated release gate

| Command                                                                                       | Exact result                                                                                    |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                              | PASS — lockfile current; dependencies already up to date                                        |
| `pnpm lint`                                                                                   | PASS — API and web lint completed                                                               |
| `pnpm typecheck`                                                                              | PASS — API, web, and shared package type checks completed                                       |
| `pnpm --filter @kommuneflow/api test:cov:ci`                                                  | PASS — 43 suites, 253 tests; statements 83.88%, branches 72.83%, functions 88.37%, lines 83.74% |
| `pnpm --filter @kommuneflow/api test:e2e:ci`                                                  | PASS — 4 suites passed, 1 intentionally skipped; 64 tests passed, 1 skipped                     |
| `pnpm --filter @kommuneflow/web test`                                                         | PASS — 4 files, 23 tests                                                                        |
| `pnpm --filter @kommuneflow/web test:e2e`                                                     | PASS — 6 Chromium tests                                                                         |
| `pnpm --filter @kommuneflow/web test:e2e:fullstack`                                           | PASS on configured rerun — 1 real workflow test                                                 |
| `pnpm test:etl`                                                                               | PASS — 22 tests                                                                                 |
| `pnpm test:screenshots`                                                                       | PASS — 3 screenshot database-safety tests                                                       |
| `pnpm audit:deps`                                                                             | PASS — no known vulnerabilities                                                                 |
| `pnpm build`                                                                                  | PASS — API, web, and shared builds completed; 15 Next routes generated                          |
| `docker compose -f compose.home.yml --env-file .env.home.example config --quiet`              | PASS                                                                                            |
| `docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet` | PASS                                                                                            |
| Home Caddy validation in `caddy:2-alpine`                                                     | PASS — valid configuration                                                                      |
| Production Caddy validation in `caddy:2-alpine`                                               | PASS after supplying neutral `ACME_EMAIL` and `APP_DOMAIN` values                               |
| `docker compose -f compose.home.yml --env-file .env.home.example build`                       | PASS — API and web production images built                                                      |
| `pnpm screenshots:demo` against the acknowledged screenshot database                          | PASS — reset/migrations/seed and 12 credential-free guest-flow captures                         |
| `pnpm --filter @kommuneflow/api demo:reset` twice against the isolated screenshot demo target | PASS twice — each run restored exactly 22 seed cases without duplicates                         |
| `git diff --check`                                                                            | PASS                                                                                            |

The first unconfigured full-stack run reached staff login and returned the expected `401` because the test fallback password differed from the ignored local seed override. It passed when `FULLSTACK_DEMO_PASSWORD` was sourced from the ignored `.env`; the value was not printed, logged, or committed.

The optional production Caddy check initially omitted required Caddy environment placeholders and failed parsing at `email`. It passed after neutral validation-only values were provided. The required home Caddy validation passed on its first run.

Screenshot generation exposed and corrected three tooling issues during PR 6: reset/seed originally ran after capture instead of before it, Windows Node 26 required a shell wrapper for the static pnpm child commands, and repeated development captures reached the intentionally strict intake throttle. The final successful run used a fresh API process with test-only high limits, reset and seeded the dedicated screenshot database before browsing, created the employee session through `/auth/demo-session`, and generated exactly the twelve files listed in `docs/SCREENSHOTS.md`.

### Implemented and verified locally

- Public landing, citizen form, text-only submission, status lookup, one-click guest session, tenant-filtered queue, case Overview, AI review, Workflow/activity, read-only Analytics, logout, and separate normal staff login.
- Unauthenticated application perimeter and representative protected API denials.
- Guest permission restrictions, tenant isolation, analytics read/aggregate separation, upload denial, origin validation, throttling, mock AI, and reset safety.
- Twelve consistent 1440 × 1000 synthetic screenshots with code elements masked and no populated staff credentials.
- Home and production Compose models, Caddy syntax, production builds, dependency audit, and two isolated reset runs.

### Implemented but not deployed

- PR 1–6 public guest behavior, safety policy, documentation, walkthrough, capture workflow, and screenshots are implemented in the stacked draft branches.
- The current PR 6 commit has not been merged or deployed to `https://kommune.norvix.no`.

### Not verified

- Exact-commit live checks for `/`, `/demo`, `/en`, `/nb`, `/internal/login`, the unauthenticated API matrix, guest permission matrix, complete browser journey, normal staff login, and rollback.
- Host cron execution and real deployed visitor/file cleanup.
- A live absence of the browser Basic Auth prompt for the exact PR 6 commit.

These checks must be performed only after review, merge, and deployment of the exact commit. Record the deployed SHA and results here; do not promote older home-server evidence to PR 6 evidence.

### Post-merge live checklist

1. Record and compare the deployed Git SHA with the reviewed merge commit.
2. Run `scripts/smoke-test.sh` without staff credentials and record every status.
3. Verify one synthetic citizen submission, status lookup, same-tenant continuation, guest case, mock-AI review, Workflow/activity update, and read-only Analytics.
4. Verify guest aggregation, audit, privacy, operations, users, departments, and routing administration are denied.
5. Verify normal staff login separately without exposing credentials.
6. Run the guarded reset twice on the configured demo target and confirm visitor cleanup plus stable seed counts.
7. Exercise rollback: disable guest sessions, confirm normal staff login, and verify the reviewed temporary Caddy gate procedure without removing the guest-role migration.
