# Product Screenshots

Generated locally on 2026-07-23 with the seeded synthetic dataset at a consistent 1440 × 1000 viewport.

| File | Product surface |
| --- | --- |
| `01-landing.png` | Public portfolio landing |
| `02-citizen-intake-en.png` | English citizen intake |
| `03-citizen-intake-nb.png` | Norwegian citizen intake |
| `04-submission-success.png` | Submission success and save actions |
| `05-status-lookup.png` | Prefilled citizen status lookup |
| `06-internal-dashboard.png` | Employee work dashboard |
| `07-case-list.png` | Filterable employee case list |
| `07-case-overview.png` | Opened case with Overview selected |
| `08-ai-review.png` | AI review and official/suggested comparison |
| `09-workflow-activity.png` | Workflow, notes, and activity |

The captures contain only local synthetic data. No Basic Auth credentials, passwords, private server details, API keys, or deployed-environment access codes are included.

Regenerate with:

```bash
NODE_ENV=test \
SCREENSHOT_DATA_ALLOW_RESET=true \
DATABASE_URL='postgresql://.../kommuneflow_screenshot' \
DEMO_PASSWORD='<local seeded password>' \
pnpm screenshots:demo
```

Screenshot generation refuses production configuration and database names that
do not contain `screenshot` or `test`. It resets and seeds only the explicitly
selected screenshot database before capture, so repeated runs do not accumulate
synthetic cases.
