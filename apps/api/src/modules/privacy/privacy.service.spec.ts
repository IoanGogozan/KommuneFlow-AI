import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
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
