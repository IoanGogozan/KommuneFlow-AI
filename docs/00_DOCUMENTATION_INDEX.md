# Documentation Index

## Start Here

These documents describe the current verified portfolio implementation:

- [README](../README.md): product problem, scope, setup, and links.
- [API Reference](./API_REFERENCE.md): current controller routes and request conventions.
- [Security and privacy](./03_SECURITY_AND_PRIVACY.md): implemented controls and limitations.
- [AI Governance](./04_AI_GOVERNANCE.md): provider abstraction, review boundaries, and AI limits.
- [Home-Server Deployment](./HOME_SERVER_DEPLOYMENT.md): current operational topology and release procedure.
- [Demo Script](./DEMO_SCRIPT.md): short public walkthrough.
- [Verification Log](./VERIFICATION_LOG.md): dated local, CI, and live evidence.

## Current Product And Engineering Docs

| Document | Purpose |
| --- | --- |
| [Product requirements](./01_PRODUCT_REQUIREMENTS.md) | Vision and implemented portfolio scope, clearly separated. |
| [Domain model](./02_DOMAIN_MODEL.md) | Current domain entities and relationships. |
| [Tech stack and architecture](./05_TECH_STACK_AND_ARCHITECTURE.md) | Selected implementation and deployment architecture. |
| [Testing strategy](./06_TESTING_STRATEGY.md) | Test layers and verification expectations. |
| [Screenshots](./SCREENSHOTS.md) | Synthetic UI evidence and regeneration rules. |
| [Runbook](./RUNBOOK.md) | Operational procedures and links. |
| [Branch protection](./BRANCH_PROTECTION.md) | Repository check policy. |

## Security, Privacy, And Integrations

- `03_SECURITY_AND_PRIVACY.md` and `security/`: security controls and hardening gaps.
- `privacy/`: privacy notice, data inventory, and DPIA-lite.
- `integrations/`: Kartverket, SSB, and manual provider verification notes.
- `observability.md`: operational event and monitoring notes.

## ADRs

The ADRs record design decisions, including decisions that explain current
implementation constraints. They are not a promise that every future target
has been implemented.

- `adr/0001` authentication cookies and rate limiting
- `adr/0002` tenant filtering
- `adr/0003` human-reviewed AI suggestions
- `adr/0004` AI provider abstraction
- `adr/0005` Compose deployment on Hetzner as an earlier decision
- `adr/0006` PostgreSQL
- `adr/0007` internationalization

## Alternatives And Explorations

- [Hetzner deployment assets](./alternatives/07_DEPLOYMENT_HETZNER.md) are an
  alternative/historical deployment, not the current live home-server target.
- [Azure/Fabric extension](./explorations/AZURE_FABRIC_EXTENSION.md) is
  unimplemented architecture exploration.

## Archive

The former portfolio implementation plan and professional quality bar were
removed because GitHub PR history and the verification log supersede them.
Historical claims must be read from Git history, not treated as active product
documentation.
