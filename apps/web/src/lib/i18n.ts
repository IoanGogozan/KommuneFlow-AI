export const locales = ["nb", "en"] as const;

export type Locale = (typeof locales)[number];

export type IntakeDictionary = {
  languageLabel: string;
  switchLanguage: string;
  badge: string;
  title: string;
  intro: string;
  tenantLabel: string;
  tenantHelp: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  addressLabel: string;
  addressSearch: string;
  addressSearching: string;
  addressSuggestionLabel: string;
  addressConfirm: string;
  addressConfirmed: string;
  addressNoResults: string;
  addressError: string;
  caseTitleLabel: string;
  descriptionLabel: string;
  documentsLabel: string;
  documentsHelp: string;
  privacyLabel: string;
  privacyText: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successText: string;
  caseIdLabel: string;
  caseReferenceLabel: string;
  statusAccessCodeLabel: string;
  statusLookupTitle: string;
  statusLookupText: string;
  statusLookupSubmit: string;
  statusLookupLoading: string;
  statusLookupError: string;
  statusLookupResultTitle: string;
  statusLabel: string;
  updatedLabel: string;
  departmentLabel: string;
  newCase: string;
  error: string;
};

export const dictionaries: Record<Locale, IntakeDictionary> = {
  nb: {
    languageLabel: "Sprak",
    switchLanguage: "English",
    badge: "Innbyggerportal",
    title: "Send inn en henvendelse",
    intro:
      "Beskriv saken din, sa registrerer kommunen den for videre behandling.",
    tenantLabel: "Kommune",
    tenantHelp: "Demo bruker Arendal Kommune.",
    nameLabel: "Navn",
    emailLabel: "E-post",
    phoneLabel: "Telefon",
    addressLabel: "Adresse",
    addressSearch: "Sok adresse",
    addressSearching: "Soker...",
    addressSuggestionLabel: "Foreslatt adresse",
    addressConfirm: "Bekreft adresse",
    addressConfirmed: "Adresse bekreftet",
    addressNoResults: "Fant ingen adresseforslag.",
    addressError: "Kunne ikke validere adressen na.",
    caseTitleLabel: "Tittel",
    descriptionLabel: "Beskrivelse",
    documentsLabel: "Dokumenter",
    documentsHelp: "Valgfritt. Last opp PDF, PNG eller JPG. Maks 10 MB per fil.",
    privacyLabel: "Personvern",
    privacyText:
      "Jeg forstar at opplysningene og eventuelle dokumenter brukes til a registrere og behandle henvendelsen min. Tilgang loggfores, og data kan eksporteres, anonymiseres eller slettes etter kommunens retensjonsregler.",
    submit: "Send inn",
    submitting: "Sender inn...",
    successTitle: "Henvendelsen er registrert",
    successText: "Kommunen har mottatt saken og vil behandle den videre.",
    caseIdLabel: "Saks-ID",
    caseReferenceLabel: "Saksreferanse",
    statusAccessCodeLabel: "Tilgangskode",
    statusLookupTitle: "Sjekk saksstatus",
    statusLookupText:
      "Bruk saksreferansen og tilgangskoden du fikk da saken ble sendt inn.",
    statusLookupSubmit: "Sjekk status",
    statusLookupLoading: "Sjekker...",
    statusLookupError: "Fant ikke saken med denne kombinasjonen.",
    statusLookupResultTitle: "Status for saken",
    statusLabel: "Status",
    updatedLabel: "Sist oppdatert",
    departmentLabel: "Avdeling",
    newCase: "Ny henvendelse",
    error: "Kunne ikke sende inn henvendelsen. Prov igjen.",
  },
  en: {
    languageLabel: "Language",
    switchLanguage: "Norsk",
    badge: "Citizen portal",
    title: "Submit a request",
    intro:
      "Describe your case and the municipality will register it for processing.",
    tenantLabel: "Municipality",
    tenantHelp: "The demo uses Arendal Kommune.",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    addressLabel: "Address",
    addressSearch: "Search address",
    addressSearching: "Searching...",
    addressSuggestionLabel: "Suggested address",
    addressConfirm: "Confirm address",
    addressConfirmed: "Address confirmed",
    addressNoResults: "No address suggestions found.",
    addressError: "Could not validate the address right now.",
    caseTitleLabel: "Title",
    descriptionLabel: "Description",
    documentsLabel: "Documents",
    documentsHelp: "Optional. Upload PDF, PNG, or JPG. Maximum 10 MB per file.",
    privacyLabel: "Privacy",
    privacyText:
      "I understand that my information and any documents are used to register and process this request. Access is audited, and data may be exported, anonymized, or deleted according to the municipality's retention policy.",
    submit: "Submit",
    submitting: "Submitting...",
    successTitle: "Request registered",
    successText: "The municipality has received the case for processing.",
    caseIdLabel: "Case ID",
    caseReferenceLabel: "Case reference",
    statusAccessCodeLabel: "Access code",
    statusLookupTitle: "Check case status",
    statusLookupText:
      "Use the case reference and access code you received after submission.",
    statusLookupSubmit: "Check status",
    statusLookupLoading: "Checking...",
    statusLookupError: "No case was found with that combination.",
    statusLookupResultTitle: "Case status",
    statusLabel: "Status",
    updatedLabel: "Last updated",
    departmentLabel: "Department",
    newCase: "New request",
    error: "Could not submit the request. Please try again.",
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
