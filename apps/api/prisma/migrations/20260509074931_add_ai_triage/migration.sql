-- CreateEnum
CREATE TYPE "AITriageStatus" AS ENUM ('pending', 'completed', 'failed', 'reviewed');

-- CreateTable
CREATE TABLE "ai_triage_results" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "suggestedCategory" "CaseCategory",
    "suggestedDepartmentId" TEXT,
    "suggestedUrgency" "CaseUrgency",
    "summary" TEXT,
    "missingInformationJson" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "reasoningSummary" TEXT,
    "rawResponseJson" JSONB NOT NULL,
    "status" "AITriageStatus" NOT NULL DEFAULT 'pending',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_triage_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "aiTriageResultId" TEXT NOT NULL,
    "reviewedByUserId" TEXT NOT NULL,
    "approvedCategory" "CaseCategory" NOT NULL,
    "approvedDepartmentId" TEXT,
    "approvedUrgency" "CaseUrgency" NOT NULL,
    "reviewComment" TEXT,
    "wasAiSuggestionAccepted" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_triage_results_tenantId_idx" ON "ai_triage_results"("tenantId");

-- CreateIndex
CREATE INDEX "ai_triage_results_tenantId_caseId_idx" ON "ai_triage_results"("tenantId", "caseId");

-- CreateIndex
CREATE INDEX "ai_triage_results_tenantId_status_idx" ON "ai_triage_results"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ai_reviews_tenantId_idx" ON "ai_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "ai_reviews_tenantId_caseId_idx" ON "ai_reviews"("tenantId", "caseId");

-- CreateIndex
CREATE INDEX "ai_reviews_tenantId_aiTriageResultId_idx" ON "ai_reviews"("tenantId", "aiTriageResultId");

-- AddForeignKey
ALTER TABLE "ai_triage_results" ADD CONSTRAINT "ai_triage_results_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_triage_results" ADD CONSTRAINT "ai_triage_results_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_triage_results" ADD CONSTRAINT "ai_triage_results_suggestedDepartmentId_fkey" FOREIGN KEY ("suggestedDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_aiTriageResultId_fkey" FOREIGN KEY ("aiTriageResultId") REFERENCES "ai_triage_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_approvedDepartmentId_fkey" FOREIGN KEY ("approvedDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
