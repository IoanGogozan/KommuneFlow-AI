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
  caseReference: string;
  statusAccessCode: string;
  status: string;
  createdAt: string;
};

type PublicStatusResult = {
  caseReference: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedDepartmentName: string | null;
};

type AddressSearchResult = {
  results: Array<{
    normalizedAddress: string;
    municipalityCode: string | null;
    municipalityName: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  }>;
};

export function IntakeForm({ dictionary, locale }: IntakeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLookupError, setStatusLookupError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<PublicStatusResult | null>(
    null,
  );
  const [address, setAddress] = useState("");
  const [addressSuggestion, setAddressSuggestion] =
    useState<AddressSearchResult["results"][number] | null>(null);
  const [addressSearchMessage, setAddressSearchMessage] = useState<string | null>(
    null,
  );
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function searchAddress() {
    const query = address.trim();
    setAddressSearchMessage(null);
    setAddressSuggestion(null);
    setIsAddressConfirmed(false);

    if (query.length < 3) {
      setAddressSearchMessage(dictionary.addressNoResults);
      return;
    }

    setIsSearchingAddress(true);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/public/tenants/arendal/integrations/kartverket/address-search?q=${encodeURIComponent(query)}`,
      );

      if (!response.ok) {
        throw new Error("Address search failed");
      }

      const result = (await response.json()) as AddressSearchResult;
      const firstSuggestion = result.results[0] ?? null;
      setAddressSuggestion(firstSuggestion);
      setAddressSearchMessage(
        firstSuggestion ? null : dictionary.addressNoResults,
      );
    } catch {
      setAddressSearchMessage(dictionary.addressError);
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function confirmAddress() {
    if (!addressSuggestion) {
      return;
    }

    setAddress(addressSuggestion.normalizedAddress);
    setIsAddressConfirmed(true);
  }

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
        address,
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
      setAddress("");
      setAddressSuggestion(null);
      setAddressSearchMessage(null);
      setIsAddressConfirmed(false);
    } catch {
      setError(dictionary.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusLookupError(null);
    setStatusResult(null);
    setIsCheckingStatus(true);

    const formData = new FormData(event.currentTarget);
    const caseReference = String(formData.get("caseReference") ?? "");
    const statusAccessCode = String(formData.get("statusAccessCode") ?? "");
    const query = new URLSearchParams({ caseReference, statusAccessCode });

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/public/tenants/arendal/cases/status?${query.toString()}`,
      );

      if (!response.ok) {
        setStatusLookupError(dictionary.statusLookupError);
        return;
      }

      setStatusResult((await response.json()) as PublicStatusResult);
    } catch {
      setStatusLookupError(dictionary.statusLookupError);
    } finally {
      setIsCheckingStatus(false);
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
            {dictionary.caseReferenceLabel}
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-slate-950">
            {result.caseReference}
          </dd>
          <dt className="mt-4 text-sm font-medium text-slate-500">
            {dictionary.statusAccessCodeLabel}
          </dt>
          <dd className="mt-1 break-all font-mono text-sm text-slate-950">
            {result.statusAccessCode}
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
    <div className="grid gap-5">
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
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">
            {dictionary.addressLabel}
          </span>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              name="address"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
                setIsAddressConfirmed(false);
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-600"
            />
            <button
              type="button"
              onClick={searchAddress}
              disabled={isSearchingAddress}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isSearchingAddress
                ? dictionary.addressSearching
                : dictionary.addressSearch}
            </button>
          </div>
        </label>
      </div>

      {addressSuggestion ? (
        <section className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-950">
            {dictionary.addressSuggestionLabel}
          </p>
          <p className="mt-1 text-sm text-emerald-900">
            {addressSuggestion.normalizedAddress}
          </p>
          <button
            type="button"
            onClick={confirmAddress}
            className="mt-3 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {isAddressConfirmed
              ? dictionary.addressConfirmed
              : dictionary.addressConfirm}
          </button>
        </section>
      ) : null}

      {addressSearchMessage ? (
        <p className="mt-3 text-sm text-slate-600">{addressSearchMessage}</p>
      ) : null}

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

      <form
        onSubmit={handleStatusLookup}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="text-xl font-semibold text-slate-950">
          {dictionary.statusLookupTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {dictionary.statusLookupText}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label={dictionary.caseReferenceLabel}
            name="caseReference"
            required
          />
          <Field
            label={dictionary.statusAccessCodeLabel}
            name="statusAccessCode"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isCheckingStatus}
          className="mt-5 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isCheckingStatus
            ? dictionary.statusLookupLoading
            : dictionary.statusLookupSubmit}
        </button>
        {statusLookupError ? (
          <p className="mt-4 text-sm text-red-700">{statusLookupError}</p>
        ) : null}
        {statusResult ? (
          <dl className="mt-5 grid gap-3 rounded-md bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{dictionary.statusLabel}</dt>
              <dd className="font-medium text-slate-950">
                {statusResult.status}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{dictionary.caseTitleLabel}</dt>
              <dd className="text-right font-medium text-slate-950">
                {statusResult.title}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{dictionary.departmentLabel}</dt>
              <dd className="font-medium text-slate-950">
                {statusResult.assignedDepartmentName ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{dictionary.updatedLabel}</dt>
              <dd className="font-medium text-slate-950">
                {new Date(statusResult.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        ) : null}
      </form>
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
