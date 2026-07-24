import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../auth/current-user';
import { SsbService } from '../integrations/ssb/ssb.service';
import { OperationalEventService } from '../operations/operational-event.service';
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
              assignedDepartment: {
                slug: 'technical_department',
                name: 'Technical Department',
              },
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
          technical_department: 1,
          unassigned: 1,
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

  it('records an operational event after analytics rebuild', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
    const service = createService(
      {
        case: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        aIReview: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        analyticsDailySnapshot: {
          upsert: jest.fn().mockResolvedValue({}),
        },
      },
      undefined,
      {
        record: operationalRecordMock,
      } as unknown as OperationalEventService,
    );

    await service.aggregateTenantRange(analyticsUser(), {
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-02T00:00:00.000Z'),
    });

    expect(operationalRecordMock).toHaveBeenCalledWith({
      eventType: 'analytics.rebuild_completed',
      severity: 'info',
      source: 'analytics',
      tenantId: 'tenant_1',
      userId: 'user_1',
      safeMessage: 'Analytics rebuild completed.',
      metadata: {
        from: '2026-05-01',
        to: '2026-05-02',
        daysAggregated: 2,
      },
    });
  });

  it('does not include personal identifiers in analytics rebuild operational metadata', async () => {
    const operationalRecordMock = jest.fn().mockResolvedValue(undefined);
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
          upsert: jest.fn().mockResolvedValue({}),
        },
      },
      ssbServiceWithPopulation(),
      {
        record: operationalRecordMock,
      } as unknown as OperationalEventService,
    );

    await service.aggregateTenantRange(analyticsUser(), {
      from: new Date('2026-05-01T00:00:00.000Z'),
      to: new Date('2026-05-01T00:00:00.000Z'),
    });

    expect(JSON.stringify(operationalRecordMock.mock.calls)).not.toContain(
      'citizen@example.local',
    );
    expect(JSON.stringify(operationalRecordMock.mock.calls)).not.toContain(
      'Demo Citizen',
    );
  });

  it('returns summary totals from source data and latest snapshot enrichment', async () => {
    const service = createService({
      case: {
        findMany: jest.fn().mockResolvedValue([
          {
            createdAt: new Date('2026-05-01T08:00:00.000Z'),
            closedAt: new Date('2026-05-01T12:00:00.000Z'),
            status: 'new',
            category: 'building_case',
            assignedDepartment: { slug: 'technical_department' },
            aiTriageResults: [
              {
                createdAt: new Date('2026-05-01T08:10:00.000Z'),
                status: 'completed',
              },
            ],
          },
          {
            createdAt: new Date('2026-05-01T09:00:00.000Z'),
            closedAt: new Date('2026-05-01T14:00:00.000Z'),
            status: 'closed',
            category: 'road_transport',
            assignedDepartment: null,
            aiTriageResults: [
              {
                createdAt: new Date('2026-05-01T09:15:00.000Z'),
                status: 'completed',
              },
            ],
          },
          {
            createdAt: new Date('2026-05-01T10:00:00.000Z'),
            closedAt: new Date('2026-05-01T15:00:00.000Z'),
            status: 'waiting_for_citizen',
            category: 'building_case',
            assignedDepartment: { slug: 'technical_department' },
            aiTriageResults: [
              {
                createdAt: new Date('2026-05-01T10:05:00.000Z'),
                status: 'failed',
              },
              {
                createdAt: new Date('2026-05-01T10:15:00.000Z'),
                status: 'reviewed',
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
            { wasAiSuggestionAccepted: false },
          ]),
      },
      aITriageResult: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { status: 'completed' },
            { status: 'completed' },
            { status: 'failed' },
            { status: 'reviewed' },
          ]),
      },
      analyticsDailySnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            date: new Date('2026-05-01T00:00:00.000Z'),
            totalCases: 3,
            casesByStatusJson: {
              new: 1,
              closed: 1,
              waiting_for_citizen: 1,
            },
            casesByCategoryJson: {
              building_case: 2,
              road_transport: 1,
            },
            casesByDepartmentJson: {
              technical_department: 2,
              unassigned: 1,
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
            municipalityPopulation: 46568,
            municipalityPopulationYear: 2026,
            casesPer1000Inhabitants: (3 / 46568) * 1000,
            ssbDataStatus: 'available',
            ssbImportedAt: new Date('2026-05-09T10:00:00.000Z'),
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
          new: 1,
          closed: 1,
          waiting_for_citizen: 1,
        },
        casesByCategory: {
          building_case: 2,
          road_transport: 1,
        },
        casesByDepartment: {
          technical_department: 2,
          unassigned: 1,
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
      sampleSizes: {
        aiReviews: 3,
        aiTriageRuns: 4,
        triageDurations: 3,
        closeDurations: 3,
      },
      analyticsLastRebuiltAt: '2026-05-09T12:00:00.000Z',
      ssbEnrichment: {
        status: 'available',
        populationUsed: 46568,
        populationYear: 2026,
        casesPer1000Inhabitants: (3 / 46568) * 1000,
        lastImportedAt: '2026-05-09T10:00:00.000Z',
      },
    });
  });

  it('returns missing SSB enrichment without breaking summary', async () => {
    const service = createService({
      case: {
        findMany: jest.fn().mockResolvedValue([
          {
            createdAt: new Date('2026-05-01T08:00:00.000Z'),
            closedAt: null,
            status: 'new',
            category: 'building_case',
            assignedDepartment: null,
            aiTriageResults: [],
          },
          {
            createdAt: new Date('2026-05-01T09:00:00.000Z'),
            closedAt: null,
            status: 'closed',
            category: 'road_transport',
            assignedDepartment: null,
            aiTriageResults: [],
          },
        ]),
      },
      aIReview: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      aITriageResult: {
        findMany: jest.fn().mockResolvedValue([]),
      },
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
        aiReviewsTotal: 0,
        casesPer1000Inhabitants: null,
      },
      sampleSizes: {
        aiReviews: 0,
        aiTriageRuns: 0,
        triageDurations: 0,
        closeDurations: 0,
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

  it('excludes next-day boundary records from whole-day summary ranges', async () => {
    const finalDay = new Date('2026-05-03T00:00:00.000Z');
    const nextDay = new Date('2026-05-04T00:00:00.000Z');
    const boundaryFilter = {
      gte: finalDay,
      lt: nextDay,
    };

    const caseRows = [
      {
        createdAt: new Date('2026-05-03T12:00:00.000Z'),
        closedAt: new Date('2026-05-03T15:00:00.000Z'),
        status: 'new',
        category: 'building_case',
        assignedDepartment: { slug: 'technical_department' },
        aiTriageResults: [
          {
            createdAt: new Date('2026-05-03T12:10:00.000Z'),
            status: 'completed',
          },
        ],
      },
      {
        createdAt: new Date('2026-05-04T00:00:00.000Z'),
        closedAt: null,
        status: 'waiting_for_citizen',
        category: 'road_transport',
        assignedDepartment: null,
        aiTriageResults: [
          {
            createdAt: new Date('2026-05-04T00:05:00.000Z'),
            status: 'failed',
          },
        ],
      },
    ];
    const reviewRows = [
      {
        createdAt: new Date('2026-05-03T12:20:00.000Z'),
        wasAiSuggestionAccepted: true,
      },
      {
        createdAt: new Date('2026-05-04T00:20:00.000Z'),
        wasAiSuggestionAccepted: false,
      },
    ];
    const triageRows = [
      { createdAt: new Date('2026-05-03T12:10:00.000Z'), status: 'completed' },
      { createdAt: new Date('2026-05-04T00:05:00.000Z'), status: 'failed' },
    ];

    const service = createService({
      analyticsDailySnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            date: finalDay,
            totalCases: 1,
            casesByStatusJson: { new: 1 },
            casesByCategoryJson: { building_case: 1 },
            casesByDepartmentJson: { technical_department: 1 },
            aiReviewsTotal: 1,
            aiCorrectionsTotal: 0,
            aiCorrectionRate: 0,
            averageTimeToTriageMinutes: 10,
            medianTimeToTriageMinutes: 10,
            averageTimeToCloseHours: 3,
            medianTimeToCloseHours: 3,
            casesWaitingForCitizen: 0,
            aiTriageSuccessCount: 1,
            aiTriageFailureCount: 0,
            aiTriageFailureRate: 0,
            aiSuggestionsAccepted: 1,
            aiSuggestionAcceptanceRate: 1,
            estimatedManualMinutesSaved: 5,
            municipalityPopulation: 46568,
            municipalityPopulationYear: 2026,
            casesPer1000Inhabitants: (1 / 46568) * 1000,
            ssbDataStatus: 'available',
            ssbImportedAt: new Date('2026-05-03T10:00:00.000Z'),
            analyticsRebuiltAt: new Date('2026-05-03T12:00:00.000Z'),
          },
        ]),
      },
      case: {
        findMany: jest
          .fn()
          .mockImplementation(
            ({
              where,
            }: {
              where?: { createdAt?: { gte: Date; lt: Date } };
            }) => {
              expect(where?.createdAt).toMatchObject(boundaryFilter);
              return Promise.resolve(
                caseRows.filter((item) =>
                  matchesExclusiveRange(item.createdAt, where?.createdAt),
                ),
              );
            },
          ),
      },
      aIReview: {
        findMany: jest
          .fn()
          .mockImplementation(
            ({
              where,
            }: {
              where?: { createdAt?: { gte: Date; lt: Date } };
            }) => {
              expect(where?.createdAt).toMatchObject(boundaryFilter);
              return Promise.resolve(
                reviewRows.filter((item) =>
                  matchesExclusiveRange(item.createdAt, where?.createdAt),
                ),
              );
            },
          ),
      },
      aITriageResult: {
        findMany: jest
          .fn()
          .mockImplementation(
            ({
              where,
            }: {
              where?: { createdAt?: { gte: Date; lt: Date } };
            }) => {
              expect(where?.createdAt).toMatchObject(boundaryFilter);
              return Promise.resolve(
                triageRows.filter((item) =>
                  matchesExclusiveRange(item.createdAt, where?.createdAt),
                ),
              );
            },
          ),
      },
    });

    await expect(
      service.getSummary(analyticsUser(), {
        from: finalDay,
        to: finalDay,
      }),
    ).resolves.toMatchObject({
      totals: {
        totalCases: 1,
        aiReviewsTotal: 1,
        aiCorrectionsTotal: 0,
        aiSuggestionsAccepted: 1,
        aiTriageFailureCount: 0,
        aiTriageSuccessCount: 1,
        casesWaitingForCitizen: 0,
      },
      sampleSizes: {
        aiReviews: 1,
        aiTriageRuns: 1,
        triageDurations: 1,
        closeDurations: 1,
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
  operationalEventService?: OperationalEventService,
) {
  const prisma = {
    case: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    aIReview: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    aITriageResult: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    analyticsDailySnapshot: {
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
    operationalEventService ??
      ({
        record: jest.fn().mockResolvedValue(undefined),
      } as unknown as OperationalEventService),
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

function matchesExclusiveRange(value: Date, range?: { gte: Date; lt: Date }) {
  if (!range) {
    return true;
  }

  return value >= range.gte && value < range.lt;
}
