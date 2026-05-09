import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { SsbService } from '../integrations/ssb/ssb.service';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  it('aggregates daily tenant analytics without personal identifiers', async () => {
    let capturedUpsertInput: unknown;
    const service = createService(
      {
        case: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'case_1',
              createdAt: new Date('2026-05-01T08:00:00.000Z'),
              closedAt: new Date('2026-05-01T12:00:00.000Z'),
              status: 'new',
              category: 'building_case',
              assignedDepartment: { name: 'Technical Department' },
              addresses: [{ municipalityCode: '4203' }],
              aiTriageResults: [
                {
                  createdAt: new Date('2026-05-01T08:10:00.000Z'),
                  status: 'completed',
                },
              ],
            },
            {
              id: 'case_2',
              createdAt: new Date('2026-05-01T09:00:00.000Z'),
              closedAt: new Date('2026-05-01T15:00:00.000Z'),
              status: 'closed',
              category: 'road_transport',
              assignedDepartment: null,
              addresses: [{ municipalityCode: '4203' }],
              aiTriageResults: [
                {
                  createdAt: new Date('2026-05-01T09:20:00.000Z'),
                  status: 'completed',
                },
              ],
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
      },
      ssbServiceWithPopulation(),
    );

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
        averageTimeToTriageMinutes: 15,
        medianTimeToTriageMinutes: 15,
        averageTimeToCloseHours: 5,
        medianTimeToCloseHours: 5,
        casesWaitingForCitizen: 0,
        aiTriageSuccessCount: 0,
        aiTriageFailureCount: 0,
        aiTriageFailureRate: 0,
        aiSuggestionsAccepted: 1,
        aiSuggestionAcceptanceRate: 0.5,
        estimatedManualMinutesSaved: 7,
        municipalityPopulation: 46568,
        municipalityPopulationYear: 2026,
        casesPer1000Inhabitants: (2 / 46568) * 1000,
        ssbDataStatus: 'available',
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
            averageTimeToTriageMinutes: 10,
            medianTimeToTriageMinutes: 10,
            averageTimeToCloseHours: 4,
            medianTimeToCloseHours: 4,
            casesWaitingForCitizen: 1,
            aiTriageSuccessCount: 2,
            aiTriageFailureCount: 1,
            aiTriageFailureRate: 1 / 3,
            aiSuggestionsAccepted: 1,
            aiSuggestionAcceptanceRate: 0.5,
            estimatedManualMinutesSaved: 7,
            municipalityPopulation: 46568,
            municipalityPopulationYear: 2025,
            casesPer1000Inhabitants: (2 / 46568) * 1000,
            ssbDataStatus: 'available',
            ssbImportedAt: new Date('2026-05-09T10:00:00.000Z'),
            analyticsRebuiltAt: new Date('2026-05-09T11:00:00.000Z'),
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
            averageTimeToTriageMinutes: 20,
            medianTimeToTriageMinutes: 20,
            averageTimeToCloseHours: 6,
            medianTimeToCloseHours: 6,
            casesWaitingForCitizen: 0,
            aiTriageSuccessCount: 1,
            aiTriageFailureCount: 0,
            aiTriageFailureRate: 0,
            aiSuggestionsAccepted: 0,
            aiSuggestionAcceptanceRate: 0,
            estimatedManualMinutesSaved: 2,
            municipalityPopulation: null,
            municipalityPopulationYear: null,
            casesPer1000Inhabitants: null,
            ssbDataStatus: 'missing',
            ssbImportedAt: null,
            analyticsRebuiltAt: new Date('2026-05-09T12:00:00.000Z'),
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
        averageTimeToTriageMinutes: 40 / 3,
        medianTimeToTriageMinutes: 15,
        averageTimeToCloseHours: 14 / 3,
        medianTimeToCloseHours: 5,
        casesWaitingForCitizen: 1,
        aiTriageSuccessCount: 3,
        aiTriageFailureCount: 1,
        aiTriageFailureRate: 0.25,
        aiSuggestionsAccepted: 1,
        aiSuggestionAcceptanceRate: 1 / 3,
        estimatedManualMinutesSaved: 9,
        casesPer1000Inhabitants: (3 / 46568) * 1000,
      },
      analyticsLastRebuiltAt: '2026-05-09T12:00:00.000Z',
      ssbEnrichment: {
        status: 'available',
        populationUsed: 46568,
        populationYear: 2025,
        casesPer1000Inhabitants: (3 / 46568) * 1000,
        lastImportedAt: '2026-05-09T10:00:00.000Z',
      },
    });
  });

  it('returns missing SSB enrichment without breaking summary', async () => {
    const service = createService({
      analyticsDailySnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            date: new Date('2026-05-01T00:00:00.000Z'),
            totalCases: 2,
            casesByStatusJson: { new: 2 },
            casesByCategoryJson: { building_case: 2 },
            casesByDepartmentJson: { 'Technical Department': 2 },
            aiReviewsTotal: 0,
            aiCorrectionsTotal: 0,
            aiCorrectionRate: 0,
            averageTimeToTriageMinutes: null,
            medianTimeToTriageMinutes: null,
            averageTimeToCloseHours: null,
            medianTimeToCloseHours: null,
            casesWaitingForCitizen: 0,
            aiTriageSuccessCount: 0,
            aiTriageFailureCount: 0,
            aiTriageFailureRate: 0,
            aiSuggestionsAccepted: 0,
            aiSuggestionAcceptanceRate: 0,
            estimatedManualMinutesSaved: 0,
            municipalityPopulation: null,
            municipalityPopulationYear: null,
            casesPer1000Inhabitants: null,
            ssbDataStatus: 'missing',
            ssbImportedAt: null,
            analyticsRebuiltAt: null,
          },
        ]),
      },
    });

    await expect(
      service.getSummary(analyticsUser(), {
        from: new Date('2026-05-01T00:00:00.000Z'),
        to: new Date('2026-05-01T00:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      totals: {
        totalCases: 2,
        casesPer1000Inhabitants: null,
      },
      ssbEnrichment: {
        status: 'missing',
        populationUsed: null,
      },
    });
  });

  it('reports stale SSB enrichment during aggregation', async () => {
    let capturedUpsertInput: unknown;
    const service = createService(
      {
        case: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'case_1',
              createdAt: new Date('2026-05-01T08:00:00.000Z'),
              closedAt: null,
              status: 'new',
              category: 'building_case',
              assignedDepartment: null,
              addresses: [{ municipalityCode: '4203' }],
              aiTriageResults: [],
            },
          ]),
        },
        aIReview: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        analyticsDailySnapshot: {
          upsert: jest.fn((input: unknown) => {
            capturedUpsertInput = input;
            return Promise.resolve({});
          }),
        },
      },
      {
        getLatestPopulationForMunicipalities: jest.fn().mockResolvedValue([
          {
            municipalityCode: '4203',
            municipalityName: 'Arendal',
            year: 2026,
            value: 46568,
            importedAt: new Date('2020-01-01T00:00:00.000Z'),
          },
        ]),
      } as unknown as SsbService,
    );

    await service.aggregateTenantRange(analyticsUser(), {
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-01T00:00:00.000Z'),
    });

    expect(capturedUpsertInput).toMatchObject({
      create: {
        ssbDataStatus: 'stale',
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

function createService(
  prismaShape: Record<string, unknown>,
  ssbService?: SsbService,
) {
  const prisma = {
    aITriageResult: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...prismaShape,
  };

  return new AnalyticsService(
    prisma as unknown as PrismaService,
    ssbService ??
      ({
        getLatestPopulationForMunicipalities: jest.fn().mockResolvedValue([]),
      } as unknown as SsbService),
  );
}

function ssbServiceWithPopulation() {
  return {
    getLatestPopulationForMunicipalities: jest.fn().mockResolvedValue([
      {
        municipalityCode: '4203',
        municipalityName: 'Arendal',
        year: 2026,
        value: 46568,
        importedAt: new Date('2026-05-09T10:00:00.000Z'),
      },
    ]),
  } as unknown as SsbService;
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
