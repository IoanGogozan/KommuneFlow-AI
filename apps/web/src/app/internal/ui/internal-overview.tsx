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
  { key: "new" },
  { key: "triage_pending" },
  { key: "triaged" },
  { key: "in_progress" },
  { key: "waiting_for_citizen" },
  { key: "closed" },
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
        <p className="mt-6 text-sm text-slate-700">
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
      <section className="mt-6 border border-[#c8d9e8] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#003b71]">
              {t.overview.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              {t.overview.description}
            </p>
          </div>
          <span className="bg-[#eaf4fb] px-3 py-2 text-sm font-semibold text-[#003b71]">
            {cases.length} {t.overview.accessibleCases}
          </span>
        </div>
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {overviewStatuses.map((status) => (
          <Link
            key={status.key}
            href={`/internal/cases?status=${status.key}`}
            className="border border-[#c8d9e8] border-l-4 border-l-[#003b71] bg-white p-4 hover:bg-[#f5f9fc]"
          >
            <p className="text-sm font-semibold text-[#55718d]">
              {t.overview.statuses[status.key]}
            </p>
            <p className="mt-2 text-4xl font-semibold text-[#003b71]">
              {counts[status.key] ?? 0}
            </p>
          </Link>
        ))}
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-2">
        <OverviewAction
          description={t.overview.actions.openQueueDescription}
          href="/internal/cases"
          label={t.overview.actions.openQueue}
          priority="primary"
        />
        <OverviewAction
          description={t.overview.actions.reviewTriageDescription}
          href="/internal/cases?status=triage_pending"
          label={t.overview.actions.reviewTriage}
          priority="primary"
        />
        {canReadAnalytics ? (
          <OverviewAction
            description={t.overview.actions.viewAnalyticsDescription}
            href="/internal/analytics"
            label={t.overview.actions.viewAnalytics}
            priority="secondary"
          />
        ) : null}
        {canReadOperations ? (
          <OverviewAction
            description={t.overview.actions.viewOperationsDescription}
            href="/internal/operations"
            label={t.overview.actions.viewOperations}
            priority="secondary"
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
  priority,
}: {
  description: string;
  href: string;
  label: string;
  priority: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        priority === "primary"
          ? "border border-[#003b71] bg-white p-5 hover:bg-[#eaf4fb]"
          : "border border-[#c8d9e8] bg-white p-5 hover:bg-[#f5f9fc]"
      }
    >
      <h3 className="text-base font-semibold text-[#003b71]">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
    </Link>
  );
}
