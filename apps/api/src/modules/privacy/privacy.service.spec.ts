import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../auth/current-user';
import { PrivacyService } from './privacy.service';

describe('PrivacyService', () => {
  it('exports tenant-scoped citizen data and records an audit event', async () => {
    const auditRecordMock = jest.fn().mockResolvedValue(undefined);
    let capturedCitizenProfileFindFirstInput: unknown;
    let capturedCaseFindManyInput: unknown;
    let capturedAuditFindManyInput: unknown;
    const service = createService(
      {
        citizenProfile: {
          findFirst: jest.fn((input: unknown) => {
            capturedCitizenProfileFindFirstInput = input;
            return Promise.resolve(citizenProfile());
          }),
        },
        case: {
          findMany: jest.fn((input: unknown) => {
            capturedCaseFindManyInput = input;
            return Promise.resolve([caseExportRecord()]);
          }),
        },
        auditEvent: {
          findMany: jest.fn((input: unknown) => {
            capturedAuditFindManyInput = input;
            return Promise.resolve([auditEvent()]);
          }),
        },
      },
      { record: auditRecordMock } as unknown as AuditService,
    );

    const result = await service.exportCitizenData(superAdmin(), {
      citizenProfileId: 'citizen_1',
    });

    expect(result.citizenProfile.id).toBe('citizen_1');
    expect(result.cases).toHaveLength(1);
    expect(result.auditEvents).toHaveLength(1);
    expect(capturedCitizenProfileFindFirstInput).toMatchObject({
      where: {
        tenantId: 'tenant_1',
        id: 'citizen_1',
      },
    });
    expect(capturedCaseFindManyInput).toMatchObject({
      where: {
        tenantId: 'tenant_1',
        citizenProfileId: 'citizen_1',
      },
    });
    expect(capturedAuditFindManyInput).toMatchObject({
      where: {
        tenantId: 'tenant_1',
      },
    });
    expect(auditRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        actor: superAdmin(),
        action: 'privacy.citizen_data_exported',
        entityType: 'citizen_profile',
        entityId: 'citizen_1',
      }),
    );
  });

  it('normalizes email lookup and requires tenant filtering', async () => {
    let capturedCitizenProfileFindFirstInput: unknown;
    const service = createService({
      citizenProfile: {
        findFirst: jest.fn((input: unknown) => {
          capturedCitizenProfileFindFirstInput = input;
          return Promise.resolve(citizenProfile());
        }),
      },
      case: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    await service.exportCitizenData(superAdmin(), {
      email: 'Citizen@Example.Local',
    });

    expect(capturedCitizenProfileFindFirstInput).toMatchObject({
      where: {
        tenantId: 'tenant_1',
        email: 'citizen@example.local',
      },
    });
  });

  it('returns not found instead of exporting cross-tenant citizen data', async () => {
    const service = createService({
      citizenProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.exportCitizenData(superAdmin(), {
        citizenProfileId: 'citizen_from_other_tenant',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('anonymizes citizen profile identifiers and records an audit event', async () => {
    const auditRecordMock = jest.fn().mockResolvedValue(undefined);
    let capturedFindFirstInput: unknown;
    let capturedUpdateInput: unknown;
    const service = createService(
      {
        citizenProfile: {
          findFirst: jest.fn((input: unknown) => {
            capturedFindFirstInput = input;
            return Promise.resolve({
              id: 'citizen_1',
            });
          }),
          update: jest.fn((input: unknown) => {
            capturedUpdateInput = input;
            return Promise.resolve({
              id: 'citizen_1',
              name: 'Anonymized citizen zen_1',
              email: 'anonymized-citizen_1@privacy.local',
              phone: null,
              address: null,
              updatedAt: new Date('2026-05-09T07:00:00.000Z'),
            });
          }),
        },
      },
      { record: auditRecordMock } as unknown as AuditService,
    );

    const result = await service.anonymizeCitizenProfile(
      superAdmin(),
      'citizen_1',
    );

    expect(result.citizenProfile).toMatchObject({
      id: 'citizen_1',
      phone: null,
      address: null,
    });
    expect(result.citizenProfile.name).not.toBe('Demo Citizen');
    expect(result.citizenProfile.email).not.toBe('citizen@example.local');
    expect(capturedFindFirstInput).toMatchObject({
      where: {
        id: 'citizen_1',
        tenantId: 'tenant_1',
      },
    });
    expect(capturedUpdateInput).toMatchObject({
      where: {
        id: 'citizen_1',
      },
      data: {
        phone: null,
        address: null,
      },
    });
    expect(auditRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_1',
        actor: superAdmin(),
        action: 'privacy.citizen_profile_anonymized',
        entityType: 'citizen_profile',
        entityId: 'citizen_1',
      }),
    );
  });

  it('returns not found instead of anonymizing cross-tenant citizen data', async () => {
    const service = createService({
      citizenProfile: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.anonymizeCitizenProfile(
        superAdmin(),
        'citizen_from_other_tenant',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates default retention policy when missing', async () => {
    const service = createService({
      retentionPolicy: {
        upsert: jest.fn().mockResolvedValue({
          id: 'retention_1',
          tenantId: 'tenant_1',
          closedCaseRetentionDays: 2555,
          deletedDocumentRetentionDays: 90,
          auditEventRetentionDays: 2555,
          analyticsRetentionDays: 1095,
        }),
      },
    });

    await expect(
      service.getRetentionPolicy(superAdmin()),
    ).resolves.toMatchObject({
      tenantId: 'tenant_1',
      deletedDocumentRetentionDays: 90,
    });
  });

  it('updates retention policy and records an audit event', async () => {
    const auditRecordMock = jest.fn().mockResolvedValue(undefined);
    let capturedUpsertInput: unknown;
    const service = createService(
      {
        retentionPolicy: {
          upsert: jest.fn((input: unknown) => {
            capturedUpsertInput = input;
            return Promise.resolve({
              id: 'retention_1',
              tenantId: 'tenant_1',
              closedCaseRetentionDays: 3650,
              deletedDocumentRetentionDays: 120,
              auditEventRetentionDays: 3650,
              analyticsRetentionDays: 1095,
            });
          }),
        },
      },
      { record: auditRecordMock } as unknown as AuditService,
    );

    await service.updateRetentionPolicy(superAdmin(), {
      deletedDocumentRetentionDays: 120,
    });

    expect(capturedUpsertInput).toMatchObject({
      where: { tenantId: 'tenant_1' },
      create: {
        tenantId: 'tenant_1',
        deletedDocumentRetentionDays: 120,
      },
      update: {
        deletedDocumentRetentionDays: 120,
      },
    });
    expect(auditRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.retention_policy_updated',
        entityType: 'retention_policy',
        entityId: 'retention_1',
      }),
    );
  });

  it('dry-runs retention cleanup without deleting records', async () => {
    let capturedAudit: unknown;
    const auditRecordMock = jest.fn((input: unknown) => {
      capturedAudit = input;
      return Promise.resolve();
    });
    const deleteManyMock = jest.fn();
    const service = createService(
      retentionPrismaShape({
        deleteManyMock,
        counts: {
          closedCases: 2,
          deletedDocuments: 3,
          auditEvents: 4,
          analyticsSnapshots: 5,
        },
      }),
      { record: auditRecordMock } as unknown as AuditService,
    );

    await expect(
      service.runRetentionCleanup(superAdmin(), { confirm: false }),
    ).resolves.toMatchObject({
      mode: 'dry_run',
      candidates: {
        closedCases: 2,
        deletedDocuments: 3,
        auditEvents: 4,
        analyticsSnapshots: 5,
      },
      deleted: {
        closedCases: 0,
        deletedDocuments: 0,
        auditEvents: 0,
        analyticsSnapshots: 0,
      },
    });
    expect(deleteManyMock).not.toHaveBeenCalled();
    const dryRunAudit = capturedAudit as {
      action: string;
      metadata: Record<string, unknown>;
    };
    expect(dryRunAudit.action).toBe('privacy.retention_cleanup_dry_run');
    expect(dryRunAudit.metadata).toMatchObject({
      candidates: {
        closedCases: 2,
        deletedDocuments: 3,
        auditEvents: 4,
        analyticsSnapshots: 5,
      },
      deleted: {
        closedCases: 0,
        deletedDocuments: 0,
        auditEvents: 0,
        analyticsSnapshots: 0,
      },
      skipped: { closedCases: 0, documents: 0 },
    });
  });

  it('deletes expired records when retention cleanup is confirmed', async () => {
    const auditRecordMock = jest.fn().mockResolvedValue(undefined);
    const deleteManyMock = jest.fn().mockResolvedValue({ count: 7 });
    const service = createService(
      retentionPrismaShape({
        deleteManyMock,
        counts: {
          closedCases: 2,
          deletedDocuments: 3,
          auditEvents: 4,
          analyticsSnapshots: 5,
        },
      }),
      { record: auditRecordMock } as unknown as AuditService,
    );

    await expect(
      service.runRetentionCleanup(superAdmin(), { confirm: true }),
    ).resolves.toMatchObject({
      mode: 'delete',
      deleted: {
        closedCases: 0,
        deletedDocuments: 0,
        auditEvents: 7,
        analyticsSnapshots: 7,
      },
    });
    expect(deleteManyMock).toHaveBeenCalledTimes(2);
    expect(auditRecordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'privacy.retention_cleanup_executed',
      }),
    );
  });

  it('deletes expired document files before deleting document metadata', async () => {
    const previousStoragePath = process.env.UPLOAD_STORAGE_PATH;
    const storagePath = await mkdtemp(join(tmpdir(), 'kommuneflow-privacy-'));
    process.env.UPLOAD_STORAGE_PATH = storagePath;
    const storageKey = 'tenant_1/case_1/document.pdf';
    const filePath = join(storagePath, storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, Buffer.from('%PDF demo'));
    const caseDocumentDeleteMock = jest.fn().mockResolvedValue({
      id: 'document_1',
    });

    try {
      const service = createService({
        ...retentionPrismaShape({
          deleteManyMock: jest.fn().mockResolvedValue({ count: 0 }),
          counts: {
            closedCases: 0,
            deletedDocuments: 1,
            auditEvents: 0,
            analyticsSnapshots: 0,
          },
        }),
        caseDocument: {
          count: jest.fn().mockResolvedValue(1),
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'document_1',
              storageKey,
            },
          ]),
          delete: caseDocumentDeleteMock,
        },
      });

      await expect(
        service.runRetentionCleanup(superAdmin(), { confirm: true }),
      ).resolves.toMatchObject({
        deleted: {
          deletedDocuments: 1,
        },
        documentStorage: {
          filesDeleted: 1,
          filesAlreadyMissing: 0,
          cleanupFailures: 0,
        },
      });
      await expect(access(filePath)).rejects.toThrow();
      expect(caseDocumentDeleteMock).toHaveBeenCalledWith({
        where: { id: 'document_1' },
      });
    } finally {
      if (previousStoragePath === undefined) {
        delete process.env.UPLOAD_STORAGE_PATH;
      } else {
        process.env.UPLOAD_STORAGE_PATH = previousStoragePath;
      }

      await rm(storagePath, { recursive: true, force: true });
    }
  });

  it('skips a closed case on storage failure and completes it on retry', async () => {
    const previousStoragePath = process.env.UPLOAD_STORAGE_PATH;
    const storagePath = await mkdtemp(join(tmpdir(), 'kommuneflow-retention-'));
    process.env.UPLOAD_STORAGE_PATH = storagePath;
    const storageKey = 'tenant_1/case_closed/document.pdf';
    const filePath = join(storagePath, storageKey);
    await mkdir(filePath, { recursive: true });
    const caseDeleteMock = jest.fn().mockResolvedValue({ count: 1 });
    const prismaShape = retentionPrismaShape({
      deleteManyMock: jest.fn().mockResolvedValue({ count: 0 }),
      counts: {
        closedCases: 1,
        deletedDocuments: 0,
        auditEvents: 0,
        analyticsSnapshots: 0,
      },
    });
    prismaShape.case.findMany.mockResolvedValue([
      {
        id: 'case_closed',
        documents: [{ id: 'document_1', storageKey }],
      },
    ]);
    prismaShape.case.deleteMany = caseDeleteMock;
    let capturedAudit: unknown;
    const auditRecordMock = jest.fn((input: unknown) => {
      capturedAudit = input;
      return Promise.resolve();
    });
    const service = createService(prismaShape, {
      record: auditRecordMock,
    } as unknown as AuditService);

    try {
      await expect(
        service.runRetentionCleanup(superAdmin(), { confirm: true }),
      ).resolves.toMatchObject({
        deleted: { closedCases: 0 },
        skipped: { closedCases: 1, documents: 1 },
        documentStorage: { cleanupFailures: 1 },
      });
      expect(caseDeleteMock).not.toHaveBeenCalled();
      const partialAudit = capturedAudit as {
        metadata: Record<string, unknown>;
      };
      expect(partialAudit.metadata).toMatchObject({
        skipped: { closedCases: 1, documents: 1 },
        documentStorage: { cleanupFailures: 1 },
      });

      await rm(filePath, { recursive: true, force: true });
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, Buffer.from('%PDF retry'));

      await expect(
        service.runRetentionCleanup(superAdmin(), { confirm: true }),
      ).resolves.toMatchObject({
        deleted: { closedCases: 1 },
        skipped: { closedCases: 0, documents: 0 },
        documentStorage: { filesDeleted: 1, cleanupFailures: 0 },
      });
      expect(caseDeleteMock).toHaveBeenCalledWith({
        where: { id: 'case_closed', tenantId: 'tenant_1' },
      });
      await expect(access(filePath)).rejects.toThrow();
    } finally {
      if (previousStoragePath === undefined) {
        delete process.env.UPLOAD_STORAGE_PATH;
      } else {
        process.env.UPLOAD_STORAGE_PATH = previousStoragePath;
      }
      await rm(storagePath, { recursive: true, force: true });
    }
  });

  it('treats an already missing closed-case file as successful cleanup', async () => {
    const caseDeleteMock = jest.fn().mockResolvedValue({ count: 1 });
    const prismaShape = retentionPrismaShape({
      deleteManyMock: jest.fn().mockResolvedValue({ count: 0 }),
      counts: {
        closedCases: 1,
        deletedDocuments: 0,
        auditEvents: 0,
        analyticsSnapshots: 0,
      },
    });
    prismaShape.case.findMany.mockResolvedValue([
      {
        id: 'case_missing_file',
        documents: [
          { id: 'document_missing', storageKey: 'tenant_1/missing.pdf' },
        ],
      },
    ]);
    prismaShape.case.deleteMany = caseDeleteMock;

    await expect(
      createService(prismaShape).runRetentionCleanup(superAdmin(), {
        confirm: true,
      }),
    ).resolves.toMatchObject({
      deleted: { closedCases: 1 },
      skipped: { closedCases: 0, documents: 0 },
      documentStorage: {
        filesAlreadyMissing: 1,
        cleanupFailures: 0,
      },
    });
  });

  it('rejects concurrent confirmed cleanup for the same tenant', async () => {
    let releaseCandidates!: () => void;
    const candidatesBlocked = new Promise<void>((resolve) => {
      releaseCandidates = resolve;
    });
    const prismaShape = retentionPrismaShape({
      deleteManyMock: jest.fn().mockResolvedValue({ count: 0 }),
      counts: {
        closedCases: 0,
        deletedDocuments: 0,
        auditEvents: 0,
        analyticsSnapshots: 0,
      },
    });
    prismaShape.case.findMany.mockImplementation(async () => {
      await candidatesBlocked;
      return [];
    });
    const service = createService(prismaShape);
    const firstCleanup = service.runRetentionCleanup(superAdmin(), {
      confirm: true,
    });
    await Promise.resolve();

    await expect(
      service.runRetentionCleanup(superAdmin(), { confirm: true }),
    ).rejects.toThrow('already running for this tenant');
    releaseCandidates();
    await expect(firstCleanup).resolves.toMatchObject({ mode: 'delete' });
  });
});

