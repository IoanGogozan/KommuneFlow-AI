import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { mkdtemp, rm } from 'node:fs/promises';
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
      where: { isSensitive?: boolean };
    };
    expect(findManyInput.where.isSensitive).toBe(false);
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

function pdfFile(): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'permit.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 12,
    buffer: Buffer.from('pdf contents'),
  } as Express.Multer.File;
}

function textFile(): Express.Multer.File {
  return {
    ...pdfFile(),
    originalname: 'notes.txt',
    mimetype: 'text/plain',
  };
}
