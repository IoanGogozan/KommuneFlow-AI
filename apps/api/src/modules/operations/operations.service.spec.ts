import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OperationsService } from './operations.service';

describe('OperationsService', () => {
  it('summarizes operational metrics from persisted events', async () => {
    const user = {
      id: 'user_1',
      tenantId: 'tenant_1',
      departmentId: null,
      email: 'auditor@example.local',
      role: UserRole.auditor,
    } as const;
    const operationalEventInputs: Array<{ where: { tenantId?: string } }> = [];
    const operationalEventResults = [2, 3, 4, 1, 6, 1, 0];
    const operationalEventCount = jest.fn(
      (input: { where: { tenantId?: string } }) => {
        operationalEventInputs.push(input);

        return Promise.resolve(operationalEventResults.shift() ?? 0);
      },
    );
    const service = new OperationsService({
      operationalEvent: {
        count: operationalEventCount,
      },
      integrationHealthEvent: {
        count: jest.fn().mockResolvedValueOnce(7).mockResolvedValueOnce(2),
        findMany: jest
          .fn()
          .mockResolvedValue([{ latencyMs: 100 }, { latencyMs: 200 }]),
      },
      aIObservabilityEvent: {
        count: jest.fn().mockResolvedValue(5),
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

    await expect(service.getMetricsSummary(user)).resolves.toMatchObject({
      apiErrorsLast24h: 2,
      failedLoginsLast24h: 3,
      permissionDeniedLast24h: 4,
      crossTenantAccessAttemptsLast24h: 1,
      rateLimitBlocksLast24h: 6,
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
    expect(operationalEventInputs[0]?.where.tenantId).toBe('tenant_1');
  });
});
