CREATE TYPE "AIObservabilityStatus" AS ENUM ('success', 'failed');

CREATE TYPE "AIProviderFailureClassification" AS ENUM (
  'timeout',
  'provider_error',
  'invalid_response',
  'validation_failed'
);

CREATE TABLE "ai_observability_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "aiTriageResultId" TEXT,
  "model" TEXT NOT NULL,
  "promptVersion" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "status" "AIObservabilityStatus" NOT NULL,
  "failureClassification" "AIProviderFailureClassification",
  "failureReason" TEXT,
  "tokenEstimate" INTEGER,
  "costEstimateCents" DOUBLE PRECISION,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_observability_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_observability_events_tenantId_createdAt_idx"
  ON "ai_observability_events"("tenantId", "createdAt");

CREATE INDEX "ai_observability_events_caseId_idx"
  ON "ai_observability_events"("caseId");

CREATE INDEX "ai_observability_events_status_createdAt_idx"
  ON "ai_observability_events"("status", "createdAt");

CREATE INDEX "ai_observability_events_failureClassification_idx"
  ON "ai_observability_events"("failureClassification");
