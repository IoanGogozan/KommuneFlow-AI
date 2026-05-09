"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/auth";

type CaseDetailResponse = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  urgency: string;
  createdAt: string;
  citizenProfile: {
    name: string;
    email: string;
  };
  assignedDepartment: {
    name: string;
  } | null;
  internalNotes: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: {
      name: string;
      role: string;
    };
  }>;
};

const caseStatuses = [
  "new",
  "triage_pending",
  "triaged",
  "in_progress",
  "waiting_for_citizen",
  "closed",
  "rejected",
];

export function CaseDetail({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [caseRecord, setCaseRecord] = useState<CaseDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("new");

  async function loadCase() {
    const token = getAccessToken();

    if (!token) {
      router.push("/internal/login");
      return;
    }

    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      clearSession();
      router.push("/internal/login");
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load case");
    }

    const result = (await response.json()) as CaseDetailResponse;
    setCaseRecord(result);
    setStatus(result.status);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCase().catch(() => setError("Could not load case."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const token = getAccessToken();

    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setError("Could not update status.");
      return;
    }

    await loadCase();
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const token = getAccessToken();

    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/internal-notes`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: String(formData.get("body") ?? "") }),
      },
    );

    if (!response.ok) {
      setError("Could not add internal note.");
      return;
    }

    form.reset();
    await loadCase();
  }

  if (!caseRecord) {
    return (
      <main className="min-h-screen bg-slate-100 px-5 py-8">
        <p className="text-sm text-slate-600">{error ?? "Loading case..."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-5 py-6">
        <Link href="/internal/cases" className="text-sm font-medium text-slate-600">
          Back to cases
        </Link>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">{caseRecord.id}</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                {caseRecord.title}
              </h1>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">
              {caseRecord.status}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <Info label="Citizen" value={caseRecord.citizenProfile.name} />
            <Info label="Department" value={caseRecord.assignedDepartment?.name ?? "Unassigned"} />
            <Info label="Urgency" value={caseRecord.urgency} />
          </dl>

          <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-700">
            {caseRecord.description}
          </p>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <form
            onSubmit={updateStatus}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-950">Status</h2>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {caseStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="mt-4 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Update status
            </button>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Internal notes</h2>
            <form onSubmit={addNote} className="mt-4 grid gap-3">
              <textarea
                name="body"
                rows={4}
                className="rounded-md border border-slate-300 px-3 py-2"
                required
              />
              <button
                type="submit"
                className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
              >
                Add note
              </button>
            </form>

            {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

            <div className="mt-5 grid gap-3">
              {caseRecord.internalNotes.map((note) => (
                <article key={note.id} className="rounded-md bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">{note.body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {note.author.name} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}
