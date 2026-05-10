import { Injectable } from '@nestjs/common';
import { OperationalEventSeverity, Prisma } from '@prisma/client';
import { appLogger } from '../../shared/logging/app-logger';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OperationalEventService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    eventType: string;
    severity: OperationalEventSeverity;
    source: string;
    tenantId?: string | null;
    userId?: string | null;
    requestId?: string | null;
    safeMessage?: string | null;
    metadata?: Prisma.InputJsonObject;
  }) {
    try {
      await this.prisma.operationalEvent.create({
        data: {
          tenantId: input.tenantId ?? null,
          userId: input.userId ?? null,
          eventType: input.eventType,
          severity: input.severity,
          source: input.source,
          requestId: input.requestId ?? null,
          safeMessage: input.safeMessage ?? null,
          metadataJson: input.metadata ?? {},
        },
      });
    } catch {
      appLogger.warn(
        {
          event: 'operational_event_record_failed',
          eventType: input.eventType,
          source: input.source,
        },
        'Could not record operational event.',
      );
    }
  }
}
