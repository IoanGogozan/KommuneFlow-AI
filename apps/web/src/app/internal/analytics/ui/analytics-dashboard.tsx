"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";

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
  };
  daily: Array<{
    date: string;
    totalCases: number;
    aiCorrectionRate: number;
  }>;
};

export function AnalyticsDashboard() {
  const router = useRouter();
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
      setError("Could not load analytics.");
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
        setError("Could not aggregate analytics.");
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
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">KommuneFlow AI</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Analytics
            </h1>
          </div>
          <Link
            href="/internal/cases"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
          >
            Cases
          </Link>
        </header>

        <section className="mt-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_1fr_auto]">
          <DateField label="From" value={from} onChange={setFrom} />
          <DateField label="To" value={to} onChange={setTo} />
          <button
            type="button"
            onClick={aggregate}
            disabled={isAggregating}
            className="self-end rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isAggregating ? "Aggregating..." : "Aggregate"}
          </button>
        </section>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <Metric label="Cases" value={summary?.totals.totalCases ?? 0} />
          <Metric
            label="AI reviews"
            value={summary?.totals.aiReviewsTotal ?? 0}
          />
          <Metric
            label="AI corrections"
            value={summary?.totals.aiCorrectionsTotal ?? 0}
          />
          <Metric
            label="AI correction rate"
            value={formatPercent(summary?.totals.aiCorrectionRate ?? 0)}
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-3">
          <Breakdown
            title="Case volume by department"
            values={summary?.totals.casesByDepartment ?? {}}
          />
          <Breakdown
            title="Case volume by category"
            values={summary?.totals.casesByCategory ?? {}}
          />
          <Breakdown
            title="Case volume by status"
            values={summary?.totals.casesByStatus ?? {}}
          />
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Daily volume</h2>
          <div className="mt-4 grid gap-2">
            {(summary?.daily ?? []).map((day) => (
              <div
                key={day.date}
                className="grid grid-cols-[1fr_auto_auto] gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-700">{day.date}</span>
                <span className="text-slate-700">{day.totalCases} cases</span>
                <span className="text-slate-500">
                  {formatPercent(day.aiCorrectionRate)} AI correction
                </span>
              </div>
            ))}
            {summary?.daily.length === 0 ? (
              <p className="text-sm text-slate-500">
                No aggregated analytics for this range.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
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
}: {
  title: string;
  values: Record<string, number>;
}) {
  const entries = Object.entries(values).sort((left, right) => right[1] - left[1]);

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
          <p className="text-sm text-slate-500">No data.</p>
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
