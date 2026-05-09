CREATE TABLE "retention_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "closedCaseRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "deletedDocumentRetentionDays" INTEGER NOT NULL DEFAULT 90,
    "auditEventRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "analyticsRetentionDays" INTEGER NOT NULL DEFAULT 1095,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "retention_policies_tenantId_key" ON "retention_policies"("tenantId");

ALTER TABLE "retention_policies" ADD CONSTRAINT "retention_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
