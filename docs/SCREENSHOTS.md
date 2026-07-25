# Product Screenshots

The committed captures are local synthetic evidence at a consistent 1440 x
1000 viewport. They contain no passwords, cookies, access codes, API keys,
private server details, or real citizen data.

| File | Product surface |
| --- | --- |
| `01-public-landing.png` | Public portfolio landing and account-free CTAs |
| `02-citizen-intake-preview.png` | Citizen intake preview |
| `03-citizen-form.png` | Upload-disabled public citizen form |
| `04-submission-success.png` | Submission success with sensitive code elements masked |
| `05-status-lookup.png` | Citizen status lookup |
| `06-guest-dashboard.png` | Restricted guest dashboard |
| `07-guest-case-queue.png` | Guest case queue |
| `08-case-overview.png` | Case Overview |
| `09-ai-review.png` | Human AI review |
| `10-workflow-activity.png` | Workflow and activity |
| `11-analytics-read-only.png` | Current deployed compact guest Analytics view |
| `12-normal-staff-login.png` | Separate unfilled staff login |

`11-analytics-read-only.png` is a credential-free capture from the exact live
deployment commit. It shows the compact guest Analytics layout with synthetic
counts, review totals, denominator-aware failure rate, waiting-citizen status,
and median triage time with sample size. The capture must not be read as live
SSB aggregation or production performance evidence.

Captures demonstrate local behavior and are not, by themselves, proof that a
commit is deployed. Deployment evidence belongs in
[VERIFICATION_LOG.md](./VERIFICATION_LOG.md).

Regenerate safely with the repository screenshot command against an explicitly
named test or screenshot database:

```bash
NODE_ENV=test SCREENSHOT_DATA_ALLOW_RESET=true DATABASE_URL='postgresql://.../kommuneflow_screenshot' pnpm screenshots:demo
```

The generator refuses production configuration, resets only the selected test
database, uses synthetic seed data, and leaves normal staff credentials blank.
