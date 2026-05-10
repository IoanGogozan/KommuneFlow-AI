"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";

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
          setError("Could not load operations metrics.");
          return;
        }

        setHealth((await healthResponse.json()) as HealthResponse);
        setReadiness((await readinessResponse.json()) as ReadinessResponse);
        setMetrics((await metricsResponse.json()) as MetricsSummary);
      } catch {
        setError("Could not load operations dashboard.");
      }
    }

    void loadOperations();
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">KommuneFlow AI</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Operations
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/internal/analytics"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            >
              Analytics
            </Link>
            <Link
              href="/internal/cases"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
            >
              Cases
            </Link>
          </div>
        </header>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <StatusCard
            title="API health"
            status={health?.status ?? "unknown"}
            detail={health?.timestamp}
          />
          <StatusCard
            title="Readiness"
            status={readiness?.status ?? "unknown"}
            detail={readiness?.timestamp}
          />
          <StatusCard
            title="Backup"
            status={metrics?.backupLastRunStatus ?? "missing"}
            detail={formatDate(metrics?.backupLastRunAt)}
          />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <Panel title="Readiness checks">
            {Object.entries(readiness?.checks ?? {}).map(([name, check]) => (
              <Row
                key={name}
                label={name}
                value={check.safeMessage ?? check.status}
              />
            ))}
          </Panel>

          <Panel title="Integrations">
            <Row
              label="Kartverket lookups"
              value={`${metrics?.kartverketLookupCountLast24h ?? 0} last 24h`}
            />
            <Row
              label="Kartverket failures"
              value={`${metrics?.kartverketFailureCountLast24h ?? 0} last 24h`}
            />
            <Row
              label="Kartverket avg latency"
              value={formatMs(metrics?.kartverketAverageLatencyMsLast24h)}
            />
            <Row
              label="SSB import"
              value={`${metrics?.ssbImportLastStatus ?? "missing"} / ${formatDate(
                metrics?.ssbImportLastRunAt,
              )}`}
            />
          </Panel>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric
            label="Failed logins"
            value={metrics?.failedLoginsLast24h ?? 0}
          />
          <Metric
            label="Permission denied"
            value={metrics?.permissionDeniedLast24h ?? 0}
          />
          <Metric
            label="Cross-tenant attempts"
            value={metrics?.crossTenantAccessAttemptsLast24h ?? 0}
          />
          <Metric
            label="Rate limit blocks"
            value={metrics?.rateLimitBlocksLast24h ?? 0}
          />
          <Metric
            label="AI triage requests"
            value={metrics?.aiTriageRequestsLast24h ?? 0}
          />
          <Metric
            label="AI triage failures"
            value={metrics?.aiTriageFailuresLast24h ?? 0}
          />
          <Metric
            label="Document upload failures"
            value={metrics?.documentUploadFailuresLast24h ?? 0}
          />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <Panel title="Background jobs">
            <Row
              label="Analytics rebuild"
              value={formatDate(metrics?.analyticsLastRebuildAt)}
            />
            <Row
              label="Retention cleanup"
              value={formatDate(metrics?.retentionCleanupLastRunAt)}
            />
          </Panel>

          <Panel title="API errors">
            <Row
              label="API errors last 24h"
              value={String(metrics?.apiErrorsLast24h ?? 0)}
            />
            <Row
              label="AI average latency"
              value={formatMs(metrics?.averageAiLatencyMsLast24h)}
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

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Missing";
}

function formatMs(value: number | null | undefined) {
  return value === null || value === undefined ? "Missing" : `${value} ms`;
}
