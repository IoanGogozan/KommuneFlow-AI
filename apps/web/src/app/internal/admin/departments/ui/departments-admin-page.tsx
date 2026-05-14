"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../../ui/access-denied";
import { InternalShell } from "../../../ui/internal-shell";

type AdminDepartment = {
  id: string;
  name: string;
  slug: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  caseCount: number;
};

export function DepartmentsAdminPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [departments, setDepartments] = useState<AdminDepartment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canViewDepartments =
    hasPermission("user:manage") ||
    hasPermission("routing_rules:manage") ||
    hasPermission("tenant:manage");

  useEffect(() => {
    async function loadDepartments() {
      if (sessionLoading || !currentUser || !canViewDepartments) {
        return;
      }

      setError(null);

      try {
        const response = await fetch(`${getApiBaseUrl()}/admin/departments`, {
          credentials: "include",
        });

        if (response.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!response.ok) {
          setError("Could not load departments.");
          return;
        }

        setDepartments((await response.json()) as AdminDepartment[]);
      } catch {
        setError("Could not load departments.");
      }
    }

    void loadDepartments();
  }, [canViewDepartments, currentUser, router, sessionLoading]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title="Departments"
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? "Could not load departments." : t.cases.loading}
        </p>
      </InternalShell>
    );
  }

  if (!canViewDepartments) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title="Departments"
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="user:manage or routing_rules:manage or tenant:manage"
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
      title="Departments"
    >
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Tenant departments
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Read-only department overview for {currentUser.tenant.name}.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {departments.length} departments
          </span>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
          <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.6fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500 md:grid">
            <span>Name</span>
            <span>Slug</span>
            <span>Municipality</span>
            <span className="text-right">Cases</span>
          </div>
          <div className="divide-y divide-slate-200">
            {departments.length === 0 && !error ? (
              <p className="p-4 text-sm text-slate-600">
                No departments were found for this tenant.
              </p>
            ) : null}
            {departments.map((department) => (
              <article
                key={department.id}
                className="grid gap-2 px-4 py-4 text-sm md:grid-cols-[1.2fr_1fr_1fr_0.6fr] md:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {department.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 md:hidden">
                    {department.slug}
                  </p>
                </div>
                <p className="text-slate-700 max-md:hidden">
                  {department.slug}
                </p>
                <p className="text-slate-700">{department.tenant.name}</p>
                <p className="font-semibold text-slate-950 md:text-right">
                  {department.caseCount}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </InternalShell>
  );
}
