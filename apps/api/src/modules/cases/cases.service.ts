import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, Prisma, UserRole } from '@prisma/client';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { AIService } from '../ai/ai.service';
import { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { AuditService } from '../audit/audit.service';
import {
  resolveDocumentStoragePath,
  validateDocumentFile,
} from '../documents/documents.service';
import { KartverketAddressService } from '../integrations/kartverket-address/kartverket-address.service';
import { OperationalEventService } from '../operations/operational-event.service';
import { NotificationService } from '../notifications/notification.service';
import {
  CreateInternalNoteInput,
  CreatePublicCaseInput,
  ListCasesQuery,
  PublicCaseStatusQuery,
  UpdateCaseStatusInput,
} from './cases.schemas';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly kartverketAddressService: KartverketAddressService,
    private readonly operationalEventService: OperationalEventService,
    private readonly notificationService: NotificationService,
    private readonly aiService: AIService,
  ) {}

  async createPublicCase(
    tenantSlug: string,
    input: CreatePublicCaseInput,
    files: Express.Multer.File[] = [],
  ) {
    files.forEach(validateDocumentFile);

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const citizenProfile = await this.prisma.citizenProfile.create({
      data: {
        tenantId: tenant.id,
        name: input.citizen.name,
        email: input.citizen.email.toLowerCase(),
        phone: emptyToNull(input.citizen.phone),
        address: emptyToNull(input.citizen.address),
      },
    });

    const caseReference = generateCaseReference();
    const statusAccessCode = generateStatusAccessCode();
    const caseRecord = await this.prisma.case.create({
      data: {
        tenantId: tenant.id,
        citizenProfileId: citizenProfile.id,
        caseReference,
        statusAccessCodeHash: hashStatusAccessCode(statusAccessCode),
        title: input.case.title,
        description: input.case.description,
        sourceLanguage: input.case.sourceLanguage,
        status: 'new',
        category: 'unknown',
        urgency: 'normal',
      },
      select: {
        id: true,
        caseReference: true,
        title: true,
        status: true,
        createdAt: true,
      },
    });

    await this.auditService.record({
      tenantId: tenant.id,
      actorCitizenProfileId: citizenProfile.id,
      action: 'case.created_by_citizen',
      entityType: 'case',
      entityId: caseRecord.id,
      metadata: {
        tenantSlug: tenant.slug,
        citizenProfileId: citizenProfile.id,
        sourceLanguage: input.case.sourceLanguage,
      },
    });

    await this.storeValidatedAddress({
      tenantId: tenant.id,
      caseId: caseRecord.id,
      citizenProfileId: citizenProfile.id,
      originalInput: input.citizen.address,
    });

    for (const file of files) {
      await this.storeCitizenUploadedDocument({
        tenantId: tenant.id,
        caseId: caseRecord.id,
        citizenProfileId: citizenProfile.id,
        file,
      });
    }

    await this.logCaseConfirmationSafely({
      tenantId: tenant.id,
      caseId: caseRecord.id,
      recipientEmail: citizenProfile.email,
      caseReference: caseRecord.caseReference,
      statusAccessCode,
      title: caseRecord.title,
    });

    this.startAutomaticAITriage({
      tenantId: tenant.id,
      caseId: caseRecord.id,
    });

    return {
      caseId: caseRecord.id,
      caseReference: caseRecord.caseReference,
      statusAccessCode,
      status: caseRecord.status,
      createdAt: caseRecord.createdAt,
      documentCount: files.length,
    };
  }

  async findPublicStatus(tenantSlug: string, query: PublicCaseStatusQuery) {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        tenant: { slug: tenantSlug },
        caseReference: query.caseReference.trim().toUpperCase(),
        statusAccessCodeHash: hashStatusAccessCode(query.statusAccessCode),
      },
      select: {
        caseReference: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        assignedDepartment: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case status not found.');
    }

    return {
      caseReference: caseRecord.caseReference,
      title: caseRecord.title,
      status: caseRecord.status,
      createdAt: caseRecord.createdAt,
      updatedAt: caseRecord.updatedAt,
      assignedDepartmentName: caseRecord.assignedDepartment?.name ?? null,
    };
  }

  async findById(caseId: string, user: CurrentUser) {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        tenantId: user.tenantId,
      },
      include: {
        citizenProfile: {
          select: {
            id: true,
            name: true,
            email: true,
            address: true,
          },
        },
        addresses: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            originalInput: true,
            normalizedAddress: true,
            municipalityCode: true,
            municipalityName: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            source: true,
            sourceReferenceId: true,
            validationStatus: true,
            validatedAt: true,
            createdAt: true,
          },
        },
        assignedDepartment: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        internalNotes: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!caseRecord) {
      await this.recordCrossTenantCaseAccessIfNeeded(caseId, user);
      throw new NotFoundException('Case not found.');
    }

    this.assertCanReadCase(user, caseRecord.assignedDepartmentId);

    return caseRecord;
  }

  async listActivity(caseId: string, user: CurrentUser) {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        assignedDepartmentId: true,
      },
    });

    if (!caseRecord) {
      await this.recordCrossTenantCaseAccessIfNeeded(caseId, user);
      throw new NotFoundException('Case not found.');
    }

    this.assertCanReadCase(user, caseRecord.assignedDepartmentId);

    const events = await this.prisma.auditEvent.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          {
            entityType: 'case',
            entityId: caseRecord.id,
          },
          {
            metadataJson: {
              path: ['caseId'],
              equals: caseRecord.id,
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 25,
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

  async list(user: CurrentUser, query: ListCasesQuery) {
    const where: Prisma.CaseWhereInput = {
      tenantId: user.tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
    };

    if (!roleHasPermission(user.role, 'case:read:all_tenant')) {
      if (
        !user.departmentId ||
        !roleHasPermission(user.role, 'case:read:department')
      ) {
        throw new ForbiddenException('You do not have access to cases.');
      }

      where.OR = [
        { assignedDepartmentId: user.departmentId },
        { assignedDepartmentId: null },
      ];
    }

    return this.prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        urgency: true,
        sourceLanguage: true,
        createdAt: true,
        assignedDepartment: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        citizenProfile: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async updateStatus(
    caseId: string,
    user: CurrentUser,
    input: UpdateCaseStatusInput,
  ) {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        status: true,
        caseReference: true,
        assignedDepartmentId: true,
        citizenProfile: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!caseRecord) {
      await this.recordCrossTenantCaseAccessIfNeeded(caseId, user);
      throw new NotFoundException('Case not found.');
    }

    this.assertCanUpdateCase(user, caseRecord.assignedDepartmentId);
    assertAllowedStatusTransition(caseRecord.status, input.status);

    const updatedCase = await this.prisma.case.update({
      where: { id: caseRecord.id },
      data: {
        status: input.status,
        closedAt: input.status === CaseStatus.closed ? new Date() : null,
      },
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'case.status_updated',
      entityType: 'case',
      entityId: caseRecord.id,
      metadata: {
        previousStatus: caseRecord.status,
        nextStatus: input.status,
      },
    });

    await this.logStatusChangedSafely({
      tenantId: user.tenantId,
      caseId: caseRecord.id,
      userId: user.id,
      recipientEmail: caseRecord.citizenProfile.email,
      caseReference: caseRecord.caseReference,
      previousStatus: caseRecord.status,
      nextStatus: input.status,
    });

    return updatedCase;
  }

  async addInternalNote(
    caseId: string,
    user: CurrentUser,
    input: CreateInternalNoteInput,
  ) {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        assignedDepartmentId: true,
      },
    });

    if (!caseRecord) {
      await this.recordCrossTenantCaseAccessIfNeeded(caseId, user);
      throw new NotFoundException('Case not found.');
    }

    this.assertCanUpdateCase(user, caseRecord.assignedDepartmentId);

    const note = await this.prisma.internalNote.create({
      data: {
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        authorId: user.id,
        body: input.body,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'case.internal_note_created',
      entityType: 'case',
      entityId: caseRecord.id,
      metadata: {
        noteId: note.id,
      },
    });

    return note;
  }

  private assertCanReadCase(
    user: CurrentUser,
    assignedDepartmentId: string | null,
  ) {
    if (roleHasPermission(user.role, 'case:read:all_tenant')) {
      return;
    }

    if (
      roleHasPermission(user.role, 'case:read:department') &&
      user.departmentId &&
      (assignedDepartmentId === user.departmentId ||
        assignedDepartmentId === null)
    ) {
      return;
    }

    throw new ForbiddenException('You do not have access to this case.');
  }

  private async storeCitizenUploadedDocument(input: {
    tenantId: string;
    caseId: string;
    citizenProfileId: string;
    file: Express.Multer.File;
  }) {
    const checksumSha256 = createHash('sha256')
      .update(input.file.buffer)
      .digest('hex');
    const extension = extname(input.file.originalname).toLowerCase();
    const storageKey = `${input.tenantId}/${input.caseId}/${randomUUID()}${extension}`;
    const storagePath = resolveDocumentStoragePath(storageKey);

    await mkdir(dirname(storagePath), { recursive: true });
    await writeFile(storagePath, input.file.buffer, { flag: 'wx' });

    const document = await this.prisma.caseDocument.create({
      data: {
        tenantId: input.tenantId,
        caseId: input.caseId,
        uploadedByCitizenProfileId: input.citizenProfileId,
        originalFileName: input.file.originalname,
        storageKey,
        mimeType: input.file.mimetype,
        sizeBytes: input.file.size,
        checksumSha256,
        isSensitive: false,
      },
      select: {
        id: true,
        mimeType: true,
        sizeBytes: true,
        checksumSha256: true,
      },
    });

    await this.auditService.record({
      tenantId: input.tenantId,
      actorCitizenProfileId: input.citizenProfileId,
      action: 'document.uploaded_by_citizen',
      entityType: 'case_document',
      entityId: document.id,
      metadata: {
        caseId: input.caseId,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        checksumSha256: document.checksumSha256,
      },
    });
  }

  private async storeValidatedAddress(input: {
    tenantId: string;
    caseId: string;
    citizenProfileId: string;
    originalInput?: string;
  }) {
    const originalInput = input.originalInput?.trim();

    if (!originalInput) {
      return;
    }

    const validation =
      await this.kartverketAddressService.validateAddress(originalInput);
    const address = validation.address;
    const createdAddress = await this.prisma.caseAddress.create({
      data: {
        tenantId: input.tenantId,
        caseId: input.caseId,
        originalInput,
        normalizedAddress: address?.normalizedAddress,
        municipalityCode: address?.municipalityCode,
        municipalityName: address?.municipalityName,
        postalCode: address?.postalCode,
        latitude: address?.latitude,
        longitude: address?.longitude,
        source: 'kartverket',
        sourceReferenceId: address?.sourceReferenceId,
        validationStatus: validation.status,
        validatedAt: validation.status === 'validated' ? new Date() : undefined,
      },
      select: {
        id: true,
        validationStatus: true,
        municipalityCode: true,
      },
    });

    await this.auditService.record({
      tenantId: input.tenantId,
      actorCitizenProfileId: input.citizenProfileId,
      action:
        validation.status === 'validated'
          ? 'integration.kartverket.address_validated'
          : 'integration.kartverket.address_validation_failed',
      entityType: 'case_address',
      entityId: createdAddress.id,
      metadata: {
        caseId: input.caseId,
        validationStatus: createdAddress.validationStatus,
        hasMunicipalityCode: Boolean(createdAddress.municipalityCode),
      },
    });
  }

  private assertCanUpdateCase(
    user: CurrentUser,
    assignedDepartmentId: string | null,
  ) {
    if (user.role === UserRole.auditor) {
      throw new ForbiddenException('Auditors cannot modify cases.');
    }

    if (
      roleHasPermission(user.role, 'case:read:all_tenant') &&
      user.role === UserRole.super_admin
    ) {
      return;
    }

    if (
      roleHasPermission(user.role, 'case:update:department') &&
      user.departmentId &&
      (assignedDepartmentId === user.departmentId ||
        assignedDepartmentId === null)
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to update this case.',
    );
  }

  private async recordCrossTenantCaseAccessIfNeeded(
    caseId: string,
    user: CurrentUser,
  ) {
    const existingCase = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { tenantId: true },
    });

    if (!existingCase || existingCase.tenantId === user.tenantId) {
      return;
    }

    await this.operationalEventService.record({
      eventType: 'security.cross_tenant_access_attempt',
      severity: 'critical',
      source: 'cases',
      tenantId: user.tenantId,
      userId: user.id,
      safeMessage: 'Cross-tenant case access attempt blocked.',
      metadata: {
        caseId,
        targetTenantId: existingCase.tenantId,
      },
    });
  }

  private async logCaseConfirmationSafely(input: {
    tenantId: string;
    caseId: string;
    recipientEmail: string;
    caseReference: string;
    statusAccessCode: string;
    title: string;
  }) {
    try {
      await this.notificationService.logCaseConfirmation(input);
    } catch {
      await this.operationalEventService.record({
        eventType: 'notification.email_log_failed',
        severity: 'warning',
        source: 'notifications',
        tenantId: input.tenantId,
        safeMessage: 'Confirmation email log failed.',
        metadata: {
          caseId: input.caseId,
          template: 'case_confirmation',
        },
      });
    }
  }

  private startAutomaticAITriage(input: { tenantId: string; caseId: string }) {
    void this.aiService
      .runSystemCaseTriage(input.caseId, input.tenantId)
      .catch(async () => {
        await this.operationalEventService.record({
          eventType: 'ai.automatic_triage_failed',
          severity: 'warning',
          source: 'ai',
          tenantId: input.tenantId,
          safeMessage:
            'Automatic AI triage failed after citizen case creation.',
          metadata: {
            caseId: input.caseId,
          },
        });
      });
  }

  private async logStatusChangedSafely(input: {
    tenantId: string;
    caseId: string;
    userId: string;
    recipientEmail: string;
    caseReference: string;
    previousStatus: CaseStatus;
    nextStatus: CaseStatus;
  }) {
    try {
      await this.notificationService.logStatusChanged(input);
    } catch {
      await this.operationalEventService.record({
        eventType: 'notification.email_log_failed',
        severity: 'warning',
        source: 'notifications',
        tenantId: input.tenantId,
        userId: input.userId,
        safeMessage: 'Status-change email log failed.',
        metadata: {
          caseId: input.caseId,
          template: 'case_status_changed',
        },
      });
    }
  }
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function generateCaseReference() {
  return `KF-${new Date().getUTCFullYear()}-${randomBytes(6)
    .toString('hex')
    .toUpperCase()}`;
}

function generateStatusAccessCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function hashStatusAccessCode(statusAccessCode: string) {
  return createHmac('sha256', getStatusCodePepper())
    .update(statusAccessCode.trim().toUpperCase())
    .digest('hex');
}

const allowedStatusTransitions: Record<CaseStatus, readonly CaseStatus[]> = {
  [CaseStatus.new]: [CaseStatus.triage_pending, CaseStatus.rejected],
  [CaseStatus.triage_pending]: [CaseStatus.triaged, CaseStatus.rejected],
  [CaseStatus.triaged]: [
    CaseStatus.in_progress,
    CaseStatus.waiting_for_citizen,
    CaseStatus.rejected,
  ],
  [CaseStatus.in_progress]: [
    CaseStatus.waiting_for_citizen,
    CaseStatus.closed,
    CaseStatus.rejected,
  ],
  [CaseStatus.waiting_for_citizen]: [
    CaseStatus.in_progress,
    CaseStatus.closed,
    CaseStatus.rejected,
  ],
  [CaseStatus.closed]: [],
  [CaseStatus.rejected]: [],
};

function assertAllowedStatusTransition(
  currentStatus: CaseStatus,
  nextStatus: CaseStatus,
) {
  if (currentStatus === nextStatus) {
    return;
  }

  if (allowedStatusTransitions[currentStatus].includes(nextStatus)) {
    return;
  }

  throw new BadRequestException(
    `Invalid status transition from ${currentStatus} to ${nextStatus}.`,
  );
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
        'mimeType',
        'sizeBytes',
        'isSensitive',
      ]);
    case 'ai.triage_result_created':
      return pickSafeMetadata(metadata, ['model', 'promptVersion']);
    case 'ai.triage_result_failed':
      return pickSafeMetadata(metadata, ['classification']);
    case 'ai.triage_review_created':
      return pickSafeMetadata(metadata, [
        'aiTriageResultId',
        'wasAiSuggestionAccepted',
        'approvedCategory',
        'approvedDepartmentSlug',
        'approvedUrgency',
      ]);
    default:
      return {};
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

function getStatusCodePepper() {
  const pepper =
    process.env.STATUS_CODE_PEPPER ??
    process.env.SESSION_SECRET ??
    process.env.JWT_SECRET;

  if (pepper && pepper.trim().length > 0) {
    return pepper;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('STATUS_CODE_PEPPER must be configured in production.');
  }

  return 'kommuneflow-local-development-status-code-pepper';
}
