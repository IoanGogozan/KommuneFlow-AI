import { PrismaClient } from '@prisma/client';
import { DemoCase } from './types';
import { addMinutes } from './time';

export async function seedAi(
  prisma: PrismaClient,
  demoCase: DemoCase,
  tenantId: string,
  departmentId: string,
  adminUserId: string,
  createdAt: Date,
) {
  if (!demoCase.triageAfterMinutes && !demoCase.aiFailed) {
    return;
  }

  const resultId = `${demoCase.id}_ai_triage`;
  const triageCreatedAt = addMinutes(createdAt, demoCase.triageAfterMinutes ?? 7);
  const hasReview = Boolean(demoCase.aiReview);
  const triageStatus = demoCase.aiFailed
    ? 'failed'
    : hasReview
      ? 'reviewed'
      : 'completed';

  await prisma.aITriageResult.upsert({
    where: { id: resultId },
    update: triageResultData({
      demoCase,
      tenantId,
      departmentId,
      triageStatus,
      triageCreatedAt,
    }),
    create: {
      id: resultId,
      ...triageResultData({
        demoCase,
        tenantId,
        departmentId,
        triageStatus,
        triageCreatedAt,
      }),
    },
  });

  await seedAiObservability(prisma, demoCase, tenantId, resultId, triageCreatedAt);

  if (!demoCase.aiReview) {
    return;
  }

  await prisma.aIReview.upsert({
    where: { id: `${demoCase.id}_ai_review` },
    update: aiReviewData(demoCase, tenantId, departmentId, adminUserId, resultId),
    create: {
      id: `${demoCase.id}_ai_review`,
      ...aiReviewData(demoCase, tenantId, departmentId, adminUserId, resultId),
      createdAt: addMinutes(triageCreatedAt, 6),
    },
  });
}

function triageResultData(input: {
  demoCase: DemoCase;
  tenantId: string;
  departmentId: string;
  triageStatus: 'failed' | 'reviewed' | 'completed';
  triageCreatedAt: Date;
}) {
  const { demoCase } = input;

  return {
    tenantId: input.tenantId,
    caseId: demoCase.id,
    model: 'mock-ai-provider',
    promptVersion: 'case_triage_v1',
    suggestedCategory: demoCase.aiFailed ? null : demoCase.category,
    suggestedDepartmentId: demoCase.aiFailed ? null : input.departmentId,
    suggestedUrgency: demoCase.aiFailed ? null : demoCase.urgency,
    summary: demoCase.aiFailed ? null : demoCase.description.slice(0, 220),
    missingInformationJson: demoCase.aiFailed
      ? []
      : ['case reference or additional documentation if relevant'],
    confidenceScore: demoCase.aiFailed ? null : 0.82,
    reasoningSummary: demoCase.aiFailed
      ? null
      : 'Seeded mock AI triage based on case category and department.',
    rawResponseJson: demoCase.aiFailed ? {} : { provider: 'mock', seed: true },
    status: input.triageStatus,
    failureReason: demoCase.aiFailed ? 'Mock provider validation failed.' : null,
    createdAt: input.triageCreatedAt,
  };
}

async function seedAiObservability(
  prisma: PrismaClient,
  demoCase: DemoCase,
  tenantId: string,
  resultId: string,
  triageCreatedAt: Date,
) {
  const data = {
    tenantId,
    caseId: demoCase.id,
    aiTriageResultId: resultId,
    model: 'mock-ai-provider',
    promptVersion: 'case_triage_v1',
    durationMs: demoCase.aiFailed ? 1600 : 950,
    status: demoCase.aiFailed ? ('failed' as const) : ('success' as const),
    failureClassification: demoCase.aiFailed ? ('validation_failed' as const) : null,
    failureReason: demoCase.aiFailed ? 'Mock provider validation failed.' : null,
    tokenEstimate: demoCase.aiFailed ? null : 420,
    costEstimateCents: demoCase.aiFailed ? null : 0.2,
    metadataJson: { seed: true },
    createdAt: triageCreatedAt,
  };

  await prisma.aIObservabilityEvent.upsert({
    where: { id: `${resultId}_observability` },
    update: data,
    create: {
      id: `${resultId}_observability`,
      ...data,
    },
  });
}

function aiReviewData(
  demoCase: DemoCase,
  tenantId: string,
  departmentId: string,
  adminUserId: string,
  resultId: string,
) {
  return {
    tenantId,
    caseId: demoCase.id,
    aiTriageResultId: resultId,
    reviewedByUserId: adminUserId,
    approvedCategory: demoCase.category,
    approvedDepartmentId: departmentId,
    approvedUrgency: demoCase.urgency,
    reviewComment:
      demoCase.aiReview === 'accepted'
        ? 'AI suggestion accepted in demo seed.'
        : 'AI suggestion corrected by case worker in demo seed.',
    wasAiSuggestionAccepted: demoCase.aiReview === 'accepted',
  };
}
