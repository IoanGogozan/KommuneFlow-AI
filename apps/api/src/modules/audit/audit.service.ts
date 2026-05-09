import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: {
    tenantId: string;
    actor?: CurrentUser;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Prisma.InputJsonObject;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actor?.id,
        actorRole: input.actor?.role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadataJson: input.metadata ?? {},
      },
    });
  }
}
