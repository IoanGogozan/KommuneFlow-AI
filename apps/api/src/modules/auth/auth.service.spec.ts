import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('logs in an active seeded-style user with valid credentials', async () => {
    const passwordHash = await hash('DemoPassword123!', 4);
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          tenantId: 'tenant_1',
          departmentId: 'department_1',
          email: 'case.worker@arendal.local',
          passwordHash,
          name: 'Arendal Case Worker',
          role: UserRole.case_worker,
          status: UserStatus.active,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    } as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    await expect(
      service.login({
        email: 'case.worker@arendal.local',
        password: 'DemoPassword123!',
      }),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      user: {
        email: 'case.worker@arendal.local',
        role: UserRole.case_worker,
      },
    });
  });
});
