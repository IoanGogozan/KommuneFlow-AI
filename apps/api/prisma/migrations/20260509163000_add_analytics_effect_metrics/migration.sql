ALTER TABLE "analytics_daily_snapshots"
  ADD COLUMN "averageTimeToTriageMinutes" DOUBLE PRECISION,
  ADD COLUMN "medianTimeToTriageMinutes" DOUBLE PRECISION,
  ADD COLUMN "averageTimeToCloseHours" DOUBLE PRECISION,
  ADD COLUMN "medianTimeToCloseHours" DOUBLE PRECISION,
  ADD COLUMN "casesWaitingForCitizen" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiTriageSuccessCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiTriageFailureCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiTriageFailureRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "aiSuggestionsAccepted" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "aiSuggestionAcceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "estimatedManualMinutesSaved" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "analyticsRebuiltAt" TIMESTAMP(3);
