CREATE TABLE "analytics_daily_snapshots" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "casesByStatusJson" JSONB NOT NULL,
    "casesByCategoryJson" JSONB NOT NULL,
    "casesByDepartmentJson" JSONB NOT NULL,
    "aiReviewsTotal" INTEGER NOT NULL,
    "aiCorrectionsTotal" INTEGER NOT NULL,
    "aiCorrectionRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_daily_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_daily_snapshots_tenantId_date_key" ON "analytics_daily_snapshots"("tenantId", "date");
CREATE INDEX "analytics_daily_snapshots_tenantId_date_idx" ON "analytics_daily_snapshots"("tenantId", "date");

ALTER TABLE "analytics_daily_snapshots" ADD CONSTRAINT "analytics_daily_snapshots_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
