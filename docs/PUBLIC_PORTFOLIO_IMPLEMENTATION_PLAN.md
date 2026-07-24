# Public portfolio implementation plan

This living document tracks the six-PR rollout for public portfolio access. It must be updated after every PR so the repository records what was planned, what was completed, what was verified, and what remains.

## Post-rollout polish

### PR 7 — Guest journey consistency and deterministic reset

Status: merged in PR #26 and deployed to the home server.

- Preserve the selected `en` or `nb` locale when entering the employee demo.
- Keep tenant-wide synthetic case reading, but restrict guest mutations to visitor-created cases and one explicitly designated demo case per tenant.
- Enforce the mutation scope in the API and mirror it with read-only controls in the employee UI.
- Remove guest-created seed-case notes, AI results/reviews, observability, email, and activity records before deterministic reseeding.
- Align public copy and consent text with disabled public uploads.
- Simplify repeated guest-session controls and show the public case reference instead of the database ID.
- Keep `/demo` as an optional guided journey chooser.

Verification:

- API tests: 44 suites, 256 tests passed.
- Web tests: 4 files, 23 tests passed.
- API and web type checks passed.
- Production build and repository lint passed.
- GitHub CI, CodeQL, and Gitleaks passed after the Playwright case-overview assertion was aligned with the public case reference.
- Home-server release `253913af67f4422d209477da667c094d44f41854` passed backup, preflight, build, migration, health, public/staff smoke, guest mutation-scope, deterministic reset, and live English-locale verification.

## Mission and invariants

Evolve the existing application into a portfolio demo that explains and demonstrates the citizen-to-employee case workflow without rebuilding it. Preserve the Next.js web app, NestJS API, Prisma/PostgreSQL model, JWT `HttpOnly` cookie sessions, server-side RBAC, tenant isolation, public intake/status flows, mock AI, documents, analytics, audit/privacy features, tests, CI, Docker Compose, Caddy topology, and normal staff login.

The final journey is:

```text
Citizen submits a request
→ the system structures it
→ AI prepares a suggestion
→ an employee reviews and decides
→ the case continues through an auditable workflow
```

Security invariants for every PR:

- The API remains the authorization authority; UI visibility is never a security control.
- Never expose passwords, password hashes, JWTs, cookies, credentials in URLs, or real municipal data.
- Preserve tenant isolation and keep auditors read-only.
- Keep the public deployment on the mock AI provider.
- Do not add public registration, OAuth, per-visitor infrastructure, or unrelated redesigns.
- Keep each PR independently reviewable and reversible.
- Do not remove Caddy Basic Auth before PR 3 and its perimeter tests.
- Report checks and deployment status precisely; never claim unexecuted verification.

## Delivery tracker

