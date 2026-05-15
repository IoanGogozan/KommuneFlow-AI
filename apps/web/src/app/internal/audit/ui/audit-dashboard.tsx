"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth";
import { getApiBaseUrl } from "@/lib/api";
import { formatInternalDateTime } from "@/lib/internal-display";
import type { InternalDictionary } from "@/lib/internal-i18n";
import { useInternalI18n } from "@/lib/internal-locale";
import { useInternalSession } from "@/lib/use-internal-session";
import { AccessDenied } from "../../ui/access-denied";
import { InternalShell } from "../../ui/internal-shell";

type AuditEventResponse = {
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

type AuditFilters = {
  action: string;
  actor: string;
  from: string;
  to: string;
};

const eventTypeOptions = [
  "",
  "case.created_by_citizen",
  "case.status_updated",
  "case.internal_note_created",
  "document.uploaded",
  "document.uploaded_by_citizen",
  "document.downloaded",
  "ai.triage_result_created",
  "ai.triage_result_failed",
  "ai.triage_review_created",
];

export function AuditDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const {
    currentUser,
    error: sessionError,
    loading: sessionLoading,
    hasPermission,
  } = useInternalSession();
  const [events, setEvents] = useState<AuditEventResponse[]>([]);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canReadAudit = hasPermission("audit:read");

  async function loadEvents(filters: AuditFilters = { action, actor, from, to }) {
    if (!currentUser || !canReadAudit) {
      return;
    }

    setError(null);
    const query = new URLSearchParams();

    if (filters.action) {
      query.set("action", filters.action);
    }
    if (filters.actor.trim()) {
      query.set("actor", filters.actor.trim());
    }
    if (filters.from) {
      query.set("from", filters.from);
    }
    if (filters.to) {
      query.set("to", filters.to);
    }

    const response = await fetch(
      `${getApiBaseUrl()}/audit/events${query.size > 0 ? `?${query}` : ""}`,
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
      setError(t.audit.loadEventsError);
      return;
    }

    setEvents((await response.json()) as AuditEventResponse[]);
  }

  useEffect(() => {
    if (sessionLoading || !currentUser || !canReadAudit) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canReadAudit, currentUser, sessionLoading]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadEvents();
  }

  function clearFilters() {
    setAction("");
    setActor("");
    setFrom("");
    setTo("");
    void loadEvents({ action: "", actor: "", from: "", to: "" });
  }

  if (sessionLoading || !currentUser) {
    return (
      <InternalShell
        currentUser={currentUser ?? undefined}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.audit.title}
      >
        <p className="mt-6 text-sm text-slate-600">
          {sessionError ? t.audit.loadPageError : t.cases.loading}
        </p>
      </InternalShell>
    );
  }

  if (!canReadAudit) {
    return (
      <InternalShell
        currentUser={currentUser}
        locale={locale}
        setLocale={setLocale}
        t={t}
        title={t.audit.title}
      >
        <AccessDenied
          currentRole={currentUser.role}
          requiredPermission="audit:read"
        />
      </InternalShell>
    );
  }

  return (
    <InternalShell
      currentUser={currentUser}
      locale={locale}
      setLocale={setLocale}
      t={t}
      title={t.audit.title}
    >
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {t.audit.sectionTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {t.audit.description} {currentUser.tenant.name}.
            </p>
          </div>
        </div>

        <form
          onSubmit={applyFilters}
          className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_auto_auto]"
        >
          <label className="grid gap-1 text-sm text-slate-700">
            {t.audit.eventType}
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            >
              {eventTypeOptions.map((item) => (
                <option key={item || "all"} value={item}>
                  {item ? formatActionLabel(item, t) : t.audit.allEvents}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            {t.audit.actor}
            <input
              value={actor}
              onChange={(event) => setActor(event.target.value)}
              placeholder={t.audit.actorPlaceholder}
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            {t.audit.from}
            <input
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              type="date"
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            {t.audit.to}
            <input
              value={to}
              onChange={(event) => setTo(event.target.value)}
              type="date"
              className="rounded-md border border-slate-300 bg-white px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            {t.audit.apply}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="self-end rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
          >
            {t.common.clear}
          </button>
        </form>
      </section>

      {error ? (
        <p className="mt-5 rounded-md bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {events.length === 0 && !error ? (
          <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">
            {t.audit.empty}
          </p>
        ) : null}

        {events.length > 0 ? (
          <ol className="grid gap-3">
            {events.map((event) => (
              <li key={event.id} className="rounded-md bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {formatActionLabel(event.action, t)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {event.entityType} | {event.entityId}
                    </p>
                  </div>
                  <time className="text-xs text-slate-500">
                    {formatInternalDateTime(event.createdAt)}
                  </time>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {t.audit.actor}: {formatActor(event.actor, t)}
                </p>
                <MetadataSummary summary={event.metadataSummary} t={t} />
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </InternalShell>
  );
}

function MetadataSummary({
  summary,
  t,
}: {
  summary: Record<string, string | number | boolean | null>;
  t: InternalDictionary;
}) {
  const entries = Object.entries(summary);

  if (entries.length === 0) {
    return null;
  }

  return (
    <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-md bg-white p-3">
          <dt className="text-xs font-medium text-slate-500">
            {formatMetadataKey(key)}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {formatMetadataValue(value, t)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function formatActor(actor: AuditEventResponse["actor"], t: InternalDictionary) {
  if (!actor) {
    return t.audit.systemOrCitizen;
  }

  const label = actor.name ?? actor.email ?? t.common.unknown;
  return actor.role ? `${label} (${actor.role})` : label;
}

function formatActionLabel(action: string, t: InternalDictionary) {
  return (t.audit.actionLabels as Record<string, string>)[action] ?? action;
}

function formatMetadataKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase();
}

function formatMetadataValue(
  value: string | number | boolean | null,
  t: InternalDictionary,
) {
  if (value === null) {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? t.common.yes : t.common.no;
  }

  return String(value);
}