function createService(
  prismaShape: Record<string, unknown>,
  auditService?: AuditService,
) {
  return new PrivacyService(
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

function superAdmin(): CurrentUser {
  return {
    id: 'user_1',
    tenantId: 'tenant_1',
    departmentId: null,
    email: 'admin@example.local',
    role: UserRole.super_admin,
  };
}

function citizenProfile() {
  return {
    id: 'citizen_1',
    tenantId: 'tenant_1',
    name: 'Demo Citizen',
    email: 'citizen@example.local',
    phone: null,
    address: null,
    createdAt: new Date('2026-05-09T07:00:00.000Z'),
    updatedAt: new Date('2026-05-09T07:00:00.000Z'),
  };
}

function caseExportRecord() {
  return {
    id: 'case_1',
    title: 'Road damage report',
    description: 'Road surface is damaged near the school.',
    category: 'road_transport',
    status: 'new',
    urgency: 'normal',
    sourceLanguage: 'en',
    createdAt: new Date('2026-05-09T07:00:00.000Z'),
    updatedAt: new Date('2026-05-09T07:00:00.000Z'),
    closedAt: null,
    assignedDepartment: null,
    documents: [],
    aiTriageResults: [],
    aiReviews: [],
  };
}

function auditEvent() {
  return {
    id: 'audit_1',
    action: 'case.created_by_citizen',
    entityType: 'case',
    entityId: 'case_1',
    actorRole: null,
    metadataJson: {},
    createdAt: new Date('2026-05-09T07:00:00.000Z'),
  };
}

function retentionPrismaShape(input: {
  deleteManyMock: jest.Mock;
  counts: {
    closedCases: number;
    deletedDocuments: number;
    auditEvents: number;
    analyticsSnapshots: number;
  };
}) {
  return {
    retentionPolicy: {
      upsert: jest.fn().mockResolvedValue({
        id: 'retention_1',
        tenantId: 'tenant_1',
        closedCaseRetentionDays: 2555,
        deletedDocumentRetentionDays: 90,
        auditEventRetentionDays: 2555,
        analyticsRetentionDays: 1095,
      }),
    },
    case: {
      count: jest.fn().mockResolvedValue(input.counts.closedCases),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: input.deleteManyMock,
    },
    caseDocument: {
      count: jest.fn().mockResolvedValue(input.counts.deletedDocuments),
      findMany: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
    },
    auditEvent: {
      count: jest.fn().mockResolvedValue(input.counts.auditEvents),
      deleteMany: input.deleteManyMock,
    },
    analyticsDailySnapshot: {
      count: jest.fn().mockResolvedValue(input.counts.analyticsSnapshots),
      deleteMany: input.deleteManyMock,
    },
    maintenanceRun: {
      create: jest.fn().mockResolvedValue({ id: 'maintenance_1' }),
    },
  };
}
