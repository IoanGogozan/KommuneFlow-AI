"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import { clearSession } from "@/lib/auth";
import { InternalLanguageToggle } from "@/lib/internal-locale";
import type { InternalDictionary } from "@/lib/internal-i18n";

type InternalShellProps = {
  breadcrumb?: ReactNode;
  children: ReactNode;
  locale: Locale;
  maxWidth?: "5xl" | "6xl";
  setLocale: (locale: Locale) => void;
  t: InternalDictionary;
  title: string;
};

const navItems = [
  { href: "/internal/cases", key: "cases" },
  { href: "/internal/analytics", key: "analytics" },
  { href: "/internal/operations", key: "operations" },
  { href: "/internal/privacy", key: "privacy" },
] as const;

export function InternalShell({
  breadcrumb,
  children,
  locale,
  maxWidth = "6xl",
  setLocale,
  t,
  title,
}: InternalShellProps) {
  const pathname = usePathname();
  const router = useRouter();

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
            <div className="flex flex-wrap items-center gap-2">
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
          <nav
            className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
            aria-label="Internal"
          >
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

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
