"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";

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

type CaseDocumentResponse = {
  id: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  isSensitive: boolean;
  createdAt: string;
  uploadedBy: {
    name: string;
    role: string;
  };
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
  const [documents, setDocuments] = useState<CaseDocumentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("new");

  async function loadCase() {
    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}`, {
      credentials: "include",
    });

    if (response.status === 401) {
      await clearSession();
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

  async function loadDocuments() {
    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}/documents`, {
      credentials: "include",
    });

    if (response.status === 401) {
      await clearSession();
      router.push("/internal/login");
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load documents");
    }

    setDocuments((await response.json()) as CaseDocumentResponse[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCase().catch(() => setError("Could not load case."));
    loadDocuments().catch(() => setError("Could not load documents."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: {
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

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}/documents`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      setError("Could not upload document.");
      return;
    }

    form.reset();
    await loadDocuments();
  }

  async function addNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/internal-notes`,
      {
        method: "POST",
        credentials: "include",
        headers: {
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

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">Documents</h2>
            <p className="text-sm text-slate-500">PDF, PNG, JPG up to 10 MB</p>
          </div>

          <form onSubmit={uploadDocument} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              required
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Upload
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="isSensitive" type="checkbox" value="true" />
              Sensitive document
            </label>
          </form>

          <div className="mt-5 grid gap-3">
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded.</p>
            ) : null}
            {documents.map((document) => (
              <article key={document.id} className="rounded-md bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {document.originalFileName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {document.mimeType} | {formatFileSize(document.sizeBytes)} |{" "}
                      {new Date(document.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {document.isSensitive ? (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      Sensitive
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Uploaded by {document.uploadedBy.name}
                </p>
              </article>
            ))}
          </div>
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

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
