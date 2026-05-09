CREATE TYPE "AddressValidationSource" AS ENUM ('kartverket');

CREATE TYPE "AddressValidationStatus" AS ENUM ('validated', 'not_found', 'failed', 'skipped');

CREATE TABLE "case_addresses" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "originalInput" TEXT NOT NULL,
  "normalizedAddress" TEXT,
  "municipalityCode" TEXT,
  "municipalityName" TEXT,
  "postalCode" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "source" "AddressValidationSource" NOT NULL DEFAULT 'kartverket',
  "sourceReferenceId" TEXT,
  "validationStatus" "AddressValidationStatus" NOT NULL,
  "validatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "integration_health_events" (
  "id" TEXT NOT NULL,
  "integrationName" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "latencyMs" INTEGER,
  "errorCode" TEXT,
  "safeMessage" TEXT,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "integration_health_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_addresses_tenantId_idx" ON "case_addresses"("tenantId");
CREATE INDEX "case_addresses_tenantId_caseId_idx" ON "case_addresses"("tenantId", "caseId");
CREATE INDEX "integration_health_events_integrationName_createdAt_idx" ON "integration_health_events"("integrationName", "createdAt");
CREATE INDEX "integration_health_events_eventType_status_idx" ON "integration_health_events"("eventType", "status");

ALTER TABLE "case_addresses"
  ADD CONSTRAINT "case_addresses_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_addresses"
  ADD CONSTRAINT "case_addresses_caseId_fkey"
  FOREIGN KEY ("caseId") REFERENCES "cases"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
