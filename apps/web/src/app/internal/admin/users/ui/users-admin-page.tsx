"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../../ui/access-denied";
import { InternalShell } from "../../../ui/internal-shell";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export function UsersAdminPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canViewUsers = hasPermission("user:manage");

  useEffect(() => {
    async function loadUsers() {
      if (sessionLoading || !currentUser || !canViewUsers) {
        return;
      }

      setError(null);

      try {
        const response = await fetch(`${getApiBaseUrl()}/admin/users`, {
          credentials: "include",
        });

        if (response.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!response.ok) {
          setError("Could not load users.");
          return;
        }

        setUsers((await response.json()) as AdminUser[]);
      } catch {
        setError("Could not load users.");
      }
    }

    void loadUsers();
  }, [canViewUsers, currentUser, router, sessionLoading]);

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title="Users"
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? "Could not load users." : t.cases.loading}
        </p>
      </InternalShell>
    );
  }

  if (!canViewUsers) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title="Users"
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="user:manage"
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
      title="Users"
    >
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Tenant users
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Read-only user and role overview for {currentUser.tenant.name}.
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {users.length} users
          </span>
        </div>

        {error ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 overflow-hidden rounded-md border border-slate-200">
          <div className="hidden grid-cols-[1.2fr_1.4fr_0.9fr_1fr_0.7fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500 lg:grid">
            <span>Name</span>
            <span>Email</span>
            <span>Role</span>
            <span>Department</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-slate-200">
            {users.length === 0 && !error ? (
              <p className="p-4 text-sm text-slate-600">
                No users were found for this tenant.
              </p>
            ) : null}
            {users.map((user) => (
              <article
                key={user.id}
                className="grid gap-2 px-4 py-4 text-sm lg:grid-cols-[1.2fr_1.4fr_0.9fr_1fr_0.7fr] lg:items-center"
              >
                <p className="font-semibold text-slate-950">{user.name}</p>
                <p className="break-all text-slate-700">{user.email}</p>
                <p className="text-slate-700">{formatRole(user.role)}</p>
                <p className="text-slate-700">
                  {user.department?.name ?? "All tenant access"}
                </p>
                <p>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold uppercase tracking-normal text-slate-700">
                    {user.status}
                  </span>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </InternalShell>
  );
}

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}
