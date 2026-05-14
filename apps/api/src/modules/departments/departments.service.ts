import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CurrentUser } from '../auth/current-user';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForCurrentTenant(user: CurrentUser) {
    return this.prisma.department.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
  }

  async listAdminDepartments(user: CurrentUser) {
    const departments = await this.prisma.department.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            cases: true,
          },
        },
      },
    });

    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      slug: department.slug,
      tenant: department.tenant,
      caseCount: department._count.cases,
    }));
  }
}
