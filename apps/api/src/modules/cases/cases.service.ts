import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CaseStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { roleHasPermission } from '../auth/permissions';
import { AuditService } from '../audit/audit.service';
import { UpdateCaseStatusInput } from './cases.schemas';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
          },
        },
        assignedDepartment: {
          select: {
            id: true,
            name: true,
            slug: true,
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
