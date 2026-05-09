import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CaseStatus, UserRole } from '@prisma/client';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { AuditService } from '../audit/audit.service';
import { KartverketAddressService } from '../integrations/kartverket-address/kartverket-address.service';
import { CasesService } from './cases.service';

describe('CasesService', () => {
  let previousStoragePath: string | undefined;
  let storagePath: string;

  beforeEach(async () => {
    previousStoragePath = process.env.UPLOAD_STORAGE_PATH;
    storagePath = await mkdtemp(join(tmpdir(), 'kommuneflow-cases-'));
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

  it('creates a public case with tenant association and audit event', async () => {
    const auditRecordMock = jest.fn().mockResolvedValue(undefined);
    const service = createService(
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant_1',
            slug: 'arendal',
          }),
        },
        citizenProfile: {
          create: jest.fn().mockResolvedValue({
            id: 'citizen_1',
          }),
        },
        case: {
          create: jest.fn().mockResolvedValue({
            id: 'case_1',
            title: 'Road damage report',
            status: CaseStatus.new,
            createdAt: new Date('2026-05-09T07:00:00.000Z'),
          }),
        },
      },
      {
        record: auditRecordMock,
      } as unknown as AuditService,
    );

    await expect(
      service.createPublicCase('arendal', {
        citizen: {
          name: 'Demo Citizen',
          email: 'Citizen@Example.Local',
          phone: '',
          address: '',
        },
        case: {
          title: 'Road damage report',
          description:
            'There is a damaged road surface near the school entrance.',
          sourceLanguage: 'en',
        },
        privacyAccepted: true,
      }),
    ).resolves.toMatchObject({
      caseId: 'case_1',
      status: CaseStatus.new,
    });
    expect(auditRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        action: 'case.created_by_citizen',
        entityType: 'case',
        entityId: 'case_1',
      }),
    );
  });

  it('creates public case documents uploaded by citizens', async () => {
    const auditRecordMock = jest.fn().mockResolvedValue(undefined);
    let capturedDocumentCreateInput: unknown;
    const service = createService(
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant_1',
            slug: 'arendal',
          }),
        },
        citizenProfile: {
          create: jest.fn().mockResolvedValue({
            id: 'citizen_1',
          }),
        },
        case: {
          create: jest.fn().mockResolvedValue({
            id: 'case_1',
            title: 'Road damage report',
            status: CaseStatus.new,
            createdAt: new Date('2026-05-09T07:00:00.000Z'),
          }),
        },
        caseDocument: {
          create: jest.fn((input: unknown) => {
            capturedDocumentCreateInput = input;
            return Promise.resolve({
              id: 'document_1',
              mimeType: 'application/pdf',
              sizeBytes: 21,
              checksumSha256: 'checksum',
            });
          }),
        },
      },
      {
        record: auditRecordMock,
      } as unknown as AuditService,
    );

    await expect(
      service.createPublicCase(
        'arendal',
        {
          citizen: {
            name: 'Demo Citizen',
            email: 'citizen@example.local',
            phone: '',
            address: '',
          },
          case: {
            title: 'Road damage report',
            description:
              'There is a damaged road surface near the school entrance.',
            sourceLanguage: 'en',
          },
          privacyAccepted: true,
        },
        [pdfFile()],
      ),
    ).resolves.toMatchObject({
      caseId: 'case_1',
      documentCount: 1,
    });

    expect(capturedDocumentCreateInput).toMatchObject({
      data: {
        tenantId: 'tenant_1',
        caseId: 'case_1',
        uploadedByCitizenProfileId: 'citizen_1',
        originalFileName: 'citizen-document.pdf',
        mimeType: 'application/pdf',
        isSensitive: false,
      },
    });
    expect(auditRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document.uploaded_by_citizen',
        actorCitizenProfileId: 'citizen_1',
      }),
    );
  });

  it('stores a validated address for citizen intake when Kartverket matches', async () => {
    const recordMock = jest.fn().mockResolvedValue(undefined);
    const validateAddressMock = jest.fn().mockResolvedValue({
      status: 'validated',
      address: {
        sourceReferenceId: '4203-1001-12',
        normalizedAddress: 'Storgata 12, 4836 Arendal',
        municipalityCode: '4203',
        municipalityName: 'Arendal',
        postalCode: '4836',
        latitude: 58.461,
        longitude: 8.772,
      },
    });
    let capturedAddressCreateInput: unknown;
    const service = createService(
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant_1',
            slug: 'arendal',
          }),
        },
        citizenProfile: {
          create: jest.fn().mockResolvedValue({
            id: 'citizen_1',
          }),
        },
        case: {
          create: jest.fn().mockResolvedValue({
            id: 'case_1',
            title: 'Road damage report',
            status: CaseStatus.new,
            createdAt: new Date('2026-05-09T07:00:00.000Z'),
          }),
        },
        caseAddress: {
          create: jest.fn((input: unknown) => {
            capturedAddressCreateInput = input;
            return Promise.resolve({
              id: 'address_1',
              validationStatus: 'validated',
              municipalityCode: '4203',
            });
          }),
        },
      },
      {
        record: recordMock,
      } as unknown as AuditService,
      {
        validateAddress: validateAddressMock,
      } as unknown as KartverketAddressService,
    );

    await service.createPublicCase('arendal', {
      citizen: {
        name: 'Demo Citizen',
        email: 'citizen@example.local',
        phone: '',
        address: 'Storgata 12',
      },
      case: {
        title: 'Road damage report',
        description:
          'There is a damaged road surface near the school entrance.',
        sourceLanguage: 'en',
      },
      privacyAccepted: true,
    });

    expect(validateAddressMock).toHaveBeenCalledWith('Storgata 12');
    expect(capturedAddressCreateInput).toMatchObject({
      data: {
        tenantId: 'tenant_1',
        caseId: 'case_1',
        originalInput: 'Storgata 12',
        normalizedAddress: 'Storgata 12, 4836 Arendal',
        municipalityCode: '4203',
        validationStatus: 'validated',
        source: 'kartverket',
      },
    });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'integration.kartverket.address_validated',
        entityType: 'case_address',
      }),
    );
  });

  it('stores failed address validation and continues public intake', async () => {
    const validateAddressMock = jest.fn().mockResolvedValue({
      status: 'failed',
      address: null,
    });
    let capturedAddressCreateInput: unknown;
    const service = createService(
      {
        tenant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'tenant_1',
            slug: 'arendal',
          }),
        },
        citizenProfile: {
          create: jest.fn().mockResolvedValue({
            id: 'citizen_1',
          }),
        },
        case: {
          create: jest.fn().mockResolvedValue({
            id: 'case_1',
            title: 'Road damage report',
            status: CaseStatus.new,
            createdAt: new Date('2026-05-09T07:00:00.000Z'),
          }),
        },
        caseAddress: {
          create: jest.fn((input: unknown) => {
            capturedAddressCreateInput = input;
            return Promise.resolve({
              id: 'address_1',
              validationStatus: 'failed',
              municipalityCode: null,
            });
          }),
        },
      },
      undefined,
      {
        validateAddress: validateAddressMock,
      } as unknown as KartverketAddressService,
    );

    await expect(
      service.createPublicCase('arendal', {
        citizen: {
          name: 'Demo Citizen',
          email: 'citizen@example.local',
          phone: '',
          address: 'Unknown road 1',
        },
        case: {
          title: 'Road damage report',
          description:
            'There is a damaged road surface near the school entrance.',
          sourceLanguage: 'en',
        },
        privacyAccepted: true,
      }),
    ).resolves.toMatchObject({ caseId: 'case_1' });

    expect(capturedAddressCreateInput).toMatchObject({
      data: {
        validationStatus: 'failed',
        normalizedAddress: undefined,
      },
    });
  });

  it('returns not found when creating a public case for an unknown tenant', async () => {
    const service = createService({
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.createPublicCase('unknown', {
        citizen: {
          name: 'Demo Citizen',
          email: 'citizen@example.local',
        },
        case: {
          title: 'Road damage report',
          description:
            'There is a damaged road surface near the school entrance.',
          sourceLanguage: 'en',
        },
        privacyAccepted: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks cross-tenant case reads by requiring tenant filtering', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.findById('case_from_other_tenant', caseWorker()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks case workers from reading another department case', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          tenantId: 'tenant_1',
          assignedDepartmentId: 'department_2',
        }),
      },
    });

    await expect(
      service.findById('case_1', caseWorker()),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists only department cases for case workers', async () => {
    let capturedFindManyInput: unknown;
    const findManyMock = jest.fn((input: unknown) => {
      capturedFindManyInput = input;
      return Promise.resolve([]);
    });
    const service = createService({
      case: {
        findMany: findManyMock,
      },
    });

    await service.list(caseWorker(), {});

    const findManyInput = capturedFindManyInput as {
      where: { tenantId: string; assignedDepartmentId?: string };
    };
    expect(findManyInput.where).toMatchObject({
      tenantId: 'tenant_1',
      assignedDepartmentId: 'department_1',
    });
  });

  it('lets auditors list all tenant cases without department filtering', async () => {
    let capturedFindManyInput: unknown;
    const findManyMock = jest.fn((input: unknown) => {
      capturedFindManyInput = input;
      return Promise.resolve([]);
    });
    const service = createService({
      case: {
        findMany: findManyMock,
      },
    });

    await service.list(auditor(), {});

    const findManyInput = capturedFindManyInput as {
      where: { assignedDepartmentId?: string };
    };
    expect(findManyInput.where.assignedDepartmentId).toBeUndefined();
  });

  it('blocks auditor mutation attempts', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          tenantId: 'tenant_1',
          status: CaseStatus.new,
          assignedDepartmentId: 'department_1',
        }),
      },
    });

    await expect(
      service.updateStatus('case_1', auditor(), {
        status: CaseStatus.in_progress,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks auditor internal note mutation attempts', async () => {
    const service = createService({
      case: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case_1',
          tenantId: 'tenant_1',
          assignedDepartmentId: 'department_1',
        }),
      },
    });

    await expect(
      service.addInternalNote('case_1', auditor(), {
        body: 'Auditor should not be able to mutate cases.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks cross-tenant status updates by requiring tenant-filtered lookup', async () => {
    let capturedFindFirstInput: unknown;
    const service = createService({
      case: {
        findFirst: jest.fn((input: unknown) => {
          capturedFindFirstInput = input;
          return Promise.resolve(null);
        }),
      },
    });

    await expect(
      service.updateStatus('guessed_case_id', caseWorker(), {
        status: CaseStatus.in_progress,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(capturedFindFirstInput).toMatchObject({
      where: {
        id: 'guessed_case_id',
        tenantId: 'tenant_1',
      },
    });
  });

  it('blocks cross-tenant internal notes by requiring tenant-filtered lookup', async () => {
    let capturedFindFirstInput: unknown;
    const service = createService({
      case: {
        findFirst: jest.fn((input: unknown) => {
          capturedFindFirstInput = input;
          return Promise.resolve(null);
        }),
      },
    });

    await expect(
      service.addInternalNote('guessed_case_id', caseWorker(), {
        body: 'Attempted cross-tenant note.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(capturedFindFirstInput).toMatchObject({
      where: {
        id: 'guessed_case_id',
        tenantId: 'tenant_1',
      },
    });
  });

  it('updates a department case and records an audit event', async () => {
    const recordMock = jest.fn().mockResolvedValue(undefined);
    const auditService = {
      record: recordMock,
    } as unknown as AuditService;
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'case_1',
            tenantId: 'tenant_1',
            status: CaseStatus.new,
            assignedDepartmentId: 'department_1',
          }),
          update: jest.fn().mockResolvedValue({
            id: 'case_1',
            status: CaseStatus.in_progress,
          }),
        },
      },
      auditService,
    );

    await expect(
      service.updateStatus('case_1', caseWorker(), {
        status: CaseStatus.in_progress,
      }),
    ).resolves.toMatchObject({
      id: 'case_1',
      status: CaseStatus.in_progress,
    });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'case.status_updated',
        tenantId: 'tenant_1',
      }),
    );
  });

  it('adds an internal note and records an audit event', async () => {
    const recordMock = jest.fn().mockResolvedValue(undefined);
    const service = createService(
      {
        case: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'case_1',
            assignedDepartmentId: 'department_1',
          }),
        },
        internalNote: {
          create: jest.fn().mockResolvedValue({
            id: 'note_1',
            body: 'Reviewed by department.',
            createdAt: new Date('2026-05-09T07:00:00.000Z'),
            author: {
              id: 'user_1',
              name: 'Arendal Case Worker',
              role: UserRole.case_worker,
            },
          }),
        },
      },
      {
        record: recordMock,
      } as unknown as AuditService,
    );

    await expect(
      service.addInternalNote('case_1', caseWorker(), {
        body: 'Reviewed by department.',
      }),
    ).resolves.toMatchObject({
      id: 'note_1',
      body: 'Reviewed by department.',
    });
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'case.internal_note_created',
        entityId: 'case_1',
      }),
    );
  });
});

function createService(
  prismaShape: Record<string, unknown>,
  auditService?: AuditService,
  kartverketAddressService?: KartverketAddressService,
) {
  return new CasesService(
    prismaShape as unknown as PrismaService,
    auditService ??
      ({
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as AuditService),
    kartverketAddressService ??
      ({
        validateAddress: jest.fn().mockResolvedValue({
          status: 'skipped',
          address: null,
        }),
      } as unknown as KartverketAddressService),
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
    fieldname: 'documents',
    originalname: 'citizen-document.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 21,
    buffer: Buffer.from('%PDF-1.7\npdf contents'),
  } as Express.Multer.File;
}
