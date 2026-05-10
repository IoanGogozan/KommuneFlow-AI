# Manual Integration Verification

These checks are for local pre-demo verification only. Do not run real Kartverket, SSB, or OpenAI API calls in CI.

## Prerequisites

1. Start PostgreSQL.

   ```bash
   docker compose up -d postgres
   ```

2. Apply migrations and seed demo data.

   ```bash
   pnpm --filter @kommuneflow/api prisma:migrate
   pnpm --filter @kommuneflow/api prisma:seed
   ```

3. Start API and web.

   ```bash
   pnpm dev
   ```

4. Open the local apps.

   ```txt
   Web: http://localhost:3000
   API: http://localhost:3101/api/v1
   Internal login: http://localhost:3000/internal/login
   ```

5. Use local demo credentials unless a step says otherwise.

   ```txt
   super.admin@kommuneflow.local
   DemoPassword123!
   ```

## Kartverket Real Address Lookup

Purpose: verify real address search and best-effort case address enrichment.

1. Confirm CI is not running this check.

   ```bash
   echo $CI
   ```

2. Verify public address search against Kartverket.

   ```bash
   curl "http://localhost:3101/api/v1/public/tenants/arendal/integrations/kartverket/address-search?q=Storgata%2012"
   ```

3. Expected result:

   ```txt
   HTTP 200
   response.query = "Storgata 12"
   response.results[0].normalizedAddress exists
   response.results[0].municipalityCode exists
   response.results[0].postalCode exists
   ```

4. Submit a citizen case in the web UI with a real demo address.

   ```txt
   http://localhost:3000/nb
   Address example: Storgata 12, Arendal
   ```

5. Open the internal case detail and verify the address block shows:

   ```txt
   validationStatus = validated
   municipalityCode is present
   municipalityName is present
   normalizedAddress is present
   ```

6. Open `/internal/operations` and verify Kartverket lookup count, failure count, and average latency are populated from persisted integration events.

7. Record the result in `docs/VERIFICATION_LOG.md`.

## SSB Population Import

Purpose: verify real SSB import into local persisted tables.

1. Confirm CI is not running this check.

2. Log in as `super.admin@kommuneflow.local`.

3. Use the internal API endpoint with the browser session cookie or an API client that preserves cookies.

   ```http
   POST http://localhost:3101/api/v1/integrations/ssb/imports/municipality-population
   Content-Type: application/json

   {
     "year": 2025,
     "municipalityCodes": ["4203", "4202", "4204"]
   }
   ```

4. Expected result:

   ```txt
   HTTP 201
   source = ssb
   dataset = 07459
   recordsImported = 3
   ```

5. Verify persisted data.

   ```bash
   pnpm --filter @kommuneflow/api exec tsx <<'TS'
   import { PrismaClient } from '@prisma/client';
   import { PrismaPg } from '@prisma/adapter-pg';
   import { config } from 'dotenv';

   config({ path: '../../.env' });

   const prisma = new PrismaClient({
     adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
   });

   const count = await prisma.externalMunicipalityStatistic.count({
     where: { source: 'ssb', sourceDataset: '07459', year: 2025 },
   });
   const latestRun = await prisma.externalDataImportRun.findFirst({
     where: { source: 'ssb', dataset: '07459' },
     orderBy: { startedAt: 'desc' },
     select: { status: true, recordsImported: true },
   });

   console.log({ count, latestRun });
   await prisma.$disconnect();
   TS
   ```

6. Expected persisted result:

   ```txt
   3 or more records for the imported year
   latest import run status = completed
   ```

7. Record the result in `docs/VERIFICATION_LOG.md`.

## OpenAI Real Triage

Purpose: verify the real OpenAI provider locally without exposing secrets.

1. Confirm CI is not running this check.

   ```bash
   echo $CI
   ```

2. Set local environment only.

   ```txt
   AI_PROVIDER=openai
   OPENAI_API_KEY=<local secret>
   OPENAI_MODEL=gpt-4o-mini
   ```

3. Restart the API after changing environment variables.

4. Log in as an internal user with `ai:triage:run`, for example:

   ```txt
   super.admin@kommuneflow.local
   DemoPassword123!
   ```

