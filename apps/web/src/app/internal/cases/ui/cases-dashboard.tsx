"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";

type CaseListItem = {
  id: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  createdAt: string;
  assignedDepartment: {
    name: string;
  } | null;
  citizenProfile: {
    name: string;
    email: string;
  };
};

const statuses = [
  "all",
  "new",
  "triage_pending",
  "triaged",
  "in_progress",
  "waiting_for_citizen",
  "closed",
  "rejected",
];

export function CasesDashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [status, setStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    return status === "all" ? "" : `?status=${status}`;
  }, [status]);

  useEffect(() => {
    async function loadCases() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/cases${query}`, {
          credentials: "include",
        });

        if (response.status === 401) {
          await clearSession();
          router.push("/internal/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load cases");
        }

        setCases((await response.json()) as CaseListItem[]);
      } catch {
        setError("Could not load cases.");
      }
    }

    void loadCases();
  }, [query, router]);

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <p className="text-sm font-medium text-slate-500">KommuneFlow AI</p>
            <h1 className="text-3xl font-semibold text-slate-950">
              Case dashboard
            </h1>
          </div>
          <button
            type="button"
            onClick={() => {
              void clearSession();
              router.push("/internal/login");
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800"
          >
            Sign out
          </button>
        </header>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <label className="grid max-w-xs gap-2">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-950"
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </section>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            <span>Case</span>
            <span>Status</span>
            <span>Department</span>
            <span>Created</span>
          </div>
          {cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              href={`/internal/cases/${caseItem.id}`}
              className="grid grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr] gap-4 border-b border-slate-100 px-4 py-4 text-sm hover:bg-slate-50"
            >
              <span>
                <span className="block font-medium text-slate-950">
                  {caseItem.title}
                </span>
                <span className="mt-1 block text-slate-500">
                  {caseItem.citizenProfile.name}
                </span>
              </span>
              <span className="text-slate-700">{caseItem.status}</span>
              <span className="text-slate-700">
                {caseItem.assignedDepartment?.name ?? "Unassigned"}
              </span>
              <span className="text-slate-700">
                {new Date(caseItem.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
          {cases.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">No cases found.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
