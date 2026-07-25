# Verification Log

No secrets, cookies, API keys, deployed access codes, or real citizen data are recorded here.

## Historical entry: 2026-07-24 public guest portfolio release candidate

This entry records the earlier release candidate and is retained as historical
evidence. It is not the current deployed state.

| Item                | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Source              | Historical release candidate; current exact commit is recorded below        |
| Environment         | Local Windows / PowerShell / Docker Desktop                                |
| Node                | `v26.2.0`                                                                  |
| pnpm                | `10.28.2`                                                                  |
| Python              | `3.14.4`                                                                   |
| AI provider         | deterministic mock                                                         |
| Data                | dedicated local `kommuneflow_screenshot` database with synthetic seed only |
| Deployment evidence | Home server, **implemented and verified** on 2026-07-24                    |

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

Screenshot generation exposed and corrected three tooling issues during the earlier documentation phase: reset/seed originally ran after capture instead of before it, Windows Node 26 required a shell wrapper for the static pnpm child commands, and repeated development captures reached the intentionally strict intake throttle. The final successful run used a fresh API process with test-only high limits, reset and seeded the dedicated screenshot database before browsing, created the employee session through `/auth/demo-session`, and generated exactly the twelve files listed in `docs/SCREENSHOTS.md`.

### Implemented and verified locally

- Public landing, citizen form, text-only submission, status lookup, one-click guest session, tenant-filtered queue, case Overview, AI review, Workflow/activity, read-only Analytics, logout, and separate normal staff login.
- Unauthenticated application perimeter and representative protected API denials.
- Guest permission restrictions, tenant isolation, analytics read/aggregate separation, upload denial, origin validation, throttling, mock AI, and reset safety.
- Twelve consistent 1440 × 1000 synthetic screenshots with code elements masked and no populated staff credentials.
- Home and production Compose models, Caddy syntax, production builds, dependency audit, and two isolated reset runs.

### Home-server release evidence

| Check                       | Exact result                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR integration              | PASS — PRs #19–#24 retargeted and merged sequentially; required CI, CodeQL, and Gitleaks checks passed                                                  |
| Pre-release database backup | PASS — PostgreSQL custom-format backup created; SHA-256 checksum verified                                                                               |
| Configuration backup        | PASS — prior `.env` preserved with mode `600`                                                                                                           |
| Home preflight              | PASS — repository, Docker, Compose, Git, required variables, mock AI, HTTPS URLs, `main`, Compose, no host ports, Caddy, proxy network, and disk checks |
| Deployed commit             | Historical entry; see the dated current deployment entry below                                                                                         |
| Image build                 | PASS — API and web production images rebuilt on the home server                                                                                         |
| Migration                   | PASS — additive `20260724133000_add_portfolio_guest_role` applied; all 18 migrations current                                                            |
| Runtime health              | PASS — PostgreSQL, API, web, and gateway healthy                                                                                                        |
| Network isolation           | PASS — only `kommuneflow-ai-gateway-1` joins shared `proxy`; API, web, and PostgreSQL remain private                                                    |
| Runtime policy              | PASS — `AI_PROVIDER=mock`, portfolio enabled, public uploads disabled                                                                                   |
| Seed                        | PASS — idempotent synthetic seed completed; exactly three portfolio guest users                                                                         |
| Public web                  | PASS — `/`, `/demo`, `/nb`, `/en`, `/internal/login`, and `/internal` returned `200` without infrastructure credentials                                 |
| Public API                  | PASS — health/readiness `200`; representative intake/status/address validation reached the API with `400`                                               |
| Unauthenticated API         | PASS — auth/me, cases, analytics, and administration returned `401`                                                                                     |
| Guest session               | PASS — session creation `201`; auth/me `200` with role `portfolio_guest`; cases and Analytics `200`                                                     |
| Guest denials               | PASS — aggregation, audit, privacy, operations, users, departments, and routing rules returned `403`                                                    |
| Upload policy               | PASS — public multipart upload returned `503`                                                                                                           |
| Staff path                  | PASS — login `201`; authenticated profile, cases, and AI status `200`                                                                                   |
| Reset                       | PASS twice — zero unexpected deletions and exactly 22 deterministic seed cases restored on each run                                                     |
| Schedule                    | PASS — guarded reset cron installed at minute 17 every six hours                                                                                        |
| Fatal log scan              | PASS — no fatal/panic/unhandled-rejection entries observed in the deployment window                                                                     |

### Live browser journey

Playwright verified the deployed public site without a browser Basic Auth prompt:

