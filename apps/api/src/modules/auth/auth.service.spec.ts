import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
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

  it('rejects wrong passwords with a generic credentials error', async () => {
    const passwordHash = await hash('DemoPassword123!', 4);
    const service = createService({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@arendal.local',
      passwordHash,
      name: 'Arendal Case Worker',
      role: UserRole.case_worker,
      status: UserStatus.active,
    });

    await expect(
      service.login({
        email: 'case.worker@arendal.local',
        password: 'WrongPassword123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));
  });

  it('rejects unknown emails with the same generic credentials error', async () => {
    const service = createService(null);

    await expect(
      service.login({
        email: 'unknown@example.test',
        password: 'WrongPassword123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));
  });

  it('rejects disabled users with the same generic credentials error', async () => {
    const passwordHash = await hash('DemoPassword123!', 4);
    const service = createService({
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: 'department_1',
      email: 'case.worker@arendal.local',
      passwordHash,
      name: 'Arendal Case Worker',
      role: UserRole.case_worker,
      status: UserStatus.disabled,
    });

    await expect(
      service.login({
        email: 'case.worker@arendal.local',
        password: 'DemoPassword123!',
      }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));
  });
});

function createService(user: unknown) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(user),
    },
  } as unknown as PrismaService;
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
  } as unknown as JwtService;

  return new AuthService(prisma, jwtService);
}
