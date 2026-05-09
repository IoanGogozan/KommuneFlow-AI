import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CaseStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { AuditService } from '../audit/audit.service';
import { CasesService } from './cases.service';

describe('CasesService', () => {
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
});

function createService(
  prismaShape: Record<string, unknown>,
  auditService?: AuditService,
) {
  return new CasesService(
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

function auditor(): CurrentUser {
  return {
    id: 'user_2',
    tenantId: 'tenant_1',
    departmentId: null,
    email: 'auditor@arendal.local',
    role: UserRole.auditor,
  };
}
