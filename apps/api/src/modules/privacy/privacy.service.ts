import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { CitizenDataExportQuery } from './privacy.schemas';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  getStatus() {
    return {
      status: 'ok',
      capabilities: {
        citizenDataExport: true,
        citizenAnonymization: true,
        documentSoftDelete: false,
        retentionConfiguration: false,
      },
    };
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
}
