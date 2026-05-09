CREATE TABLE "analytics_department_daily" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "departmentId" TEXT,
  "departmentName" TEXT NOT NULL,
  "caseCount" INTEGER NOT NULL,
  "averageTimeToTriageMinutes" DOUBLE PRECISION,
  "averageTimeToCloseHours" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "analytics_department_daily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_ai_quality_daily" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "aiReviewsTotal" INTEGER NOT NULL,
  "aiSuggestionsAccepted" INTEGER NOT NULL,
  "aiCorrectionsTotal" INTEGER NOT NULL,
  "aiAcceptanceRate" DOUBLE PRECISION NOT NULL,
  "aiCorrectionRate" DOUBLE PRECISION NOT NULL,
  "aiTriageSuccessCount" INTEGER NOT NULL,
  "aiTriageFailureCount" INTEGER NOT NULL,
  "aiTriageFailureRate" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "analytics_ai_quality_daily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_municipality_daily" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "municipalityCode" TEXT NOT NULL,
  "municipalityName" TEXT,
  "caseCount" INTEGER NOT NULL,
  "population" INTEGER,
  "populationYear" INTEGER,
  "casesPer1000Inhabitants" DOUBLE PRECISION,
  "ssbImportedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "analytics_municipality_daily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "analytics_department_daily_tenantId_date_departmentName_key"
  ON "analytics_department_daily"("tenantId", "date", "departmentName");

CREATE INDEX "analytics_department_daily_tenantId_date_idx"
  ON "analytics_department_daily"("tenantId", "date");

CREATE UNIQUE INDEX "analytics_ai_quality_daily_tenantId_date_key"
  ON "analytics_ai_quality_daily"("tenantId", "date");

CREATE INDEX "analytics_ai_quality_daily_tenantId_date_idx"
  ON "analytics_ai_quality_daily"("tenantId", "date");

CREATE UNIQUE INDEX "analytics_municipality_daily_tenantId_date_municipalityCode_key"
  ON "analytics_municipality_daily"("tenantId", "date", "municipalityCode");

CREATE INDEX "analytics_municipality_daily_tenantId_date_idx"
  ON "analytics_municipality_daily"("tenantId", "date");

CREATE INDEX "analytics_municipality_daily_municipalityCode_date_idx"
  ON "analytics_municipality_daily"("municipalityCode", "date");

ALTER TABLE "analytics_department_daily"
  ADD CONSTRAINT "analytics_department_daily_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analytics_ai_quality_daily"
  ADD CONSTRAINT "analytics_ai_quality_daily_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analytics_municipality_daily"
  ADD CONSTRAINT "analytics_municipality_daily_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
