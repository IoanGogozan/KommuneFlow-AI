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
  submitNewRequestTab: string;
  checkExistingCaseTab: string;
  sectionMunicipalityHelp: string;
  sectionContactTitle: string;
  sectionContactHelp: string;
  sectionAddressTitle: string;
  sectionAddressHelp: string;
  sectionRequestTitle: string;
  sectionRequestHelp: string;
  sectionDocumentsTitle: string;
  sectionDocumentsHelp: string;
  sectionPrivacyTitle: string;
  sectionPrivacyHelp: string;
  sectionSubmitTitle: string;
  sectionSubmitHelp: string;
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
  successSaveCodeWarning: string;
  successMunicipalityLabel: string;
  successNextStepsLabel: string;
  successNextStepsText: string;
  caseIdLabel: string;
  caseReferenceLabel: string;
  statusAccessCodeLabel: string;
  statusLookupTitle: string;
  statusLookupText: string;
  statusLookupRequirements: string;
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
    languageLabel: "Språk",
    switchLanguage: "English",
    badge: "Innbyggerportal",
    title: "Send inn en henvendelse",
    intro:
      "Beskriv saken din, så registrerer kommunen den for videre behandling.",
    tenantLabel: "Kommune",
    tenantHelp:
      "Velg kommunen saken gjelder. Henvendelsen lagres hos valgt kommune.",
    submitNewRequestTab: "Send ny henvendelse",
    checkExistingCaseTab: "Sjekk eksisterende sak",
    sectionMunicipalityHelp:
      "Velg riktig kommune slik at saken registreres hos riktig mottaker.",
    sectionContactTitle: "Kontaktinformasjon",
    sectionContactHelp:
      "Oppgi kontaktinformasjon kommunen kan bruke ved oppfolging.",
    sectionAddressTitle: "Adresse",
    sectionAddressHelp:
      "Sok og bekreft adressen hvis saken gjelder et bestemt sted.",
    sectionRequestTitle: "Detaljer om henvendelsen",
    sectionRequestHelp:
      "Beskriv hva saken gjelder. Jo tydeligere beskrivelse, desto enklere er det a behandle saken.",
    sectionDocumentsTitle: "Dokumenter",
    sectionDocumentsHelp:
      "Legg ved relevante filer hvis de hjelper kommunen a forsta saken.",
    sectionPrivacyTitle: "Personvernbekreftelse",
    sectionPrivacyHelp:
      "Bekreft at kommunen kan bruke opplysningene til a registrere og behandle saken.",
    sectionSubmitTitle: "Send inn",
    sectionSubmitHelp:
      "Kontroller informasjonen og send inn henvendelsen nar alt er klart.",
    nameLabel: "Navn",
    emailLabel: "E-post",
    phoneLabel: "Telefon",
    addressLabel: "Adresse",
    addressSearch: "Søk adresse",
    addressSearching: "Søker...",
    addressSuggestionLabel: "Foreslatt adresse",
    addressConfirm: "Bekreft adresse",
    addressConfirmed: "Adresse bekreftet",
    addressNoResults: "Fant ingen adresseforslag.",
    addressError: "Kunne ikke validere adressen nå.",
    caseTitleLabel: "Tittel",
    descriptionLabel: "Beskrivelse",
    documentsLabel: "Dokumenter",
    documentsHelp:
      "Valgfritt. Last opp PDF, PNG eller JPG. Maks 10 MB per fil.",
    privacyLabel: "Personvern",
    privacyText:
      "Jeg forstår at opplysningene og eventuelle dokumenter brukes til å registrere og behandle henvendelsen min. Tilgang loggføres, og data kan eksporteres eller håndteres etter kommunens retensjonsregler.",
    submit: "Send inn",
    submitting: "Sender inn...",
    successTitle: "Henvendelsen er registrert",
    successText: "Kommunen har mottatt saken og vil behandle den videre.",
    successSaveCodeWarning:
      "Lagre denne tilgangskoden. Du trenger den for a sjekke saksstatus.",
    successMunicipalityLabel: "Kommune",
    successNextStepsLabel: "Neste steg",
    successNextStepsText:
      "Bruk saksreferansen og tilgangskoden i fanen Sjekk eksisterende sak for a teste statusoppslag med en gang.",
    caseIdLabel: "Saks-ID",
    caseReferenceLabel: "Saksreferanse",
    statusAccessCodeLabel: "Tilgangskode",
    statusLookupTitle: "Sjekk saksstatus",
    statusLookupText:
      "Bruk saksreferansen og tilgangskoden du fikk da saken ble sendt inn.",
    statusLookupRequirements:
      "Du trenger både saksreferanse og tilgangskode for a se status.",
    statusLookupSubmit: "Sjekk status",
    statusLookupLoading: "Sjekker...",
    statusLookupError: "Fant ikke saken med denne kombinasjonen.",
    statusLookupResultTitle: "Status for saken",
    statusLabel: "Status",
    updatedLabel: "Sist oppdatert",
    departmentLabel: "Avdeling",
    newCase: "Ny henvendelse",
    error: "Kunne ikke sende inn henvendelsen. Prøv igjen.",
  },
  en: {
    languageLabel: "Language",
    switchLanguage: "Norsk",
    badge: "Citizen portal",
    title: "Submit a request",
    intro:
      "Describe your case and the municipality will register it for processing.",
    tenantLabel: "Municipality",
    tenantHelp:
      "Choose the municipality for this case. The request is stored under the selected municipality.",
    submitNewRequestTab: "Submit new request",
    checkExistingCaseTab: "Check existing case",
    sectionMunicipalityHelp:
      "Choose the correct municipality so the request is registered with the right recipient.",
    sectionContactTitle: "Contact information",
    sectionContactHelp:
      "Provide contact details the municipality can use for follow-up.",
    sectionAddressTitle: "Address",
    sectionAddressHelp:
      "Search and confirm the address if the request concerns a specific place.",
    sectionRequestTitle: "Request details",
    sectionRequestHelp:
      "Describe what the case is about. Clear details make the request easier to process.",
    sectionDocumentsTitle: "Documents",
    sectionDocumentsHelp:
      "Attach relevant files if they help the municipality understand the case.",
    sectionPrivacyTitle: "Privacy confirmation",
    sectionPrivacyHelp:
      "Confirm that the municipality may use the information to register and process the request.",
    sectionSubmitTitle: "Submit",
    sectionSubmitHelp:
      "Review the information and submit the request when everything is ready.",
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
      "I understand that my information and any documents are used to register and process this request. Access is audited, and data may be exported or handled according to the municipality's retention policy.",
    submit: "Submit",
    submitting: "Submitting...",
    successTitle: "Request registered",
    successText: "The municipality has received the case for processing.",
    successSaveCodeWarning:
      "Save this access code. It is needed to check your case status.",
    successMunicipalityLabel: "Municipality",
    successNextStepsLabel: "Next steps",
    successNextStepsText:
      "Use the case reference and access code in the Check existing case tab to test status lookup immediately.",
    caseIdLabel: "Case ID",
    caseReferenceLabel: "Case reference",
    statusAccessCodeLabel: "Access code",
    statusLookupTitle: "Check case status",
    statusLookupText:
      "Use the case reference and access code you received after submission.",
    statusLookupRequirements:
      "You need both the case reference and access code to check status.",
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
