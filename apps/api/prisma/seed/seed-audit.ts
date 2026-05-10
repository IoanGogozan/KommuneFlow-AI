import { Prisma, PrismaClient } from '@prisma/client';
import { DemoCase } from './types';

export async function seedCaseAudit(
  prisma: PrismaClient,
  demoCase: DemoCase,
  tenantId: string,
  citizenProfileId: string,
  adminUserId: string,
) {
  await upsertAudit(prisma, {
    id: `${demoCase.id}_audit_created`,
    tenantId,
    actorCitizenProfileId: citizenProfileId,
    action: 'case.created_by_citizen',
    entityType: 'case',
    entityId: demoCase.id,
    metadataJson: { source: 'prisma_seed' },
  });
  await upsertAudit(prisma, {
    id: `${demoCase.id}_audit_address`,
    tenantId,
    actorCitizenProfileId: citizenProfileId,
    action: 'integration.kartverket.address_validated',
    entityType: 'case_address',
    entityId: `${demoCase.id}_address`,
    metadataJson: { caseId: demoCase.id },
  });

  if (demoCase.documentNames.length > 0) {
    await upsertAudit(prisma, {
      id: `${demoCase.id}_audit_document`,
      tenantId,
      actorCitizenProfileId: citizenProfileId,
      action: 'document.uploaded_by_citizen',
      entityType: 'case_document',
      entityId: `${demoCase.id}_document_1`,
      metadataJson: { caseId: demoCase.id },
    });
  }

  if (demoCase.triageAfterMinutes || demoCase.aiFailed) {
    await upsertAudit(prisma, {
      id: `${demoCase.id}_audit_ai`,
      tenantId,
      actorUserId: adminUserId,
      actorRole: 'department_admin',
      action: demoCase.aiFailed
        ? 'ai.triage_result_failed'
        : 'ai.triage_result_created',
      entityType: 'ai_triage_result',
      entityId: `${demoCase.id}_ai_triage`,
      metadataJson: { caseId: demoCase.id },
    });
  }

  if (demoCase.aiReview) {
    await upsertAudit(prisma, {
      id: `${demoCase.id}_audit_review`,
      tenantId,
      actorUserId: adminUserId,
      actorRole: 'department_admin',
      action: 'ai.triage_review_created',
      entityType: 'ai_review',
      entityId: `${demoCase.id}_ai_review`,
      metadataJson: {
        caseId: demoCase.id,
        wasAiSuggestionAccepted: demoCase.aiReview === 'accepted',
      },
    });
  }
}

async function upsertAudit(
  prisma: PrismaClient,
  input: {
    id: string;
    tenantId: string;
    actorUserId?: string;
    actorCitizenProfileId?: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadataJson: Prisma.InputJsonObject;
  },
) {
  await prisma.auditEvent.upsert({
    where: { id: input.id },
    update: {
      tenantId: input.tenantId,
      actorUserId: input.actorUserId,
      actorCitizenProfileId: input.actorCitizenProfileId,
      actorRole: input.actorRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataJson: input.metadataJson,
    },
    create: input,
  });
}
