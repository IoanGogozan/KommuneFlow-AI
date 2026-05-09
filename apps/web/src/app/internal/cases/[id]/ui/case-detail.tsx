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
  } | null;
  uploadedByCitizenProfile: {
    name: string;
  } | null;
};

type AITriageResultResponse = {
  id: string;
  model: string;
  promptVersion: string;
  suggestedCategory: string | null;
  suggestedUrgency: string | null;
  summary: string | null;
  missingInformationJson: string[];
  confidenceScore: number | null;
  reasoningSummary: string | null;
  status: string;
  failureReason: string | null;
  createdAt: string;
  suggestedDepartment: {
    slug: string;
    name: string;
  } | null;
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

const caseCategories = [
  "building_case",
  "kindergarten_school",
  "health_care",
  "road_transport",
  "tax_finance",
  "water_waste",
  "general_inquiry",
  "unknown",
];

const caseUrgencies = ["low", "normal", "high", "urgent"];

export function CaseDetail({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [caseRecord, setCaseRecord] = useState<CaseDetailResponse | null>(null);
  const [documents, setDocuments] = useState<CaseDocumentResponse[]>([]);
  const [aiResult, setAiResult] = useState<AITriageResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("new");
  const [reviewCategory, setReviewCategory] = useState("unknown");
  const [reviewDepartmentSlug, setReviewDepartmentSlug] = useState("");
  const [reviewUrgency, setReviewUrgency] = useState("normal");

  function syncReviewForm(result: AITriageResultResponse | null) {
    if (!result) {
      return;
    }

    setReviewCategory(result.suggestedCategory ?? "unknown");
    setReviewDepartmentSlug(result.suggestedDepartment?.slug ?? "");
    setReviewUrgency(result.suggestedUrgency ?? "normal");
  }

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

  async function loadAITriage() {
    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/ai-triage/latest`,
      {
        credentials: "include",
      },
    );

    if (response.status === 401) {
      await clearSession();
      router.push("/internal/login");
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load AI triage");
    }

    const result = (await response.json()) as AITriageResultResponse | null;
    setAiResult(result);
    syncReviewForm(result);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCase().catch(() => setError("Could not load case."));
    loadDocuments().catch(() => setError("Could not load documents."));
    loadAITriage().catch(() => setError("Could not load AI triage."));
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

  async function runAITriage() {
    setError(null);

    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}/ai-triage`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setError("Could not run AI triage.");
      return;
    }

    const result = (await response.json()) as AITriageResultResponse;
    setAiResult(result);
    syncReviewForm(result);
  }

  async function submitAIReview(accepted: boolean) {
    if (!aiResult) {
      return;
    }

    setError(null);
    const approvedCategory = accepted
      ? (aiResult.suggestedCategory ?? "unknown")
      : reviewCategory;
    const approvedDepartmentSlug = accepted
      ? (aiResult.suggestedDepartment?.slug ?? null)
      : reviewDepartmentSlug || null;
    const approvedUrgency = accepted
      ? (aiResult.suggestedUrgency ?? "normal")
      : reviewUrgency;
    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/ai-triage/${aiResult.id}/review`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approvedCategory,
          approvedDepartmentSlug,
          approvedUrgency,
          reviewComment: "",
          wasAiSuggestionAccepted: accepted,
        }),
      },
    );

    if (!response.ok) {
      setError("Could not review AI triage.");
      return;
    }

    await loadCase();
    await loadAITriage();
  }

  async function reviewAITriage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAIReview(false);
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
            <h2 className="text-lg font-semibold text-slate-950">AI triage</h2>
            <button
              type="button"
              onClick={runAITriage}
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Generate suggestion
            </button>
          </div>

          {!aiResult ? (
            <p className="mt-4 text-sm text-slate-500">
              No AI suggestion generated for this case.
            </p>
          ) : null}

          {aiResult?.status === "failed" ? (
            <p className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
              AI triage failed: {aiResult.failureReason ?? "Unknown error"}
            </p>
          ) : null}

          {aiResult && aiResult.status !== "failed" ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="grid gap-3">
                <Info label="Category" value={aiResult.suggestedCategory ?? "unknown"} />
                <Info
                  label="Department"
                  value={aiResult.suggestedDepartment?.name ?? "Unassigned"}
                />
                <Info label="Urgency" value={aiResult.suggestedUrgency ?? "normal"} />
                <Info
                  label="Confidence"
                  value={
                    aiResult.confidenceScore === null
                      ? "Unknown"
                      : `${Math.round(aiResult.confidenceScore * 100)}%`
                  }
                />
                <div className="rounded-md bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-500">Summary</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {aiResult.summary}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-500">
                    Missing information
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {aiResult.missingInformationJson.length > 0
                      ? aiResult.missingInformationJson.join(", ")
                      : "None"}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-500">Reason</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {aiResult.reasoningSummary}
                  </p>
                </div>
              </div>

              <form
                onSubmit={reviewAITriage}
                className="grid content-start gap-3 rounded-md bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-950">Human review</h3>
                <label className="grid gap-1 text-sm text-slate-700">
                  Category
                  <select
                    value={reviewCategory}
                    onChange={(event) => setReviewCategory(event.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    {caseCategories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Department slug
                  <input
                    value={reviewDepartmentSlug}
                    onChange={(event) => setReviewDepartmentSlug(event.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  Urgency
                  <select
                    value={reviewUrgency}
                    onChange={(event) => setReviewUrgency(event.target.value)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    {caseUrgencies.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => submitAIReview(true)}
                    className="rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Accept suggestion
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Save correction
                  </button>
                </div>
              </form>
            </div>
          ) : null}
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
                  <a
                    href={`${getApiBaseUrl()}/cases/${caseId}/documents/${document.id}/download`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    Download
                  </a>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Uploaded by{" "}
                  {document.uploadedBy?.name ??
                    document.uploadedByCitizenProfile?.name ??
                    "Unknown"}
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