| PR   | Scope                                         | Status   | Evidence / outcome                                                                                           |
| ---- | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| PR 1 | Portfolio guest authorization model           | Merged   | [PR #19](https://github.com/IoanGogozan/KommuneFlow-AI/pull/19)                                              |
| PR 2 | One-click guest session                       | Merged   | [PR #20](https://github.com/IoanGogozan/KommuneFlow-AI/pull/20)                                              |
| PR 3 | Public application perimeter                  | Merged   | [PR #21](https://github.com/IoanGogozan/KommuneFlow-AI/pull/21)                                              |
| PR 4 | Portfolio journey UX                          | Merged   | [PR #22](https://github.com/IoanGogozan/KommuneFlow-AI/pull/22)                                              |
| PR 5 | Public demo safety and reset                  | Merged   | [PR #23](https://github.com/IoanGogozan/KommuneFlow-AI/pull/23)                                              |
| PR 6 | Documentation, screenshots, live verification | Deployed | [PR #24](https://github.com/IoanGogozan/KommuneFlow-AI/pull/24); home-server commit `286c769`; live verified |

## PR 1 — Portfolio guest authorization model

Objective: add a dedicated, restricted `portfolio_guest` authorization model without changing the current public perimeter. Basic Auth stays active and no guest-entry button or session endpoint is added.

Planned work:

- Add `portfolio_guest` to the Prisma `UserRole` enum and commit a migration.
- Add `case:update:all_tenant` and `analytics:aggregate` using existing permission conventions.
- Give the guest exactly: `case:read:all_tenant`, `case:update:all_tenant`, `ai:triage:run`, `ai:triage:review`, `document:read:department`, and `analytics:read`.
- Explicitly withhold uploads/deletes, audit, privacy, operations, tenant/user/routing administration, analytics aggregation, and AI diagnostics.
- Add a reusable any-of permission decorator/guard mechanism; do not add role/email bypasses in controllers.
- Apply tenant-scoped update authorization to case mutations, AI triage/review, notes, assignment, category, and urgency while preserving existing roles.
- Split analytics viewing from aggregation in API authorization and frontend visibility.
- Seed one idempotent guest for each supported demo tenant with a valid, unusable published password hash.
- Add frontend role/type/label/current-user/navigation support in English and Bokmål.
- Test the role, migration, idempotent seed, same-tenant workflow, cross-tenant denial, prohibited capabilities, auditor read-only behavior, and existing role regressions.

Expected change areas:

- `apps/api/prisma/schema.prisma`, a new Prisma migration, and seed files.
- API permission decorator/guard/map, case and AI authorization, analytics controller, and focused unit/e2e tests.
- Web current-user/permission types, labels/i18n, analytics action visibility, case mutation visibility, and component tests.
- This tracking document.

Risks and controls:

- Migration compatibility: additive enum migration only; validate generation and application.
- Tenant escape: all-tenant means authenticated tenant only; retain tenant predicates in service queries.
- Permission regression: any-of groups must not weaken existing all-required behavior.
- Analytics escalation: aggregation receives a separate permission and guest UI/API both deny it.
- Credential exposure: seeded guest hashes are generated and are not documented as login credentials.

Acceptance checklist:

- [x] Role and migration exist.
- [x] Permissions are server-side and contain no role/email bypass.
- [x] Guest completes the central workflow only inside its tenant.
- [x] Administrative and destructive operations remain denied.
- [x] Auditor and existing staff behavior remain correct.
- [x] Basic Auth and public behavior remain unchanged.
- [x] Relevant automated checks pass.
- [x] Draft PR opened and results recorded below.

PR 1 result (update at completion):

- Implemented: additive Prisma role/migration; restricted permission map; any-of permission guard; tenant-scoped case and AI mutations; separate analytics aggregation authorization and UI visibility; three idempotently seeded guests; typed/labeled frontend role support; focused regression tests
- Verified: migration deploy; seed executed repeatedly with exactly three guest records; lint; workspace typecheck; 228 API unit tests with coverage; 30 API e2e tests (plus one intentionally skipped); 17 web unit tests; one full-stack browser workflow; production build
- Not verified / manual work: no deployed-environment verification was performed
- Draft PR: [#19 — feat: add restricted portfolio guest authorization model](https://github.com/IoanGogozan/KommuneFlow-AI/pull/19)
- Deployment: not deployed
- Rollback: revert the additive code/migration before production adoption; do not remove existing roles

## PR 2 — One-click guest session

Add disabled-by-default `POST /api/v1/auth/demo-session`, server-side tenant allowlisting, guest-only short TTL using existing JWT/cookie helpers, origin validation, throttling, safe operational events, and a reusable frontend entry component not yet placed on the landing page. Verify no credentials/tokens leak and normal staff sessions remain unchanged. Basic Auth remains active.

PR 2 result (update at completion):

- Implemented: disabled-by-default demo-session configuration; strict tenant-only request schema; server-resolved portfolio guest; existing JWT infrastructure with a separate 30-minute TTL; shared `HttpOnly`, `SameSite=Lax`, production-secure cookie helper; origin/Referer validation for login, demo-session, and logout; 10 requests per 10 minutes/IP throttling; safe started/denied/rate-limited events; reusable `EnterPortfolioDemoButton`; Compose, environment example, preflight, and smoke-test wiring
- Verified: lint; workspace typecheck; 246 API unit tests with coverage; 33 API e2e tests (plus one intentionally skipped); 19 web unit tests; one full-stack browser workflow; production build; home Compose configuration
- Security: request cannot select a user, email, role, or permission; tenant must be allowlisted; guest identity is resolved by tenant and role; JWT/password data never enters the JSON response; rejected origins receive no cookie; normal staff TTL and login remain unchanged
- User-facing scope: component exists and is tested but is deliberately not placed on the public landing page in PR 2
- Not verified / manual work: no deployed-environment verification was performed
- Deployment: implemented and verified locally, but disabled by default and not deployed
- Rollback: set `PORTFOLIO_DEMO_ENABLED=false` immediately or revert PR 2; normal staff login and Basic Auth remain available
- Draft PR: [#20 — feat: add one-click portfolio demo session](https://github.com/IoanGogozan/KommuneFlow-AI/pull/20)

## PR 3 — Public application perimeter

Inventory and classify every endpoint, add unauthenticated perimeter e2e coverage, audit server-rendered internal pages, then remove Caddy Basic Auth and obsolete secrets. Update smoke tests to prove public routes work and protected APIs return 401 without an application cookie. Validate Caddy/Compose and retain gateway security controls.

PR 3 result (update at completion):

- Implemented: complete API endpoint security inventory; 31-check unauthenticated perimeter e2e suite; Next.js internal rendering audit; removal of Caddy Basic Auth and its obsolete environment/Compose/script wiring; simplified API/web gateway routing; application-perimeter smoke checks; aligned deployment, security, demo, and README guidance
- Authorization: no API authorization rules were weakened; public endpoints remain limited to health, citizen intake/status/address, login/logout, and the feature-flagged demo session; authenticated and permission-protected routes continue to rely on JWT, RBAC, and tenant scoping
- Gateway controls retained: trusted proxy restrictions, HTTPS/security headers, compression, API request-body limit, private application network, and API/web reverse-proxy separation
- Verified before Basic Auth removal: focused unauthenticated perimeter suite passed with 31 tests
- Verified after removal: full `test:all` passed with 246 API unit tests, 64 API e2e tests plus one intentionally skipped, 19 web unit tests, 6 browser e2e tests, and 22 ETL tests; production build passed; both Compose configurations rendered successfully; both Caddyfiles validated; shell scripts passed POSIX syntax validation; `git diff --check` passed
- User-facing scope: the portfolio, citizen, and internal application shells are reachable without infrastructure credentials; internal data still requires an application cookie; no PR 4 journey UI was added
- Database migrations: none
- Not verified / manual work: the deployment smoke script was updated but was not executed against a live deployment; no deployment was performed
- Deployment: implemented and verified locally, but not deployed
- Rollback: revert PR 3 to restore the prior Caddy gate and its environment wiring; application authentication remains independently usable throughout
- Draft PR: [#21 — deploy: expose application-authenticated portfolio perimeter](https://github.com/IoanGogozan/KommuneFlow-AI/pull/21)

## PR 4 — Portfolio journey UX

Create the public landing and guided citizen/employee portfolio journey, place the one-click guest entry, continue from citizen success/status into the employee demo without putting access codes in URLs, communicate synthetic/shared/reset data and human-reviewed AI, and keep normal staff login available. Avoid broad redesign.

PR 4 result (update at completion):

- Implemented: direct landing CTAs for the public citizen flow and one-click employee demo; three-path `/demo` page; English/Bokmål portfolio-mode citizen banner; same-tenant continuation from submission/status into a guest session; case-reference URL search and list prefill; public-demo-first internal login while retaining accessible staff fields; guest session banner, role/scope, exit action, and permission-derived navigation; read-only analytics visibility
- Citizen continuation: successful reference and access code remain in client state; only the case reference is URL-encoded into `/internal/cases?search=...`; the access code is never stored in the URL or browser storage; guest-session errors retain the citizen flow and provide retry
- API support: authenticated case-list responses now include `caseReference` so the existing queue can filter and display the submitted case; no authorization or tenant-scope rule changed
- Browser coverage: landing CTA and 320 px overflow checks; credential-free `/demo`; public portfolio banner; synthetic intake and status lookup; same-tenant guest-session creation; reference-prefilled case queue; guest banner; absent admin/operations navigation; analytics visible without Aggregate; access code absent from URL; existing staff login and case workflow/AI review coverage retained
- Verified: lint; workspace typecheck; 246 API unit tests with coverage; 64 API e2e tests plus one intentionally skipped; 22 web unit tests; 6 browser e2e tests; 22 ETL tests; production build; one real full-stack citizen/employee/AI workflow
- Full-stack note: the first run used the test's fallback password and received the expected authentication failure (`401`); rerunning with the local seeded demo password supplied through `FULLSTACK_DEMO_PASSWORD` passed
- Accessibility: semantic headings and landmarks retained; native buttons/links and password-manager-compatible email/password fields preserved; loading buttons are disabled; guest and portfolio notices use visible text and labelled regions
- Database migrations: none
- Not implemented in this PR: public upload restrictions, reset automation, new rate-limit policy, screenshot regeneration, or live deployment verification
- Deployment: implemented and verified locally, but not deployed
- Rollback: revert PR 4; PR 1–3 authorization, one-click endpoint, application perimeter, and normal staff login remain independently usable
- Draft PR: [#22 — feat: add public portfolio guest journey](https://github.com/IoanGogozan/KommuneFlow-AI/pull/22)

## PR 5 — Public demo safety and reset

Disable public-demo uploads at the backend and communicate this in the UI; add configurable limits for intake/status/address/demo-session endpoints; implement an explicit, guarded, idempotent demo reset command with safe database/storage checks; preserve deterministic seeds; clean expired visitor data/files; and document host scheduling without exposing a reset endpoint.

PR 5 result (update at completion):

- Implemented: backend-enforced upload disablement for portfolio mode; matching citizen UI explanation and removal of the file control; environment-configurable throttling for intake, status, address, and demo-session endpoints; guarded CLI-only reset maintenance command; expired non-seed visitor cleanup across database records and physical files; deterministic seed restoration using the existing seed pipeline; Compose/environment/preflight wiring; six-hour host scheduling guidance
- Reset safety: requires portfolio mode, an explicit confirmation flag, an exact expected database-name match, a deliberately upload-specific storage path, a positive retention period, and mock AI in portfolio production configuration; path traversal is rejected; no public reset endpoint exists
- Seed and idempotency: `seed_` cases are excluded from visitor deletion, then deterministic cases/documents/AI/audit fixtures are restored through the existing idempotent seeder; focused tests execute the reset flow twice and confirm stable results
- User-facing scope: when public uploads are disabled, citizens can still submit text-only cases and are directed to seeded employee-demo cases for document examples; shared-demo copy now states that synthetic submissions can be seen by other visitors and are periodically reset
- Verified: full `test:all` passed with 253 API unit tests, 64 API e2e tests plus one intentionally skipped, 23 web unit tests, 6 browser e2e tests, and 22 ETL tests; lint and workspace typecheck passed within that suite; production build passed; home and production Compose configurations rendered; API and web production images built; packaged reset command exists and refuses execution without safety flags; `git diff --check` passed
- Safe reset evidence: reset behavior was verified through focused unit tests, including two consecutive simulated runs; the packaged CLI negative-path check refused to run with `PORTFOLIO_DEMO_ENABLED must be true`
- Database migrations: none
- Not verified / manual work: no destructive reset was run against the local working database or a deployed database; cron execution and cleanup of real deployed uploads require post-deployment verification
- Deployment: implemented and verified locally, but not deployed
- Rollback: disable scheduled reset execution first; set `PUBLIC_DEMO_ALLOW_UPLOADS` and endpoint limits to the prior intended values if needed; revert PR 5 to remove the maintenance command and safety policy without changing PR 1–4 authorization or journeys
- Draft PR: [#23 — feat: harden and reset public portfolio demo](https://github.com/IoanGogozan/KommuneFlow-AI/pull/23)

## PR 6 — Documentation, screenshots, and live verification

Update README, demo script, API/deployment/security/quality/verification docs, regenerate synthetic screenshots, run the full requested test/build/audit/Compose/Caddy/image suite, deploy the exact reviewed commit, and verify the public, unauthenticated API, guest, browser, rollback, and normal-login journeys. Clearly distinguish automated, manual, and deployed evidence.

Planned work:

- Align README, demo walkthrough, API, deployment, security, hardening, quality-bar, and verification documentation with the public citizen and one-click restricted guest journey.
- Explain application-level API protection, guest permissions, short-lived cookies, origin validation, throttling, disabled uploads, mock AI, synthetic/shared data, reset automation, normal staff access, and rollback.
- Update the screenshot capture workflow to use the credential-free guest session for guest-only evidence while retaining a separate normal staff login capture.
- Regenerate the twelve required screenshots at a consistent viewport using only locally seeded synthetic data, with no published passwords, cookies, access codes, or private server information.
- Run the complete requested dependency, lint, type, unit, integration, browser, full-stack, ETL, screenshot-safety, build, Compose, Caddy, image-build, and reset-idempotency verification suite.
- Treat deployment as a separate evidence boundary: do not claim live verification unless the exact reviewed commit is actually deployed and tested.

Expected change areas:

- `README.md` and the nine documentation/runbook files named by the PR 6 specification.
- `scripts/capture-demo-screenshots.mjs`, screenshot safety coverage if required, and `docs/screenshots/*`.
- Landing preview assets only if the regenerated evidence requires synchronization.
- This tracking document.

Risks and controls:

- Evidence leakage: capture only local synthetic data and automatically reject unsafe screenshot database targets; never publish credentials, cookies, or access codes.
- Authorization drift: guest screenshots must be produced through `POST /auth/demo-session`; normal staff login remains separately evidenced.
- Misleading verification: record exact commands and outcomes, separating implemented and verified locally, implemented but not deployed, and not verified live.
- Reset safety: run destructive screenshot resets only against the explicitly acknowledged screenshot database; exercise production reset idempotency through a dedicated disposable demo database or report it as not verified.
- Stacked reviewability: keep PR 6 limited to evidence, documentation, capture tooling, and generated screenshots; no new product behavior or authorization changes.

PR 6 result (update at completion):

- Implemented: README public-demo opening; sub-five-minute citizen → mock AI → employee walkthrough; API, deployment, security, hardening, quality-bar, screenshot, and verification documentation; credential-free guest screenshot workflow; twelve regenerated local synthetic screenshots; removal of obsolete duplicate captures
- Evidence accuracy: all documents distinguish local automated evidence, implemented-but-not-deployed behavior, historical deployment evidence, and exact-commit live checks that remain outstanding
- Screenshot safety: capture requires an explicitly acknowledged database whose name contains `screenshot` or `test`, refuses production, resets/migrates/seeds before browsing, generates an unpublished random seed password, enters through the real guest-session endpoint, masks code elements, uses a consistent 1440 × 1000 viewport, and leaves staff login fields empty
- Verified locally: frozen install; lint; workspace typecheck; 253 API unit tests across 43 suites with 83.88% statements / 72.83% branches / 88.37% functions / 83.74% lines; 64 API e2e tests plus one intentional skip; 23 web unit tests; 6 browser e2e tests; one configured real full-stack workflow; 22 ETL tests; 3 screenshot-safety tests; dependency audit with no known vulnerabilities; production build; home and production Compose rendering; home and production Caddy validation; home API/web image build; twelve screenshot captures; two guarded reset runs restoring exactly 22 seeds each; formatting, script syntax, and `git diff --check`
- Rerun evidence: the first full-stack run received `401` because its fallback password differed from the ignored local seed; it passed with the ignored seed value supplied without disclosure. An optional production Caddy validation initially omitted required placeholders; it passed when neutral validation-only values were supplied. Required home Caddy validation passed directly
- Database migrations: none in PR 6
- Authorization changes: none; PR 6 documents and evidences the existing PR 1–5 server-side model
- Security/privacy impact: no credentials or deployed access codes were added; hardcoded local seed password guidance was removed from README; screenshots use only local synthetic data; no reset or deployment endpoint was added
- Accessibility impact: no product UI changed; evidence retains native accessible controls and a separately visible normal staff-login path
- Not verified: the PR 6 commit was not merged or deployed, so live public status codes, unauthenticated API matrix, guest matrix, browser journey, staff login, host cron, deployed reset, and rollback remain post-merge manual checks
- Deployment: implemented and verified locally, but not deployed
- Rollback: revert PR 6 to restore prior documentation/captures; no application schema, authorization, or runtime behavior changes need rollback
- Draft PR: [#24 — docs: publish public guest demo evidence](https://github.com/IoanGogozan/KommuneFlow-AI/pull/24)

Live deployment update (2026-07-24):

- Merged: PRs #19–#24 were retargeted and merged sequentially into `main`; all required CI, CodeQL, and secret-scan checks passed
- Deployed commit: `286c769bdfc2314f6ecc724444523e0588f4bef0` on the home server only; the Hetzner deployment was not changed
- Release safety: PostgreSQL backup and checksum completed before release; prior `.env` was preserved with mode `600`; preflight passed every check
- Runtime: API and web images rebuilt; additive guest-role migration applied; all 18 migrations are current; PostgreSQL, API, web, and gateway are healthy; only the gateway joins the shared proxy network
- Live public perimeter: `/`, `/demo`, `/nb`, `/en`, `/internal/login`, and `/internal` returned `200`; health/readiness returned `200`; representative public validation returned `400`; unauthenticated auth/cases/analytics/admin returned `401`
- Live guest matrix: demo session `201`; `/auth/me` reported `portfolio_guest`; cases and analytics returned `200`; aggregation, audit, privacy, operations, users, departments, and routing rules returned `403`; public multipart upload returned `503`; logout returned `201`
- Live browser journey: synthetic citizen submission, status lookup, same-tenant guest continuation, reference-filtered queue, case Overview, mock-AI human review, workflow status update, internal note/activity, read-only Analytics, and logout to normal staff login all passed
- Live staff path: normal staff login returned `201`; authenticated profile, cases, and AI status returned `200`
- Reset: guarded reset ran twice; both runs restored exactly 22 deterministic seed cases with no duplicates; six-hour cron installed idempotently
- Runtime policy: `AI_PROVIDER=mock`, `PORTFOLIO_DEMO_ENABLED=true`, `PUBLIC_DEMO_ALLOW_UPLOADS=false`, and exactly three portfolio guest users verified
- Remaining operational limitation: rollback was documented and prerequisites were checked, but an actual rollback was not triggered because the release was healthy

## Required report after each PR

Record and report:

```text
PR:
Branch:
Objective:

Implemented:
Files changed:
Database migrations:
Authorization changes:
User-facing changes:
Security/privacy impact:
Accessibility impact:

Tests added:
Commands executed:
Exact results:

Not completed:
Manual verification required:
Deployment impact:
Rollback considerations:
Next PR:
```

Use these evidence labels consistently: **implemented and verified**, **implemented but not deployed**, **recommended but not implemented**, and **not verified**.
