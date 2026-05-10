import { Prisma, PrismaClient } from '@prisma/client';
import { DemoCase } from './types';
import { addMinutes } from './time';

export async function seedEmailLogs(
  prisma: PrismaClient,
  demoCase: DemoCase,
  tenantId: string,
  createdAt: Date,
) {
  await upsertEmailLog(prisma, {
    id: `${demoCase.id}_email_confirmation`,
    tenantId,
    caseId: demoCase.id,
    recipientEmail: demoCase.citizenEmail,
    subject: `KommuneFlow case ${caseReferenceForDemoCase(demoCase.id)} received`,
    bodyText: [
      `Your request "${demoCase.title}" has been registered.`,
      `Case reference: ${caseReferenceForDemoCase(demoCase.id)}`,
      `Status access code: ${maskStatusAccessCode(
        statusAccessCodeForDemoCase(demoCase.id),
      )}`,
      'Keep this code to check status later.',
    ].join('\n'),
    template: 'case_confirmation',
    createdAt: addMinutes(createdAt, 4),
    metadataJson: {
      caseReference: caseReferenceForDemoCase(demoCase.id),
      statusAccessCodeMasked: maskStatusAccessCode(
        statusAccessCodeForDemoCase(demoCase.id),
      ),
      source: 'prisma_seed',
    },
  });

  if (demoCase.status === 'new') {
    return;
  }

  await upsertEmailLog(prisma, {
    id: `${demoCase.id}_email_status_changed`,
    tenantId,
    caseId: demoCase.id,
    recipientEmail: demoCase.citizenEmail,
    subject: `KommuneFlow case ${caseReferenceForDemoCase(
      demoCase.id,
    )} status updated`,
    bodyText: [
      `Case ${caseReferenceForDemoCase(demoCase.id)} has changed status.`,
      'Previous status: new',
      `New status: ${demoCase.status}`,
    ].join('\n'),
    template: 'case_status_changed',
    createdAt: addMinutes(createdAt, demoCase.triageAfterMinutes ?? 10),
    metadataJson: {
      caseReference: caseReferenceForDemoCase(demoCase.id),
      previousStatus: 'new',
      nextStatus: demoCase.status,
      source: 'prisma_seed',
    },
  });
}

async function upsertEmailLog(
  prisma: PrismaClient,
  input: {
    id: string;
    tenantId: string;
    caseId: string;
    recipientEmail: string;
    subject: string;
    bodyText: string;
    template: string;
    createdAt: Date;
    metadataJson: Prisma.InputJsonObject;
  },
) {
  const data = {
    tenantId: input.tenantId,
    caseId: input.caseId,
    recipientEmail: input.recipientEmail,
    subject: input.subject,
    bodyText: input.bodyText,
    template: input.template,
    provider: 'mock',
    status: 'logged',
    sentAt: null,
    createdAt: input.createdAt,
    metadataJson: input.metadataJson,
  };

  await prisma.emailLog.upsert({
    where: { id: input.id },
    update: data,
    create: {
      id: input.id,
      ...data,
    },
  });
}

function caseReferenceForDemoCase(caseId: string) {
  return `KF-DEMO-${caseId.replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase()}`;
}

function statusAccessCodeForDemoCase(caseId: string) {
  return `DEMO-${caseId}`.toUpperCase();
}

function maskStatusAccessCode(statusAccessCode: string) {
  const normalized = statusAccessCode.trim().toUpperCase();

  if (normalized.length <= 4) {
    return '****';
  }

  return `${normalized.slice(0, 4)}-${'*'.repeat(
    Math.min(8, normalized.length - 4),
  )}`;
}
