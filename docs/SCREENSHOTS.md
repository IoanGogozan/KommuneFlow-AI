# Screenshots

Screenshots should be captured after the UI is seeded with realistic demo data.

Recommended screenshots after `pnpm --filter @kommuneflow/api prisma:seed`:

1. Citizen intake in Norwegian.
2. Citizen intake in English with document upload visible.
3. Internal login.
4. Case dashboard with several realistic cases.
5. Case detail with documents and internal notes.
6. AI triage suggestion and human review controls.
7. Analytics dashboard after aggregation.
8. Operations dashboard with readiness and integration metrics.
9. Privacy UI with retention dry run output.
10. Deployment smoke test output after Hetzner deployment.

Suggested filenames:

```txt
docs/screenshots/01-citizen-intake-nb.png
docs/screenshots/02-citizen-intake-en-documents.png
docs/screenshots/03-internal-login.png
docs/screenshots/04-case-dashboard.png
docs/screenshots/05-case-detail-documents.png
docs/screenshots/06-ai-triage-review.png
docs/screenshots/07-analytics-dashboard.png
docs/screenshots/08-operations-dashboard.png
docs/screenshots/09-privacy-retention.png
docs/screenshots/10-hetzner-smoke-test.png
```

Current status: screenshots 1-9 were captured locally from seeded demo data on 2026-05-10. Do not add Hetzner screenshots until the final deployment phase.

Regenerate the main local demo screenshots with:

```bash
pnpm screenshots:demo
```

The script captures the citizen portal, internal login, case dashboard, analytics dashboard, and operations dashboard against the running local web/API services. It uses the Kristiansand department admin demo account and narrows the analytics date range so the screenshot shows populated recent demo data instead of a long empty range.
