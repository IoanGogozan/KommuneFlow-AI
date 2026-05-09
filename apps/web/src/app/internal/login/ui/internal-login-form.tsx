"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";

export function InternalLoginForm() {
  const router = useRouter();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const result = (await response.json()) as {
        accessToken: string;
        user: {
          email: string;
          name: string;
          role: string;
        };
      };

      localStorage.setItem("kommuneflow.accessToken", result.accessToken);
      localStorage.setItem("kommuneflow.user", JSON.stringify(result.user));
      router.push("/internal/cases");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Email</span>
        <input
          name="email"
          type="email"
          defaultValue="case.worker@arendal.local"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-700"
          required
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-700">Password</span>
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
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
