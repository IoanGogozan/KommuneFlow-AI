"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import {
  InternalLanguageToggle,
  useInternalI18n,
} from "@/lib/internal-locale";

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

type ReadinessResponse = {
  status: string;
  checks: Record<string, { status: string; safeMessage?: string }>;
  timestamp: string;
};

type MetricsSummary = {
  apiErrorsLast24h: number;
  failedLoginsLast24h: number;
  permissionDeniedLast24h: number;
  crossTenantAccessAttemptsLast24h: number;
  rateLimitBlocksLast24h: number;
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

export function OperationsDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOperations() {
      setError(null);

      try {
        const [healthResponse, readinessResponse, metricsResponse] =
          await Promise.all([
            fetch(`${getApiBaseUrl()}/health`, { credentials: "include" }),
            fetch(`${getApiBaseUrl()}/readiness`, { credentials: "include" }),
            fetch(`${getApiBaseUrl()}/operations/metrics-summary`, {
              credentials: "include",
            }),
          ]);

        if (metricsResponse.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!metricsResponse.ok) {
          setError(t.operations.loadMetricsError);
          return;
        }

        setHealth((await healthResponse.json()) as HealthResponse);
        setReadiness((await readinessResponse.json()) as ReadinessResponse);
        setMetrics((await metricsResponse.json()) as MetricsSummary);
      } catch {
        setError(t.operations.loadDashboardError);
      }
    }

    void loadOperations();
  }, [router, t.operations.loadDashboardError, t.operations.loadMetricsError]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {t.common.app}
            </p>
            <h1 className="text-3xl font-semibold text-slate-950">
              {t.operations.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <InternalLanguageToggle locale={locale} setLocale={setLocale} />
            <Link
              href="/internal/analytics"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            >
              {t.nav.analytics}
            </Link>
            <Link
              href="/internal/cases"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            >
              {t.nav.cases}
            </Link>
            <Link
              href="/internal/privacy"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            >
              {t.nav.privacy}
            </Link>
          </div>
        </header>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <StatusCard
            title={t.operations.health}
            status={health?.status ?? t.common.unknown}
            detail={health?.timestamp}
          />
          <StatusCard
            title={t.operations.readiness}
            status={readiness?.status ?? t.common.unknown}
            detail={readiness?.timestamp}
          />
          <StatusCard
            title={t.operations.backup}
            status={metrics?.backupLastRunStatus ?? t.common.missing}
            detail={formatDate(metrics?.backupLastRunAt, t.common.missing)}
          />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <Panel title={t.operations.readinessChecks}>
            {Object.entries(readiness?.checks ?? {}).map(([name, check]) => (
              <Row
                key={name}
                label={name}
                value={check.safeMessage ?? check.status}
              />
            ))}
          </Panel>

          <Panel title={t.operations.integrations}>
            <Row
              label={t.operations.kartverketLookups}
              value={`${metrics?.kartverketLookupCountLast24h ?? 0} ${t.common.last24h}`}
            />
            <Row
              label={t.operations.kartverketFailures}
              value={`${metrics?.kartverketFailureCountLast24h ?? 0} ${t.common.last24h}`}
            />
            <Row
              label={t.operations.kartverketLatency}
              value={formatMs(
                metrics?.kartverketAverageLatencyMsLast24h,
                t.common.missing,
              )}
            />
            <Row
              label={t.operations.ssbImport}
              value={`${metrics?.ssbImportLastStatus ?? t.common.missing} / ${formatDate(
                metrics?.ssbImportLastRunAt,
                t.common.missing,
              )}`}
            />
          </Panel>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric
            label={t.operations.failedLogins}
            value={metrics?.failedLoginsLast24h ?? 0}
          />
          <Metric
            label={t.operations.permissionDenied}
            value={metrics?.permissionDeniedLast24h ?? 0}
          />
          <Metric
            label={t.operations.crossTenant}
            value={metrics?.crossTenantAccessAttemptsLast24h ?? 0}
          />
          <Metric
            label={t.operations.rateLimit}
            value={metrics?.rateLimitBlocksLast24h ?? 0}
          />
          <Metric
            label={t.operations.aiRequests}
            value={metrics?.aiTriageRequestsLast24h ?? 0}
          />
          <Metric
            label={t.operations.aiFailures}
            value={metrics?.aiTriageFailuresLast24h ?? 0}
          />
          <Metric
            label={t.operations.uploadFailures}
            value={metrics?.documentUploadFailuresLast24h ?? 0}
          />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <Panel title={t.operations.jobs}>
            <Row
              label={t.operations.analyticsRebuild}
              value={formatDate(metrics?.analyticsLastRebuildAt, t.common.missing)}
            />
            <Row
              label={t.operations.retention}
              value={formatDate(metrics?.retentionCleanupLastRunAt, t.common.missing)}
            />
          </Panel>

          <Panel title={t.operations.apiErrors}>
            <Row
              label={t.operations.apiErrors24h}
              value={String(metrics?.apiErrorsLast24h ?? 0)}
            />
            <Row
              label={t.operations.aiLatency}
              value={formatMs(metrics?.averageAiLatencyMsLast24h, t.common.missing)}
            />
          </Panel>
        </section>
      </div>
    </main>
  );
}

function StatusCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: string;
  detail?: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{status}</p>
      {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-2">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </section>
  );
}

function formatDate(value: string | null | undefined, missingLabel: string) {
  return value ? new Date(value).toLocaleString() : missingLabel;
}

function formatMs(value: number | null | undefined, missingLabel: string) {
  return value === null || value === undefined ? missingLabel : `${value} ms`;
}
