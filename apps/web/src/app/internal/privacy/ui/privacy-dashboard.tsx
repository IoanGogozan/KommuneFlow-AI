"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { clearSession } from "@/lib/auth";
import { useInternalI18n } from "@/lib/internal-locale";
import { InternalShell } from "../../ui/internal-shell";

type Result = Record<string, unknown> | null;

type PrivacyStatus = {
  status: string;
  capabilities: Record<string, boolean>;
};

type RetentionPolicy = {
  closedCaseRetentionDays: number;
  deletedDocumentRetentionDays: number;
  auditEventRetentionDays: number;
  analyticsRetentionDays: number;
};

export function PrivacyDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useInternalI18n();
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [policy, setPolicy] = useState<RetentionPolicy | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  async function callPrivacy(
    path: string,
    options: RequestInit = {},
  ): Promise<Result> {
    setError(null);
    setIsWorking(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...options,
        credentials: "include",
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...options.headers,
        },
      });

      if (response.status === 401) {
        await clearSession();
        router.push("/internal/login");
        return null;
      }

      if (response.status === 403) {
        setError(t.privacy.forbidden);
        return null;
      }

      if (!response.ok) {
        setError(t.privacy.error);
        return null;
      }

      return (await response.json()) as Result;
    } finally {
      setIsWorking(false);
    }
  }

  async function loadPrivacyContext() {
    const loadedStatus = (await callPrivacy(
      "/privacy/status",
    )) as PrivacyStatus | null;
    setStatus(loadedStatus);

    const loadedPolicy = (await callPrivacy(
      "/privacy/retention-policy",
    )) as RetentionPolicy | null;
    setPolicy(loadedPolicy);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPrivacyContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = new URLSearchParams();
    const email = String(formData.get("email") ?? "").trim();
    const citizenProfileId = String(
      formData.get("citizenProfileId") ?? "",
    ).trim();

    if (citizenProfileId) {
      query.set("citizenProfileId", citizenProfileId);
    } else {
      query.set("email", email);
    }

    setResult(await callPrivacy(`/privacy/citizen-data-export?${query}`));
  }

  async function anonymize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const citizenProfileId = String(
      formData.get("citizenProfileId") ?? "",
    ).trim();

    setResult(
      await callPrivacy(
        `/privacy/citizen-profiles/${citizenProfileId}/anonymize`,
        {
          method: "POST",
        },
      ),
    );
  }

  async function updatePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      closedCaseRetentionDays: Number(formData.get("closedCaseRetentionDays")),
      deletedDocumentRetentionDays: Number(
        formData.get("deletedDocumentRetentionDays"),
      ),
      auditEventRetentionDays: Number(formData.get("auditEventRetentionDays")),
      analyticsRetentionDays: Number(formData.get("analyticsRetentionDays")),
    };
    const updated = (await callPrivacy("/privacy/retention-policy", {
      method: "PATCH",
      body: JSON.stringify(payload),
    })) as RetentionPolicy | null;

    if (updated) {
      setPolicy(updated);
      setResult(updated as unknown as Result);
    }
  }

  async function retentionCleanup(confirm: boolean) {
    setResult(
      await callPrivacy("/privacy/retention-cleanup", {
        method: "POST",
        body: JSON.stringify({ confirm }),
      }),
    );
  }

  return (
    <InternalShell
      locale={locale}
      setLocale={setLocale}
      t={t}
      title={t.privacy.title}
    >
      <p className="mt-5 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        {t.privacy.readOnly}
      </p>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title={t.privacy.statusTitle}>
          {status ? (
            <div className="grid gap-2">
              <Row label="status" value={status.status} />
              <h3 className="pt-2 text-sm font-semibold text-slate-700">
                {t.privacy.capabilities}
              </h3>
              {Object.entries(status.capabilities).map(([name, enabled]) => (
                <Row
                  key={name}
                  label={name}
                  value={enabled ? "enabled" : "disabled"}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              {isWorking ? t.privacy.loadingStatus : t.common.missing}
            </p>
          )}
        </Panel>

        <Panel title={t.privacy.retentionPolicyTitle}>
          <form onSubmit={updatePolicy} className="grid gap-3 sm:grid-cols-2">
            <NumberField
              label={t.privacy.closedCaseRetentionDays}
              name="closedCaseRetentionDays"
              value={policy?.closedCaseRetentionDays}
            />
            <NumberField
              label={t.privacy.deletedDocumentRetentionDays}
              name="deletedDocumentRetentionDays"
              value={policy?.deletedDocumentRetentionDays}
            />
            <NumberField
              label={t.privacy.auditEventRetentionDays}
              name="auditEventRetentionDays"
              value={policy?.auditEventRetentionDays}
            />
            <NumberField
              label={t.privacy.analyticsRetentionDays}
              name="analyticsRetentionDays"
              value={policy?.analyticsRetentionDays}
            />
            <div className="sm:col-span-2">
              <SubmitButton
                label={t.privacy.savePolicy}
                loadingLabel={t.privacy.loading}
                isWorking={isWorking}
              />
            </div>
          </form>
        </Panel>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel title={t.privacy.exportTitle}>
          <form onSubmit={exportData} className="grid gap-3">
            <Field label={t.privacy.email} name="email" type="email" />
            <Field label={t.privacy.citizenProfileId} name="citizenProfileId" />
            <SubmitButton
              label={t.privacy.export}
              loadingLabel={t.privacy.loading}
              isWorking={isWorking}
            />
          </form>
        </Panel>

        <Panel title={t.privacy.anonymizeTitle}>
          <form onSubmit={anonymize} className="grid gap-3">
            <Field
              label={t.privacy.citizenProfileId}
              name="citizenProfileId"
              required
            />
            <SubmitButton
              label={t.privacy.anonymize}
              loadingLabel={t.privacy.loading}
              isWorking={isWorking}
            />
          </form>
        </Panel>

        <Panel title={t.privacy.retentionTitle}>
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => void retentionCleanup(false)}
              disabled={isWorking}
              className="rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isWorking ? t.privacy.loading : t.privacy.dryRun}
            </button>
            <button
              type="button"
              onClick={() => void retentionCleanup(true)}
              disabled={isWorking}
              className="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isWorking ? t.privacy.loading : t.privacy.cleanup}
            </button>
          </div>
        </Panel>
      </section>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          {t.privacy.result}
        </h2>
        <pre className="mt-4 max-h-[32rem] overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify(result ?? {}, null, 2)}
        </pre>
      </section>
    </InternalShell>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-950">{value}</span>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-600"
      />
    </label>
  );
}

function NumberField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        key={`${name}-${value ?? "empty"}`}
        name={name}
        type="number"
        min="1"
        max="36500"
        defaultValue={value}
        required
        className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-600"
      />
    </label>
  );
}

function SubmitButton({
  label,
  loadingLabel,
  isWorking,
}: {
  label: string;
  loadingLabel: string;
  isWorking: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={isWorking}
      className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
    >
      {isWorking ? loadingLabel : label}
    </button>
  );
}
