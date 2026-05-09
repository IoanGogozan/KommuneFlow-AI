# ADR 0001: Internal Authentication Cookie And Rate Limiting

## Status

Accepted

## Context

The internal dashboard initially used a browser-stored bearer token for simplicity. This is not the preferred security posture for an internal municipal case management interface because JavaScript-accessible tokens are exposed to theft if an XSS issue is introduced later.

The security documentation requires server-side authorization, expiring tokens, secrets outside source control, rate limiting on login, and a safer approach to browser sessions.

## Decision

Internal authentication uses a JWT stored in an `HttpOnly` cookie named `kommuneflow_access_token`.

The API sets the cookie on successful login and clears it on logout. The frontend sends authenticated internal requests with `credentials: "include"` and does not store tokens in `localStorage`.

The backend still accepts `Authorization: Bearer ...` for API/test compatibility, but the browser UI must use the cookie flow.

Login and public case intake endpoints are rate-limited with `@nestjs/throttler`.

`JWT_SECRET` is mandatory in production. A development fallback is allowed only when `NODE_ENV` is not `production`.

## Consequences

- Internal tokens are not readable from browser JavaScript.
- XSS impact is reduced compared with `localStorage` token storage.
- CSRF must be considered for future cross-site deployments. The current cookie uses `SameSite=Lax`; production hardening may add CSRF tokens if cross-site workflows are introduced.
- Local development must use `credentials: "include"` for authenticated frontend API calls.
