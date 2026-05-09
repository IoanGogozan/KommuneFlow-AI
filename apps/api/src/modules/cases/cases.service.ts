import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, Prisma, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { AuditService } from '../audit/audit.service';
import {
  resolveDocumentStoragePath,
  validateDocumentFile,
} from '../documents/documents.service';
import { KartverketAddressService } from '../integrations/kartverket-address/kartverket-address.service';
import {
  CreateInternalNoteInput,
  CreatePublicCaseInput,
  ListCasesQuery,
  UpdateCaseStatusInput,
} from './cases.schemas';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly kartverketAddressService: KartverketAddressService,
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

    const caseRecord = await this.prisma.case.create({
      data: {
        tenantId: tenant.id,
        citizenProfileId: citizenProfile.id,
        title: input.case.title,
        description: input.case.description,
        sourceLanguage: input.case.sourceLanguage,
        status: 'new',
        category: 'unknown',
        urgency: 'normal',
      },
      select: {
        id: true,
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

    return {
      caseId: caseRecord.id,
      status: caseRecord.status,
      createdAt: caseRecord.createdAt,
      documentCount: files.length,
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
      throw new NotFoundException('Case not found.');
    }

    this.assertCanReadCase(user, caseRecord.assignedDepartmentId);

    return caseRecord;
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

      where.assignedDepartmentId = user.departmentId;
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
        assignedDepartmentId: true,
      },
    });

    if (!caseRecord) {
      throw new NotFoundException('Case not found.');
    }

    this.assertCanUpdateCase(user, caseRecord.assignedDepartmentId);

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
      assignedDepartmentId === user.departmentId
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
      assignedDepartmentId === user.departmentId
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to update this case.',
    );
  }
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}
