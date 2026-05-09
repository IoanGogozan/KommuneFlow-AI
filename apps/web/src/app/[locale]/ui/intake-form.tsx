"use client";

import { FormEvent, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import type { IntakeDictionary, Locale } from "@/lib/i18n";

type IntakeFormProps = {
  dictionary: IntakeDictionary;
  locale: Locale;
};

type SubmissionResult = {
  caseId: string;
  status: string;
  createdAt: string;
};

export function IntakeForm({ dictionary, locale }: IntakeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      citizen: {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
      },
      case: {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        sourceLanguage: locale,
      },
      privacyAccepted: formData.get("privacyAccepted") === "on",
    };
    const requestBody = new FormData();
    requestBody.set("payload", JSON.stringify(payload));

    for (const file of formData.getAll("documents")) {
      if (file instanceof File && file.size > 0) {
        requestBody.append("documents", file);
      }
    }

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/public/tenants/arendal/cases`,
        {
          method: "POST",
          body: requestBody,
        },
      );

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setResult((await response.json()) as SubmissionResult);
      form.reset();
    } catch {
      setError(dictionary.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-950">
          {dictionary.successTitle}
        </h2>
        <p className="mt-3 text-slate-600">{dictionary.successText}</p>
        <dl className="mt-6 rounded-md bg-slate-50 p-4">
          <dt className="text-sm font-medium text-slate-500">
            {dictionary.caseIdLabel}
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-slate-950">
            {result.caseId}
          </dd>
        </dl>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-6 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {dictionary.newCase}
        </button>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4">
        <label className="text-sm font-medium text-slate-700">
          {dictionary.tenantLabel}
        </label>
        <p className="mt-1 text-base font-semibold text-slate-950">
          Arendal Kommune
        </p>
        <p className="mt-1 text-sm text-slate-500">{dictionary.tenantHelp}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={dictionary.nameLabel} name="name" required />
        <Field label={dictionary.emailLabel} name="email" type="email" required />
        <Field label={dictionary.phoneLabel} name="phone" />
        <Field label={dictionary.addressLabel} name="address" />
      </div>

      <div className="mt-4 grid gap-4">
        <Field label={dictionary.caseTitleLabel} name="title" required />
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">
            {dictionary.descriptionLabel}
          </span>
          <textarea
            name="description"
            required
            minLength={20}
            rows={7}
            className="min-h-40 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-600"
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-medium text-slate-700">
          {dictionary.documentsLabel}
        </span>
        <input
          name="documents"
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-600"
        />
        <span className="text-sm text-slate-500">{dictionary.documentsHelp}</span>
      </label>

      <label className="mt-5 flex gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
        <input
          name="privacyAccepted"
          type="checkbox"
          required
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-slate-800">
            {dictionary.privacyLabel}
          </span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            {dictionary.privacyText}
          </span>
        </span>
      </label>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? dictionary.submitting : dictionary.submit}
      </button>
    </form>
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
