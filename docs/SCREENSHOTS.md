# Product Screenshots

Generated locally on 2026-07-24 with the reset seeded synthetic dataset at a consistent 1440 × 1000 viewport.

| File                            | Product surface                                                  |
| ------------------------------- | ---------------------------------------------------------------- |
| `01-public-landing.png`         | Public portfolio landing and account-free CTAs                   |
| `02-citizen-intake-preview.png` | Short citizen intake preview used by portfolio evidence          |
| `03-citizen-form.png`           | Public portfolio citizen form with upload-disabled explanation   |
| `04-submission-success.png`     | Submission success with sensitive code elements masked           |
| `05-status-lookup.png`          | Prefilled citizen status lookup                                  |
| `06-guest-dashboard.png`        | Restricted guest dashboard, tenant scope, and shared-demo notice |
| `07-guest-case-queue.png`       | Guest case queue filtered to the submitted reference             |
| `08-case-overview.png`          | Opened case with Overview selected                               |
| `09-ai-review.png`              | AI review and official/suggested comparison                      |
| `10-workflow-activity.png`      | Workflow, notes, and activity                                    |
| `11-analytics-read-only.png`    | Guest analytics without aggregation control                      |
| `12-normal-staff-login.png`     | Separate normal staff login path with no populated credentials   |

The captures contain only local synthetic data. No passwords, cookies, private server details, API keys, or deployed-environment access codes are included. They demonstrate local behavior and are not evidence that the same commit is deployed.

Regenerate with:

```bash
NODE_ENV=test \
SCREENSHOT_DATA_ALLOW_RESET=true \
DATABASE_URL='postgresql://.../kommuneflow_screenshot' \
pnpm screenshots:demo
```

Screenshot generation refuses production configuration and database names that
do not contain `screenshot` or `test`. It resets and seeds only the explicitly
selected screenshot database before capture, generates a random unpublished seed password, enters the employee area through the real guest-session endpoint, and keeps normal staff login as an unfilled standalone capture.
