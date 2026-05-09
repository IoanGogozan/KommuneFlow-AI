CREATE TABLE "maintenance_runs" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "safeMessage" TEXT,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "maintenance_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "maintenance_runs_type_startedAt_idx"
  ON "maintenance_runs"("type", "startedAt");

CREATE INDEX "maintenance_runs_status_idx"
  ON "maintenance_runs"("status");
