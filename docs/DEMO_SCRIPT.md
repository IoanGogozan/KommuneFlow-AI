# Demo Script

Use synthetic information only. No account or password is required for the
public path.

## Five-minute Walkthrough

1. Open `/` and frame the citizen request -> mock AI suggestion -> employee
   review -> traceable processing journey.
2. Select the citizen flow, choose a municipality, and enter synthetic text.
   Explain that public uploads are disabled.
3. Submit the request and keep the generated reference and access code on
   screen. Never put the access code in a URL, note, log, or screenshot.
4. Check the status using the reference and code, then continue to the employee
   demo.
5. Open the case Overview, AI review, and Workflow pages. Explain that the
   deterministic mock suggestion is separate from official values and that an
   employee must accept or correct it.
6. Open Analytics. The currently deployed page is a synthetic reference view,
   not a live operational report.

## Guest Analytics Talking Points

PR #29 defines a compact guest Analytics layout, but PR #29 is still open and
draft. It is not present in the current home-server deployment, so do not demo
the post-PR #29 cards as live behavior until that PR is merged and deployed.

The guest Analytics page shows:

- synthetic case count;
- human AI reviews;
- accepted and corrected review counts;
- failed triage runs with their total-run denominator;
- cases by status and department;
- cases waiting for a citizen;
- median triage time with a sample size.

The intended post-PR #29 values are a deterministic portfolio reference
snapshot with denominators and sample-size limitations. The current live page
must not be described as that final layout until deployment evidence is added.
Neither state is a live municipal performance report.

## Security Talking Points

- Tenant filtering and authorization are enforced server-side.
- The guest session is allowlisted, short-lived, HttpOnly, and synthetic.
- The guest cannot access administration, privacy, audit, operations,
  document upload/delete, or analytics aggregation.
- Public intake, status, address search, and guest-session creation are
  throttled.
- AI output is untrusted, schema-validated decision support.

For evidence and exact command results, use the
[verification log](./VERIFICATION_LOG.md). For a separate controlled staff
login demonstration, use `/internal/login` without displaying credentials.
