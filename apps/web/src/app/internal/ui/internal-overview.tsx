"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "./access-denied";
import { InternalShell } from "./internal-shell";

type CaseOverviewItem = {
  id: string;
  status: string;
};

const overviewStatuses = [
  { key: "new", label: "New cases" },
  { key: "triage_pending", label: "Triage pending" },
  { key: "triaged", label: "Triaged" },
  { key: "in_progress", label: "In progress" },
  { key: "waiting_for_citizen", label: "Waiting for citizen" },
  { key: "closed", label: "Closed" },
] as const;

export function InternalOverview() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [cases, setCases] = useState<CaseOverviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canReadCases =
    hasPermission("case:read:own") ||
    hasPermission("case:read:department") ||
    hasPermission("case:read:all_tenant");
  const canReadAnalytics = hasPermission("analytics:read");
  const canReadOperations = hasPermission("operations:read");

  const counts = useMemo(() => {
    return cases.reduce<Record<string, number>>((accumulator, caseItem) => {
      accumulator[caseItem.status] = (accumulator[caseItem.status] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [cases]);

  useEffect(() => {
    async function loadCases() {
      if (sessionLoading || !currentUser || !canReadCases) {
        return;
      }

      setError(null);

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
          throw new Error("Failed to load overview cases");
        }

        setCases((await response.json()) as CaseOverviewItem[]);
      } catch {
        setError(t.cases.loadError);
      }
    }

    void loadCases();
  }, [
    canReadCases,
    currentUser,
    router,
    sessionLoading,
    t.cases.loadError,
  ]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.nav.dashboard}
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
        title={t.nav.dashboard}
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
      title={t.nav.dashboard}
    >
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Work overview
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Case counts are based on the cases available to your role, tenant
              and department.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {cases.length} accessible cases
          </span>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {overviewStatuses.map((status) => (
          <Link
            key={status.key}
            href={`/internal/cases?status=${status.key}`}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="text-sm font-medium text-slate-500">
              {status.label}
            </p>
            <p className="mt-3 text-4xl font-semibold text-slate-950">
              {counts[status.key] ?? 0}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2">
        <OverviewAction
          description="Open the full queue of cases you are allowed to access."
          href="/internal/cases"
          label="Open case queue"
        />
        <OverviewAction
          description="Review cases waiting for triage or human follow-up."
          href="/internal/cases?status=triage_pending"
          label="Review AI triage cases"
        />
        {canReadAnalytics ? (
          <OverviewAction
            description="Inspect case volume, AI review quality and effect metrics."
            href="/internal/analytics"
            label="View analytics"
          />
        ) : null}
        {canReadOperations ? (
          <OverviewAction
            description="Check health, readiness, integrations and operational metrics."
            href="/internal/operations"
            label="View operations"
          />
        ) : null}
      </section>
    </InternalShell>
  );
}

function OverviewAction({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 hover:bg-slate-50"
    >
      <h3 className="text-base font-semibold text-slate-950">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Link>
  );
}
