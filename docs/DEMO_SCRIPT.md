# Demo Script

## Five-minute walkthrough

Use synthetic data only. Interactive routes require protected demo credentials supplied separately; never show passwords in a recording or screenshot.

1. Open `/` and explain the three-step workflow: citizen request, structured AI suggestion, employee review and processing.
2. Enter `/en`, explicitly select a municipality, provide synthetic contact details, choose an address result or no-address mode, describe the request, and optionally attach a safe demo document.
3. Submit. Copy or save the case reference and access code.
4. Select **Check this case now** and show that both values are already filled and status loads without retyping.
5. Open `/internal/login` and sign in with the protected recruiter or department-admin demo account.
6. Open **Cases**, locate the submitted or seeded synthetic case, and open it.
7. Begin in **Overview**. Read the citizen description, official classification, address, and documents before discussing AI.
8. Open **AI review**. Compare official values with the schema-validated suggestion and explain that official fields do not change until an employee accepts or corrects it.
9. Accept or correct the suggestion, then show the updated official values.
10. Open **Workflow**, update status if appropriate, and show internal notes and recent auditable activity.
11. If time remains, show Analytics and briefly compare case-worker, auditor, and admin navigation to demonstrate server-backed RBAC and tenant scope.

## Talking points

- Tenant isolation and authorization are enforced server-side.
- Auditors are read-only.
- Private documents are validated, permission-checked, and audited.
- AI output is untrusted, schema-validated decision support.
- The normal demo uses deterministic mock AI and synthetic data.
- This is a functional portfolio demonstration, not an approved municipal production system.

Screenshot evidence keeps the case list and opened Overview distinct:
`07-case-list.png` shows discovery/filtering, while `07-case-overview.png`
shows the actual opened case before AI review.
