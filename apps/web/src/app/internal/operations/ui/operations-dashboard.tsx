"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import {
  formatDisplayValue,
  formatInternalDateTime,
} from "@/lib/internal-display";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../ui/access-denied";
import { InternalShell } from "../../ui/internal-shell";

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

type AIStatusResponse = {
  provider: "mock" | "openai";
  model: string | null;
  configured: boolean;
  timeoutMs: number;
  maxAttempts: number;
  ciDisabled: boolean;
};

export function OperationsDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canReadOperations = hasPermission("operations:read");

  useEffect(() => {
    async function loadOperations() {
      if (sessionLoading || !currentUser || !canReadOperations) {
        return;
      }

      setError(null);

      try {
        const [
          healthResponse,
          readinessResponse,
          metricsResponse,
          aiStatusResponse,
        ] =
          await Promise.all([
            fetch(`${getApiBaseUrl()}/health`, { credentials: "include" }),
            fetch(`${getApiBaseUrl()}/readiness`, { credentials: "include" }),
            fetch(`${getApiBaseUrl()}/operations/metrics-summary`, {
              credentials: "include",
            }),
            fetch(`${getApiBaseUrl()}/ai/status`, {
              credentials: "include",
            }),
          ]);

        if (metricsResponse.status === 401 || aiStatusResponse.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!metricsResponse.ok || !aiStatusResponse.ok) {
          setError(t.operations.loadMetricsError);
          return;
        }

        setHealth((await healthResponse.json()) as HealthResponse);
        setReadiness((await readinessResponse.json()) as ReadinessResponse);
        setMetrics((await metricsResponse.json()) as MetricsSummary);
        setAiStatus((await aiStatusResponse.json()) as AIStatusResponse);
      } catch {
        setError(t.operations.loadDashboardError);
      }
    }

    void loadOperations();
  }, [
    canReadOperations,
    currentUser,
    router,
    sessionLoading,
    t.operations.loadDashboardError,
    t.operations.loadMetricsError,
  ]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.operations.title}
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? t.operations.loadDashboardError : t.cases.loading}
        </p>
      </InternalShell>
    );
  }

  if (!canReadOperations) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.operations.title}
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="operations:read"
        />
      </InternalShell>
    );
  }

  return (
    <InternalShell
      currentUser={currentUser}
      locale={locale}
      setLocale={setLocale}
      t={t}
      title={t.operations.title}
    >
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <StatusCard
          title={t.operations.health}
          status={formatDisplayValue(health?.status, "operationStatuses", t)}
          detail={health?.timestamp}
        />
        <StatusCard
          title={t.operations.readiness}
          status={formatDisplayValue(
            readiness?.status,
            "operationStatuses",
            t,
          )}
          detail={readiness?.timestamp}
        />
        <StatusCard
          title={t.operations.backup}
          status={formatDisplayValue(
            metrics?.backupLastRunStatus,
            "operationStatuses",
            t,
          )}
          detail={formatDate(metrics?.backupLastRunAt, t.common.missing)}
        />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <Panel title={t.operations.readinessChecks}>
          {Object.entries(readiness?.checks ?? {}).map(([name, check]) => (
            <Row
              key={name}
              label={name}
              value={
                check.safeMessage ??
                formatDisplayValue(check.status, "operationStatuses", t)
              }
            />
          ))}
        </Panel>

        <AIStatusPanel
          aiStatus={aiStatus}
          missingLabel={t.common.missing}
          noLabel={t.common.no}
          t={t}
          yesLabel={t.common.yes}
        />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
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
            value={`${formatDisplayValue(
              metrics?.ssbImportLastStatus,
              "operationStatuses",
              t,
            )} / ${formatDate(metrics?.ssbImportLastRunAt, t.common.missing)}`}
          />
        </Panel>

        <Panel title={t.operations.apiErrors}>
          <Row
            label={t.operations.apiErrors24h}
            value={String(metrics?.apiErrorsLast24h ?? 0)}
          />
          <Row
            label={t.operations.aiLatency}
            value={formatMs(
              metrics?.averageAiLatencyMsLast24h,
              t.common.missing,
            )}
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
            value={formatDate(
              metrics?.analyticsLastRebuildAt,
              t.common.missing,
            )}
          />
          <Row
            label={t.operations.retention}
            value={formatDate(
              metrics?.retentionCleanupLastRunAt,
              t.common.missing,
            )}
          />
        </Panel>

      </section>
    </InternalShell>
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-2">{children}</div>
    </section>
  );
}

function AIStatusPanel({
  aiStatus,
  missingLabel,
  noLabel,
  t,
  yesLabel,
}: {
  aiStatus: AIStatusResponse | null;
  missingLabel: string;
  noLabel: string;
  t: ReturnType<typeof useInternalI18n>["t"];
  yesLabel: string;
}) {
  const isMock = aiStatus?.provider === "mock";
  const isOpenAIUnconfigured =
    aiStatus?.provider === "openai" && !aiStatus.configured;

  return (
    <Panel title={t.operations.aiConfiguration}>
      <Row label={t.operations.provider} value={aiStatus?.provider ?? missingLabel} />
      <Row label={t.operations.model} value={aiStatus?.model ?? missingLabel} />
      <Row
        label={t.operations.configured}
        value={aiStatus ? (aiStatus.configured ? yesLabel : noLabel) : missingLabel}
      />
      <Row
        label={t.operations.timeout}
        value={aiStatus ? formatMs(aiStatus.timeoutMs, missingLabel) : missingLabel}
      />
      <Row
        label={t.operations.maxAttempts}
        value={aiStatus ? String(aiStatus.maxAttempts) : missingLabel}
      />
      <Row
        label={t.operations.ciDisabled}
        value={aiStatus ? (aiStatus.ciDisabled ? yesLabel : noLabel) : missingLabel}
      />
      {isOpenAIUnconfigured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {t.operations.openAiNotConfigured}
        </p>
      ) : null}
      {isMock ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-900">
          {t.operations.mockAiActive}
        </p>
      ) : null}
    </Panel>
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
  return value ? formatInternalDateTime(value) : missingLabel;
}

function formatMs(value: number | null | undefined, missingLabel: string) {
  return value === null || value === undefined ? missingLabel : `${value} ms`;
}
