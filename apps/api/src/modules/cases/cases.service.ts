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
import { CreatePublicCaseInput, UpdateCaseStatusInput } from './cases.schemas';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createPublicCase(tenantSlug: string, input: CreatePublicCaseInput) {
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
      action: 'case.created_by_citizen',
      entityType: 'case',
      entityId: caseRecord.id,
      metadata: {
        tenantSlug: tenant.slug,
        citizenProfileId: citizenProfile.id,
        sourceLanguage: input.case.sourceLanguage,
      },
    });

    return {
      caseId: caseRecord.id,
      status: caseRecord.status,
      createdAt: caseRecord.createdAt,
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

function emptyToNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}
