-- AlterTable
ALTER TABLE "case_documents" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "case_documents_tenantId_caseId_deletedAt_idx" ON "case_documents"("tenantId", "caseId", "deletedAt");
