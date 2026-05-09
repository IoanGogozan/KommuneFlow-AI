ALTER TABLE "case_documents" ADD COLUMN "uploadedByCitizenProfileId" TEXT;
ALTER TABLE "case_documents" ALTER COLUMN "uploadedByUserId" DROP NOT NULL;

CREATE INDEX "case_documents_tenantId_uploadedByCitizenProfileId_idx" ON "case_documents"("tenantId", "uploadedByCitizenProfileId");

ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_uploadedByCitizenProfileId_fkey" FOREIGN KEY ("uploadedByCitizenProfileId") REFERENCES "citizen_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
