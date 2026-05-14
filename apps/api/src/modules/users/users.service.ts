import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CurrentUser } from '../auth/current-user';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAdminUsers(user: CurrentUser) {
    return this.prisma.user.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }
}
