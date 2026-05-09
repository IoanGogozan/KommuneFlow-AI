# Definition Of Done

## Purpose Of This Document

This document defines the checklist that every feature must satisfy before it is considered complete.

## Functional Completion

- The feature works for the intended user role.
- The happy path works.
- Important failure paths are handled.
- The UI has Norwegian and English text where user-facing.
- Backend/internal names remain English.

## Security Completion

- Authentication is enforced where required.
- Authorization is enforced server-side.
- Tenant isolation is enforced.
- Input is validated.
- Sensitive actions are audited.
- Secrets are not exposed.

## Privacy Completion

- Personal data is minimized.
- Sensitive data is not logged unnecessarily.
- Privacy-relevant actions are auditable.
- Analytics avoids personal identifiers unless required.

## Testing Completion

- Unit tests exist where logic is non-trivial.
- Integration/API tests exist for backend workflows.
- RBAC tests exist where permissions matter.
- Tenant isolation tests exist for tenant-owned resources.
- AI behavior is tested using mock provider.

## Code Quality Completion

- Code is typed.
- Code is formatted.
- Linting passes.
- No unnecessary large files.
- No duplicated business logic.
- Errors are handled consistently.
- Naming is clear and English.

## Documentation Completion

- README or relevant docs are updated.
- New environment variables are documented.
- New commands are documented.
- Architectural decisions are documented if important.

## Deployment Completion

- Feature works in Docker local environment.
- Feature works after production build.
- Feature does not require manual hidden steps.
- Feature does not break Hetzner deployment.
