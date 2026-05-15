"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import {
  formatInternalDateTime,
  formatInternalNumber,
} from "@/lib/internal-display";
import type { InternalDictionary } from "@/lib/internal-i18n";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../ui/access-denied";
import { InternalShell } from "../../ui/internal-shell";

type AnalyticsSummary = {
  from: string;
  to: string;
  totals: {
    totalCases: number;
    casesByStatus: Record<string, number>;
    casesByCategory: Record<string, number>;
    casesByDepartment: Record<string, number>;
    aiReviewsTotal: number;
    aiCorrectionsTotal: number;
    aiCorrectionRate: number;
    averageTimeToTriageMinutes: number | null;
    medianTimeToTriageMinutes: number | null;
    averageTimeToCloseHours: number | null;
    medianTimeToCloseHours: number | null;
    casesWaitingForCitizen: number;
    aiTriageSuccessCount: number;
    aiTriageFailureCount: number;
    aiTriageFailureRate: number;
    aiSuggestionsAccepted: number;
    aiSuggestionAcceptanceRate: number;
    estimatedManualMinutesSaved: number;
    casesPer1000Inhabitants: number | null;
  };
  assumptions: {
    acceptedAiSuggestionMinutesSaved: number;
    correctedAiSuggestionMinutesSaved: number;
    estimatedManualMinutesSavedLabel: string;
  };
  analyticsLastRebuiltAt: string | null;
  ssbEnrichment: {
    status: string;
    populationUsed: number | null;
    populationYear: number | null;
    casesPer1000Inhabitants: number | null;
    lastImportedAt: string | null;
  };
  daily: Array<{
    date: string;
    totalCases: number;
    aiCorrectionRate: number;
    aiTriageFailureRate: number;
    estimatedManualMinutesSaved: number;
    casesPer1000Inhabitants: number | null;
    ssbDataStatus: string;
  }>;
};

