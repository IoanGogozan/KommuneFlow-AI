import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('aggregates daily tenant analytics without personal identifiers', async () => {
    let capturedUpsertInput: unknown;
    const service = createService({
      case: {
        findMany: jest.fn().mockResolvedValue([
          {
            status: 'new',
            category: 'building_case',
            assignedDepartment: { name: 'Technical Department' },
          },
          {
            status: 'closed',
            category: 'road_transport',
            assignedDepartment: null,
          },
        ]),
      },
      aIReview: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { wasAiSuggestionAccepted: true },
            { wasAiSuggestionAccepted: false },
          ]),
      },
      analyticsDailySnapshot: {
        upsert: jest.fn((input: unknown) => {
          capturedUpsertInput = input;
          return Promise.resolve({});
        }),
      },
    });

    await expect(
      service.aggregateTenantRange(analyticsUser(), {
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-01T00:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      tenantId: 'tenant_1',
      daysAggregated: 1,
    });

    expect(capturedUpsertInput).toMatchObject({
      where: {
        tenantId_date: {
          tenantId: 'tenant_1',
          date: new Date('2026-05-01T00:00:00.000Z'),
        },
      },
      create: {
        tenantId: 'tenant_1',
        totalCases: 2,
        casesByStatusJson: {
          new: 1,
          closed: 1,
        },
        casesByCategoryJson: {
          building_case: 1,
          road_transport: 1,
        },
        casesByDepartmentJson: {
          'Technical Department': 1,
          Unassigned: 1,
        },
        aiReviewsTotal: 2,
        aiCorrectionsTotal: 1,
        aiCorrectionRate: 0.5,
      },
    });

    expect(JSON.stringify(capturedUpsertInput)).not.toContain(
      'citizen@example.local',
    );
    expect(JSON.stringify(capturedUpsertInput)).not.toContain('Demo Citizen');
  });

  it('uses upsert so aggregation can be rerun safely', async () => {
    const upsertMock = jest.fn().mockResolvedValue({});
    const service = createService({
      case: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      aIReview: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      analyticsDailySnapshot: {
        upsert: upsertMock,
      },
    });

    await service.aggregateTenantRange(analyticsUser(), {
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-02T00:00:00.000Z'),
    });
    await service.aggregateTenantRange(analyticsUser(), {
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-02T00:00:00.000Z'),
    });

    expect(upsertMock).toHaveBeenCalledTimes(4);
  });

  it('returns summary totals from aggregated snapshots', async () => {
    const service = createService({
      analyticsDailySnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            date: new Date('2026-05-01T00:00:00.000Z'),
            totalCases: 2,
            casesByStatusJson: { new: 2 },
            casesByCategoryJson: { building_case: 2 },
            casesByDepartmentJson: { 'Technical Department': 2 },
            aiReviewsTotal: 2,
            aiCorrectionsTotal: 1,
            aiCorrectionRate: 0.5,
          },
          {
            date: new Date('2026-05-02T00:00:00.000Z'),
            totalCases: 1,
            casesByStatusJson: { closed: 1 },
            casesByCategoryJson: { road_transport: 1 },
            casesByDepartmentJson: { Unassigned: 1 },
            aiReviewsTotal: 1,
            aiCorrectionsTotal: 1,
            aiCorrectionRate: 1,
          },
        ]),
      },
    });

    await expect(
      service.getSummary(analyticsUser(), {
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-02T00:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      totals: {
        totalCases: 3,
        casesByStatus: {
          new: 2,
          closed: 1,
        },
        casesByCategory: {
          building_case: 2,
          road_transport: 1,
        },
        casesByDepartment: {
          'Technical Department': 2,
          Unassigned: 1,
        },
        aiReviewsTotal: 3,
        aiCorrectionsTotal: 2,
        aiCorrectionRate: 2 / 3,
      },
    });
  });

  it('rejects invalid ranges', async () => {
    const service = createService({});

    await expect(
      service.getSummary(analyticsUser(), {
        from: new Date('2026-05-02T00:00:00.000Z'),
        to: new Date('2026-05-01T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function createService(prismaShape: Record<string, unknown>) {
  return new AnalyticsService(prismaShape as unknown as PrismaService);
}

function analyticsUser(): CurrentUser {
  return {
    id: 'user_1',
    tenantId: 'tenant_1',
    departmentId: null,
    email: 'department.admin@arendal.local',
    role: UserRole.department_admin,
  };
}
