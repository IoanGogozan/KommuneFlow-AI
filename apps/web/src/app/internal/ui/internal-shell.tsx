"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
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
  group: "work" | "insights" | "governance" | "administration" | "system";
};

const caseReadPermissions: InternalPermission[] = [
  "case:read:own",
  "case:read:department",
  "case:read:all_tenant",
];

const navItems: NavItem[] = [
  { href: "/internal", key: "dashboard", group: "work" },
  {
    href: "/internal/cases",
    key: "cases",
    requiredPermissions: caseReadPermissions,
    requireAnyPermission: true,
    group: "work",
  },
  {
    href: "/internal/analytics",
    key: "analytics",
    requiredPermissions: ["analytics:read"],
    group: "insights",
  },
  {
    href: "/internal/operations",
    key: "operations",
    requiredPermissions: ["operations:read"],
    group: "system",
  },
  {
    href: "/internal/privacy",
    key: "privacy",
    requiredPermissions: ["privacy:export", "privacy:anonymize"],
    requireAnyPermission: true,
    superAdminOnlyBypass: true,
    group: "governance",
  },
  {
    href: "/internal/audit",
    key: "audit",
    requiredPermissions: ["audit:read"],
    group: "governance",
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
    group: "administration",
  },
  {
    href: "/internal/admin/routing-rules",
    key: "adminRoutingRules",
    requiredPermissions: ["routing_rules:manage"],
    group: "administration",
  },
  {
    href: "/internal/admin/users",
    key: "adminUsers",
    requiredPermissions: ["user:manage"],
    group: "administration",
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) =>
    canViewNavItem(item, currentUser),
  );
  const groupedItems = {
    work: visibleNavItems.filter((item) => item.group === "work"),
    insights: visibleNavItems.filter((item) => item.group === "insights"),
    governance: visibleNavItems.filter((item) => item.group === "governance"),
    administration: visibleNavItems.filter(
      (item) => item.group === "administration",
    ),
    system: visibleNavItems.filter((item) => item.group === "system"),
  };

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
          <button
            type="button"
            aria-expanded={mobileMenuOpen}
            aria-controls="internal-mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="mt-4 w-full border border-[#003b71] bg-white px-4 py-3 text-left text-sm font-semibold text-[#003b71] md:hidden"
          >
            {t.nav.menu}
          </button>
          <nav
            id="internal-mobile-navigation"
            hidden={!mobileMenuOpen}
            onClick={() => setMobileMenuOpen(false)}
            className="mt-2 border border-[#c8d9e8] bg-white p-3 md:hidden"
            aria-label="Internal mobile"
          >
            <GroupedNavigation groupedItems={groupedItems} pathname={pathname} t={t} mobile />
          </nav>
          <nav className="mt-4 hidden items-center gap-1 border border-[#c8d9e8] bg-white p-1 md:flex" aria-label="Internal">
            {groupedItems.work.map((item) => <NavLink key={item.href} item={item} pathname={pathname} t={t} />)}
            {groupedItems.insights.map((item) => <NavLink key={item.href} item={item} pathname={pathname} t={t} />)}
            <NavDropdown label={t.nav.governance} items={groupedItems.governance} pathname={pathname} t={t} />
            <NavDropdown label={t.nav.administration} items={groupedItems.administration} pathname={pathname} t={t} />
            {groupedItems.system.map((item) => <NavLink key={item.href} item={item} pathname={pathname} t={t} />)}
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

function NavLink({ item, pathname, t }: { item: NavItem; pathname: string; t: InternalDictionary }) {
  const isActive = isNavItemActive(pathname, item.href);
  return (
    <Link href={item.href} aria-current={isActive ? "page" : undefined} className={isActive ? "block bg-[#003b71] px-3 py-2 text-sm font-semibold text-white" : "block px-3 py-2 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]"}>
      {t.nav[item.key]}
    </Link>
  );
}

function NavDropdown({ label, items, pathname, t }: { label: string; items: NavItem[]; pathname: string; t: InternalDictionary }) {
  if (items.length === 0) return null;
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]">{label} ▾</summary>
      <div className="absolute left-0 z-20 mt-1 min-w-48 border border-[#c8d9e8] bg-white p-1 shadow-lg">
        {items.map((item) => <NavLink key={item.href} item={item} pathname={pathname} t={t} />)}
      </div>
    </details>
  );
}

function GroupedNavigation({ groupedItems, pathname, t, mobile }: { groupedItems: Record<string, NavItem[]>; pathname: string; t: InternalDictionary; mobile?: boolean }) {
  const groups = ["work", "insights", "governance", "administration", "system"] as const;
  return (
    <div className={mobile ? "grid gap-4" : ""}>
      {groups.map((group) => groupedItems[group].length > 0 ? (
        <section key={group}>
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#55718d]">{t.nav[group]}</h2>
          {groupedItems[group].map((item) => <NavLink key={item.href} item={item} pathname={pathname} t={t} />)}
        </section>
      ) : null)}
    </div>
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
