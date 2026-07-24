"use client";

import { FormEvent, ReactNode, useState } from "react";
import { getApiBaseUrl } from "@/lib/api";
import type { IntakeDictionary, Locale } from "@/lib/i18n";
import { formatInternalDateTime } from "@/lib/internal-display";
import { EnterPortfolioDemoButton } from "@/components/enter-portfolio-demo-button";

type IntakeFormProps = {
  dictionary: IntakeDictionary;
  locale: Locale;
  initialTenantSlug?: string;
  portfolioMode?: boolean;
  uploadsAllowed?: boolean;
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

export function IntakeForm({
  dictionary,
  locale,
  initialTenantSlug,
  portfolioMode = false,
  uploadsAllowed = true,
}: IntakeFormProps) {
  const initialTenant =
    demoTenants.find((tenant) => tenant.slug === initialTenantSlug) ?? null;
  const [selectedTenant, setSelectedTenant] = useState<DemoTenant | null>(
    initialTenant,
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
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [address, setAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSearchResult["results"]
  >([]);
  const [addressSearchMessage, setAddressSearchMessage] = useState<
    string | null
  >(null);
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
  const [hasNoAddress, setHasNoAddress] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [lastSubmission, setLastSubmission] = useState<SubmissionResult | null>(
    null,
  );
  const [statusCaseReference, setStatusCaseReference] = useState("");
  const [statusAccessCode, setStatusAccessCode] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  function selectTenant(slug: string) {
    const tenant = demoTenants.find((item) => item.slug === slug);

    if (!tenant) {
      setSelectedTenant(null);
      clearAddress();
      return;
    }

    setSelectedTenant(tenant);
    clearAddress();
    setStatusResult(null);
    setStatusLookupError(null);
  }

  async function searchAddress() {
    if (!selectedTenant) {
      return;
    }
    const query = address.trim();
    setAddressSearchMessage(null);
    setAddressSuggestions([]);
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
      const suggestions = result.results.slice(0, 5);
      setAddressSuggestions(suggestions);
      setAddressSearchMessage(
        suggestions.length > 0 ? null : dictionary.addressNoResults,
      );
    } catch {
      setAddressSearchMessage(dictionary.addressError);
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function confirmAddress(suggestion: AddressSearchResult["results"][number]) {
    setAddress(suggestion.normalizedAddress);
    setIsAddressConfirmed(true);
    setHasNoAddress(false);
    setAddressSuggestions([]);
    setAddressSearchMessage(null);
  }

  function clearAddress() {
    setAddress("");
    setAddressSuggestions([]);
    setAddressSearchMessage(null);
    setIsAddressConfirmed(false);
    setHasNoAddress(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selectedTenant) {
      setError(dictionary.tenantRequired);
      return;
    }
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

    if (uploadsAllowed) {
      for (const file of selectedDocuments) {
        if (file.size > 0) {
          requestBody.append("documents", file);
        }
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

      const submission = (await response.json()) as SubmissionResult;
      setResult(submission);
      setLastSubmission(submission);
      form.reset();
      setSelectedDocuments([]);
      clearAddress();
    } catch {
      setError(dictionary.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateSelectedDocuments(files: FileList | null) {
    setError(null);
    if (!files || files.length === 0) {
      setSelectedDocuments([]);
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
    ]);
    const nextFiles = Array.from(files).filter(
      (file) => allowedTypes.has(file.type) && file.size <= 10 * 1024 * 1024,
    );
    if (files.length > 5 || nextFiles.length !== files.length) {
      setSelectedDocuments([]);
      setError(dictionary.documentsValidationError);
      return;
    }
    setSelectedDocuments(nextFiles);
  }

  function removeSelectedDocument(index: number) {
    setSelectedDocuments((files) =>
      files.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  async function handleStatusLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupStatus(statusCaseReference, statusAccessCode);
  }

  async function lookupStatus(caseReference: string, accessCode: string) {
    if (!selectedTenant) {
      setStatusLookupError(dictionary.tenantRequired);
      return;
    }
    setStatusLookupError(null);
    setStatusResult(null);
    setIsCheckingStatus(true);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/public/tenants/${selectedTenant.slug}/cases/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            caseReference,
            statusAccessCode: accessCode,
          }),
        },
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

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(dictionary.copied);
    } catch {
      setCopyFeedback(dictionary.copyFailed);
    }
  }

  async function checkSubmittedCase() {
    if (!result) {
      return;
    }
    const reference = result.caseReference;
    const accessCode = result.statusAccessCode;
    setStatusCaseReference(reference);
    setStatusAccessCode(accessCode);
    setResult(null);
    setActiveTab("status");
    await lookupStatus(reference, accessCode);
  }

  if (result) {
    const employeeDemoUrl = `/internal/cases?search=${encodeURIComponent(result.caseReference)}`;

    return (
      <section className="submission-success border border-[#003b71] bg-white p-6">
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
            value={selectedTenant?.name ?? ""}
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

        <div className="submission-actions mt-6 grid gap-3 sm:grid-cols-2">
          {portfolioMode && selectedTenant ? (
            <EnterPortfolioDemoButton
              className="bg-[#003b71] px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-400"
              idleLabel={dictionary.continueEmployeeDemo}
              loadingLabel={dictionary.enteringEmployeeDemo}
              locale={locale}
              redirectTo={employeeDemoUrl}
              retryLabel={dictionary.retryEmployeeDemo}
              tenantSlug={selectedTenant.slug}
            />
          ) : null}
          <button
            type="button"
            onClick={() => copyValue(result.caseReference)}
            className="border-2 border-[#003b71] bg-white px-4 py-3 text-sm font-semibold text-[#003b71]"
          >
            {dictionary.copyReference}
          </button>
          <button
            type="button"
            onClick={() => copyValue(result.statusAccessCode)}
            className="border-2 border-[#003b71] bg-white px-4 py-3 text-sm font-semibold text-[#003b71]"
          >
            {dictionary.copyAccessCode}
          </button>
          <button
            type="button"
            onClick={checkSubmittedCase}
            className="bg-[#003b71] px-4 py-3 text-sm font-semibold text-white"
          >
            {dictionary.checkThisCase}
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setLastSubmission(null);
              setStatusCaseReference("");
              setStatusAccessCode("");
              setStatusResult(null);
            }}
            className="border-2 border-[#003b71] bg-white px-4 py-3 text-sm font-semibold text-[#003b71]"
          >
            {dictionary.submitAnotherRequest}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="border-2 border-slate-500 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
          >
            {dictionary.printDetails}
          </button>
        </div>
        {copyFeedback ? (
          <p role="status" className="mt-3 text-sm font-medium text-[#003b71]">
            {copyFeedback}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      {portfolioMode ? (
        <aside
          className="border border-sky-300 bg-sky-50 p-4 text-sky-950"
          aria-label={dictionary.portfolioBannerTitle}
        >
          <p className="font-semibold">{dictionary.portfolioBannerTitle}</p>
          <p className="mt-1 text-sm">{dictionary.portfolioBannerText}</p>
        </aside>
      ) : null}
      <div>
        <p className="mb-4 inline-flex bg-[#eaf4fb] px-3 py-1 text-sm font-semibold text-[#003b71]">
          {dictionary.badge}
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-normal text-[#003b71]">
          {activeTab === "submit"
            ? dictionary.title
            : dictionary.statusPageTitle}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
          {activeTab === "submit"
            ? dictionary.intro
            : dictionary.statusPageIntro}
        </p>
      </div>
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
            help={dictionary.sectionContactHelp}
            number={1}
            title={dictionary.sectionContactTitle}
          >
            <label className="text-sm font-medium text-[#003b71]">
              {dictionary.tenantLabel}
            </label>
            <select
              value={selectedTenant?.slug ?? ""}
              onChange={(event) => selectTenant(event.target.value)}
              required
              className="mt-2 w-full border-2 border-[#c8d9e8] bg-white px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:border-[#003b71]"
            >
              <option value="">{dictionary.tenantPlaceholder}</option>
              {demoTenants.map((tenant) => (
                <option key={tenant.slug} value={tenant.slug}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-slate-600">
              {dictionary.tenantHelp}
            </p>
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
            help={dictionary.sectionRequestHelp}
            number={2}
            title={dictionary.sectionRequestTitle}
          >
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#003b71]">
                {dictionary.addressLabel}
              </span>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  aria-label={dictionary.addressLabel}
                  name="address"
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    setIsAddressConfirmed(false);
                    setHasNoAddress(false);
                    setAddressSuggestions([]);
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

            {!isAddressConfirmed && addressSuggestions.length > 0 ? (
              <fieldset className="grid gap-2 border-2 border-[#00876c] bg-[#eefaf6] p-4">
                <legend className="px-1 text-sm font-medium text-[#005f4c]">
                  {dictionary.addressSuggestionLabel}
                </legend>
                {addressSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={`${suggestion.normalizedAddress}-${suggestion.postalCode}`}
                    onClick={() => confirmAddress(suggestion)}
                    className="border border-[#00876c] bg-white p-3 text-left text-sm text-[#005f4c] hover:bg-[#dff5ed]"
                  >
                    <span className="block font-semibold">
                      {suggestion.normalizedAddress}
                    </span>
                    <span className="mt-1 block">
                      {[suggestion.postalCode, suggestion.municipalityName]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                ))}
              </fieldset>
            ) : null}

            <label className="flex items-start gap-3 border border-[#c8d9e8] bg-[#f5f9fc] p-3 text-sm text-[#003b71]">
              <input
                type="checkbox"
                checked={hasNoAddress}
                onChange={(event) => {
                  if (event.target.checked) {
                    clearAddress();
                    setHasNoAddress(true);
                  } else {
                    setHasNoAddress(false);
                  }
                }}
                className="mt-0.5 h-4 w-4"
              />
              {dictionary.addressNotApplicable}
            </label>

            {addressSearchMessage ? (
              <p className="bg-[#eaf4fb] p-3 text-sm text-[#003b71]">
                {addressSearchMessage}
              </p>
            ) : null}

            <Field
              label={dictionary.caseTitleLabel}
              hint={dictionary.caseTitleHint}
              name="title"
              required
            />
            <label className="grid gap-2">
              <span className="text-sm font-medium text-[#003b71]">
                {dictionary.descriptionLabel}
              </span>
              <span className="text-sm text-slate-600">
                {dictionary.descriptionHint}
              </span>
              <textarea
                aria-label={dictionary.descriptionLabel}
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
            number={3}
            title={dictionary.sectionDocumentsTitle}
          >
            {uploadsAllowed ? (
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
                    onChange={(event) =>
                      updateSelectedDocuments(event.target.files)
                    }
                    className="sr-only"
                  />
                  <span className="inline-flex w-fit border-2 border-[#003b71] bg-white px-3 py-2 text-sm font-semibold text-[#003b71]">
                    {dictionary.documentsChooseFiles}
                  </span>
                </label>
                {selectedDocuments.length > 0 ? (
                  <ul
                    className="grid gap-2"
                    aria-label={dictionary.documentsSelected}
                  >
                    {selectedDocuments.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center justify-between gap-3 border border-[#c8d9e8] p-3 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {file.name}
                          </span>
                          <span className="text-slate-600">
                            {formatFileSize(file.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelectedDocument(index)}
                          className="font-semibold text-[#003b71] underline"
                        >
                          {dictionary.documentsRemove}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-slate-600">
                    {dictionary.documentsNoFilesSelected}
                  </span>
                )}
                <span className="text-sm text-slate-600">
                  {dictionary.documentsHelp}
                </span>
              </div>
            ) : (
              <p className="border border-amber-300 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-950">
                {dictionary.documentsDisabled}
              </p>
            )}
          </FormSection>

          <FormSection
            help={dictionary.sectionPrivacyHelp}
            number={4}
            title={dictionary.sectionSubmitTitle}
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
            <details className="border border-[#c8d9e8] p-4 text-sm text-slate-700">
              <summary className="cursor-pointer font-semibold text-[#003b71]">
                {dictionary.privacyDetailsSummary}
              </summary>
              <p className="mt-3 leading-6">{dictionary.privacyDetailsText}</p>
            </details>
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
              value={selectedTenant?.slug ?? ""}
              onChange={(event) => selectTenant(event.target.value)}
              required
              className="border-2 border-[#c8d9e8] bg-white px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:border-[#003b71]"
            >
              <option value="">{dictionary.tenantPlaceholder}</option>
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
              value={statusCaseReference}
              onChange={setStatusCaseReference}
            />
            <Field
              label={dictionary.statusAccessCodeLabel}
              name="statusAccessCode"
              required
              value={statusAccessCode}
              onChange={setStatusAccessCode}
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
            <>
              <dl className="mt-5 grid gap-3 bg-[#f5f9fc] p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">{dictionary.tenantLabel}</dt>
                  <dd className="font-medium text-[#003b71]">
                    {selectedTenant?.name ?? "-"}
                  </dd>
                </div>
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
                  <dt className="text-slate-600">
                    {dictionary.caseTitleLabel}
                  </dt>
                  <dd className="text-right font-medium text-[#003b71]">
                    {statusResult.title}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-600">
                    {dictionary.departmentLabel}
                  </dt>
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
              {portfolioMode && selectedTenant && lastSubmission ? (
                <EnterPortfolioDemoButton
                  className="mt-4 w-full bg-[#003b71] px-4 py-3 text-sm font-semibold text-white disabled:bg-slate-400"
                  idleLabel={dictionary.continueEmployeeDemo}
                  loadingLabel={dictionary.enteringEmployeeDemo}
                  locale={locale}
                  redirectTo={`/internal/cases?search=${encodeURIComponent(lastSubmission.caseReference)}`}
                  retryLabel={dictionary.retryEmployeeDemo}
                  tenantSlug={selectedTenant.slug}
                />
              ) : null}
            </>
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
  hint,
  label,
  name,
  type = "text",
  required = false,
  value,
  onChange,
}: {
  hint?: string;
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-[#003b71]">{label}</span>
      {hint ? <span className="text-sm text-slate-600">{hint}</span> : null}
      <input
        aria-label={label}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        className="border-2 border-[#c8d9e8] px-3 py-2 text-slate-950 outline-none focus:border-[#003b71]"
      />
    </label>
  );
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatPublicStatus(status: string, dictionary: IntakeDictionary) {
  return dictionary.statusLabels[status] ?? status;
}
