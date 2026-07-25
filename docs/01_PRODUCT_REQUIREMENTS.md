# Product Requirements

## Product Vision

KommuneFlow AI explores a municipal case workflow in which citizen requests
are received consistently, routed with assistance, reviewed by people, and
kept traceable. The vision includes integrations, stronger operational
automation, and a production-grade service model.

## Implemented Portfolio Scope

This repository is a portfolio implementation of that vision, not an approved
SaaS product or an approved municipal system. The current scope demonstrates:

- Norwegian and English citizen intake and internal portfolio workflows.
- Synthetic case data and a citizen-to-employee continuation path.
- Deterministic mock AI behind the `AIProvider` abstraction.
- Human review before official case values change.
- Server-side authentication, authorization, tenant filtering, privacy,
  audit, and operational controls.
- Read-only guest Analytics over a deterministic synthetic reference snapshot.

## Documents And Uploads

The domain supports document records and employee-side document examples. The
public portfolio deployment disables citizen uploads. This distinction is
intentional: document capability in the model does not mean public upload is
enabled.

## Users And Tenants

The backend contains roles, tenants, and permission guards used for the
portfolio demonstration. The current guest UI is primarily read-only with
limited workflow actions; it is not a full tenant, user, or feature-management
product surface.

## AI And Integrations

AI execution is synchronous in the current request path. Background processing,
retry/backoff, cost monitoring, stronger PII redaction, and operational worker
controls are future work. OpenAI is an optional provider and real OpenAI use is
not claimed as verified without dated evidence. Public mode uses deterministic
mock AI.

SSB and Kartverket integration code is present, but a completed live import is
not claimed by this document without a dated successful verification.

## Privacy And Limitations

The implementation provides privacy-oriented controls such as export,
anonymization, retention cleanup, access boundaries, safe errors, and audit
evidence. This is not a claim of GDPR compliance or certification. Public data
must remain synthetic, and the deployment is not approved for real municipal
use.

## Deployment Scope

The current verified deployment is the home-server portfolio deployment. Hetzner
assets are an alternative/historical path, not a mandatory MVP requirement.
Azure/Fabric material is unimplemented architecture exploration.
