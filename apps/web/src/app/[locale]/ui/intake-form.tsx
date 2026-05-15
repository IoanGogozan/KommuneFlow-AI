"use client";

import { FormEvent, ReactNode, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import type { IntakeDictionary, Locale } from "@/lib/i18n";
import { formatInternalDateTime } from "@/lib/internal-display";

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

const demoTenants = [
  { slug: "arendal", name: "Arendal Kommune" },
  { slug: "grimstad", name: "Grimstad Kommune" },
  { slug: "kristiansand", name: "Kristiansand Kommune" },
] as const;

type DemoTenant = (typeof demoTenants)[number];
type PublicPortalTab = "submit" | "status";

export function IntakeForm({ dictionary, locale }: IntakeFormProps) {
  const [selectedTenant, setSelectedTenant] = useState<DemoTenant>(
    demoTenants[2],
  );
  const [activeTab, setActiveTab] = useState<PublicPortalTab>("submit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusLookupError, setStatusLookupError] = useState<string | null>(
    null,
  );
  const [statusResult, setStatusResult] = useState<PublicStatusResult | null>(
    null,
  );
  const [selectedDocumentsText, setSelectedDocumentsText] = useState(
    dictionary.documentsNoFilesSelected,
  );
  const [address, setAddress] = useState("");
  const [addressSuggestion, setAddressSuggestion] = useState<
    AddressSearchResult["results"][number] | null
  >(null);
  const [addressSearchMessage, setAddressSearchMessage] = useState<
    string | null
  >(null);
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  function selectTenant(slug: string) {
    const tenant = demoTenants.find((item) => item.slug === slug);

    if (!tenant) {
      return;
    }

    setSelectedTenant(tenant);
    setAddressSuggestion(null);
    setAddressSearchMessage(null);
    setIsAddressConfirmed(false);
    setStatusResult(null);
    setStatusLookupError(null);
  }

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
        `${getApiBaseUrl()}/public/tenants/${selectedTenant.slug}/integrations/kartverket/address-search?q=${encodeURIComponent(query)}`,
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
    setAddressSuggestion(null);
    setAddressSearchMessage(null);
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
        `${getApiBaseUrl()}/public/tenants/${selectedTenant.slug}/cases`,
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
      setSelectedDocumentsText(dictionary.documentsNoFilesSelected);
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

  function updateSelectedDocuments(files: FileList | null) {
    if (!files || files.length === 0) {
      setSelectedDocumentsText(dictionary.documentsNoFilesSelected);
      return;
    }

    const fileNames = Array.from(files).map((file) => file.name);
    setSelectedDocumentsText(fileNames.join(", "));
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
        `${getApiBaseUrl()}/public/tenants/${selectedTenant.slug}/cases/status?${query.toString()}`,
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
      <section className="border border-[#003b71] bg-white p-6">
        <div className="bg-[#eaf4fb] p-4">
          <h2 className="text-2xl font-semibold text-[#003b71]">
            {dictionary.successTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-800">
            {dictionary.successText}
          </p>
        </div>

        <dl className="mt-6 grid gap-3 bg-[#f5f9fc] p-4 sm:grid-cols-2">
          <InfoItem
            label={dictionary.caseReferenceLabel}
            value={result.caseReference}
          />
          <InfoItem
            label={dictionary.statusAccessCodeLabel}
            value={result.statusAccessCode}
            valueClassName="font-mono"
          />
          <InfoItem
            label={dictionary.successMunicipalityLabel}
            value={selectedTenant.name}
          />
          <InfoItem
            label={dictionary.statusLabel}
            value={formatPublicStatus(result.status, dictionary)}
          />
        </dl>

        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
          {dictionary.successSaveCodeWarning}
        </p>

        <div className="mt-4 border-2 border-[#c8d9e8] bg-white p-4">
          <h3 className="text-sm font-semibold text-[#003b71]">
            {dictionary.successNextStepsLabel}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            {dictionary.successNextStepsText}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setResult(null);
            setActiveTab("status");
          }}
          className="mt-6 bg-[#003b71] px-4 py-3 text-sm font-semibold text-white hover:bg-[#002f5a]"
        >
          {dictionary.statusLookupSubmit}
        </button>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="ml-3 mt-6 border-2 border-[#003b71] bg-white px-4 py-3 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]"
        >
          {dictionary.newCase}
        </button>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <div
        className="grid gap-2 border border-[#003b71] bg-white p-1.5 sm:grid-cols-2"
        role="tablist"
        aria-label={dictionary.title}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "submit"}
          onClick={() => setActiveTab("submit")}
          className={
            activeTab === "submit"
              ? "bg-[#003b71] px-4 py-2.5 text-sm font-semibold text-white"
              : "px-4 py-2.5 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]"
          }
        >
          {dictionary.submitNewRequestTab}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "status"}
          onClick={() => setActiveTab("status")}
          className={
            activeTab === "status"
              ? "bg-[#003b71] px-4 py-2.5 text-sm font-semibold text-white"
              : "px-4 py-2.5 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]"
          }
        >
          {dictionary.checkExistingCaseTab}
        </button>
      </div>

      {activeTab === "submit" ? (
        <form
          onSubmit={handleSubmit}
          className="border border-[#003b71] bg-white p-4 sm:p-5"
        >
        <FormSection
          help={dictionary.sectionMunicipalityHelp}
          number={1}
          title={dictionary.tenantLabel}
        >
          <label className="text-sm font-medium text-[#003b71]">
            {dictionary.tenantLabel}
          </label>
          <select
            value={selectedTenant.slug}
            onChange={(event) => selectTenant(event.target.value)}
            className="mt-2 w-full border-2 border-[#c8d9e8] bg-white px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:border-[#003b71]"
          >
            {demoTenants.map((tenant) => (
              <option key={tenant.slug} value={tenant.slug}>
                {tenant.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-slate-600">{dictionary.tenantHelp}</p>
        </FormSection>

        <FormSection
          help={dictionary.sectionContactHelp}
          number={2}
          title={dictionary.sectionContactTitle}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={dictionary.nameLabel} name="name" required />
            <Field
              label={dictionary.emailLabel}
              name="email"
              type="email"
              required
            />
            <Field label={dictionary.phoneLabel} name="phone" />
          </div>
        </FormSection>

        <FormSection
          help={dictionary.sectionAddressHelp}
          number={3}
          title={dictionary.sectionAddressTitle}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#003b71]">
              {dictionary.addressLabel}
            </span>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                name="address"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  setIsAddressConfirmed(false);
                  setAddressSuggestion(null);
                  setAddressSearchMessage(null);
                }}
                className="border-2 border-[#c8d9e8] px-3 py-2 text-slate-950 outline-none focus:border-[#003b71]"
              />
              <button
                type="button"
                onClick={searchAddress}
                disabled={isSearchingAddress}
                className="border-2 border-[#003b71] bg-white px-4 py-2 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb] disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
              >
                {isSearchingAddress
                  ? dictionary.addressSearching
                  : dictionary.addressSearch}
              </button>
            </div>
          </label>

          {isAddressConfirmed ? (
            <section className="border-2 border-[#00876c] bg-[#eefaf6] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#005f4c]">
                    {dictionary.addressConfirmed}
                  </p>
                  <p className="mt-1 text-sm text-[#005f4c]">{address}</p>
                  <p className="mt-2 text-sm leading-6 text-[#005f4c]">
                    {dictionary.addressConfirmedHelp}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddressConfirmed(false)}
                  className="border-2 border-[#00876c] bg-white px-3 py-2 text-sm font-semibold text-[#005f4c] hover:bg-[#dff5ed]"
                >
                  {dictionary.addressChange}
                </button>
              </div>
            </section>
          ) : null}

          {!isAddressConfirmed && addressSuggestion ? (
            <section className="border-2 border-[#00876c] bg-[#eefaf6] p-4">
              <p className="text-sm font-medium text-[#005f4c]">
                {dictionary.addressSuggestionLabel}
              </p>
              <p className="mt-1 text-sm text-[#005f4c]">
                {addressSuggestion.normalizedAddress}
              </p>
              <button
                type="button"
                onClick={confirmAddress}
                className="mt-3 bg-[#007f66] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006b56]"
              >
                {dictionary.addressConfirm}
              </button>
            </section>
          ) : null}

          {addressSearchMessage ? (
            <p className="bg-[#eaf4fb] p-3 text-sm text-[#003b71]">
              {addressSearchMessage}
            </p>
          ) : null}
        </FormSection>

        <FormSection
          help={dictionary.sectionRequestHelp}
          number={4}
          title={dictionary.sectionRequestTitle}
        >
          <Field label={dictionary.caseTitleLabel} name="title" required />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#003b71]">
              {dictionary.descriptionLabel}
            </span>
            <textarea
              name="description"
              required
              minLength={20}
              rows={7}
              className="min-h-40 border-2 border-[#c8d9e8] px-3 py-2 text-slate-950 outline-none focus:border-[#003b71]"
            />
          </label>
        </FormSection>

        <FormSection
          help={dictionary.sectionDocumentsHelp}
          number={5}
          title={dictionary.sectionDocumentsTitle}
        >
          <div className="grid gap-2">
            <span className="text-sm font-medium text-[#003b71]">
              {dictionary.documentsLabel}
            </span>
            <label className="flex cursor-pointer flex-col gap-3 border-2 border-dashed border-[#c8d9e8] bg-[#f5f9fc] px-4 py-4 hover:border-[#003b71] hover:bg-white sm:flex-row sm:items-center">
              <input
                name="documents"
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg"
                onChange={(event) => updateSelectedDocuments(event.target.files)}
                className="sr-only"
              />
              <span className="inline-flex w-fit border-2 border-[#003b71] bg-white px-3 py-2 text-sm font-semibold text-[#003b71]">
                {dictionary.documentsChooseFiles}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                {selectedDocumentsText}
              </span>
            </label>
            <span className="text-sm text-slate-600">
              {dictionary.documentsHelp}
            </span>
          </div>
        </FormSection>

        <FormSection
          help={dictionary.sectionPrivacyHelp}
          number={6}
          title={dictionary.sectionPrivacyTitle}
        >
          <label className="flex gap-3 border-2 border-[#c8d9e8] bg-[#f5f9fc] p-4">
            <input
              name="privacyAccepted"
              type="checkbox"
              required
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium text-[#003b71]">
                {dictionary.privacyLabel}
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-700">
                {dictionary.privacyText}
              </span>
            </span>
          </label>
        </FormSection>

        <FormSection
          help={dictionary.sectionSubmitHelp}
          number={7}
          title={dictionary.sectionSubmitTitle}
        >
          {error ? (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#003b71] px-4 py-3 text-sm font-semibold text-white hover:bg-[#002f5a] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? dictionary.submitting : dictionary.submit}
          </button>
        </FormSection>
        </form>
      ) : null}

      {activeTab === "status" ? (
        <form
          onSubmit={handleStatusLookup}
          className="border border-[#003b71] bg-white p-4 sm:p-5"
        >
        <h2 className="text-xl font-semibold text-[#003b71]">
          {dictionary.statusLookupTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {dictionary.statusLookupText}
        </p>
        <p className="mt-3 bg-[#eaf4fb] p-3 text-sm leading-6 text-[#003b71]">
          {dictionary.statusLookupRequirements}
        </p>
        <label className="mt-4 grid gap-2">
          <span className="text-sm font-medium text-[#003b71]">
            {dictionary.tenantLabel}
          </span>
          <select
            value={selectedTenant.slug}
            onChange={(event) => selectTenant(event.target.value)}
            className="border-2 border-[#c8d9e8] bg-white px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:border-[#003b71]"
          >
            {demoTenants.map((tenant) => (
              <option key={tenant.slug} value={tenant.slug}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
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
          className="mt-5 bg-[#003b71] px-4 py-3 text-sm font-semibold text-white hover:bg-[#002f5a] disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isCheckingStatus
            ? dictionary.statusLookupLoading
            : dictionary.statusLookupSubmit}
        </button>
        {statusLookupError ? (
          <p className="mt-4 text-sm text-red-700">{statusLookupError}</p>
        ) : null}
        {statusResult ? (
          <dl className="mt-5 grid gap-3 bg-[#f5f9fc] p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">
                {dictionary.caseReferenceLabel}
              </dt>
              <dd className="break-all text-right font-medium text-[#003b71]">
                {statusResult.caseReference}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{dictionary.statusLabel}</dt>
              <dd className="font-medium text-[#003b71]">
                {formatPublicStatus(statusResult.status, dictionary)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{dictionary.caseTitleLabel}</dt>
              <dd className="text-right font-medium text-[#003b71]">
                {statusResult.title}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{dictionary.departmentLabel}</dt>
              <dd className="font-medium text-[#003b71]">
                {statusResult.assignedDepartmentName ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-600">{dictionary.updatedLabel}</dt>
              <dd className="font-medium text-[#003b71]">
                {formatInternalDateTime(statusResult.updatedAt)}
              </dd>
            </div>
          </dl>
        ) : null}
        </form>
      ) : null}
    </div>
  );
}

function FormSection({
  children,
  help,
  number,
  title,
}: {
  children: ReactNode;
  help: string;
  number: number;
  title: string;
}) {
  return (
    <section className="mt-4 border-t border-[#c8d9e8] pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-start gap-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#003b71] text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {number}
        </span>
        <div>
          <h2 className="text-base font-semibold text-[#003b71] sm:text-lg">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">{help}</p>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function InfoItem({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white p-3">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      <dd
        className={`mt-1 break-all text-sm font-semibold text-[#003b71] ${valueClassName}`}
      >
        {value}
      </dd>
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
      <span className="text-sm font-medium text-[#003b71]">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="border-2 border-[#c8d9e8] px-3 py-2 text-slate-950 outline-none focus:border-[#003b71]"
      />
    </label>
  );
}

function formatPublicStatus(status: string, dictionary: IntakeDictionary) {
  return dictionary.statusLabels[status] ?? status;
}
