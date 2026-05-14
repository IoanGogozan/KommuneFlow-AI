"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import type { InternalDictionary } from "@/lib/internal-i18n";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../../ui/access-denied";
import { InternalShell } from "../../../ui/internal-shell";

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

type DepartmentOption = {
  id: string;
  name: string;
  slug: string;
};

type CaseActivityResponse = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: {
    id?: string;
    name: string | null;
    email: string | null;
    role: string | null;
  } | null;
  metadataSummary: Record<string, string | number | boolean | null>;
};

type AIErrorKind =
  | "provider_not_configured"
  | "timeout"
  | "upstream_error"
  | "validation_failed"
  | "unknown";

type AIErrorState = {
  kind: AIErrorKind;
  message: string;
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

const workflowStatuses = [
  "new",
  "triage_pending",
  "triaged",
  "in_progress",
  "waiting_for_citizen",
  "closed",
] as const;

const recommendedWorkflow = workflowStatuses.join(" -> ");

const statusExplanations: Record<string, string> = {
  new: "The case has been received and is waiting for initial handling.",
  triage_pending: "The case is ready for AI or manual triage.",
  triaged: "A human reviewer has confirmed category, urgency and routing.",
  in_progress: "The assigned department is actively processing the case.",
  waiting_for_citizen: "The case is waiting for more information from the citizen.",
  closed: "The case has been completed.",
  rejected: "The case has been rejected and is in a terminal state.",
};

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
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [caseRecord, setCaseRecord] = useState<CaseDetailResponse | null>(null);
  const [documents, setDocuments] = useState<CaseDocumentResponse[]>([]);
  const [aiResult, setAiResult] = useState<AITriageResultResponse | null>(null);
  const [activity, setActivity] = useState<CaseActivityResponse[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [aiError, setAIError] = useState<AIErrorState | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentListUnavailable, setDepartmentListUnavailable] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState("new");
  const [reviewCategory, setReviewCategory] = useState("unknown");
  const [reviewDepartmentSlug, setReviewDepartmentSlug] = useState("");
  const [reviewUrgency, setReviewUrgency] = useState("normal");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewValidationError, setReviewValidationError] = useState<
    string | null
  >(null);
  const canReadCase =
    hasPermission("case:read:own") ||
    hasPermission("case:read:department") ||
    hasPermission("case:read:all_tenant");
  const canUpdateCase = hasPermission("case:update:department");
  const canRunAITriage = canUpdateCase && hasPermission("ai:triage:run");
  const canReviewAITriage = canUpdateCase && hasPermission("ai:triage:review");
  const canUploadDocument = canUpdateCase && hasPermission("document:upload");

  function syncReviewForm(result: AITriageResultResponse | null) {
    if (!result) {
      return;
    }

    setReviewCategory(result.suggestedCategory ?? "unknown");
    setReviewDepartmentSlug(result.suggestedDepartment?.slug ?? "");
    setReviewUrgency(result.suggestedUrgency ?? "normal");
    setReviewComment("");
    setReviewValidationError(null);
    setAIError(null);
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

  async function loadActivity() {
    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}/activity`, {
      credentials: "include",
    });

    if (response.status === 401) {
      await clearSession();
      router.push("/internal/login");
      return;
    }

    if (!response.ok) {
      throw new Error("Failed to load case activity");
    }

    setActivity((await response.json()) as CaseActivityResponse[]);
    setActivityError(null);
  }

  async function loadDepartments() {
    const response = await fetch(`${getApiBaseUrl()}/departments`, {
      credentials: "include",
    });

    if (response.status === 401) {
      await clearSession();
      router.push("/internal/login");
      return;
    }

    if (!response.ok) {
      setDepartmentListUnavailable(true);
      return;
    }

    setDepartments((await response.json()) as DepartmentOption[]);
    setDepartmentListUnavailable(false);
  }

  useEffect(() => {
    if (sessionLoading || !currentUser || !canReadCase) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCase().catch(() => setError(t.cases.loadCaseError));
    loadDocuments().catch(() => setError(t.cases.loadDocumentsError));
    loadAITriage().catch(() => setError(t.cases.loadAiError));
    loadActivity().catch(() =>
      setActivityError("Recent activity could not be loaded."),
    );
    loadDepartments().catch(() => setDepartmentListUnavailable(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadCase, caseId, currentUser, sessionLoading]);

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatusUpdateError(null);

    const response = await fetch(`${getApiBaseUrl()}/cases/${caseId}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setStatusUpdateError(await readSafeStatusUpdateError(response));
      return;
    }

    await loadCase();
    await loadActivity();
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
    await loadActivity();
  }

  async function runAITriage() {
    setError(null);
    setAIError(null);

    const response = await fetch(
      `${getApiBaseUrl()}/cases/${caseId}/ai-triage`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) {
      setAIError(await buildAITriageError(response));
      return;
    }

    const result = (await response.json()) as AITriageResultResponse;
    setAiResult(result);
    if (result.status === "failed") {
      setAIError(classifyStoredAIFailure(result.failureReason));
    }
    syncReviewForm(result);
    await loadActivity();
  }

  function correctionHasMeaningfulDifference() {
    if (!aiResult) {
      return false;
    }

    return (
      reviewCategory !== (aiResult.suggestedCategory ?? "unknown") ||
      (reviewDepartmentSlug || null) !==
        (aiResult.suggestedDepartment?.slug ?? null) ||
      reviewUrgency !== (aiResult.suggestedUrgency ?? "normal")
    );
  }

  async function submitAIReview(accepted: boolean) {
    if (!aiResult) {
      return;
    }

    setError(null);
    setReviewValidationError(null);
    const trimmedReviewComment = reviewComment.trim();

    if (
      !accepted &&
      !correctionHasMeaningfulDifference() &&
      trimmedReviewComment.length === 0
    ) {
      setReviewValidationError(
        "Change at least one reviewed value or add a review comment before saving a correction.",
      );
      return;
    }

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
          reviewComment: trimmedReviewComment,
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
    await loadActivity();
    setReviewComment("");
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
    await loadActivity();
  }

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        maxWidth="5xl"
        setLocale={setLocale}
        t={t}
        title={t.cases.loading}
      >
        <p className="text-sm text-slate-600">
          {sessionError ? t.cases.loadCaseError : (error ?? t.cases.loading)}
        </p>
      </InternalShell>
    );
  }

  if (!canReadCase) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        maxWidth="5xl"
        setLocale={setLocale}
        t={t}
        title={t.nav.caseDetail}
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="case:read:own or case:read:department or case:read:all_tenant"
        />
      </InternalShell>
    );
  }

  if (!caseRecord) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        maxWidth="5xl"
        setLocale={setLocale}
        t={t}
        title={t.cases.loading}
      >
        <p className="text-sm text-slate-600">{error ?? t.cases.loading}</p>
      </InternalShell>
    );
  }

  const caseAddress = caseRecord.addresses[0] ?? null;

  return (
    <InternalShell
      breadcrumb={
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/internal/cases"
              className="font-medium text-slate-600 hover:text-slate-950"
            >
              {t.nav.cases}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-700">
            {t.nav.caseDetail}
          </li>
        </ol>
      }
      currentUser={currentUser}
      locale={locale}
      maxWidth="5xl"
      setLocale={setLocale}
      t={t}
      title={caseRecord.title}
    >
      <Link
        href="/internal/cases"
        className="mt-5 inline-flex text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        {t.cases.back}
      </Link>

      <CaseSummaryCard caseRecord={caseRecord} t={t} />
      {!canUpdateCase ? <ReadOnlyNotice currentRole={currentUser.role} /> : null}
      <CitizenAddressCard caseAddress={caseAddress} t={t} />
      <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <CaseWorkflowCard
          canUpdate={canUpdateCase}
          currentStatus={caseRecord.status}
          error={statusUpdateError}
          onSubmit={updateStatus}
          setStatus={setStatus}
          status={status}
          t={t}
        />
        <InternalNotesCard
          canAddNote={canUpdateCase}
          error={error}
          notes={caseRecord.internalNotes}
          onSubmit={addNote}
          t={t}
        />
      </section>
      <AITriageCard
        aiResult={aiResult}
        officialCategory={caseRecord.category}
        officialDepartment={caseRecord.assignedDepartment?.name ?? null}
        officialUrgency={caseRecord.urgency}
        departments={departments}
        departmentListUnavailable={departmentListUnavailable}
        aiError={aiError}
        canReview={canReviewAITriage}
        canRun={canRunAITriage}
        onReviewCategoryChange={setReviewCategory}
        onReviewCommentChange={setReviewComment}
        onReviewDepartmentSlugChange={setReviewDepartmentSlug}
        onReviewUrgencyChange={setReviewUrgency}
        onRunAITriage={runAITriage}
        onSubmitAIReview={submitAIReview}
        onSubmitCorrection={reviewAITriage}
        reviewCategory={reviewCategory}
        reviewComment={reviewComment}
        reviewDepartmentSlug={reviewDepartmentSlug}
        reviewValidationError={reviewValidationError}
        reviewUrgency={reviewUrgency}
        t={t}
      />
      <DocumentsCard
        canUpload={canUploadDocument}
        caseId={caseId}
        documents={documents}
        onUploadDocument={uploadDocument}
        t={t}
      />
      <RecentActivityCard
        activity={activity}
        error={activityError}
        t={t}
      />
    </InternalShell>
  );
}