5. Open the admin-only diagnostics endpoint from an authenticated session.

   ```http
   GET http://localhost:3101/api/v1/internal/ai/diagnostics
   ```

6. Expected diagnostics:

   ```txt
   provider = openai
   status = ready
   openai.apiKeyConfigured = true
   no OPENAI_API_KEY value is returned
   ```

7. Open an internal case and run AI triage from the UI, or call:

   ```http
   POST http://localhost:3101/api/v1/cases/{caseId}/ai-triage
   ```

8. Expected result:

   ```txt
   HTTP 201
   status = completed or failed with safe failureReason
   no raw secret or citizen email appears in logs
   AI observability event is created
   operations dashboard AI request/failure metrics update
   ```

9. Reset local environment back to mock after verification.

   ```txt
   AI_PROVIDER=mock
   ```

10. Record the result in `docs/VERIFICATION_LOG.md`.

## Analytics Rebuild

Purpose: verify analytics snapshots and operational rebuild evidence.

1. Log in as a user with `analytics:read`, for example the super admin.

2. Rebuild analytics for a local date range with seeded or submitted cases.

   ```http
   POST http://localhost:3101/api/v1/analytics/aggregate
   Content-Type: application/json

   {
     "from": "2026-05-10",
     "to": "2026-05-10"
   }
   ```

3. Verify summary.

   ```http
   GET http://localhost:3101/api/v1/analytics/summary?from=2026-05-10&to=2026-05-10
   ```

4. Expected result:

   ```txt
   analyticsLastRebuiltAt is present
   totals.totalCases is numeric
   SSB enrichment is available, partial, stale, or missing
   no citizen identifiers appear in analytics response
   ```

5. Open `/internal/analytics` and confirm the dashboard renders the same metrics.

6. Open `/internal/operations` and verify analytics rebuild status is visible from persisted data.

7. Record the result in `docs/VERIFICATION_LOG.md`.

## Document Upload And Download

Purpose: verify local private upload storage, document metadata, and secure download.

1. Log in as a case worker or department admin for the target tenant.

2. Open `/internal/cases`, select a case assigned to the user's department, and upload a PDF, PNG, or JPG under 10 MB.

3. Expected upload result:

   ```txt
   document appears in the document list
   MIME type and size are shown
   audit event document.uploaded is created
   storage file exists under apps/api/storage/ or UPLOAD_STORAGE_PATH
   ```

4. Download the uploaded document from the case detail page.

5. Expected download result:

   ```txt
   HTTP 200
   Cache-Control = private, no-store
   Content-Disposition attachment filename is safe
   downloaded bytes match the uploaded document
   audit event document.downloaded is created
   ```

6. Try one abuse case locally, such as a `.txt` file or mismatched MIME/magic bytes.

7. Expected abuse result:

   ```txt
   HTTP 400
   operational event document.upload_failed is created
   no file is stored
   ```

8. Record the result in `docs/VERIFICATION_LOG.md`.

## Citizen Status Lookup

Purpose: verify citizen-facing status lookup and safe public fields.

1. Submit a citizen case from:

   ```txt
   http://localhost:3000/nb
   http://localhost:3000/en
   ```

2. Save the returned values:

   ```txt
   caseReference
   statusAccessCode
   ```

3. Query status.

   ```bash
   curl "http://localhost:3101/api/v1/public/tenants/arendal/cases/status?caseReference=<caseReference>&statusAccessCode=<statusAccessCode>"
   ```

4. Expected result:

   ```txt
   HTTP 200
   response includes caseReference, title, status, createdAt, updatedAt, assignedDepartmentName
   response does not include citizen name, email, phone, address, documents, internal notes, AI raw response, or audit events
   ```

5. Try an invalid code and a guessed reference.

   ```txt
   expected: HTTP 404 with safe generic message
   ```

6. Try the correct reference/code under a wrong tenant slug.

   ```txt
   expected: HTTP 404 with safe generic message
   ```

7. Confirm request and error logs do not include the status access code in the path.

8. Record the result in `docs/VERIFICATION_LOG.md`.
