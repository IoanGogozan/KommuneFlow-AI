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
    <main className="min-h-screen bg-[#f3f7fb]">
      <div
        className={
          maxWidth === "5xl"
            ? "mx-auto max-w-5xl px-5 py-6"
            : "mx-auto max-w-6xl px-5 py-6"
        }
      >
        <header className="border-b border-[#003b71] pb-4">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#55718d]">
                {t.common.app}
              </p>
              <h1 className="mt-1 break-words text-3xl font-semibold text-[#003b71]">
                {title}
              </h1>
              {currentUser ? (
                <UserContext currentUser={currentUser} t={t} />
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link
                href={`/${locale}`}
                className="border border-[#c8d9e8] bg-white px-3 py-2 text-sm font-semibold text-[#003b71] hover:border-[#003b71] hover:bg-[#eaf4fb]"
              >
                {t.nav.publicIntake}
              </Link>
              <InternalLanguageToggle locale={locale} setLocale={setLocale} />
              <button
                type="button"
                onClick={() => void signOut()}
                className="border border-[#c8d9e8] bg-white px-3 py-2 text-sm font-semibold text-[#003b71] hover:border-[#003b71] hover:bg-[#eaf4fb]"
              >
                {t.nav.signOut}
              </button>
            </div>
          </div>
          <nav
            className="mt-4 flex gap-1 overflow-x-auto border border-[#c8d9e8] bg-white p-1"
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
                      ? "shrink-0 bg-[#003b71] px-3 py-2 text-center text-sm font-semibold text-white sm:text-left"
                      : "shrink-0 px-3 py-2 text-center text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb] sm:text-left"
                  }
                >
                  {t.nav[item.key]}
                </Link>
              );
            })}
          </nav>
        </header>

        {breadcrumb ? (
          <div className="mt-5 text-sm text-[#55718d]">{breadcrumb}</div>
        ) : null}

        {children}
      </div>
    </main>
  );
}

function UserContext({
  currentUser,
  t,
}: {
  currentUser: InternalCurrentUser;
  t: InternalDictionary;
}) {
  const scope =
    currentUser.department?.name ??
    (currentUser.departmentId === null
      ? t.common.allTenantAccess
      : t.common.unassigned);

  return (
    <section
      aria-label="Current internal user"
      className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#55718d]"
    >
      <p className="font-semibold text-[#003b71]">
        {currentUser.name || currentUser.email}
      </p>
      <p>
        <span className="font-semibold text-[#003b71]">{t.common.role}:</span>{" "}
        {formatRole(currentUser.role, t)}
      </p>
      <p>
        <span className="font-semibold text-[#003b71]">{t.common.scope}:</span>{" "}
        {currentUser.tenant.name} / {scope}
      </p>
    </section>
  );
}

function formatRole(role: string, t: InternalDictionary) {
  return (t.common.roles as Record<string, string>)[role] ?? role.replaceAll("_", " ");
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
