# ADR 0005: Docker Compose On Hetzner

## Status

Accepted

## Context

The project needs a production-like deployment target that is understandable in interviews and realistic for a small municipal SaaS demo. Kubernetes would add operational complexity without improving the portfolio signal for this scope.

## Decision

Use Docker Compose on a Hetzner VPS with:

- API container
- web container
- PostgreSQL container
- Caddy reverse proxy
- persistent database and upload volumes
- Caddy certificate volume
- backup and restore scripts

## Consequences

- The deployment is understandable and reproducible.
- HTTPS can be handled by Caddy.
- PostgreSQL remains private on the Docker network.
- The setup is appropriate for demo/small-scale deployment.
- Larger production deployments could later move PostgreSQL to managed infrastructure and add separate workers/object storage.