1. Landing showed account-free citizen and employee actions.
2. A synthetic Kristiansand request was submitted with uploads visibly disabled.
3. Status lookup loaded using the generated reference/access code without putting the access code in the URL.
4. Same-tenant continuation created a guest session and opened a reference-filtered queue.
5. The submitted case opened in Overview.
6. Deterministic mock-AI triage remained separate from official values and was accepted through explicit human review.
7. Workflow status changed to `in_progress`; an internal synthetic note and new activity entries appeared.
8. Analytics loaded without an Aggregate control.
9. Logout returned to the normal staff-login page.

The synthetic live-verification case is intentionally subject to the six-hour demo reset.

### Remaining manual limitation

- The rollback procedure and prerequisites were reviewed, but an actual rollback was not triggered because the release was healthy.
- The scheduled cron entry is installed and the identical command passed twice manually; its first timer-triggered execution remains future operational evidence.
- Hetzner was not modified. This verification applies only to the home-server deployment at `https://kommune.norvix.no`.

## 2026-07-24 — Portfolio polish deployment

PR #26 was merged after CI, CodeQL, and Gitleaks passed, then commit
An earlier portfolio polish commit was deployed only to the physical home
server. Hetzner was not modified.

| Check                   | Exact result                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Backup                  | PASS — `kommuneflow_ai_20260724T140753Z.dump`, 102 KB, SHA-256 verified, mode `600`                            |
| Preflight               | PASS — all repository, Docker, configuration, mock-AI, HTTPS, branch, Compose, network, Caddy, and disk checks |
| Release                 | PASS — API/web images rebuilt; no pending migrations; all 18 migrations current                                |
| Runtime                 | PASS — PostgreSQL, API, web, and gateway healthy; health/readiness `200`                                       |
| Public/staff smoke      | PASS — public pages and perimeter responses correct; staff login/profile/cases/AI status succeeded             |
| Guest mutation boundary | PASS — session `201`; ordinary seed mutation `403`; designated mutable seed mutation `201`                     |
| Deterministic reset     | PASS — 22 seed cases restored and the synthetic mutable-seed note count returned to `0`                        |
| Locale continuity       | PASS — English landing entered `/internal` with `kommuneflow.internal.locale=en` and English employee UI       |
| Guest UI                | PASS — one Exit demo action, compact portfolio banner, public case references, no duplicate guest logout       |
| Network isolation       | PASS — only `kommuneflow-ai-gateway-1` from this application joins the shared `proxy` network                  |

The deployment required no schema migration and no global Caddy change. The
existing six-hour guarded reset schedule remains installed.

## 2026-07-25 - Documentation audit baseline

PR #29 remains open and draft, so it has no merge commit to claim. The exact
`origin/main` and home-server commit used for this audit is
`07744f79cae713a476249a982d8ca5ec5ecb2f92`.

| Scope | Result |
| --- | --- |
| Exact deployed commit | PASS - home-server release reported `07744f79cae713a476249a982d8ca5ec5ecb2f92` |
| Home release | PASS - preflight, image build, migrations, health checks, and smoke checks completed |
| Public pages | PASS - `/`, `/demo`, `/nb`, `/en`, `/internal/login`, and `/internal` returned `200` |
| Protected perimeter | PASS - representative unauthenticated protected APIs returned `401` |
| Guest browser flow | PASS - guest entry, case workflow, current deployed guest Analytics, and Exit demo to `/` verified |
| Public uploads | PASS - disabled in the public deployment |
| AI provider | PASS - public deployment uses deterministic mock AI |
| Fatal logs | PASS - no fatal errors observed in the deployment window |
| PR #29 status | OPEN and DRAFT - no merge commit exists yet |

### Automated evidence retained from PR #29

Local and CI lint, typecheck, API tests, API e2e, web tests, web e2e,
full-stack e2e, build, and `git diff --check` passed as recorded on the PR.
CodeQL passed. Gitleaks/Secret scan passed. `pnpm audit:deps` reported one
moderate finding and is not described as clean.

### Analytics evidence

The corrected Kristiansand deterministic baseline on the PR #29 branch is 9
cases, 6 human AI reviews, 4 accepted, 2 corrected, 1 failed run, 8 total
triage runs, 1 case waiting for a citizen, and 24 illustrative minutes. PR #29
was not merged or deployed at this audit date, so these values are not claimed
as the current live guest page. The live capture remains the earlier Analytics
view and must not be described as the compact post-PR #29 layout.

### Verification boundaries

Local tests and CI prove repository behavior. The home-server release and
browser smoke prove the listed live behavior for the exact deployed commit.
Real OpenAI remains unverified unless a protected manual workflow has a dated
successful run recorded here. Backup scripts are manual tools; scheduled
backup/restore testing is not claimed by this entry.
