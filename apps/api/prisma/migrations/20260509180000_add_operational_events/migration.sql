CREATE TYPE "OperationalEventSeverity" AS ENUM ('info', 'warning', 'error', 'critical');

CREATE TABLE "operational_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "userId" TEXT,
  "eventType" TEXT NOT NULL,
  "severity" "OperationalEventSeverity" NOT NULL,
  "source" TEXT NOT NULL,
  "requestId" TEXT,
  "safeMessage" TEXT,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "operational_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "operational_events_eventType_createdAt_idx" ON "operational_events"("eventType", "createdAt");
CREATE INDEX "operational_events_severity_createdAt_idx" ON "operational_events"("severity", "createdAt");
CREATE INDEX "operational_events_tenantId_createdAt_idx" ON "operational_events"("tenantId", "createdAt");
