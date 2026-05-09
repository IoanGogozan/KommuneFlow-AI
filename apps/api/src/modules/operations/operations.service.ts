import { Injectable } from '@nestjs/common';
import { constants } from 'node:fs';
import { access, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PrismaService } from '../../database/prisma.service';

type ReadinessCheck = {
  status: 'ok' | 'warning' | 'error';
  safeMessage?: string;
};

type ReadinessChecks = {
  database: ReadinessCheck;
  uploadStorage: ReadinessCheck;
  kartverketAddressIntegration: ReadinessCheck;
  ssbIntegration: ReadinessCheck;
};

export type OperationsMetricsSummary = {
  apiErrorsLast24h: number;
  failedLoginsLast24h: number;
  permissionDeniedLast24h: number;
  crossTenantAccessAttemptsLast24h: number;
  aiTriageRequestsLast24h: number;
  aiTriageFailuresLast24h: number;
  averageAiLatencyMsLast24h: number | null;
  documentUploadFailuresLast24h: number;
  kartverketLookupCountLast24h: number;
  kartverketFailureCountLast24h: number;
  kartverketAverageLatencyMsLast24h: number | null;
  ssbImportLastStatus: string | null;
  ssbImportLastRunAt: string | null;
  analyticsLastRebuildAt: string | null;
  retentionCleanupLastRunAt: string | null;
  backupLastRunStatus: string | null;
  backupLastRunAt: string | null;
};

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReadinessChecks(): Promise<ReadinessChecks> {
    const [database, uploadStorage] = await Promise.all([
      this.checkDatabase(),
      this.checkUploadStorage(),
    ]);

    return {
      database,
      uploadStorage,
      kartverketAddressIntegration: this.checkConfiguredIntegration(
        'kartverket_address',
        process.env.KARTVERKET_ADDRESS_BASE_URL,
      ),
      ssbIntegration: this.checkConfiguredIntegration(
        'ssb',
        process.env.SSB_API_BASE_URL,
      ),
    };
  }

  async getMetricsSummary(): Promise<OperationsMetricsSummary> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      apiErrorsLast24h,
      failedLoginsLast24h,
      permissionDeniedLast24h,
      crossTenantAccessAttemptsLast24h,
      aiTriageRequestsLast24h,
      aiTriageFailuresLast24h,
      aiObservabilityEvents,
      documentUploadFailuresLast24h,
      kartverketLookupCountLast24h,
      kartverketFailureCountLast24h,
      kartverketLatencyEvents,
      ssbImportLastRun,
      analyticsLastSnapshot,
      retentionCleanupLastRun,
      backupLastRun,
    ] = await Promise.all([
      this.countAuditEvents(['api.error'], since),
      this.countAuditEvents(['auth.login_failed'], since),
      this.countAuditEvents(['security.permission_denied'], since),
      this.countAuditEvents(['security.cross_tenant_access_attempt'], since),
      this.countAuditEvents(
        ['ai.triage_result_created', 'ai.triage_result_failed'],
        since,
      ),
      this.countAuditEvents(['ai.triage_result_failed'], since),
      this.prisma.aIObservabilityEvent.findMany({
        where: {
          createdAt: { gte: since },
        },
        select: {
          durationMs: true,
        },
      }),
      this.countAuditEvents(['document.upload_failed'], since),
      this.prisma.integrationHealthEvent.count({
        where: {
          integrationName: 'kartverket_address',
          eventType: 'address_search',
          createdAt: { gte: since },
        },
      }),
      this.prisma.integrationHealthEvent.count({
        where: {
          integrationName: 'kartverket_address',
          status: 'failed',
          createdAt: { gte: since },
        },
      }),
      this.prisma.integrationHealthEvent.findMany({
        where: {
          integrationName: 'kartverket_address',
          latencyMs: { not: null },
          createdAt: { gte: since },
        },
        select: { latencyMs: true },
      }),
      this.prisma.externalDataImportRun.findFirst({
        where: { source: 'ssb' },
        orderBy: { startedAt: 'desc' },
        select: {
          status: true,
          startedAt: true,
        },
      }),
      this.prisma.analyticsDailySnapshot.findFirst({
        where: { analyticsRebuiltAt: { not: null } },
        orderBy: { analyticsRebuiltAt: 'desc' },
        select: { analyticsRebuiltAt: true },
      }),
      this.prisma.maintenanceRun.findFirst({
        where: { type: 'retention_cleanup' },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true },
      }),
      this.prisma.maintenanceRun.findFirst({
        where: { type: 'backup' },
        orderBy: { startedAt: 'desc' },
        select: { status: true, startedAt: true },
      }),
    ]);

    return {
      apiErrorsLast24h,
      failedLoginsLast24h,
      permissionDeniedLast24h,
      crossTenantAccessAttemptsLast24h,
      aiTriageRequestsLast24h,
      aiTriageFailuresLast24h,
      averageAiLatencyMsLast24h: averageDuration(aiObservabilityEvents),
      documentUploadFailuresLast24h,
      kartverketLookupCountLast24h,
      kartverketFailureCountLast24h,
      kartverketAverageLatencyMsLast24h: averageLatency(
        kartverketLatencyEvents,
      ),
      ssbImportLastStatus: ssbImportLastRun?.status ?? null,
      ssbImportLastRunAt: ssbImportLastRun?.startedAt.toISOString() ?? null,
      analyticsLastRebuildAt:
        analyticsLastSnapshot?.analyticsRebuiltAt?.toISOString() ?? null,
      retentionCleanupLastRunAt:
        retentionCleanupLastRun?.startedAt.toISOString() ?? null,
      backupLastRunStatus: backupLastRun?.status ?? null,
      backupLastRunAt: backupLastRun?.startedAt.toISOString() ?? null,
    };
  }

  private countAuditEvents(actions: string[], since: Date) {
    return this.prisma.auditEvent.count({
      where: {
        action: { in: actions },
        createdAt: { gte: since },
      },
    });
  }

  private async checkDatabase(): Promise<ReadinessCheck> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }

  private async checkUploadStorage(): Promise<ReadinessCheck> {
    try {
      const uploadStoragePath = resolve(
        process.env.UPLOAD_STORAGE_PATH ?? './storage/uploads',
      );

      await mkdir(uploadStoragePath, { recursive: true });
      await access(uploadStoragePath, constants.R_OK | constants.W_OK);

      return { status: 'ok' };
    } catch {
      return { status: 'error' };
    }
  }

  private checkConfiguredIntegration(
    integrationName: string,
    configuredBaseUrl: string | undefined,
  ): ReadinessCheck {
    if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
      return { status: 'ok' };
    }

    return {
      status: 'warning',
      safeMessage: `${integrationName} uses default public endpoint configuration.`,
    };
  }
}

function averageLatency(events: Array<{ latencyMs: number | null }>) {
  const values = events
    .map((event) => event.latencyMs)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function averageDuration(events: Array<{ durationMs: number }>) {
  if (events.length === 0) {
    return null;
  }

  return Math.round(
    events.reduce((sum, event) => sum + event.durationMs, 0) / events.length,
  );
}
