# Tech Stack And Architecture

## Selected Stack

- TypeScript with Next.js for the web application.
- NestJS for the API.
- PostgreSQL with Prisma for persistence and migrations.
- Zod for request and AI-output validation.
- Python ELT helpers and tests for integration-oriented work.
- Docker Compose for local and current home-server deployment.
- Caddy for the project gateway and TLS boundary integration.
- Jest, Vitest, and Playwright for automated verification.

OpenAI is optional behind the `AIProvider` interface. The public deployment
uses a deterministic mock provider. The stack was selected for the current
portfolio implementation; it is not presented as a recommendation to make the
system look enterprise-ready.

## Current Home-Server Deployment

The public deployment at `https://kommune.norvix.no` uses the home-server
topology documented in [HOME_SERVER_DEPLOYMENT.md](./HOME_SERVER_DEPLOYMENT.md).
Global Caddy terminates TLS on ports 80/443. The project gateway is on the
private proxy network and listens on HTTP port 8080. It routes to the web and
API containers and applies security headers and request-size limits. The API,
web, and PostgreSQL services remain on the private project network and do not
publish host ports.

The exact current commit and checks belong in
[VERIFICATION_LOG.md](./VERIFICATION_LOG.md), not in this architecture summary.

## Alternatives And Exploration

[Hetzner deployment assets](./alternatives/07_DEPLOYMENT_HETZNER.md) describe an
alternative/historical deployment path and are not evidence of the current
live target. [Azure/Fabric](./explorations/AZURE_FABRIC_EXTENSION.md) is
architecture exploration and is not implemented.

## Boundaries

The public system uses synthetic data, disables public uploads, and exposes a
restricted guest path. Authentication, authorization, tenant isolation, and
request validation are implemented server-side. Full background processing,
live SSB normalization, scheduled backup/restore testing, and production
municipal operations remain outside the verified portfolio scope.
