# Azure, AI Foundry, and Fabric Extension

KommuneFlow AI currently runs as a portable TypeScript/Python application with Docker-based deployment documentation. This document shows how the same architecture can be moved into a Microsoft-oriented stack without claiming that the current demo is already deployed there.

## Target Mapping

| Current capability                  | Azure/Fabric target                                   |
| ----------------------------------- | ----------------------------------------------------- |
| Next.js web app                     | Azure Container Apps or Azure App Service             |
| NestJS API                          | Azure Container Apps or Azure App Service             |
| PostgreSQL database                 | Azure Database for PostgreSQL Flexible Server         |
| Uploaded case documents             | Azure Blob Storage with private containers            |
| Application secrets                 | Azure Key Vault with managed identity access          |
| API logs, metrics, and traces       | Azure Monitor and Application Insights                |
| KI/AI provider abstraction          | Azure OpenAI Service through Azure AI Foundry         |
| Analytics snapshots and ELT outputs | Microsoft Fabric Lakehouse, OneLake, and Data Factory |
| Operational dashboards              | Fabric semantic model or Power BI on curated tables   |

## Proposed Architecture

1. Route public and internal traffic through Azure Front Door or Application Gateway with TLS, WAF rules, and tenant-aware hostnames.
2. Run `apps/web` and `apps/api` as separate services in Azure Container Apps. App Service is also viable if the organization prefers that operational model.
3. Store relational case, audit, privacy, and analytics state in Azure Database for PostgreSQL.
4. Store uploaded documents in Azure Blob Storage. Keep only metadata and blob keys in PostgreSQL.
5. Move secrets such as JWT keys, database credentials, storage connection settings, and KI provider credentials to Azure Key Vault.
6. Emit structured logs, readiness checks, operational events, and latency metrics to Application Insights.
7. Configure the existing provider abstraction so Azure OpenAI or another Azure AI Foundry deployment can replace the local mock/OpenAI provider.
8. Export analytics snapshots, SSB-enriched municipality metrics, and KI quality metrics into a Fabric Lakehouse through Data Factory or a scheduled ELT job.
9. Build Power BI/Fabric reports for case volume by department, time to triage, KI acceptance/correction rate, SSB-normalized case volume, and operational events.

## Data Platform Flow

PostgreSQL remains the operational store. A scheduled ELT job extracts non-sensitive operational facts into OneLake:

- daily case counts by status, category, department, and tenant
- average and median time to triage or close
- KI review, acceptance, correction, and failure counts
- SSB population basis and cases per 1,000 inhabitants
- operational event counts for integrations, auth, rate limits, API errors, and maintenance

Fabric can then expose curated tables as a semantic model for Power BI dashboards. Citizen names, emails, phone numbers, addresses, document contents, raw prompts, and internal notes should stay out of analytical exports.

## Governance Notes

- KI output remains decision support only. Human review is still required before official case fields change.
- Azure OpenAI deployments should use explicit data processing settings, region choices, logging controls, and retention policies approved by the municipality.
- Application Insights telemetry must avoid personal data. Use IDs, counts, status codes, latency, and safe operational messages.
- Fabric datasets should follow the same retention and access model as the application analytics layer.
