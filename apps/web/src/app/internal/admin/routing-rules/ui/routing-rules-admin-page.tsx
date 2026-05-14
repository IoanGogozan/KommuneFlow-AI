"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { formatDisplayValue } from "@/lib/internal-display";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../../ui/access-denied";
import { InternalShell } from "../../../ui/internal-shell";

type RoutingRuleDepartment = {
  id: string;
  name: string;
  slug: string;
};

type RoutingRule = {
  category: string;
  defaultDepartmentSlug: string;
  defaultDepartment: RoutingRuleDepartment | null;
  urgencyRules: string[];
  source: string;
};

export function RoutingRulesAdminPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canViewRoutingRules = hasPermission("routing_rules:manage");

  useEffect(() => {
    async function loadRoutingRules() {
      if (sessionLoading || !currentUser || !canViewRoutingRules) {
        return;
      }

      setError(null);

      try {
        const response = await fetch(`${getApiBaseUrl()}/admin/routing-rules`, {
          credentials: "include",
        });

        if (response.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!response.ok) {
          setError(t.admin.routingRules.loadError);
          return;
        }

        setRules((await response.json()) as RoutingRule[]);
      } catch {
        setError(t.admin.routingRules.loadError);
      }
    }

    void loadRoutingRules();
  }, [
    canViewRoutingRules,
    currentUser,
    router,
    sessionLoading,
    t.admin.routingRules.loadError,
  ]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.admin.routingRules.title}
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? t.admin.routingRules.loadError : t.cases.loading}
        </p>
      </InternalShell>
    );
  }

  if (!canViewRoutingRules) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.admin.routingRules.title}
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="routing_rules:manage"
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
      title={t.admin.routingRules.title}
    >
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t.admin.routingRules.sectionTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t.admin.routingRules.descriptionStart}{" "}
              {currentUser.tenant.name}. {t.admin.routingRules.descriptionEnd}
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {rules.length} {t.admin.routingRules.count}
          </span>
        </div>

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {t.admin.routingRules.notice}
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
          <div className="hidden grid-cols-[1fr_1.2fr_1fr_1.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500 lg:grid">
            <span>{t.admin.routingRules.columns.category}</span>
            <span>{t.admin.routingRules.columns.defaultDepartment}</span>
            <span>{t.admin.routingRules.columns.source}</span>
            <span>{t.admin.routingRules.columns.urgencyGuidance}</span>
          </div>
          <div className="divide-y divide-slate-200">
            {rules.length === 0 && !error ? (
              <p className="p-4 text-sm text-slate-600">
                {t.admin.routingRules.empty}
              </p>
            ) : null}
            {rules.map((rule) => (
              <article
                key={rule.category}
                className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1fr_1.2fr_1fr_1.8fr] lg:items-start"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    {t.admin.routingRules.columns.category}
                  </p>
                  <p className="font-semibold text-slate-950">
                    {formatDisplayValue(rule.category, "categories", t)}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {rule.category}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    {t.admin.routingRules.columns.defaultDepartment}
                  </p>
                  <p className="font-medium text-slate-800">
                    {rule.defaultDepartment?.name
                      ? formatDisplayValue(
                          rule.defaultDepartment.name,
                          "departments",
                          t,
                        )
                      : t.admin.routingRules.unresolvedDepartment}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {rule.defaultDepartmentSlug}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    {t.admin.routingRules.columns.source}
                  </p>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-normal text-slate-700">
                    {formatDisplayValue(rule.source, "sources", t)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    {t.admin.routingRules.columns.urgencyGuidance}
                  </p>
                  <ul className="space-y-1 text-slate-700">
                    {rule.urgencyRules.map((urgencyRule) => (
                      <li key={urgencyRule}>{urgencyRule}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </InternalShell>
  );
}
