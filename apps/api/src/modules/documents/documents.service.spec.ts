import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  let previousStoragePath: string | undefined;
  let storagePath: string;

  beforeEach(async () => {
    previousStoragePath = process.env.UPLOAD_STORAGE_PATH;
    storagePath = await mkdtemp(join(tmpdir(), 'kommuneflow-documents-'));
    process.env.UPLOAD_STORAGE_PATH = storagePath;
  });

  afterEach(async () => {
    if (previousStoragePath === undefined) {
      delete process.env.UPLOAD_STORAGE_PATH;
    } else {
      process.env.UPLOAD_STORAGE_PATH = previousStoragePath;
    }

    await rm(storagePath, { recursive: true, force: true });
  });

  it('uploads a valid document, stores metadata, and records an audit event', async () => {
    const recordMock = jest.fn().mockResolvedValue(undefined);
    let capturedCreateInput: unknown;
    const createMock = jest.fn((input: unknown) => {
      capturedCreateInput = input;
      return Promise.resolve({
        id: 'document_1',
        originalFileName: 'permit.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12,
        checksumSha256: 'checksum',
        isSensitive: false,
        createdAt: new Date('2026-05-09T07:00:00.000Z'),
      });
    });
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'case_1',
            assignedDepartmentId: 'department_1',
          }),
        },
        caseDocument: {
          create: createMock,
        },
      },
      { record: recordMock } as unknown as AuditService,
    );

    await expect(
      service.uploadForCase('case_1', caseWorker(), pdfFile(), {
        isSensitive: false,
      }),
    ).resolves.toMatchObject({
      id: 'document_1',
      originalFileName: 'permit.pdf',
    });
    const createInput = capturedCreateInput as {
      data: {
        tenantId: string;
        caseId: string;
        uploadedByUserId: string;
        mimeType: string;
      };
    };
    expect(createInput.data).toMatchObject({
      tenantId: 'tenant_1',
      caseId: 'case_1',
      uploadedByUserId: 'user_1',
      mimeType: 'application/pdf',
    });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document.uploaded',
        entityType: 'case_document',
      }),
    );
  });

  it('rejects unsupported file types', async () => {
    const service = createService({});

    await expect(
      service.uploadForCase('case_1', caseWorker(), textFile(), {
        isSensitive: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty files', async () => {
    const service = createService({});

    await expect(
      service.uploadForCase(
        'case_1',
        caseWorker(),
        {
          ...pdfFile(),
          size: 0,
          buffer: Buffer.alloc(0),
        },
        {
          isSensitive: false,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects fake extension and MIME combinations using magic bytes', async () => {
    const service = createService({});

    await expect(
      service.uploadForCase(
        'case_1',
        caseWorker(),
        {
          ...pdfFile(),
          originalname: 'malware.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.from('MZ executable content'),
          size: 21,
        },
        {
          isSensitive: false,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects path traversal file names', async () => {
    const service = createService({});

    await expect(
      service.uploadForCase(
        'case_1',
        caseWorker(),
        {
          ...pdfFile(),
          originalname: '../permit.pdf',
        },
        {
          isSensitive: false,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects executable uploads', async () => {
    const service = createService({});

    await expect(
      service.uploadForCase(
        'case_1',
        caseWorker(),
        {
          ...pdfFile(),
          originalname: 'payload.exe',
          mimetype: 'application/x-msdownload',
          buffer: Buffer.from('MZ executable content'),
          size: 21,
        },
        {
          isSensitive: false,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects oversized files', async () => {
    const service = createService({});

    await expect(
      service.uploadForCase(
        'case_1',
        caseWorker(),
        {
          ...pdfFile(),
          size: 10 * 1024 * 1024 + 1,
        },
        {
          isSensitive: false,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks cross-tenant document access by requiring tenant-filtered cases', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.listForCase('case_from_other_tenant', caseWorker()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks department users from accessing another department documents', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          assignedDepartmentId: 'department_2',
        }),
      },
    });

    await expect(
      service.listForCase('case_1', caseWorker()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('filters sensitive documents when the user lacks sensitive permission', async () => {
    let capturedFindManyInput: unknown;
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          assignedDepartmentId: 'department_1',
        }),
      },
      caseDocument: {
        findMany: jest.fn((input: unknown) => {
          capturedFindManyInput = input;
          return Promise.resolve([]);
        }),
      },
    });

    await service.listForCase('case_1', caseWorker());

    const findManyInput = capturedFindManyInput as {
      where: { isSensitive?: boolean; deletedAt?: null };
    };
    expect(findManyInput.where.isSensitive).toBe(false);
    expect(findManyInput.where.deletedAt).toBeNull();
  });

  it('soft-deletes a document and records an audit event', async () => {
    const recordMock = jest.fn().mockResolvedValue(undefined);
    let capturedDocumentFindFirstInput: unknown;
    let capturedDocumentUpdateInput: unknown;
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'case_1',
            assignedDepartmentId: 'department_1',
          }),
        },
        caseDocument: {
          findFirst: jest.fn((input: unknown) => {
            capturedDocumentFindFirstInput = input;
            return Promise.resolve({
              id: 'document_1',
              originalFileName: 'permit.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 12,
              isSensitive: false,
            });
          }),
          update: jest.fn((input: unknown) => {
            capturedDocumentUpdateInput = input;
            return Promise.resolve({
              id: 'document_1',
              originalFileName: 'permit.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 12,
              isSensitive: false,
              deletedAt: new Date('2026-05-09T08:44:00.000Z'),
            });
          }),
        },
      },
      { record: recordMock } as unknown as AuditService,
    );

    await expect(
      service.softDeleteForCase('case_1', 'document_1', caseWorker()),
    ).resolves.toMatchObject({
      id: 'document_1',
      deletedAt: new Date('2026-05-09T08:44:00.000Z'),
    });
    expect(capturedDocumentFindFirstInput).toMatchObject({
      where: {
        id: 'document_1',
        tenantId: 'tenant_1',
        caseId: 'case_1',
        deletedAt: null,
      },
    });
    expect(capturedDocumentUpdateInput).toMatchObject({
      where: {
        id: 'document_1',
      },
    });
    const updateInput = capturedDocumentUpdateInput as {
      data: { deletedAt: Date };
    };
    expect(updateInput.data.deletedAt).toBeInstanceOf(Date);
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        action: 'document.soft_deleted',
        entityType: 'case_document',
        entityId: 'document_1',
      }),
    );
  });

  it('returns a download stream and records a document download audit event', async () => {
    const recordMock = jest.fn().mockResolvedValue(undefined);
    await mkdir(join(storagePath, 'tenant_1', 'case_1'), { recursive: true });
    await writeFile(
      join(storagePath, 'tenant_1', 'case_1', 'document.pdf'),
      Buffer.from('%PDF-1.7\npdf contents'),
    );
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'case_1',
            assignedDepartmentId: 'department_1',
          }),
        },
        caseDocument: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'document_1',
            originalFileName: 'permit.pdf',
            storageKey: 'tenant_1/case_1/document.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 21,
            checksumSha256: 'checksum',
            isSensitive: false,
          }),
        },
      },
      { record: recordMock } as unknown as AuditService,
    );

    await expect(
      service.getDownloadForCase('case_1', 'document_1', caseWorker()),
    ).resolves.toMatchObject({
      fileName: 'permit.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 21,
    });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        action: 'document.downloaded',
        entityType: 'case_document',
        entityId: 'document_1',
      }),
    );
  });

  it('blocks cross-tenant document storage key access by requiring tenant and case filters', async () => {
    let capturedDocumentFindFirstInput: unknown;
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          assignedDepartmentId: 'department_1',
        }),
      },
      caseDocument: {
        findFirst: jest.fn((input: unknown) => {
          capturedDocumentFindFirstInput = input;
          return Promise.resolve(null);
        }),
      },
    });

    await expect(
      service.getDownloadForCase('case_1', 'guessed_document_id', caseWorker()),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(capturedDocumentFindFirstInput).toMatchObject({
      where: {
        id: 'guessed_document_id',
        tenantId: 'tenant_1',
        caseId: 'case_1',
        deletedAt: null,
      },
    });
  });

  it('blocks sensitive document downloads when the user lacks sensitive permission', async () => {
    let capturedDocumentFindFirstInput: unknown;
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          assignedDepartmentId: 'department_1',
        }),
      },
      caseDocument: {
        findFirst: jest.fn((input: unknown) => {
          capturedDocumentFindFirstInput = input;
          return Promise.resolve(null);
        }),
      },
    });

    await expect(
      service.getDownloadForCase('case_1', 'sensitive_document', caseWorker()),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(capturedDocumentFindFirstInput).toMatchObject({
      where: {
        isSensitive: false,
      },
    });
  });

  it('rejects document storage keys that escape the upload root', async () => {
    const recordMock = jest.fn().mockResolvedValue(undefined);
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'case_1',
            assignedDepartmentId: 'department_1',
          }),
        },
        caseDocument: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'document_1',
            originalFileName: 'permit.pdf',
            storageKey: '../outside.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 21,
            checksumSha256: 'checksum',
            isSensitive: false,
          }),
        },
      },
      { record: recordMock } as unknown as AuditService,
    );

    await expect(
      service.getDownloadForCase('case_1', 'document_1', caseWorker()),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it('blocks auditors from soft-deleting documents', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          assignedDepartmentId: 'department_1',
        }),
      },
    });

    await expect(
      service.softDeleteForCase('case_1', 'document_1', auditor()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns not found for missing or already deleted documents', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          assignedDepartmentId: 'department_1',
        }),
      },
      caseDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.softDeleteForCase('case_1', 'document_1', caseWorker()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

function createService(
  prismaShape: Record<string, unknown>,
  auditService?: AuditService,
) {
  return new DocumentsService(
    prismaShape as unknown as PrismaService,
    auditService ??
      ({
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as AuditService),
    {
      record: jest.fn().mockResolvedValue(undefined),
    } as never,
  );
}

function caseWorker(): CurrentUser {
  return {
    id: 'user_1',
    tenantId: 'tenant_1',
    departmentId: 'department_1',
    email: 'case.worker@arendal.local',
    role: UserRole.case_worker,
  };
}

function auditor(): CurrentUser {
  return {
    id: 'user_2',
    tenantId: 'tenant_1',
    departmentId: null,
    email: 'auditor@arendal.local',
    role: UserRole.auditor,
  };
}

function pdfFile(): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'permit.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 21,
    buffer: Buffer.from('%PDF-1.7\npdf contents'),
  } as Express.Multer.File;
}

function textFile(): Express.Multer.File {
  return {
    ...pdfFile(),
    originalname: 'notes.txt',
    mimetype: 'text/plain',
  };
}
