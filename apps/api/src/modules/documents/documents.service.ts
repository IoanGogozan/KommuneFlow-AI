import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { AuditService } from '../audit/audit.service';
import { UploadDocumentBody } from './documents.schemas';

const maxFileSizeBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const allowedExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async listForCase(caseId: string, user: CurrentUser) {
    const caseRecord = await this.findAccessibleCase(caseId, user);
    const canReadSensitive = roleHasPermission(
      user.role,
      'document:read:sensitive',
    );

    const documents = await this.prisma.caseDocument.findMany({
      where: {
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        ...(canReadSensitive ? {} : { isSensitive: false }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        checksumSha256: true,
        isSensitive: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (
      canReadSensitive &&
      documents.some((document) => document.isSensitive)
    ) {
      await this.auditService.record({
        tenantId: user.tenantId,
        actor: user,
        action: 'document.sensitive_accessed',
        entityType: 'case',
        entityId: caseRecord.id,
        metadata: {
          documentIds: documents
            .filter((document) => document.isSensitive)
            .map((document) => document.id),
        },
      });
    }

    return documents;
  }

  async uploadForCase(
    caseId: string,
    user: CurrentUser,
    file: Express.Multer.File | undefined,
    input: UploadDocumentBody,
  ) {
    if (!file) {
      throw new BadRequestException('Document file is required.');
    }

    this.validateFile(file);
    const caseRecord = await this.findAccessibleCase(caseId, user);
    this.assertCanUploadToCase(user, caseRecord.assignedDepartmentId);

    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const extension = extname(file.originalname).toLowerCase();
    const storageKey = `${user.tenantId}/${caseRecord.id}/${randomUUID()}${extension}`;
    const storagePath = resolve(getUploadStoragePath(), storageKey);

    await mkdir(dirname(storagePath), { recursive: true });
    await writeFile(storagePath, file.buffer, { flag: 'wx' });

    const document = await this.prisma.caseDocument.create({
      data: {
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        uploadedByUserId: user.id,
        originalFileName: file.originalname,
        storageKey,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        checksumSha256,
        isSensitive: input.isSensitive,
      },
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        checksumSha256: true,
        isSensitive: true,
        createdAt: true,
      },
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'document.uploaded',
      entityType: 'case_document',
      entityId: document.id,
      metadata: {
        caseId: caseRecord.id,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        isSensitive: document.isSensitive,
      },
    });

    return document;
  }

  private async findAccessibleCase(caseId: string, user: CurrentUser) {
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

    this.assertCanReadCase(user, caseRecord.assignedDepartmentId);
    return caseRecord;
  }

  private validateFile(file: Express.Multer.File) {
    if (file.size > maxFileSizeBytes) {
      throw new BadRequestException('Document exceeds the 10 MB limit.');
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Unsupported document MIME type.');
    }

    const extension = extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      throw new BadRequestException('Unsupported document file extension.');
    }
  }

  private assertCanReadCase(
    user: CurrentUser,
    assignedDepartmentId: string | null,
  ) {
    if (roleHasPermission(user.role, 'case:read:all_tenant')) {
      return;
    }

    if (
      roleHasPermission(user.role, 'document:read:department') &&
      user.departmentId &&
      assignedDepartmentId === user.departmentId
    ) {
      return;
    }

    throw new ForbiddenException('You do not have access to this case.');
  }

  private assertCanUploadToCase(
    user: CurrentUser,
    assignedDepartmentId: string | null,
  ) {
    if (user.role === UserRole.auditor) {
      throw new ForbiddenException('Auditors cannot upload documents.');
    }

    if (
      roleHasPermission(user.role, 'case:read:all_tenant') &&
      user.role === UserRole.super_admin
    ) {
      return;
    }

    if (user.departmentId && assignedDepartmentId === user.departmentId) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to upload documents to this case.',
    );
  }
}

function getUploadStoragePath() {
  return process.env.UPLOAD_STORAGE_PATH ?? './storage/uploads';
}
