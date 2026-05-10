import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'node:fs/promises';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { resolveDocumentStoragePath } from '../documents/documents.service';
import { OperationalEventService } from '../operations/operational-event.service';
import {
  CitizenDataExportQuery,
  RetentionCleanupInput,
  UpdateRetentionPolicyInput,
} from './privacy.schemas';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly operationalEventService: OperationalEventService,
  ) {}

  getStatus() {
    return {
      status: 'ok',
      capabilities: {
        citizenDataExport: true,
        citizenAnonymization: true,
        documentSoftDelete: false,
        retentionConfiguration: true,
      },
    };
  }

  async getRetentionPolicy(user: CurrentUser) {
    return this.ensureRetentionPolicy(user.tenantId);
  }

  async updateRetentionPolicy(
    user: CurrentUser,
    input: UpdateRetentionPolicyInput,
  ) {
    const policy = await this.prisma.retentionPolicy.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        ...input,
      },
      update: input,
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'privacy.retention_policy_updated',
      entityType: 'retention_policy',
      entityId: policy.id,
      metadata: {
        closedCaseRetentionDays: policy.closedCaseRetentionDays,
        deletedDocumentRetentionDays: policy.deletedDocumentRetentionDays,
        auditEventRetentionDays: policy.auditEventRetentionDays,
        analyticsRetentionDays: policy.analyticsRetentionDays,
      },
    });

    return policy;
  }

  async runRetentionCleanup(user: CurrentUser, input: RetentionCleanupInput) {
    const policy = await this.ensureRetentionPolicy(user.tenantId);
    const now = new Date();
    const cutoffs = {
      closedCases: daysBefore(now, policy.closedCaseRetentionDays),
      deletedDocuments: daysBefore(now, policy.deletedDocumentRetentionDays),
      auditEvents: daysBefore(now, policy.auditEventRetentionDays),
      analytics: daysBefore(now, policy.analyticsRetentionDays),
    };
    const where = {
      closedCases: {
        tenantId: user.tenantId,
        closedAt: {
          not: null,
          lt: cutoffs.closedCases,
        },
      },
      deletedDocuments: {
        tenantId: user.tenantId,
        deletedAt: {
          not: null,
          lt: cutoffs.deletedDocuments,
        },
      },
      auditEvents: {
        tenantId: user.tenantId,
        createdAt: {
          lt: cutoffs.auditEvents,
        },
      },
      analytics: {
        tenantId: user.tenantId,
        date: {
          lt: cutoffs.analytics,
        },
      },
    };

    const [closedCases, deletedDocuments, auditEvents, analytics] =
      await Promise.all([
        this.prisma.case.count({ where: where.closedCases }),
        this.prisma.caseDocument.count({ where: where.deletedDocuments }),
        this.prisma.auditEvent.count({ where: where.auditEvents }),
        this.prisma.analyticsDailySnapshot.count({ where: where.analytics }),
      ]);

    const deleted = {
      closedCases: 0,
      deletedDocuments: 0,
      auditEvents: 0,
      analyticsSnapshots: 0,
    };
    const documentStorage = {
      filesDeleted: 0,
      filesAlreadyMissing: 0,
      cleanupFailures: 0,
    };

    if (input.confirm) {
      const [
        deletedClosedCases,
        deletedDocumentCleanup,
        deletedAuditEvents,
        deletedAnalytics,
      ] = await Promise.all([
        this.prisma.case.deleteMany({ where: where.closedCases }),
        this.deleteExpiredDocumentFiles(where.deletedDocuments),
        this.prisma.auditEvent.deleteMany({ where: where.auditEvents }),
        this.prisma.analyticsDailySnapshot.deleteMany({
          where: where.analytics,
        }),
      ]);

      deleted.closedCases = deletedClosedCases.count;
      deleted.deletedDocuments = deletedDocumentCleanup.metadataDeleted;
      deleted.auditEvents = deletedAuditEvents.count;
      deleted.analyticsSnapshots = deletedAnalytics.count;
      documentStorage.filesDeleted = deletedDocumentCleanup.filesDeleted;
      documentStorage.filesAlreadyMissing =
        deletedDocumentCleanup.filesAlreadyMissing;
      documentStorage.cleanupFailures = deletedDocumentCleanup.cleanupFailures;
    }

    const result = {
      mode: input.confirm ? 'delete' : 'dry_run',
      evaluatedAt: now.toISOString(),
      cutoffs,
      candidates: {
        closedCases,
        deletedDocuments,
        auditEvents,
        analyticsSnapshots: analytics,
      },
      deleted,
      documentStorage,
    };

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: input.confirm
        ? 'privacy.retention_cleanup_executed'
        : 'privacy.retention_cleanup_dry_run',
      entityType: 'retention_policy',
      entityId: policy.id,
      metadata: {
        candidates: result.candidates,
        deleted: result.deleted,
        documentStorage: result.documentStorage,
      },
    });
    const maintenanceRun = await this.prisma.maintenanceRun.create({
      data: {
        type: 'retention_cleanup',
        status: 'completed',
        completedAt: new Date(),
        safeMessage: input.confirm
          ? 'Retention cleanup executed.'
          : 'Retention cleanup dry run completed.',
        metadataJson: {
          mode: result.mode,
          candidates: result.candidates,
          deleted: result.deleted,
          documentStorage: result.documentStorage,
        },
      },
      select: { id: true },
    });
    await this.operationalEventService.record({
      eventType: 'maintenance.retention_cleanup',
      severity: 'info',
      source: 'privacy',
      tenantId: user.tenantId,
      userId: user.id,
      safeMessage: input.confirm
        ? 'Retention cleanup executed.'
        : 'Retention cleanup dry run completed.',
      metadata: {
        maintenanceRunId: maintenanceRun.id,
        mode: result.mode,
      },
    });

    return result;
  }

  private async deleteExpiredDocumentFiles(where: {
    tenantId: string;
    deletedAt: {
      not: null;
      lt: Date;
    };
  }) {
    const documents = await this.prisma.caseDocument.findMany({
      where,
      select: {
        id: true,
        storageKey: true,
      },
    });
    const result = {
      metadataDeleted: 0,
      filesDeleted: 0,
      filesAlreadyMissing: 0,
      cleanupFailures: 0,
    };

    for (const document of documents) {
      const fileDeleted = await this.deleteDocumentFileIfPresent(
        document.storageKey,
      );

      if (!fileDeleted.ok) {
        result.cleanupFailures += 1;
        continue;
      }

      if (fileDeleted.status === 'deleted') {
        result.filesDeleted += 1;
      } else {
        result.filesAlreadyMissing += 1;
      }

      await this.prisma.caseDocument.delete({
        where: { id: document.id },
      });
      result.metadataDeleted += 1;
    }

    return result;
  }

  private async deleteDocumentFileIfPresent(
    storageKey: string,
  ): Promise<
    | { ok: true; status: 'deleted' | 'already_missing' }
    | { ok: false; status: 'failed' }
  > {
    try {
      await unlink(resolveDocumentStoragePath(storageKey));
      return { ok: true, status: 'deleted' };
    } catch (error) {
      if (isMissingFileError(error) || error instanceof NotFoundException) {
        return { ok: true, status: 'already_missing' };
      }

      return { ok: false, status: 'failed' };
    }
  }

  async exportCitizenData(user: CurrentUser, query: CitizenDataExportQuery) {
    const citizenProfile = await this.prisma.citizenProfile.findFirst({
      where: {
        tenantId: user.tenantId,
        ...(query.citizenProfileId
          ? { id: query.citizenProfileId }
          : { email: query.email?.toLowerCase() }),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!citizenProfile) {
      throw new NotFoundException('Citizen profile not found.');
    }

    const cases = await this.prisma.case.findMany({
      where: {
        tenantId: user.tenantId,
        citizenProfileId: citizenProfile.id,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        urgency: true,
        sourceLanguage: true,
        createdAt: true,
        updatedAt: true,
        closedAt: true,
        assignedDepartment: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            originalFileName: true,
            mimeType: true,
            sizeBytes: true,
            checksumSha256: true,
            isSensitive: true,
            createdAt: true,
            deletedAt: true,
          },
        },
        aiTriageResults: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            model: true,
            promptVersion: true,
            suggestedCategory: true,
            suggestedUrgency: true,
            summary: true,
            missingInformationJson: true,
            confidenceScore: true,
            reasoningSummary: true,
            status: true,
            failureReason: true,
            createdAt: true,
            suggestedDepartment: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        aiReviews: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            approvedCategory: true,
            approvedUrgency: true,
            reviewComment: true,
            wasAiSuggestionAccepted: true,
            createdAt: true,
            approvedDepartment: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });
    const caseIds = cases.map((caseRecord) => caseRecord.id);
    const auditEvents = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { actorCitizenProfileId: citizenProfile.id },
          { entityType: 'citizen_profile', entityId: citizenProfile.id },
          ...(caseIds.length > 0
            ? [{ entityType: 'case', entityId: { in: caseIds } }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorRole: true,
        metadataJson: true,
        createdAt: true,
      },
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'privacy.citizen_data_exported',
      entityType: 'citizen_profile',
      entityId: citizenProfile.id,
      metadata: {
        lookupType: query.citizenProfileId ? 'citizenProfileId' : 'email',
        caseCount: cases.length,
      },
    });

    return {
      exportedAt: new Date().toISOString(),
      citizenProfile,
      cases,
      auditEvents,
    };
  }

  async anonymizeCitizenProfile(user: CurrentUser, citizenProfileId: string) {
    const citizenProfile = await this.prisma.citizenProfile.findFirst({
      where: {
        id: citizenProfileId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!citizenProfile) {
      throw new NotFoundException('Citizen profile not found.');
    }

    const anonymizedProfile = await this.prisma.citizenProfile.update({
      where: {
        id: citizenProfile.id,
      },
      data: {
        name: `Anonymized citizen ${citizenProfile.id.slice(-6)}`,
        email: `anonymized-${citizenProfile.id}@privacy.local`,
        phone: null,
        address: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        updatedAt: true,
      },
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'privacy.citizen_profile_anonymized',
      entityType: 'citizen_profile',
      entityId: citizenProfile.id,
      metadata: {
        anonymizedFields: ['name', 'email', 'phone', 'address'],
      },
    });

    return {
      anonymizedAt: new Date().toISOString(),
      citizenProfile: anonymizedProfile,
    };
  }

  private ensureRetentionPolicy(tenantId: string) {
    return this.prisma.retentionPolicy.upsert({
      where: { tenantId },
      create: { tenantId },
      update: {},
    });
  }
}

function daysBefore(date: Date, days: number) {
  const cutoff = new Date(date);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff;
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}
