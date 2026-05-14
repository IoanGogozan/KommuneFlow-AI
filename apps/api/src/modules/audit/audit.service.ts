import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { ListAuditEventsQuery } from './audit.schemas';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    tenantId: string;
    actor?: CurrentUser;
    actorCitizenProfileId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonObject;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actor?.id,
        actorCitizenProfileId: input.actorCitizenProfileId,
        actorRole: input.actor?.role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadataJson: input.metadata ?? {},
      },
    });
  }

  async listRecentEvents(user: CurrentUser, query: ListAuditEventsQuery) {
    const where: Prisma.AuditEventWhereInput = {
      tenantId: user.tenantId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.actor
        ? {
            actorUser: {
              OR: [
                { name: { contains: query.actor, mode: 'insensitive' } },
                { email: { contains: query.actor, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const events = await this.prisma.auditEvent.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorRole: true,
        metadataJson: true,
        createdAt: true,
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return events.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      createdAt: event.createdAt,
      actor: event.actorUser
        ? {
            id: event.actorUser.id,
            name: event.actorUser.name,
            email: event.actorUser.email,
            role: event.actorRole,
          }
        : null,
      metadataSummary: summarizeAuditMetadata(event.action, event.metadataJson),
    }));
  }
}

function summarizeAuditMetadata(
  action: string,
  metadataJson: Prisma.JsonValue,
): Record<string, string | number | boolean | null> {
  const metadata = isJsonObject(metadataJson) ? metadataJson : {};

  switch (action) {
    case 'case.created_by_citizen':
      return pickSafeMetadata(metadata, ['sourceLanguage']);
    case 'case.status_updated':
      return pickSafeMetadata(metadata, ['previousStatus', 'nextStatus']);
    case 'case.internal_note_created':
      return pickSafeMetadata(metadata, ['noteId']);
    case 'document.uploaded':
    case 'document.uploaded_by_citizen':
    case 'document.downloaded':
    case 'document.soft_deleted':
    case 'document.sensitive_accessed':
      return pickSafeMetadata(metadata, [
        'caseId',
        'mimeType',
        'sizeBytes',
        'isSensitive',
      ]);
    case 'ai.triage_result_created':
      return pickSafeMetadata(metadata, ['caseId', 'model', 'promptVersion']);
    case 'ai.triage_result_failed':
      return pickSafeMetadata(metadata, ['caseId', 'classification']);
    case 'ai.triage_review_created':
      return pickSafeMetadata(metadata, [
        'caseId',
        'aiTriageResultId',
        'wasAiSuggestionAccepted',
        'approvedCategory',
        'approvedDepartmentSlug',
        'approvedUrgency',
      ]);
    default:
      return pickSafeMetadata(metadata, ['caseId']);
  }
}

function pickSafeMetadata(
  metadata: Record<string, Prisma.JsonValue>,
  keys: string[],
) {
  return keys.reduce<Record<string, string | number | boolean | null>>(
    (summary, key) => {
      const value = metadata[key];

      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        summary[key] = value;
      }

      return summary;
    },
    {},
  );
}

function isJsonObject(
  value: Prisma.JsonValue,
): value is Record<string, Prisma.JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
