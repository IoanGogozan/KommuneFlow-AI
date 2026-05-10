"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import {
  InternalLanguageToggle,
  useInternalI18n,
} from "@/lib/internal-locale";

export function InternalLoginForm() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      router.push("/internal/cases");
    } catch {
      setError(t.login.invalid);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <section className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {t.common.app}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              {t.login.title}
            </h1>
          </div>
          <InternalLanguageToggle locale={locale} setLocale={setLocale} />
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t.login.intro}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              {t.login.email}
            </span>
            <input
              name="email"
              type="email"
              defaultValue="case.worker@arendal.local"
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-700"
              required
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-700">
              {t.login.password}
            </span>
            <input
              name="password"
              type="password"
              defaultValue="DemoPassword123!"
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-700"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400"
          >
            {isSubmitting ? t.login.signingIn : t.login.signIn}
          </button>
        </form>
      </section>
    </main>
  );
}