function CaseSummaryCard({
  caseRecord,
  t,
}: {
  caseRecord: CaseDetailResponse;
  t: InternalDictionary;
}) {
  return (
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
  );
}

function CitizenAddressCard({
  caseAddress,
  t,
}: {
  caseAddress: CaseDetailResponse["addresses"][number] | null;
  t: InternalDictionary;
}) {
  return (
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
              caseAddress.latitude !== null && caseAddress.longitude !== null
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
        <p className="mt-3 text-sm text-slate-500">{t.cases.noAddress}</p>
      )}
    </section>
  );
}

function ReadOnlyNotice({ currentRole }: { currentRole: string }) {
  return (
    <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">
        Read-only case access
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Your current role, {currentRole}, can view this case but cannot update
        status, add notes, run or review AI triage, or upload documents.
      </p>
    </div>
  );
}

function CaseWorkflowCard({
  canUpdate,
  currentStatus,
  error,
  onSubmit,
  setStatus,
  status,
  t,
}: {
  canUpdate: boolean;
  currentStatus: string;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setStatus: (value: string) => void;
  status: string;
  t: InternalDictionary;
}) {
  const transitionWarning = getStatusTransitionWarning(currentStatus, status);

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-slate-950">
        {t.cases.status}
      </h2>
      <WorkflowTimeline currentStatus={currentStatus} />
      {canUpdate ? (
        <>
          <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            Recommended workflow: {recommendedWorkflow}
          </p>
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
          {transitionWarning ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              {transitionWarning}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-4 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            {t.cases.updateStatus}
          </button>
        </>
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          Status updates are disabled for read-only roles.
        </p>
      )}
    </form>
  );
}

function WorkflowTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = workflowStatuses.findIndex(
    (item) => item === currentStatus,
  );
  const isRejected = currentStatus === "rejected";

  return (
    <div className="mt-4">
      <ol className="grid gap-2">
        {workflowStatuses.map((item, index) => {
          const isCurrent = item === currentStatus;
          const isComplete = currentIndex > index;

          return (
            <li key={item} className="flex items-start gap-3">
              <span
                className={
                  isCurrent
                    ? "mt-0.5 h-4 w-4 rounded-full bg-slate-950"
                    : isComplete
                      ? "mt-0.5 h-4 w-4 rounded-full bg-emerald-600"
                      : "mt-0.5 h-4 w-4 rounded-full border border-slate-300 bg-white"
                }
                aria-hidden="true"
              />
              <div>
                <p
                  className={
                    isCurrent
                      ? "text-sm font-semibold text-slate-950"
                      : "text-sm font-medium text-slate-700"
                  }
                >
                  {formatStatusLabel(item)}
                </p>
                {isCurrent ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {statusExplanations[item]}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {isRejected ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">Rejected</p>
          <p className="mt-1 text-xs leading-5 text-red-800">
            {statusExplanations.rejected}
          </p>
        </div>
      ) : null}
      {!isRejected && statusExplanations[currentStatus] ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          Current status: {statusExplanations[currentStatus]}
        </p>
      ) : null}
    </div>
  );
}

function InternalNotesCard({
  canAddNote,
  error,
  notes,
  onSubmit,
  t,
}: {
  canAddNote: boolean;
  error: string | null;
  notes: CaseDetailResponse["internalNotes"];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  t: InternalDictionary;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{t.cases.notes}</h2>
      {canAddNote ? (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3">
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
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          Internal note updates are disabled for read-only roles.
        </p>
      )}

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-3">
        {notes.map((note) => (
          <article key={note.id} className="rounded-md bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-700">{note.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              {note.author.name} | {new Date(note.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function AITriageCard({
  aiResult,
  aiError,
  canReview,
  canRun,
  officialCategory,
  officialDepartment,
  officialUrgency,
  departments,
  departmentListUnavailable,
  onReviewCategoryChange,
  onReviewCommentChange,
  onReviewDepartmentSlugChange,
  onReviewUrgencyChange,
  onRunAITriage,
  onSubmitAIReview,
  onSubmitCorrection,
  reviewCategory,
  reviewComment,
  reviewDepartmentSlug,
  reviewValidationError,
  reviewUrgency,
  t,
}: {
  aiResult: AITriageResultResponse | null;
  aiError: AIErrorState | null;
  canReview: boolean;
  canRun: boolean;
  officialCategory: string;
  officialDepartment: string | null;
  officialUrgency: string;
  departments: DepartmentOption[];
  departmentListUnavailable: boolean;
  onReviewCategoryChange: (value: string) => void;
  onReviewCommentChange: (value: string) => void;
  onReviewDepartmentSlugChange: (value: string) => void;
  onReviewUrgencyChange: (value: string) => void;
  onRunAITriage: () => void;
  onSubmitAIReview: (accepted: boolean) => void;
  onSubmitCorrection: (event: FormEvent<HTMLFormElement>) => void;
  reviewCategory: string;
  reviewComment: string;
  reviewDepartmentSlug: string;
  reviewValidationError: string | null;
  reviewUrgency: string;
  t: InternalDictionary;
}) {
  const hasDepartmentOptions = departments.length > 0;
  const selectedDepartmentIsMissing =
    reviewDepartmentSlug.length > 0 &&
    !departments.some((department) => department.slug === reviewDepartmentSlug);

  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">{t.ai.title}</h2>
        {canRun ? (
          <button
            type="button"
            onClick={onRunAITriage}
            className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            {t.ai.generate}
          </button>
        ) : null}
      </div>
      <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        {t.ai.notice}
      </p>
      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-950">
        AI suggestions do not update the official case automatically. A human
        reviewer must accept or correct them.
      </p>

      {!aiResult ? (
        <p className="mt-4 text-sm text-slate-500">{t.ai.empty}</p>
      ) : null}

      {aiError ? (
        <AITriageFailureNotice
          canRetry={canRun}
          error={aiError}
          onRetry={onRunAITriage}
        />
      ) : null}

      {aiResult?.status === "failed" ? (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">{t.ai.failed}</p>
          <p className="mt-2 text-sm leading-6 text-red-800">
            Stored failure reason:{" "}
            {safeStoredFailureReason(aiResult.failureReason) ??
              t.common.unknown}
          </p>
        </div>
      ) : null}

      {aiResult && aiResult.status !== "failed" ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-3">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-950">
                Official case values
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Info label="Official category" value={officialCategory} />
                <Info
                  label="Official department"
                  value={officialDepartment ?? t.common.unassigned}
                />
                <Info label="Official urgency" value={officialUrgency} />
              </div>
            </div>

            <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">
                AI suggested values
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Info
                  label="Suggested category"
                  value={aiResult.suggestedCategory ?? t.common.unknown}
                />
                <Info
                  label="Suggested department"
                  value={
                    aiResult.suggestedDepartment?.name ?? t.common.unassigned
                  }
                />
                <Info
                  label="Suggested urgency"
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
              </div>
            </div>

            <TextPanel label={t.ai.summary} value={aiResult.summary} />
            <TextPanel
              label={t.ai.missingInfo}
              value={
                aiResult.missingInformationJson.length > 0
                  ? aiResult.missingInformationJson.join(", ")
                  : t.common.none
              }
            />
            <TextPanel label={t.ai.reason} value={aiResult.reasoningSummary} />
          </div>

          {canReview ? (
            <form
              onSubmit={onSubmitCorrection}
              className="grid content-start gap-3 rounded-md bg-slate-50 p-4"
            >
              <h3 className="text-sm font-semibold text-slate-950">
                {t.ai.humanReview}
              </h3>
              <label className="grid gap-1 text-sm text-slate-700">
                {t.ai.category}
                <select
                  value={reviewCategory}
                  onChange={(event) =>
                    onReviewCategoryChange(event.target.value)
                  }
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
                {hasDepartmentOptions ? (
                  <select
                    value={reviewDepartmentSlug}
                    onChange={(event) =>
                      onReviewDepartmentSlugChange(event.target.value)
                    }
                    className="rounded-md border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="">No department</option>
                    {selectedDepartmentIsMissing ? (
                      <option value={reviewDepartmentSlug}>
                        Current selection ({reviewDepartmentSlug})
                      </option>
                    ) : null}
                    {departments.map((department) => (
                      <option key={department.id} value={department.slug}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      value={reviewDepartmentSlug}
                      onChange={(event) =>
                        onReviewDepartmentSlugChange(event.target.value)
                      }
                      className="rounded-md border border-slate-300 bg-white px-3 py-2"
                    />
                    {departmentListUnavailable ? (
                      <span className="text-xs leading-5 text-amber-700">
                        Department list is unavailable. Enter the department
                        slug manually.
                      </span>
                    ) : null}
                  </>
                )}
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                {t.ai.urgency}
                <select
                  value={reviewUrgency}
                  onChange={(event) =>
                    onReviewUrgencyChange(event.target.value)
                  }
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                >
                  {caseUrgencies.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm text-slate-700">
                Review comment
                <textarea
                  value={reviewComment}
                  onChange={(event) =>
                    onReviewCommentChange(event.target.value)
                  }
                  rows={4}
                  maxLength={1000}
                  placeholder="Explain why the AI suggestion was accepted or corrected."
                  className="rounded-md border border-slate-300 bg-white px-3 py-2"
                />
              </label>
              {reviewValidationError ? (
                <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">
                  {reviewValidationError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => onSubmitAIReview(true)}
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
          ) : (
            <div className="rounded-md bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">
                {t.ai.humanReview}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                AI review actions are disabled for read-only roles.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function DocumentsCard({
  canUpload,
  caseId,
  documents,
  onUploadDocument,
  t,
}: {
  canUpload: boolean;
  caseId: string;
  documents: CaseDocumentResponse[];
  onUploadDocument: (event: FormEvent<HTMLFormElement>) => void;
  t: InternalDictionary;
}) {
  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">
          {t.documents.title}
        </h2>
        <p className="text-sm text-slate-500">{t.documents.help}</p>
      </div>

      {canUpload ? (
        <form
          onSubmit={onUploadDocument}
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
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          Document upload is disabled for read-only roles.
        </p>
      )}

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
                  {document.mimeType} | {formatFileSize(document.sizeBytes)} |{" "}
                  {new Date(document.createdAt).toLocaleString()}
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
  );
}

function AITriageFailureNotice({
  canRetry,
  error,
  onRetry,
}: {
  canRetry: boolean;
  error: AIErrorState;
  onRetry: () => void;
}) {
  return (
    <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">
        AI triage could not complete
      </p>
      <p className="mt-2 text-sm leading-6 text-red-800">{error.message}</p>
      {canRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900"
        >
          Retry AI triage
        </button>
      ) : null}
    </div>
  );
}

function RecentActivityCard({
  activity,
  error,
  t,
}: {
  activity: CaseActivityResponse[];
  error: string | null;
  t: InternalDictionary;
}) {
  return (
    <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            Recent Activity
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Audit events connected to this case.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      {!error && activity.length === 0 ? (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          No recent activity has been recorded for this case yet.
        </p>
      ) : null}

      {activity.length > 0 ? (
        <ol className="mt-5 grid gap-3">
          {activity.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span
                className="mt-1.5 h-3 w-3 rounded-full bg-slate-950"
                aria-hidden="true"
              />
              <article className="min-w-0 flex-1 rounded-md bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatActivityAction(event.action)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatActivityActor(event.actor, t.common.unknown)}
                    </p>
                  </div>
                  <time className="text-xs text-slate-500">
                    {new Date(event.createdAt).toLocaleString()}
                  </time>
                </div>
                <ActivityMetadataSummary summary={event.metadataSummary} />
              </article>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function ActivityMetadataSummary({
  summary,
}: {
  summary: Record<string, string | number | boolean | null>;
}) {
  const entries = Object.entries(summary);

  if (entries.length === 0) {
    return null;
  }

  return (
    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md bg-white p-3">
          <dt className="text-xs font-medium text-slate-500">
            {formatMetadataKey(key)}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {formatMetadataValue(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TextPanel({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <h3 className="text-sm font-medium text-slate-500">{label}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
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

function formatActivityAction(action: string) {
  const labels: Record<string, string> = {
    "case.created_by_citizen": "Case created",
    "document.uploaded_by_citizen": "Document uploaded by citizen",
    "document.uploaded": "Document uploaded",
    "document.downloaded": "Document downloaded",
    "ai.triage_result_created": "AI triage run",
    "ai.triage_result_failed": "AI triage failed",
    "ai.triage_review_created": "AI review accepted/corrected",
    "case.status_updated": "Status changed",
    "case.internal_note_created": "Internal note added",
  };

  return labels[action] ?? action;
}

function formatActivityActor(
  actor: CaseActivityResponse["actor"],
  unknownLabel: string,
) {
  if (!actor) {
    return unknownLabel;
  }

  const displayName = actor.name ?? actor.email ?? unknownLabel;
  return actor.role ? `${displayName} (${actor.role})` : displayName;
}

function formatMetadataKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

function formatMetadataValue(value: string | number | boolean | null) {
  if (value === null) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

async function buildAITriageError(response: Response): Promise<AIErrorState> {
  const apiError = await readSafeApiError(response);
  const message = apiError?.message ?? "";

  if (
    response.status === 503 ||
    message.toLowerCase().includes("openai_api_key") ||
    message.toLowerCase().includes("provider") ||
    message.toLowerCase().includes("configured")
  ) {
    return {
      kind: "provider_not_configured",
      message:
        "The AI provider is not configured. Check Operations and set the required provider settings before running triage.",
    };
  }

  if (response.status === 408 || message.toLowerCase().includes("timeout")) {
    return {
      kind: "timeout",
      message:
        "The AI provider timed out. Try again, and check provider timeout settings if this keeps happening.",
    };
  }

  if (response.status === 400 || response.status === 422) {
    return {
      kind: "validation_failed",
      message:
        "The AI triage response or request could not be validated. Review the case data and try again.",
    };
  }

  if (response.status >= 500) {
    return {
      kind: "upstream_error",
      message:
        "The AI provider returned an upstream error. Retry triage after the provider is healthy.",
    };
  }

  return {
    kind: "unknown",
    message:
      "AI triage failed. Retry the request or check Operations for provider status.",
  };
}

async function readSafeStatusUpdateError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: {
        message?: string;
      };
    };
    const message = body.error?.message;

    if (message?.startsWith("Invalid status transition")) {
      return message;
    }
  } catch {
    return "Could not update status.";
  }

  return "Could not update status.";
}

async function readSafeApiError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
      };
    };

    return body.error ?? null;
  } catch {
    return null;
  }
}

function classifyStoredAIFailure(
  failureReason: string | null,
): AIErrorState | null {
  if (!failureReason) {
    return {
      kind: "unknown",
      message:
        "AI triage failed. Retry the request or check Operations for provider status.",
    };
  }

  const lowerReason = failureReason.toLowerCase();

  if (lowerReason.includes("timeout")) {
    return {
      kind: "timeout",
      message:
        "The AI provider timed out. Try again, and check provider timeout settings if this keeps happening.",
    };
  }

  if (
    lowerReason.includes("validation") ||
    lowerReason.includes("invalid response")
  ) {
    return {
      kind: "validation_failed",
      message:
        "The AI triage response could not be validated. Review the case data and try again.",
    };
  }

  if (
    lowerReason.includes("api key") ||
    lowerReason.includes("configured") ||
    lowerReason.includes("provider")
  ) {
    return {
      kind: "provider_not_configured",
      message:
        "The AI provider is not configured. Check Operations and set the required provider settings before running triage.",
    };
  }

  return {
    kind: "upstream_error",
    message:
      "The AI provider returned an upstream error. Retry triage after the provider is healthy.",
  };
}

function safeStoredFailureReason(failureReason: string | null) {
  if (!failureReason) {
    return null;
  }

  const safeReasons = [
    "AI provider failed.",
    "Real OpenAI calls are disabled in CI.",
    "OpenAI API key is not configured.",
    "AI provider request timed out.",
    "AI provider returned an invalid response.",
  ];

  return safeReasons.includes(failureReason) ? failureReason : "AI failed.";
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function getStatusTransitionWarning(
  currentStatus: string,
  selectedStatus: string,
) {
  if (currentStatus === selectedStatus) {
    return null;
  }

  if (selectedStatus === "rejected") {
    return null;
  }

  if (currentStatus === "closed" || currentStatus === "rejected") {
    return "This case is already in a terminal status. Backend rules may reject reopening unless explicitly supported.";
  }

  const currentIndex = workflowStatuses.findIndex(
    (item) => item === currentStatus,
  );
  const selectedIndex = workflowStatuses.findIndex(
    (item) => item === selectedStatus,
  );

  if (currentIndex === -1 || selectedIndex === -1) {
    return null;
  }

  if (selectedIndex > currentIndex + 1) {
    return `This selection skips the recommended next workflow step, ${formatStatusLabel(
      workflowStatuses[currentIndex + 1],
    )}. You can still submit it, but review the case history first.`;
  }

  if (selectedIndex < currentIndex) {
    return "This selection moves the case backward in the workflow. You can still submit it, but review the case history first.";
  }

  return null;
}
