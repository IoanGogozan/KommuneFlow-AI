"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { useInternalI18n } from "@/lib/internal-locale";
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
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);

  async function loadSummary() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <InternalShell
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

      <section className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric
          label={t.analytics.cases}
          value={summary ? summary.totals.totalCases : "..."}
        />
        <Metric
          label={t.analytics.aiReviews}
          value={summary ? summary.totals.aiReviewsTotal : "..."}
        />
        <Metric
          label={t.analytics.aiCorrections}
          value={summary ? summary.totals.aiCorrectionsTotal : "..."}
        />
        <Metric
          label={t.analytics.aiCorrectionRate}
          value={
            summary ? formatPercent(summary.totals.aiCorrectionRate) : "..."
          }
        />
        <Metric
          label={t.analytics.aiAcceptanceRate}
          value={
            summary
              ? formatPercent(summary.totals.aiSuggestionAcceptanceRate)
              : "..."
          }
        />
        <Metric
          label={t.analytics.aiTriageFailures}
          value={
            summary
              ? `${summary.totals.aiTriageFailureCount} (${formatPercent(
                  summary.totals.aiTriageFailureRate,
                )})`
              : "..."
          }
        />
        <Metric
          label={t.analytics.waitingForCitizen}
          value={summary ? summary.totals.casesWaitingForCitizen : "..."}
        />
        <Metric
          label={t.analytics.minutesSaved}
          value={summary ? summary.totals.estimatedManualMinutesSaved : "..."}
        />
        <Metric
          label={t.analytics.avgTriage}
          value={
            summary
              ? `${formatNullableNumber(
                  summary.totals.averageTimeToTriageMinutes,
                  t.common.missing,
                )} min`
              : "..."
          }
        />
        <Metric
          label={t.analytics.medianTriage}
          value={
            summary
              ? `${formatNullableNumber(
                  summary.totals.medianTimeToTriageMinutes,
                  t.common.missing,
                )} min`
              : "..."
          }
        />
        <Metric
          label={t.analytics.avgClose}
          value={
            summary
              ? `${formatNullableNumber(
                  summary.totals.averageTimeToCloseHours,
                  t.common.missing,
                )} h`
              : "..."
          }
        />
        <Metric
          label={t.analytics.medianClose}
          value={
            summary
              ? `${formatNullableNumber(
                  summary.totals.medianTimeToCloseHours,
                  t.common.missing,
                )} h`
              : "..."
          }
        />
        <Metric
          label={t.analytics.per1000}
          value={
            summary
              ? formatNullableNumber(
                  summary.totals.casesPer1000Inhabitants,
                  t.common.missing,
                )
              : "..."
          }
        />
        <Metric
          label={t.analytics.population}
          value={
            summary
              ? (summary.ssbEnrichment.populationUsed?.toLocaleString() ??
                t.common.missing)
              : "..."
          }
        />
        <Metric
          label={t.analytics.ssbYear}
          value={
            summary
              ? (summary.ssbEnrichment.populationYear ?? t.common.missing)
              : "..."
          }
        />
        <Metric
          label={t.analytics.ssbStatus}
          value={summary ? summary.ssbEnrichment.status : "..."}
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
              ? new Date(summary.analyticsLastRebuiltAt).toLocaleString()
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
            {new Date(summary.ssbEnrichment.lastImportedAt).toLocaleString()}
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
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
