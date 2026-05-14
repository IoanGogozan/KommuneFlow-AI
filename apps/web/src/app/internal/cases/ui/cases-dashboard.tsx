"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { formatDisplayValue } from "@/lib/internal-display";
import type { InternalDictionary } from "@/lib/internal-i18n";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../ui/access-denied";
import { InternalShell } from "../../ui/internal-shell";

type CaseListItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  createdAt: string;
  assignedDepartment: {
    name: string;
  } | null;
  citizenProfile: {
    name: string;
    email: string;
  };
};

const statusFilters = [
  { value: "all" },
  { value: "new" },
  { value: "triage_pending" },
  { value: "triaged" },
  { value: "in_progress" },
  { value: "waiting_for_citizen" },
  { value: "closed" },
  { value: "rejected" },
] as const;

export function CasesDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [allCases, setAllCases] = useState<CaseListItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    return status === "all" ? "" : `?status=${status}`;
  }, [status]);
  const statusCounts = useMemo(() => {
    return allCases.reduce<Record<string, number>>(
      (accumulator, caseItem) => {
        accumulator[caseItem.status] =
          (accumulator[caseItem.status] ?? 0) + 1;
        return accumulator;
      },
      { all: allCases.length },
    );
  }, [allCases]);
  const filteredCases = useMemo(() => {
    const queryText = search.trim().toLowerCase();

    if (!queryText) {
      return cases;
    }

    return cases.filter((caseItem) => {
      const searchableValues = [
        caseItem.title,
        caseItem.citizenProfile.name,
        caseItem.citizenProfile.email,
        caseItem.category,
        caseItem.status,
        caseItem.assignedDepartment?.name ?? "",
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(queryText),
      );
    });
  }, [cases, search]);
  const canReadCases =
    hasPermission("case:read:own") ||
    hasPermission("case:read:department") ||
    hasPermission("case:read:all_tenant");

  useEffect(() => {
    async function loadCases() {
      if (sessionLoading || !currentUser || !canReadCases) {
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/cases${query}`, {
          credentials: "include",
        });

        if (response.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load cases");
        }

        setCases((await response.json()) as CaseListItem[]);
      } catch {
        setError(t.cases.loadError);
      }
    }

    void loadCases();
  }, [
    canReadCases,
    currentUser,
    query,
    router,
    sessionLoading,
    t.cases.loadError,
  ]);

  useEffect(() => {
    async function loadCaseCounts() {
      if (sessionLoading || !currentUser || !canReadCases) {
        return;
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/cases`, {
          credentials: "include",
        });

        if (response.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!response.ok) {
          return;
        }

        setAllCases((await response.json()) as CaseListItem[]);
      } catch {
        setAllCases([]);
      }
    }

    void loadCaseCounts();
  }, [canReadCases, currentUser, router, sessionLoading]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.cases.title}
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? t.cases.loadError : t.cases.loading}
        </p>
      </InternalShell>
    );
  }

  if (!canReadCases) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.cases.title}
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="case:read:own or case:read:department or case:read:all_tenant"
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
      title={t.cases.title}
    >
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              {t.cases.status}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              {t.cases.statusDescription}
            </p>
          </div>
          <label className="grid min-w-48 gap-2 sm:hidden">
            <span className="text-sm font-medium text-slate-700">
              {t.cases.status}
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-950"
            >
              {statusFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {t.cases.filters[item.value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
          {statusFilters.map((item) => {
            const isActive = status === item.value;
            const count = statusCounts[item.value] ?? 0;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className={
                  isActive
                    ? "rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                }
              >
                {t.cases.filters[item.value]}{" "}
                <span
                  className={
                    isActive
                      ? "ml-1 text-slate-200"
                      : "ml-1 text-slate-500"
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              {t.cases.search}
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.cases.searchPlaceholder}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-600"
            />
          </label>
          <button
            type="button"
            onClick={() => setSearch("")}
            disabled={!search}
            className="self-end rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {t.common.clear}
          </button>
        </div>
      </section>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.5fr_0.85fr_0.75fr_0.85fr_1fr_0.75fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 lg:grid">
          <span>{t.cases.case}</span>
          <span>{t.cases.status}</span>
          <span>{t.cases.urgency}</span>
          <span>{t.ai.category}</span>
          <span>{t.cases.department}</span>
          <span>{t.cases.created}</span>
        </div>
        {filteredCases.map((caseItem) => (
          <CaseListRow
            key={caseItem.id}
            caseItem={caseItem}
            categoryLabel={t.ai.category}
            createdLabel={t.cases.created}
            departmentLabel={t.cases.department}
            statusLabels={t.cases.filters}
            t={t}
            unassignedLabel={t.common.unassigned}
          />
        ))}
        {filteredCases.length === 0 ? (
          <div className="px-4 py-10">
            <p className="text-sm font-medium text-slate-700">
              {t.cases.empty}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {t.cases.emptyHint}
            </p>
          </div>
        ) : null}
      </section>
    </InternalShell>
  );
}

function CaseListRow({
  caseItem,
  categoryLabel,
  createdLabel,
  departmentLabel,
  statusLabels,
  t,
  unassignedLabel,
}: {
  caseItem: CaseListItem;
  categoryLabel: string;
  createdLabel: string;
  departmentLabel: string;
  statusLabels: Record<string, string>;
  t: InternalDictionary;
  unassignedLabel: string;
}) {
  const department = caseItem.assignedDepartment?.name
    ? formatDisplayValue(caseItem.assignedDepartment.name, "departments", t)
    : unassignedLabel;

  return (
    <Link
      href={`/internal/cases/${caseItem.id}`}
      className="block border-b border-slate-100 px-4 py-4 text-sm hover:bg-slate-50"
    >
      <div className="grid gap-3 lg:grid-cols-[1.5fr_0.85fr_0.75fr_0.85fr_1fr_0.75fr] lg:items-center lg:gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">
            {caseItem.title}
          </p>
          <p className="mt-1 truncate text-slate-500">
            {caseItem.citizenProfile.name}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:block">
          <Badge tone={statusTone(caseItem.status)}>
            {statusLabels[caseItem.status] ?? formatLabel(caseItem.status)}
          </Badge>
          <span className="lg:hidden">
            <Badge tone={urgencyTone(caseItem.urgency)}>
              {formatDisplayValue(caseItem.urgency, "urgencies", t)}
            </Badge>
          </span>
        </div>

        <div className="hidden lg:block">
          <Badge tone={urgencyTone(caseItem.urgency)}>
            {formatDisplayValue(caseItem.urgency, "urgencies", t)}
          </Badge>
        </div>

        <p className="text-slate-700">
          <span className="font-medium text-slate-500 lg:hidden">
            {categoryLabel}:{" "}
          </span>
          {formatDisplayValue(caseItem.category, "categories", t)}
        </p>

        <p className="text-slate-700">
          <span className="font-medium text-slate-500 lg:hidden">
            {departmentLabel}:{" "}
          </span>
          {department}
        </p>

        <p className="text-slate-700">
          <span className="font-medium text-slate-500 lg:hidden">
            {createdLabel}:{" "}
          </span>
          {new Date(caseItem.createdAt).toLocaleDateString()}
        </p>
      </div>
    </Link>
  );
}

function Badge({
  children,
  tone,
}: {
  children: string;
  tone: "amber" | "emerald" | "red" | "slate" | "sky";
}) {
  const className = {
    amber: "bg-amber-100 text-amber-900",
    emerald: "bg-emerald-100 text-emerald-900",
    red: "bg-red-100 text-red-900",
    sky: "bg-sky-100 text-sky-900",
    slate: "bg-slate-100 text-slate-800",
  }[tone];

  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${className}`}
    >
      {formatLabel(children)}
    </span>
  );
}

function statusTone(status: string) {
  if (status === "closed") {
    return "emerald";
  }

  if (status === "rejected") {
    return "red";
  }

  if (status === "new" || status === "triage_pending") {
    return "amber";
  }

  if (status === "in_progress" || status === "waiting_for_citizen") {
    return "sky";
  }

  return "slate";
}

function urgencyTone(urgency: string) {
  if (urgency === "urgent" || urgency === "high") {
    return "red";
  }

  if (urgency === "normal") {
    return "sky";
  }

  return "slate";
}

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}
