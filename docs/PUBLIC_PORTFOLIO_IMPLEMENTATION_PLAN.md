# Public portfolio implementation plan

This living document tracks the six-PR rollout for public portfolio access. It must be updated after every PR so the repository records what was planned, what was completed, what was verified, and what remains.

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

| PR   | Scope                                         | Status        | Evidence / outcome                                                                                                      |
| ---- | --------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| PR 1 | Portfolio guest authorization model           | Draft PR open | [PR #19](https://github.com/IoanGogozan/KommuneFlow-AI/pull/19); implemented and verified locally; Basic Auth unchanged |
| PR 2 | One-click guest session                       | Draft PR open | [PR #20](https://github.com/IoanGogozan/KommuneFlow-AI/pull/20); stacked on draft PR #19; disabled by default           |
| PR 3 | Public application perimeter                  | Ready for PR  | Branch `agent/public-portfolio-perimeter`; implemented and verified locally; stacked on draft PR #20                    |
| PR 4 | Portfolio journey UX                          | Not started   | Landing, citizen-to-employee continuation, guest UX                                                                     |
| PR 5 | Public demo safety and reset                  | Not started   | Upload controls, rate limits, safe reset                                                                                |
| PR 6 | Documentation, screenshots, live verification | Not started   | Evidence must match deployed behavior                                                                                   |

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
- Draft PR: pending

## PR 4 — Portfolio journey UX

Create the public landing and guided citizen/employee portfolio journey, place the one-click guest entry, continue from citizen success/status into the employee demo without putting access codes in URLs, communicate synthetic/shared/reset data and human-reviewed AI, and keep normal staff login available. Avoid broad redesign.

## PR 5 — Public demo safety and reset

Disable public-demo uploads at the backend and communicate this in the UI; add configurable limits for intake/status/address/demo-session endpoints; implement an explicit, guarded, idempotent demo reset command with safe database/storage checks; preserve deterministic seeds; clean expired visitor data/files; and document host scheduling without exposing a reset endpoint.

## PR 6 — Documentation, screenshots, and live verification

Update README, demo script, API/deployment/security/quality/verification docs, regenerate synthetic screenshots, run the full requested test/build/audit/Compose/Caddy/image suite, deploy the exact reviewed commit, and verify the public, unauthenticated API, guest, browser, rollback, and normal-login journeys. Clearly distinguish automated, manual, and deployed evidence.

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
