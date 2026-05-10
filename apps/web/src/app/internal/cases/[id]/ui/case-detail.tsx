"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import {
  InternalLanguageToggle,
  useInternalI18n,
} from "@/lib/internal-locale";

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
    address: string | null;
  };
  addresses: Array<{
    id: string;
    originalInput: string;
    normalizedAddress: string | null;
    municipalityCode: string | null;
    municipalityName: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    source: string;
    sourceReferenceId: string | null;
    validationStatus: string;
    validatedAt: string | null;
  }>;
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
  const { locale, setLocale, t } = useInternalI18n();
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
    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/documents`,
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
    loadCase().catch(() => setError(t.cases.loadCaseError));
    loadDocuments().catch(() => setError(t.cases.loadDocumentsError));
    loadAITriage().catch(() => setError(t.cases.loadAiError));
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
      setError(t.cases.updateStatusError);
      return;
    }

    await loadCase();
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/documents`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      },
    );

    if (!response.ok) {
      setError(t.cases.uploadError);
      return;
    }

    form.reset();
    await loadDocuments();
  }

  async function runAITriage() {
    setError(null);

    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/ai-triage`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      setError(t.cases.runAiError);
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
      setError(t.cases.reviewAiError);
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
      setError(t.cases.reviewAiError);
      return;
    }

    form.reset();
    await loadCase();
  }

  if (!caseRecord) {
    return (
      <main className="min-h-screen bg-slate-100 px-5 py-8">
        <p className="text-sm text-slate-600">{error ?? t.cases.loading}</p>
      </main>
    );
  }

  const caseAddress = caseRecord.addresses[0] ?? null;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-5 py-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/internal/cases"
            className="text-sm font-medium text-slate-600"
          >
            {t.cases.back}
          </Link>
          <InternalLanguageToggle locale={locale} setLocale={setLocale} />
        </div>

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
            <Info label={t.cases.citizen} value={caseRecord.citizenProfile.name} />
            <Info
              label={t.cases.department}
              value={caseRecord.assignedDepartment?.name ?? t.common.unassigned}
            />
            <Info label={t.cases.urgency} value={caseRecord.urgency} />
          </dl>

          <p className="mt-6 whitespace-pre-wrap leading-7 text-slate-700">
            {caseRecord.description}
          </p>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            {t.cases.address}
          </h2>
          {caseAddress ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Info
                label={t.cases.originalAddress}
                value={caseAddress.originalInput}
              />
              <Info
                label={t.cases.normalizedAddress}
                value={caseAddress.normalizedAddress ?? t.cases.notAvailable}
              />
              <Info
                label={t.cases.municipality}
                value={
                  caseAddress.municipalityName && caseAddress.municipalityCode
                    ? `${caseAddress.municipalityName} (${caseAddress.municipalityCode})`
                    : t.cases.notAvailable
                }
              />
              <Info
                label={t.cases.postalCode}
                value={caseAddress.postalCode ?? t.cases.notAvailable}
              />
              <Info
                label={t.cases.coordinates}
                value={
                  caseAddress.latitude !== null &&
                  caseAddress.longitude !== null
                    ? `${caseAddress.latitude}, ${caseAddress.longitude}`
                    : t.cases.notAvailable
                }
              />
              <Info
                label={t.cases.validation}
                value={`${caseAddress.validationStatus} via ${caseAddress.source}`}
              />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              {t.cases.noAddress}
            </p>
          )}
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <form
            onSubmit={updateStatus}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-950">
              {t.cases.status}
            </h2>
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
              {t.cases.updateStatus}
            </button>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              {t.cases.notes}
            </h2>
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
                {t.cases.addNote}
              </button>
            </form>

            {error ? (
              <p className="mt-4 text-sm text-red-700">{error}</p>
            ) : null}

            <div className="mt-5 grid gap-3">
              {caseRecord.internalNotes.map((note) => (
                <article key={note.id} className="rounded-md bg-slate-50 p-4">
                  <p className="text-sm leading-6 text-slate-700">
                    {note.body}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {note.author.name} ·{" "}
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">
              {t.ai.title}
            </h2>
            <button
              type="button"
              onClick={runAITriage}
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              {t.ai.generate}
            </button>
          </div>
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            {t.ai.notice}
          </p>

          {!aiResult ? (
            <p className="mt-4 text-sm text-slate-500">
              {t.ai.empty}
            </p>
          ) : null}

          {aiResult?.status === "failed" ? (
            <p className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
              {t.ai.failed}: {aiResult.failureReason ?? t.common.unknown}
            </p>
          ) : null}

          {aiResult && aiResult.status !== "failed" ? (
            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="grid gap-3">
                <Info
                  label={t.ai.category}
                  value={aiResult.suggestedCategory ?? t.common.unknown}
                />
                <Info
                  label={t.ai.department}
                  value={aiResult.suggestedDepartment?.name ?? t.common.unassigned}
                />
                <Info
                  label={t.ai.urgency}
                  value={aiResult.suggestedUrgency ?? "normal"}
                />
                <Info
                  label={t.ai.confidence}
                  value={
                    aiResult.confidenceScore === null
                      ? t.common.unknown
                      : `${Math.round(aiResult.confidenceScore * 100)}%`
                  }
                />
                <div className="rounded-md bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-500">
                    {t.ai.summary}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {aiResult.summary}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-500">
                    {t.ai.missingInfo}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {aiResult.missingInformationJson.length > 0
                      ? aiResult.missingInformationJson.join(", ")
                      : t.common.none}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-500">
                    {t.ai.reason}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {aiResult.reasoningSummary}
                  </p>
                </div>
              </div>

              <form
                onSubmit={reviewAITriage}
                className="grid content-start gap-3 rounded-md bg-slate-50 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-950">
                  {t.ai.humanReview}
                </h3>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t.ai.category}
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
                  {t.ai.departmentSlug}
                  <input
                    value={reviewDepartmentSlug}
                    onChange={(event) =>
                      setReviewDepartmentSlug(event.target.value)
                    }
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm text-slate-700">
                  {t.ai.urgency}
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
                    {t.ai.accept}
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    {t.ai.saveCorrection}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </section>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">
              {t.documents.title}
            </h2>
            <p className="text-sm text-slate-500">{t.documents.help}</p>
          </div>

          <form
            onSubmit={uploadDocument}
            className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
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
              {t.documents.upload}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="isSensitive" type="checkbox" value="true" />
              {t.documents.sensitiveDocument}
            </label>
          </form>

          <div className="mt-5 grid gap-3">
            {documents.length === 0 ? (
              <p className="text-sm text-slate-500">{t.documents.empty}</p>
            ) : null}
            {documents.map((document) => (
              <article key={document.id} className="rounded-md bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {document.originalFileName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {document.mimeType} | {formatFileSize(document.sizeBytes)}{" "}
                      | {new Date(document.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {document.isSensitive ? (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      {t.documents.sensitive}
                    </span>
                  ) : null}
                  <a
                    href={`${getApiBaseUrl()}/cases/${caseId}/documents/${document.id}/download`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    {t.documents.download}
                  </a>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {t.documents.uploadedBy}{" "}
                  {document.uploadedBy?.name ??
                    document.uploadedByCitizenProfile?.name ??
                    t.common.unknown}
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
