import { UserRole } from '@prisma/client';
import { seedTenantsDepartmentsAndUsers } from '../../../prisma/seed/seed-users';
import { SeedContext } from '../../../prisma/seed/types';

describe('portfolio guest seed', () => {
  it('upserts one tenant-scoped guest per supported demo tenant', async () => {
    const userUpsert = jest
      .fn()
      .mockImplementation(({ create }: UserUpsertInput) => ({
        id: `user_${create.email}`,
        email: create.email,
      }));
    const prisma = {
      tenant: {
        upsert: jest
          .fn()
          .mockImplementation(({ create }: { create: { slug: string } }) => ({
            id: `tenant_${create.slug}`,
          })),
      },
      retentionPolicy: { upsert: jest.fn() },
      department: {
        upsert: jest
          .fn()
          .mockImplementation(({ create }: { create: { slug: string } }) => ({
            id: `department_${create.slug}`,
          })),
      },
      user: { upsert: userUpsert },
    };

    await seedTenantsDepartmentsAndUsers(prisma as never, seedContext(), {
      demoPasswordHash: 'valid-demo-hash',
      recruiterPasswordHash: 'valid-recruiter-hash',
      portfolioGuestPasswordHash: 'valid-random-guest-hash',
    });

    const guestUpserts = (userUpsert.mock.calls as Array<[UserUpsertInput]>)
      .map(([input]) => input)
      .filter((input) => input.create.role === UserRole.portfolio_guest);
    expect(guestUpserts).toHaveLength(3);
    expect(guestUpserts.map((input) => input.where.email).sort()).toEqual([
      'portfolio.guest@arendal.local',
      'portfolio.guest@grimstad.local',
      'portfolio.guest@kristiansand.local',
    ]);
    expect(
      guestUpserts.every(
        (input) =>
          input.create.tenantId === input.update.tenantId &&
          input.create.departmentId === null &&
          input.create.passwordHash === 'valid-random-guest-hash' &&
          !('passwordHash' in input.update),
      ),
    ).toBe(true);
  });
});

type UserUpsertInput = {
  where: { email: string };
  update: { tenantId: string; passwordHash?: string };
  create: {
    email: string;
    role: UserRole;
    tenantId: string;
    departmentId: string | null;
    passwordHash: string;
  };
};

function seedContext(): SeedContext {
  return {
    snapshotDate: new Date('2026-07-24T00:00:00.000Z'),
    importedAt: new Date('2026-07-24T00:00:00.000Z'),
    analyticsRebuiltAt: new Date('2026-07-24T00:00:00.000Z'),
    tenantMap: new Map(),
    departmentMap: new Map(),
    adminByTenant: new Map(),
  };
}
