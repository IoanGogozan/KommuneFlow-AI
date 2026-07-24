# Demo Script

## Five-minute walkthrough

Use synthetic information only. No account or password is required for this public path.

1. Open `/`. In about 20 seconds, frame the workflow: citizen request → structured mock-AI suggestion → employee review → traceable processing.
2. Select **Try citizen flow**, confirm the public portfolio banner, choose a municipality, and enter synthetic contact and request information. Mention that public uploads are deliberately disabled.
3. Submit the request. Keep the generated reference and access code on screen; do not copy the access code into a URL, recording note, or screenshot.
4. Select **Check this case now** and show the public status result.
5. Select **Continue in employee demo**. The server creates a short-lived, restricted guest cookie for the same municipality and opens the case queue with the reference search prefilled.
6. Open the case and begin with **Overview**: citizen description, official values, address, seeded document examples, and activity.
7. Open **AI review**. Explain that the deterministic mock provider returns a schema-validated suggestion stored separately from official values.
8. Accept or correct the suggestion. Key message: **AI assists. Employees make every official decision.**
9. Open **Workflow**, update status, add a synthetic internal note if useful, and show the new activity entry.
10. Open **Analytics**. Show existing aggregates and point out that guest aggregation controls are unavailable and the API denies that permission.
11. Return to the landing technical-review link and point to the architecture, tests, security controls, and exact verification log.
12. If RBAC administration is relevant, show `/internal/login` only as a separate controlled path; never display a password.

## Talking points

- Tenant isolation and authorization are enforced server-side.
- Auditors are read-only.
- The guest cannot upload/delete documents or access audit, privacy, operations, users, departments, or routing administration.
- Guest cookies are `HttpOnly`, short-lived, origin-validated, and created only for allowlisted demo tenants.
- Public intake, status, address search, and guest-session creation are throttled.
- AI output is untrusted, schema-validated decision support.
- The public demo uses deterministic mock AI and shared synthetic data that resets periodically.
- This is a functional portfolio demonstration, not an approved municipal production system.

Screenshot evidence keeps the queue, Overview, AI review, Workflow, and read-only Analytics distinct. All committed captures come from a reset local screenshot database; they are not proof of the currently deployed commit.
