import { Injectable } from '@nestjs/common';
import { CaseStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MockEmailProvider } from './mock-email.provider';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailProvider: MockEmailProvider,
  ) {}

  async logCaseConfirmation(input: {
    tenantId: string;
    caseId: string;
    recipientEmail: string;
    caseReference: string;
    statusAccessCode: string;
    title: string;
  }) {
    const subject = `KommuneFlow case ${input.caseReference} received`;
    const bodyText = [
      `Your request "${input.title}" has been registered.`,
      `Case reference: ${input.caseReference}`,
      `Status access code: ${input.statusAccessCode}`,
      'Keep this code to check status later.',
    ].join('\n');
    const storedBodyText = [
      `Your request "${input.title}" has been registered.`,
      `Case reference: ${input.caseReference}`,
      `Status access code: ${maskStatusAccessCode(input.statusAccessCode)}`,
      'Keep this code to check status later.',
    ].join('\n');

    return this.logEmail({
      tenantId: input.tenantId,
      caseId: input.caseId,
      recipientEmail: input.recipientEmail,
      subject,
      bodyText,
      storedBodyText,
      template: 'case_confirmation',
      metadata: {
        caseReference: input.caseReference,
        statusAccessCodeMasked: maskStatusAccessCode(input.statusAccessCode),
      },
    });
  }

  async logStatusChanged(input: {
    tenantId: string;
    caseId: string;
    recipientEmail: string;
    caseReference: string;
    previousStatus: CaseStatus;
    nextStatus: CaseStatus;
  }) {
    return this.logEmail({
      tenantId: input.tenantId,
      caseId: input.caseId,
      recipientEmail: input.recipientEmail,
      subject: `KommuneFlow case ${input.caseReference} status updated`,
      bodyText: [
        `Case ${input.caseReference} has changed status.`,
        `Previous status: ${input.previousStatus}`,
        `New status: ${input.nextStatus}`,
      ].join('\n'),
      template: 'case_status_changed',
      metadata: {
        caseReference: input.caseReference,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
      },
    });
  }

  private async logEmail(input: {
    tenantId: string;
    caseId: string;
    recipientEmail: string;
    subject: string;
    bodyText: string;
    storedBodyText?: string;
    template: string;
    metadata: Record<string, unknown>;
  }) {
    const delivery = await this.emailProvider.send({
      to: input.recipientEmail,
      subject: input.subject,
      bodyText: input.bodyText,
      template: input.template,
      metadata: input.metadata,
    });

    return this.prisma.emailLog.create({
      data: {
        tenantId: input.tenantId,
        caseId: input.caseId,
        recipientEmail: input.recipientEmail.toLowerCase(),
        subject: input.subject,
        bodyText: input.storedBodyText ?? input.bodyText,
        template: input.template,
        provider: delivery.provider,
        status: delivery.status,
        sentAt: delivery.sentAt,
        metadataJson: {
          ...input.metadata,
          mockMessageId: delivery.messageId,
        },
      },
      select: {
        id: true,
        template: true,
        status: true,
        provider: true,
        createdAt: true,
      },
    });
  }
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
