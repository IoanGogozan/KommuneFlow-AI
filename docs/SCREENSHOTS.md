# Screenshots

Screenshots should be captured after the UI is seeded with realistic demo data.

Recommended screenshots after `pnpm --filter @kommuneflow/api prisma:seed`:

1. Citizen intake in Norwegian.
2. Public status lookup.
3. Internal login.
4. Internal overview dashboard.
5. Case list with several realistic cases.
6. Case detail with documents and internal notes.
7. AI triage suggestion and human review context.
8. Analytics dashboard after aggregation.
9. Operations dashboard with readiness, integration, and AI provider metrics.
10. Privacy UI if the configured user has access.
11. Audit UI if the configured user has access.
12. Deployment smoke test output after Hetzner deployment.

Suggested filenames:

```txt
docs/screenshots/01-citizen-intake-nb.png
docs/screenshots/02-public-status-lookup.png
docs/screenshots/03-internal-login.png
docs/screenshots/04-internal-overview.png
docs/screenshots/05-case-list.png
docs/screenshots/06-case-detail-documents.png
docs/screenshots/07-ai-triage-section.png
docs/screenshots/08-analytics-dashboard.png
docs/screenshots/09-operations-dashboard.png
docs/screenshots/10-privacy-dashboard.png
docs/screenshots/11-audit-dashboard.png
docs/screenshots/12-audit-dashboard-auditor.png
docs/screenshots/13-hetzner-smoke-test.png
```

Current status: screenshots 1-9 were captured locally from seeded demo data on 2026-05-10. Do not add Hetzner screenshots until the final deployment phase.

Regenerate the main local demo screenshots with:

```bash
DEMO_PASSWORD='<demo internal password>' \
pnpm screenshots:demo
```

Useful optional variables:

```bash
WEB_BASE_URL=http://localhost:3000
SCREENSHOT_DIR=docs/screenshots
DEMO_EMAIL=department.admin@kristiansand.local
DEMO_PASSWORD='<demo internal password>'
DEMO_AUDIT_EMAIL=auditor@kristiansand.local
DEMO_AUDIT_PASSWORD='<demo internal password>'
PLAYWRIGHT_BROWSER_CHANNEL=msedge
```

The script captures the citizen portal, public status lookup, internal login, internal overview, case list, case detail, AI triage section, analytics dashboard, operations dashboard, and privacy/audit pages when available to the configured user. It requires login credentials through environment variables and does not hardcode passwords.
