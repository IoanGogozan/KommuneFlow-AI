import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
} from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { AuditService } from '../audit/audit.service';
import { OperationalEventService } from '../operations/operational-event.service';
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
    private readonly operationalEventService: OperationalEventService,
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
        deletedAt: null,
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
        deletedAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        uploadedByCitizenProfile: {
          select: {
            id: true,
            name: true,
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

  async softDeleteForCase(
    caseId: string,
    documentId: string,
    user: CurrentUser,
  ) {
    const caseRecord = await this.findAccessibleCase(caseId, user);
    this.assertCanUploadToCase(user, caseRecord.assignedDepartmentId);

    const document = await this.prisma.caseDocument.findFirst({
      where: {
        id: documentId,
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        deletedAt: null,
      },
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        isSensitive: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    const deletedAt = new Date();
    const updatedDocument = await this.prisma.caseDocument.update({
      where: { id: document.id },
      data: { deletedAt },
      select: {
        id: true,
        originalFileName: true,
        mimeType: true,
        sizeBytes: true,
        isSensitive: true,
        deletedAt: true,
      },
    });

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'document.soft_deleted',
      entityType: 'case_document',
      entityId: document.id,
      metadata: {
        caseId: caseRecord.id,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        isSensitive: document.isSensitive,
      },
    });

    return updatedDocument;
  }

  async getDownloadForCase(
    caseId: string,
    documentId: string,
    user: CurrentUser,
  ) {
    const caseRecord = await this.findAccessibleCase(caseId, user);
    const canReadSensitive = roleHasPermission(
      user.role,
      'document:read:sensitive',
    );

    const document = await this.prisma.caseDocument.findFirst({
      where: {
        id: documentId,
        tenantId: user.tenantId,
        caseId: caseRecord.id,
        deletedAt: null,
        ...(canReadSensitive ? {} : { isSensitive: false }),
      },
      select: {
        id: true,
        originalFileName: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        checksumSha256: true,
        isSensitive: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    const storagePath = resolveDocumentStoragePath(document.storageKey);

    try {
      await access(storagePath);
    } catch {
      throw new NotFoundException('Document file not found.');
    }

    await this.auditService.record({
      tenantId: user.tenantId,
      actor: user,
      action: 'document.downloaded',
      entityType: 'case_document',
      entityId: document.id,
      metadata: {
        caseId: caseRecord.id,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        isSensitive: document.isSensitive,
        checksumSha256: document.checksumSha256,
      },
    });

    return {
      stream: createReadStream(storagePath),
      fileName: document.originalFileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    };
  }

  async uploadForCase(
    caseId: string,
    user: CurrentUser,
    file: Express.Multer.File | undefined,
    input: UploadDocumentBody,
  ) {
    if (!file) {
      await this.recordUploadFailure(caseId, user, 'missing_file');
      throw new BadRequestException('Document file is required.');
    }

    try {
      validateDocumentFile(file);
    } catch (error) {
      await this.recordUploadFailure(caseId, user, error);
      throw error;
    }

    const caseRecord = await this.findAccessibleCase(caseId, user);
    this.assertCanUploadToCase(user, caseRecord.assignedDepartmentId);

    const checksumSha256 = createHash('sha256')
      .update(file.buffer)
      .digest('hex');
    const extension = extname(file.originalname).toLowerCase();
    const storageKey = `${user.tenantId}/${caseRecord.id}/${randomUUID()}${extension}`;
    const storagePath = resolveDocumentStoragePath(storageKey);

    try {
      await mkdir(dirname(storagePath), { recursive: true });
      await writeFile(storagePath, file.buffer, { flag: 'wx' });
    } catch (error) {
      await this.recordUploadFailure(caseId, user, error);
      throw error;
    }

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

  private async recordUploadFailure(
    caseId: string,
    user: CurrentUser,
    error: unknown,
  ) {
    await this.operationalEventService.record({
      eventType: 'document.upload_failed',
      severity: 'warning',
      source: 'documents',
      tenantId: user.tenantId,
      userId: user.id,
      safeMessage: 'Document upload failed.',
      metadata: {
        caseId,
        reason: error instanceof Error ? error.message : 'unknown',
      },
    });
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
      (assignedDepartmentId === user.departmentId ||
        assignedDepartmentId === null)
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

    if (
      user.departmentId &&
      (assignedDepartmentId === user.departmentId ||
        assignedDepartmentId === null)
    ) {
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

export function resolveDocumentStoragePath(storageKey: string) {
  const storageRoot = resolve(getUploadStoragePath());
  const storagePath = resolve(storageRoot, storageKey);
  const relativePath = relative(storageRoot, storagePath);

  if (
    relativePath.startsWith('..') ||
    relativePath === '..' ||
    isAbsolute(relativePath)
  ) {
    throw new NotFoundException('Document not found.');
  }

  return storagePath;
}

export function validateDocumentFile(file: Express.Multer.File) {
  if (file.size === 0 || file.buffer.length === 0) {
    throw new BadRequestException('Document file cannot be empty.');
  }

  if (file.size > maxFileSizeBytes) {
    throw new BadRequestException('Document exceeds the 10 MB limit.');
  }

  if (isUnsafeOriginalFileName(file.originalname)) {
    throw new BadRequestException('Unsafe document file name.');
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw new BadRequestException('Unsupported document MIME type.');
  }

  const extension = extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    throw new BadRequestException('Unsupported document file extension.');
  }

  if (!fileMagicBytesMatch(file.buffer, file.mimetype)) {
    throw new BadRequestException('Document content does not match file type.');
  }
}

function isUnsafeOriginalFileName(originalFileName: string) {
  return (
    originalFileName !== basename(originalFileName) ||
    originalFileName.includes('..') ||
    originalFileName.includes('/') ||
    originalFileName.includes('\\')
  );
}

function fileMagicBytesMatch(buffer: Buffer, mimeType: string) {
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 4).equals(Buffer.from('%PDF'));
  }

  if (mimeType === 'image/png') {
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  return false;
}
