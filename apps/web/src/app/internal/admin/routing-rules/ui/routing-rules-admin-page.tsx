"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";
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
          setError("Could not load routing rules.");
          return;
        }

        setRules((await response.json()) as RoutingRule[]);
      } catch {
        setError("Could not load routing rules.");
      }
    }

    void loadRoutingRules();
  }, [canViewRoutingRules, currentUser, router, sessionLoading]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title="Routing rules"
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? "Could not load routing rules." : t.cases.loading}
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
        title="Routing rules"
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
      title="Routing rules"
    >
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Tenant routing logic
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Read-only category to department routing for{" "}
              {currentUser.tenant.name}. AI triage can suggest a department from
              the tenant department list, but official case values update only
              after human review.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {rules.length} rules
          </span>
        </div>

        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          These rules document the current static/demo routing conventions. This
          is not a workflow engine and cannot be edited from the UI yet.
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
          <div className="hidden grid-cols-[1fr_1.2fr_1fr_1.8fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500 lg:grid">
            <span>Category</span>
            <span>Default department</span>
            <span>Source</span>
            <span>Urgency guidance</span>
          </div>
          <div className="divide-y divide-slate-200">
            {rules.length === 0 && !error ? (
              <p className="p-4 text-sm text-slate-600">
                No routing rules are documented for this tenant.
              </p>
            ) : null}
            {rules.map((rule) => (
              <article
                key={rule.category}
                className="grid gap-3 px-4 py-4 text-sm lg:grid-cols-[1fr_1.2fr_1fr_1.8fr] lg:items-start"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    Category
                  </p>
                  <p className="font-semibold text-slate-950">
                    {formatSlug(rule.category)}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {rule.category}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    Default department
                  </p>
                  <p className="font-medium text-slate-800">
                    {rule.defaultDepartment?.name ?? "Unresolved department"}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-500">
                    {rule.defaultDepartmentSlug}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    Source
                  </p>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-normal text-slate-700">
                    {formatSlug(rule.source)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 lg:hidden">
                    Urgency guidance
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

function formatSlug(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
