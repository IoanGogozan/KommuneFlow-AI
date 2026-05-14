"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { clearSession } from "@/lib/auth";
import { InternalLanguageToggle } from "@/lib/internal-locale";
import type { InternalDictionary } from "@/lib/internal-i18n";
import type {
  InternalCurrentUser,
  InternalPermission,
} from "@/lib/internal-user";

type InternalShellProps = {
  breadcrumb?: ReactNode;
  children: ReactNode;
  currentUser?: InternalCurrentUser;
  locale: Locale;
  maxWidth?: "5xl" | "6xl";
  setLocale: (locale: Locale) => void;
  t: InternalDictionary;
  title: string;
};

type NavItem = {
  href: string;
  key: keyof InternalDictionary["nav"];
  requiredPermissions?: InternalPermission[];
  requireAnyPermission?: boolean;
  superAdminOnlyBypass?: boolean;
};

const caseReadPermissions: InternalPermission[] = [
  "case:read:own",
  "case:read:department",
  "case:read:all_tenant",
];

const navItems: NavItem[] = [
  { href: "/internal", key: "dashboard" },
  {
    href: "/internal/cases",
    key: "cases",
    requiredPermissions: caseReadPermissions,
    requireAnyPermission: true,
  },
  {
    href: "/internal/analytics",
    key: "analytics",
    requiredPermissions: ["analytics:read"],
  },
  {
    href: "/internal/operations",
    key: "operations",
    requiredPermissions: ["operations:read"],
  },
  {
    href: "/internal/privacy",
    key: "privacy",
    requiredPermissions: ["privacy:export", "privacy:anonymize"],
    requireAnyPermission: true,
    superAdminOnlyBypass: true,
  },
  {
    href: "/internal/audit",
    key: "audit",
    requiredPermissions: ["audit:read"],
  },
  {
    href: "/internal/admin/departments",
    key: "adminDepartments",
    requiredPermissions: [
      "user:manage",
      "routing_rules:manage",
      "tenant:manage",
    ],
    requireAnyPermission: true,
  },
  {
    href: "/internal/admin/routing-rules",
    key: "adminRoutingRules",
    requiredPermissions: ["routing_rules:manage"],
  },
  {
    href: "/internal/admin/users",
    key: "adminUsers",
    requiredPermissions: ["user:manage"],
  },
] as const;

export function InternalShell({
  breadcrumb,
  children,
  currentUser,
  locale,
  maxWidth = "6xl",
  setLocale,
  t,
  title,
}: InternalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleNavItems = navItems.filter((item) =>
    canViewNavItem(item, currentUser),
  );

  async function signOut() {
    await clearSession();
    router.push("/internal/login");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div
        className={
          maxWidth === "5xl"
            ? "mx-auto max-w-5xl px-5 py-6"
            : "mx-auto max-w-6xl px-5 py-6"
        }
      >
        <header className="border-b border-slate-300 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {t.common.app}
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-slate-950">
                {title}
              </h1>
            </div>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
              {currentUser ? <UserContext currentUser={currentUser} /> : null}
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <InternalLanguageToggle locale={locale} setLocale={setLocale} />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                >
                  {t.nav.signOut}
                </button>
              </div>
            </div>
          </div>
          <nav
            className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            aria-label="Internal"
          >
            {visibleNavItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white sm:text-left"
                      : "rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm font-medium text-slate-800 hover:bg-slate-50 sm:text-left"
                  }
                >
                  {t.nav[item.key]}
                </Link>
              );
            })}
          </nav>
        </header>

        {breadcrumb ? (
          <div className="mt-5 text-sm text-slate-500">{breadcrumb}</div>
        ) : null}

        {children}
      </div>
    </main>
  );
}

function UserContext({ currentUser }: { currentUser: InternalCurrentUser }) {
  return (
    <section
      aria-label="Current internal user"
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-slate-950">
          {currentUser.name || currentUser.email}
        </span>
        <span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-normal text-slate-700">
          {formatRole(currentUser.role)}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {currentUser.tenant.name} |{" "}
        {currentUser.department?.name ??
          (currentUser.departmentId === null
            ? "All tenant access"
            : "No department")}
      </p>
    </section>
  );
}

function formatRole(role: string) {
  return role.replaceAll("_", " ");
}

function canViewNavItem(
  item: NavItem,
  currentUser: InternalCurrentUser | undefined,
) {
  if (!currentUser) {
    return false;
  }

  if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
    return true;
  }

  if (item.superAdminOnlyBypass && currentUser.role === "super_admin") {
    return true;
  }

  const permissions = new Set(currentUser.permissions);

  if (item.requireAnyPermission) {
    return item.requiredPermissions.some((permission) =>
      permissions.has(permission),
    );
  }

  return item.requiredPermissions.every((permission) =>
    permissions.has(permission),
  );
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/internal") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
