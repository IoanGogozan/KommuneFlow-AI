import { PrismaService } from '../../database/prisma.service';
import { OperationsService } from './operations.service';

describe('OperationsService', () => {
  it('summarizes operational metrics from persisted events', async () => {
    const service = new OperationsService({
      auditEvent: {
        count: jest
          .fn()
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(4)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(5)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(0),
      },
      integrationHealthEvent: {
        count: jest.fn().mockResolvedValueOnce(7).mockResolvedValueOnce(2),
        findMany: jest
          .fn()
          .mockResolvedValue([{ latencyMs: 100 }, { latencyMs: 200 }]),
      },
      aIObservabilityEvent: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ durationMs: 1200 }, { durationMs: 1800 }]),
      },
      externalDataImportRun: {
        findFirst: jest.fn().mockResolvedValue({
          status: 'completed',
          startedAt: new Date('2026-05-09T10:00:00.000Z'),
        }),
      },
      analyticsDailySnapshot: {
        findFirst: jest.fn().mockResolvedValue({
          analyticsRebuiltAt: new Date('2026-05-09T11:00:00.000Z'),
        }),
      },
      maintenanceRun: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            startedAt: new Date('2026-05-09T12:00:00.000Z'),
          })
          .mockResolvedValueOnce({
            status: 'completed',
            startedAt: new Date('2026-05-09T13:00:00.000Z'),
          }),
      },
    } as unknown as PrismaService);

    await expect(service.getMetricsSummary()).resolves.toMatchObject({
      apiErrorsLast24h: 2,
      failedLoginsLast24h: 3,
      permissionDeniedLast24h: 4,
      crossTenantAccessAttemptsLast24h: 1,
      aiTriageRequestsLast24h: 5,
      aiTriageFailuresLast24h: 1,
      averageAiLatencyMsLast24h: 1500,
      documentUploadFailuresLast24h: 0,
      kartverketLookupCountLast24h: 7,
      kartverketFailureCountLast24h: 2,
      kartverketAverageLatencyMsLast24h: 150,
      ssbImportLastStatus: 'completed',
      analyticsLastRebuildAt: '2026-05-09T11:00:00.000Z',
      retentionCleanupLastRunAt: '2026-05-09T12:00:00.000Z',
      backupLastRunStatus: 'completed',
      backupLastRunAt: '2026-05-09T13:00:00.000Z',
    });
  });
});
