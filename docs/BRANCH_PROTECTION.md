# Recommended Branch Protection

Protect `main` in GitHub repository settings. This is an operational repository setting, not application code.

- Require a pull request before merging and disallow direct pushes.
- Require the `CI / Checks` status check.
- Require CodeQL analysis and the existing Gitleaks secret scan.
- Require branches to be up to date before merging.
- Dismiss stale approvals after new commits where appropriate.

The manually triggered `OpenAI Smoke` workflow must not be required. Standard pull-request and `main` CI use `AI_PROVIDER=mock` and never require `OPENAI_API_KEY`.