export function AnalyticsDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);
  const canReadAnalytics = hasPermission("analytics:read");

  async function loadSummary() {
    if (!currentUser || !canReadAnalytics) {
      return;
    }

    setError(null);
    const response = await fetch(
      `${getApiBaseUrl()}/analytics/summary?from=${from}&to=${to}`,
      {
        credentials: "include",
      },
    );

    if (response.status === 401) {
      await clearSession();
      router.push("/internal/login");
      return;
    }

    if (!response.ok) {
      setError(t.analytics.loadError);
      return;
    }

    setSummary((await response.json()) as AnalyticsSummary);
  }

  async function aggregate() {
    setError(null);
    setIsAggregating(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/analytics/aggregate`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to }),
      });

      if (response.status === 401) {
        await clearSession();
        router.push("/internal/login");
        return;
      }

      if (!response.ok) {
        setError(t.analytics.aggregateError);
        return;
      }

      await loadSummary();
    } finally {
      setIsAggregating(false);
    }
  }

  useEffect(() => {
    if (sessionLoading || !currentUser || !canReadAnalytics) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadAnalytics, currentUser, sessionLoading]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.analytics.title}
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? t.analytics.loadError : t.cases.loading}
        </p>
      </InternalShell>
    );
  }

  if (!canReadAnalytics) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.analytics.title}
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="analytics:read"
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
      title={t.analytics.title}
    >
      <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
        <DateField label={t.analytics.from} value={from} onChange={setFrom} />
        <DateField label={t.analytics.to} value={to} onChange={setTo} />
        <button
          type="button"
          onClick={aggregate}
          disabled={isAggregating}
          className="self-end rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isAggregating ? t.analytics.aggregating : t.analytics.aggregate}
        </button>
      </section>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t.analytics.executiveTitle}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {t.analytics.executiveText}
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {summary ? `${summary.from} - ${summary.to}` : "..."}
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {buildInsights(summary, t).map((insight) => (
            <InsightCard key={insight.title} insight={insight} />
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_0.9fr]">
        <MetricGroup
          title={t.analytics.aiQualityTitle}
          description={t.analytics.aiQualityText}
          metrics={[
            {
              label: t.analytics.aiAcceptanceRate,
              value: summary
                ? formatPercent(summary.totals.aiSuggestionAcceptanceRate)
                : "...",
              detail: summary
                ? `${summary.totals.aiSuggestionsAccepted}/${summary.totals.aiReviewsTotal} ${t.analytics.aiReviews.toLowerCase()}`
                : t.analytics.noData,
            },
            {
              label: t.analytics.aiCorrectionRate,
              value: summary
                ? formatPercent(summary.totals.aiCorrectionRate)
                : "...",
              detail: summary
                ? `${summary.totals.aiCorrectionsTotal} ${t.analytics.aiCorrections.toLowerCase()}`
                : t.analytics.noData,
            },
            {
              label: t.analytics.aiTriageFailures,
              value: summary
                ? `${summary.totals.aiTriageFailureCount} (${formatPercent(
                    summary.totals.aiTriageFailureRate,
                  )})`
                : "...",
              detail: t.analytics.aiFailureDetail,
            },
          ]}
        />
        <MetricGroup
          title={t.analytics.flowTitle}
          description={t.analytics.flowText}
          metrics={[
            {
              label: t.analytics.avgTriage,
              value: summary
                ? `${formatNullableNumber(
                    summary.totals.averageTimeToTriageMinutes,
                    t.common.missing,
                  )} min`
                : "...",
              detail: `${t.analytics.median}: ${
                summary
                  ? formatNullableNumber(
                      summary.totals.medianTimeToTriageMinutes,
                      t.common.missing,
                    )
                  : "..."
              } min`,
            },
            {
              label: t.analytics.avgClose,
              value: summary
                ? `${formatNullableNumber(
                    summary.totals.averageTimeToCloseHours,
                    t.common.missing,
                  )} h`
                : "...",
              detail: `${t.analytics.median}: ${
                summary
                  ? formatNullableNumber(
                      summary.totals.medianTimeToCloseHours,
                      t.common.missing,
                    )
                  : "..."
              } h`,
            },
            {
              label: t.analytics.waitingForCitizen,
              value: summary ? summary.totals.casesWaitingForCitizen : "...",
              detail: t.analytics.waitingDetail,
            },
          ]}
        />
        <MetricGroup
          title={t.analytics.volumeTitle}
          description={t.analytics.volumeText}
          metrics={[
            {
              label: t.analytics.cases,
              value: summary ? summary.totals.totalCases : "...",
              detail: t.analytics.selectedPeriod,
            },
            {
              label: t.analytics.per1000,
              value: summary
                ? formatNullableNumber(
                    summary.totals.casesPer1000Inhabitants,
                    t.common.missing,
                  )
                : "...",
              detail: summary
                ? formatPopulationDetail(summary, t)
                : t.analytics.noData,
            },
            {
              label: t.analytics.minutesSaved,
              value: summary
                ? summary.totals.estimatedManualMinutesSaved
                : "...",
              detail: t.analytics.estimateDetail,
            },
          ]}
        />
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t.analytics.effectTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {t.analytics.effectText}
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {t.analytics.lastRebuild}:{" "}
            {summary?.analyticsLastRebuiltAt
              ? formatInternalDateTime(summary.analyticsLastRebuiltAt)
              : t.common.missing}
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {t.analytics.assumption}: {t.analytics.acceptedSave}{" "}
          {summary?.assumptions.acceptedAiSuggestionMinutesSaved ?? 5}{" "}
          {t.analytics.minutes}; {t.analytics.correctedSave}{" "}
          {summary?.assumptions.correctedAiSuggestionMinutesSaved ?? 2}{" "}
          {t.analytics.minutes}.
        </p>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t.analytics.ssbTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t.analytics.ssbText}</p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {t.analytics.source}: SSB
          </span>
        </div>
        {summary?.ssbEnrichment.status === "missing" ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            {t.analytics.ssbMissing}
          </p>
        ) : null}
        {summary?.ssbEnrichment.status === "stale" ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            {t.analytics.ssbStale}
          </p>
        ) : null}
        {summary?.ssbEnrichment.lastImportedAt ? (
          <p className="mt-4 text-sm text-slate-600">
            {t.analytics.imported}:{" "}
            {formatInternalDateTime(summary.ssbEnrichment.lastImportedAt)}
          </p>
        ) : null}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <Breakdown
          title={t.analytics.byDepartment}
          values={summary?.totals.casesByDepartment ?? {}}
          emptyLabel={t.analytics.noData}
        />
        <Breakdown
          title={t.analytics.byCategory}
          values={summary?.totals.casesByCategory ?? {}}
          emptyLabel={t.analytics.noData}
        />
        <Breakdown
          title={t.analytics.byStatus}
          values={summary?.totals.casesByStatus ?? {}}
          emptyLabel={t.analytics.noData}
        />
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          {t.analytics.daily}
        </h2>
        <div className="mt-4 grid gap-2">
          {(summary?.daily ?? []).map((day) => (
            <div
              key={day.date}
              className="grid gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm md:grid-cols-[1fr_auto_auto_auto_auto_auto]"
            >
              <span className="font-medium text-slate-700">{day.date}</span>
              <span className="text-slate-700">
                {day.totalCases} {t.analytics.cases.toLowerCase()}
              </span>
              <span className="text-slate-500">
                {formatPercent(day.aiCorrectionRate)} {t.analytics.aiCorrection}
              </span>
              <span className="text-slate-500">
                {formatPercent(day.aiTriageFailureRate)} {t.analytics.aiFailure}
              </span>
              <span className="text-slate-500">
                {day.estimatedManualMinutesSaved} {t.analytics.minSaved}
              </span>
              <span className="text-slate-500">
                {formatNullableNumber(
                  day.casesPer1000Inhabitants,
                  t.common.missing,
                )}{" "}
                per 1,000
              </span>
            </div>
          ))}
          {summary?.daily.length === 0 ? (
            <p className="text-sm text-slate-500">{t.analytics.noDaily}</p>
          ) : null}
        </div>
      </section>
    </InternalShell>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-950"
      />
    </label>
  );
}

type Insight = {
  title: string;
  value: string;
  text: string;
  tone: "good" | "warn" | "neutral";
};

type MetricItem = {
  label: string;
  value: string | number;
  detail: string;
};

function InsightCard({ insight }: { insight: Insight }) {
  const toneClass =
    insight.tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : insight.tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-950";

  return (
    <article className={`rounded-md border p-4 ${toneClass}`}>
      <p className="text-sm font-semibold">{insight.title}</p>
      <p className="mt-2 text-3xl font-semibold">{insight.value}</p>
      <p className="mt-2 text-sm leading-6">{insight.text}</p>
    </article>
  );
}

function MetricGroup({
  title,
  description,
  metrics,
}: {
  title: string;
  description: string;
  metrics: MetricItem[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      <div className="mt-4 grid gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-slate-100 bg-slate-50 p-4"
          >
            <p className="text-sm font-medium text-slate-500">
              {metric.label}
            </p>
            <p className="mt-1 text-3xl font-semibold text-slate-950">
              {metric.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {metric.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Breakdown({
  title,
  values,
  emptyLabel,
}: {
  title: string;
  values: Record<string, number>;
  emptyLabel: string;
}) {
  const entries = Object.entries(values).sort(
    (left, right) => right[1] - left[1],
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 grid gap-2">
        {entries.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm"
          >
            <span className="truncate text-slate-700">{label}</span>
            <span className="font-semibold text-slate-950">{value}</span>
          </div>
        ))}
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : null}
      </div>
    </section>
  );
}

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildInsights(
  summary: AnalyticsSummary | null,
  t: InternalDictionary,
): Insight[] {
  if (!summary) {
    return [
      {
        title: t.analytics.aiQualityTitle,
        value: "...",
        text: t.analytics.loadingInsight,
        tone: "neutral",
      },
      {
        title: t.analytics.flowTitle,
        value: "...",
        text: t.analytics.loadingInsight,
        tone: "neutral",
      },
      {
        title: t.analytics.volumeTitle,
        value: "...",
        text: t.analytics.loadingInsight,
        tone: "neutral",
      },
    ];
  }

  const correctionRate = summary.totals.aiCorrectionRate;
  const failureRate = summary.totals.aiTriageFailureRate;
  const waitingShare =
    summary.totals.totalCases > 0
      ? summary.totals.casesWaitingForCitizen / summary.totals.totalCases
      : 0;

  return [
    {
      title: t.analytics.aiQualityTitle,
      value: formatPercent(summary.totals.aiSuggestionAcceptanceRate),
      text:
        correctionRate > 0.3
          ? t.analytics.aiQualityNeedsReview
          : t.analytics.aiQualityHealthy,
      tone: correctionRate > 0.3 ? "warn" : "good",
    },
    {
      title: t.analytics.flowTitle,
      value: `${formatNullableNumber(
        summary.totals.medianTimeToTriageMinutes,
        t.common.missing,
      )} min`,
      text:
        waitingShare > 0.15
          ? t.analytics.flowBlocked
          : t.analytics.flowHealthy,
      tone: waitingShare > 0.15 ? "warn" : "good",
    },
    {
      title: t.analytics.reliabilityTitle,
      value: formatPercent(failureRate),
      text:
        failureRate > 0.05
          ? t.analytics.reliabilityNeedsReview
          : t.analytics.reliabilityHealthy,
      tone: failureRate > 0.05 ? "warn" : "good",
    },
  ];
}

function formatPopulationDetail(
  summary: AnalyticsSummary,
  t: InternalDictionary,
) {
  if (
    summary.ssbEnrichment.populationUsed === null ||
    summary.ssbEnrichment.populationUsed === undefined
  ) {
    return t.analytics.populationMissingDetail;
  }

  return `${formatInternalNumber(summary.ssbEnrichment.populationUsed)} ${
    t.analytics.population
  }, ${t.analytics.ssbYear.toLowerCase()} ${
    summary.ssbEnrichment.populationYear ?? t.common.missing
  }`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatNullableNumber(
  value: number | null | undefined,
  missingLabel: string,
) {
  if (value === null || value === undefined) {
    return missingLabel;
  }

  return value.toFixed(2);
}
