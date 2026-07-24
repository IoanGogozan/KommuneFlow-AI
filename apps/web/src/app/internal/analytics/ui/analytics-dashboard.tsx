"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { formatInternalDateTime, formatInternalNumber } from "@/lib/internal-display";
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
  sampleSizes: {
    aiReviews: number;
    aiTriageRuns: number;
    triageDurations: number;
    closeDurations: number;
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
  const canAggregateAnalytics = hasPermission("analytics:aggregate");

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

  if (currentUser.role === "portfolio_guest") {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.analytics.title}
      >
        <GuestAnalyticsView summary={summary} t={t} />
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
      <StaffAnalyticsView
        aggregate={aggregate}
        canAggregateAnalytics={canAggregateAnalytics}
        error={error}
        from={from}
        isAggregating={isAggregating}
        setFrom={setFrom}
        setTo={setTo}
        summary={summary}
        t={t}
        to={to}
      />
    </InternalShell>
  );
}

function GuestAnalyticsView({
  summary,
  t,
}: {
  summary: AnalyticsSummary | null;
  t: InternalDictionary;
}) {
  const acceptedReviews = summary?.totals.aiSuggestionsAccepted ?? 0;
  const reviewCount = summary?.totals.aiReviewsTotal ?? 0;
  const correctionCount = summary?.totals.aiCorrectionsTotal ?? 0;
  const waitingCount = summary?.totals.casesWaitingForCitizen ?? 0;

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
          {t.analytics.guestEyebrow}
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-slate-950">
              {t.analytics.guestTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {t.analytics.guestIntro}
            </p>
          </div>
          <div className="rounded-xl border border-sky-200 bg-white/90 p-3 text-sm text-slate-700 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t.analytics.guestRangeLabel}
            </p>
            <p className="mt-1 font-medium text-slate-950">
              {summary ? `${summary.from} - ${summary.to}` : t.common.missing}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {t.analytics.guestDisclaimer}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CompactMetricCard
          label={t.analytics.guestCases}
          value={summary ? summary.totals.totalCases : "..."}
          detail={t.analytics.guestCasesDetail}
        />
        <CompactMetricCard
          label={t.analytics.aiReviews}
          value={summary ? reviewCount : "..."}
          detail={
            summary
              ? `${acceptedReviews}/${reviewCount} ${t.analytics.guestReviewsDetail}`
              : t.analytics.noData
          }
        />
        <CompactMetricCard
          label={t.analytics.aiAcceptanceRate}
          value={summary ? formatPercent(summary.totals.aiSuggestionAcceptanceRate) : "..."}
          detail={summary ? t.analytics.guestAcceptanceDetail : t.analytics.noData}
        />
        <CompactMetricCard
          label={t.analytics.waitingForCitizen}
          value={summary ? waitingCount : "..."}
          detail={summary ? t.analytics.guestWaitingDetail : t.analytics.noData}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          {t.analytics.guestAiSectionTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {t.analytics.guestAiSectionText}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <CompactMetricCard
            label={t.analytics.aiAcceptanceRate}
            value={summary ? formatPercent(summary.totals.aiSuggestionAcceptanceRate) : "..."}
            detail={
              summary
                ? `${acceptedReviews}/${reviewCount} ${t.analytics.guestReviewsDetail}`
                : t.analytics.noData
            }
          />
          <CompactMetricCard
            label={t.analytics.aiCorrectionRate}
            value={summary ? formatPercent(summary.totals.aiCorrectionRate) : "..."}
            detail={
              summary
                ? `${correctionCount}/${reviewCount} ${t.analytics.guestReviewsDetail}`
                : t.analytics.noData
            }
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {t.analytics.guestAiNote}
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          {t.analytics.guestWorkflowTitle}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {t.analytics.guestWorkflowText}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <CompactMetricCard
            label={t.analytics.medianTriage}
            value={summary
              ? `${formatNullableNumber(
                  summary.totals.medianTimeToTriageMinutes,
                  t.common.missing,
                )} min`
              : "..."}
            detail={
              summary
                ? `${summary.sampleSizes.triageDurations} ${t.analytics.guestMeasuredTriage}`
                : t.analytics.noData
            }
          />
          <CompactMetricCard
            label={t.analytics.avgClose}
            value={summary
              ? `${formatNullableNumber(
                  summary.totals.averageTimeToCloseHours,
                  t.common.missing,
                )} h`
              : "..."}
            detail={
              summary
                ? `${summary.sampleSizes.closeDurations} ${t.analytics.guestMeasuredClose}`
                : t.analytics.noData
            }
          />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {t.analytics.guestWorkflowNote}
        </p>
      </section>
    </div>
  );
}

function StaffAnalyticsView({
  aggregate,
  canAggregateAnalytics,
  error,
  from,
  isAggregating,
  setFrom,
  setTo,
  summary,
  t,
  to,
}: {
  aggregate: () => Promise<void>;
  canAggregateAnalytics: boolean;
  error: string | null;
  from: string;
  isAggregating: boolean;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  summary: AnalyticsSummary | null;
  t: InternalDictionary;
  to: string;
}) {
  return (
    <>
      <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
        <DateField label={t.analytics.from} value={from} onChange={setFrom} />
        <DateField label={t.analytics.to} value={to} onChange={setTo} />
        {canAggregateAnalytics ? (
          <button
            type="button"
            onClick={aggregate}
            disabled={isAggregating}
            className="self-end rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isAggregating ? t.analytics.aggregating : t.analytics.aggregate}
          </button>
        ) : null}
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
                ? `${summary.totals.aiSuggestionsAccepted}/${summary.sampleSizes.aiReviews} ${t.analytics.aiReviews.toLowerCase()}.`
                : t.analytics.noData,
            },
            {
              label: t.analytics.aiCorrectionRate,
              value: summary
                ? formatPercent(summary.totals.aiCorrectionRate)
                : "...",
              detail: summary
                ? `${summary.totals.aiCorrectionsTotal}/${summary.sampleSizes.aiReviews} ${t.analytics.aiReviews.toLowerCase()}.`
                : t.analytics.noData,
            },
            {
              label: t.analytics.aiTriageFailures,
              value: summary
                ? `${summary.totals.aiTriageFailureCount} (${formatPercent(
                    summary.totals.aiTriageFailureRate,
                  )})`
                : "...",
              detail: summary
                ? `${summary.totals.aiTriageFailureCount}/${summary.sampleSizes.aiTriageRuns} ${t.analytics.aiTriageRuns.toLowerCase()}.`
                : t.analytics.noData,
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
              detail: summary
                ? `${t.analytics.median}: ${
                    summary
                      ? formatNullableNumber(
                          summary.totals.medianTimeToTriageMinutes,
                          t.common.missing,
                        )
                      : "..."
                  } min · ${summary.sampleSizes.triageDurations} ${t.analytics.sampledTriage}`
                : t.analytics.noData,
            },
            {
              label: t.analytics.avgClose,
              value: summary
                ? `${formatNullableNumber(
                    summary.totals.averageTimeToCloseHours,
                    t.common.missing,
                  )} h`
                : "...",
              detail: summary
                ? `${t.analytics.median}: ${
                    summary
                      ? formatNullableNumber(
                          summary.totals.medianTimeToCloseHours,
                          t.common.missing,
                        )
                      : "..."
                  } h · ${summary.sampleSizes.closeDurations} ${t.analytics.sampledClose}`
                : t.analytics.noData,
            },
            {
              label: t.analytics.waitingForCitizen,
              value: summary ? summary.totals.casesWaitingForCitizen : "...",
              detail: summary
                ? `${summary.totals.casesWaitingForCitizen} ${t.analytics.waitingDetail}`
                : t.analytics.noData,
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
              detail: summary ? formatPopulationDetail(summary, t) : t.analytics.noData,
            },
            {
              label: t.analytics.minutesSaved,
              value: summary ? summary.totals.estimatedManualMinutesSaved : "...",
              detail: summary
                ? `${summary.assumptions.estimatedManualMinutesSavedLabel} ${summary.assumptions.acceptedAiSuggestionMinutesSaved} ${t.analytics.minutes} / ${summary.assumptions.correctedAiSuggestionMinutesSaved} ${t.analytics.minutes}.`
                : t.analytics.noData,
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
            {t.analytics.ssbSourceLabel}
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
    </>
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

function CompactMetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
    </article>
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
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
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

  const smallSample =
    summary.sampleSizes.aiReviews < 30 ||
    summary.sampleSizes.aiTriageRuns < 30 ||
    summary.sampleSizes.triageDurations < 30 ||
    summary.sampleSizes.closeDurations < 30;

  if (smallSample) {
    return [
      {
        title: t.analytics.aiQualityTitle,
        value: formatPercent(summary.totals.aiSuggestionAcceptanceRate),
        text: t.analytics.smallSampleInsight,
        tone: "neutral",
      },
      {
        title: t.analytics.flowTitle,
        value: `${formatNullableNumber(
          summary.totals.medianTimeToTriageMinutes,
          t.common.missing,
        )} min`,
        text: t.analytics.smallSampleInsight,
        tone: "neutral",
      },
      {
        title: t.analytics.volumeTitle,
        value: `${summary.totals.totalCases}`,
        text: t.analytics.smallSampleInsight,
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
        waitingShare > 0.15 ? t.analytics.flowBlocked : t.analytics.flowHealthy,
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
