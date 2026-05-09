CREATE TYPE "ExternalDataImportStatus" AS ENUM ('started', 'completed', 'failed');

CREATE TABLE "external_municipality_statistics" (
  "id" TEXT NOT NULL,
  "municipalityCode" TEXT NOT NULL,
  "municipalityName" TEXT,
  "statisticKey" TEXT NOT NULL,
  "statisticLabel" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "value" INTEGER NOT NULL,
  "unit" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceDataset" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_municipality_statistics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_data_import_runs" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "dataset" TEXT NOT NULL,
  "status" "ExternalDataImportStatus" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "recordsImported" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "external_data_import_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_municipality_statistics_municipalityCode_statisticKey_year_sourceDataset_key"
  ON "external_municipality_statistics"("municipalityCode", "statisticKey", "year", "sourceDataset");

CREATE INDEX "external_municipality_statistics_municipalityCode_year_idx"
  ON "external_municipality_statistics"("municipalityCode", "year");

CREATE INDEX "external_municipality_statistics_statisticKey_year_idx"
  ON "external_municipality_statistics"("statisticKey", "year");

CREATE INDEX "external_data_import_runs_source_dataset_startedAt_idx"
  ON "external_data_import_runs"("source", "dataset", "startedAt");

CREATE INDEX "external_data_import_runs_status_idx"
  ON "external_data_import_runs"("status");

ALTER TABLE "analytics_daily_snapshots"
  ADD COLUMN "municipalityPopulation" INTEGER,
  ADD COLUMN "municipalityPopulationYear" INTEGER,
  ADD COLUMN "casesPer1000Inhabitants" DOUBLE PRECISION,
  ADD COLUMN "ssbDataStatus" TEXT NOT NULL DEFAULT 'missing',
  ADD COLUMN "ssbImportedAt" TIMESTAMP(3);
