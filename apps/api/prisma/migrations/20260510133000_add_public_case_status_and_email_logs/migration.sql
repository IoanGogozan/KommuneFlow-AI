CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "cases"
ADD COLUMN "caseReference" TEXT,
ADD COLUMN "statusAccessCodeHash" TEXT;

WITH numbered_cases AS (
  SELECT
    "id",
    "createdAt",
    row_number() OVER (ORDER BY "createdAt", "id") AS sequence_number
  FROM "cases"
)
UPDATE "cases"
SET
  "caseReference" = 'KF-'
    || to_char(numbered_cases."createdAt", 'YYYY')
    || '-'
    || upper(substr(md5("cases"."id" || numbered_cases."createdAt"::text), 1, 12))
    || '-'
    || lpad(numbered_cases.sequence_number::text, 6, '0'),
  "statusAccessCodeHash" = encode(
    digest(
      'legacy-status-access-code:' || "cases"."id" || ':' || numbered_cases."createdAt"::text,
      'sha256'
    ),
    'hex'
  )
FROM numbered_cases
WHERE "cases"."id" = numbered_cases."id";

ALTER TABLE "cases"
ALTER COLUMN "caseReference" SET NOT NULL,
ALTER COLUMN "statusAccessCodeHash" SET NOT NULL;

CREATE UNIQUE INDEX "cases_caseReference_key" ON "cases"("caseReference");
CREATE INDEX "cases_tenantId_caseReference_idx" ON "cases"("tenantId", "caseReference");

CREATE TABLE "email_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "caseId" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyText" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'mock',
  "status" TEXT NOT NULL DEFAULT 'logged',
  "metadataJson" JSONB NOT NULL,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_logs_tenantId_createdAt_idx" ON "email_logs"("tenantId", "createdAt");
CREATE INDEX "email_logs_tenantId_caseId_idx" ON "email_logs"("tenantId", "caseId");
CREATE INDEX "email_logs_recipientEmail_createdAt_idx" ON "email_logs"("recipientEmail", "createdAt");

ALTER TABLE "email_logs"
ADD CONSTRAINT "email_logs_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_logs"
ADD CONSTRAINT "email_logs_caseId_fkey"
FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
