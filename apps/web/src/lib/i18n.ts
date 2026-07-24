export const locales = ["nb", "en"] as const;

export type Locale = (typeof locales)[number];

export type IntakeDictionary = {
  languageLabel: string;
  switchLanguage: string;
  employeePortalLabel: string;
  portfolioBannerTitle: string;
  portfolioBannerText: string;
  badge: string;
  title: string;
  intro: string;
  statusPageTitle: string;
  statusPageIntro: string;
  tenantLabel: string;
  tenantPlaceholder: string;
  tenantRequired: string;
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
  addressConfirmedHelp: string;
  addressChange: string;
  addressNoResults: string;
  addressError: string;
  addressNotApplicable: string;
  caseTitleLabel: string;
  caseTitleHint: string;
  descriptionLabel: string;
  descriptionHint: string;
  documentsLabel: string;
  documentsHelp: string;
  documentsChooseFiles: string;
  documentsNoFilesSelected: string;
  documentsSelected: string;
  documentsRemove: string;
  documentsValidationError: string;
  privacyLabel: string;
  privacyText: string;
  privacyDetailsSummary: string;
  privacyDetailsText: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successText: string;
  successSaveCodeWarning: string;
  successMunicipalityLabel: string;
  successNextStepsLabel: string;
  successNextStepsText: string;
  copyReference: string;
  copyAccessCode: string;
  copied: string;
  copyFailed: string;
  checkThisCase: string;
  submitAnotherRequest: string;
  printDetails: string;
  continueEmployeeDemo: string;
  enteringEmployeeDemo: string;
  retryEmployeeDemo: string;
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
  statusLabels: Record<string, string>;
  updatedLabel: string;
  departmentLabel: string;
  newCase: string;
  error: string;
};

export const dictionaries: Record<Locale, IntakeDictionary> = {
  nb: {
    languageLabel: "Språk",
    switchLanguage: "English",
    employeePortalLabel: "Ansattportal",
    portfolioBannerTitle: "Offentlig porteføljedemo",
    portfolioBannerText: "Bruk kun syntetisk informasjon.",
    badge: "Innbyggerportal",
    title: "Send inn en henvendelse",
    intro:
      "Beskriv saken din, så registrerer kommunen den for videre behandling.",
    statusPageTitle: "Sjekk en sak",
    statusPageIntro:
      "Skriv inn saksreferansen og tilgangskoden for å se gjeldende status.",
    tenantLabel: "Kommune",
    tenantPlaceholder: "Velg kommune…",
    tenantRequired: "Velg en kommune før du fortsetter.",
    tenantHelp:
      "Velg kommunen saken gjelder. Henvendelsen lagres hos valgt kommune.",
    submitNewRequestTab: "Send ny henvendelse",
    checkExistingCaseTab: "Sjekk eksisterende sak",
    sectionMunicipalityHelp:
      "Velg riktig kommune slik at saken registreres hos riktig mottaker.",
    sectionContactTitle: "Kommune og kontaktinformasjon",
    sectionContactHelp:
      "Oppgi kontaktinformasjon kommunen kan bruke ved oppfølging.",
    sectionAddressTitle: "Adresse",
    sectionAddressHelp:
      "Søk og bekreft adressen hvis saken gjelder et bestemt sted.",
    sectionRequestTitle: "Detaljer om henvendelsen",
    sectionRequestHelp:
      "Beskriv hva saken gjelder. Jo tydeligere beskrivelse, desto enklere er det å behandle saken.",
    sectionDocumentsTitle: "Vedlegg",
    sectionDocumentsHelp:
      "Legg ved relevante filer hvis de hjelper kommunen å forstå saken.",
    sectionPrivacyTitle: "Personvernbekreftelse",
    sectionPrivacyHelp:
      "Bekreft at kommunen kan bruke opplysningene til å registrere og behandle saken.",
    sectionSubmitTitle: "Bekreft og send inn",
    sectionSubmitHelp:
      "Kontroller informasjonen og send inn henvendelsen når alt er klart.",
    nameLabel: "Navn",
    emailLabel: "E-post",
    phoneLabel: "Telefon",
    addressLabel: "Adresse",
    addressSearch: "Søk adresse",
    addressSearching: "Søker...",
    addressSuggestionLabel: "Foreslatt adresse",
    addressConfirm: "Bekreft adresse",
    addressConfirmed: "Adresse bekreftet",
    addressConfirmedHelp:
      "Adressen er lagret i skjemaet. Du kan fortsette til neste del.",
    addressChange: "Endre adresse",
    addressNoResults: "Fant ingen adresseforslag.",
    addressError: "Kunne ikke validere adressen nå.",
    addressNotApplicable: "Denne henvendelsen gjelder ikke en bestemt adresse",
    caseTitleLabel: "Tittel",
    caseTitleHint: "En kort oppsummering, for eksempel «Gatelys virker ikke».",
    descriptionLabel: "Beskrivelse",
    descriptionHint:
      "Forklar hva som har skjedd, hvor det skjedde, og hvilken hjelp du trenger.",
    documentsLabel: "Filer",
    documentsHelp:
      "Valgfritt. Last opp PDF, PNG eller JPG. Maks 10 MB per fil.",
    documentsChooseFiles: "Velg filer",
    documentsNoFilesSelected: "Ingen filer valgt",
    documentsSelected: "Valgte dokumenter",
    documentsRemove: "Fjern",
    documentsValidationError:
      "Velg opptil fem PDF-, PNG- eller JPG-filer på maksimalt 10 MB hver.",
    privacyLabel: "Personvern",
    privacyText:
      "Jeg forstår at opplysningene mine og opplastede dokumenter brukes til å registrere og behandle henvendelsen.",
    privacyDetailsSummary: "Mer om personvern og lagring",
    privacyDetailsText:
      "Viktige handlinger og dokumenttilgang loggføres. Kommunen kan tilby dataeksport og personvernoperasjoner, og opplysninger håndteres etter dokumenterte regler for oppbevaring og sletting.",
    submit: "Send inn",
    submitting: "Sender inn...",
    successTitle: "Henvendelsen er registrert",
    successText: "Kommunen har mottatt saken og vil behandle den videre.",
    successSaveCodeWarning:
      "Lagre denne tilgangskoden. Du trenger den for å sjekke saksstatus.",
    successMunicipalityLabel: "Kommune",
    successNextStepsLabel: "Neste steg",
    successNextStepsText:
      "Lagre tilgangskoden for senere, eller velg «Sjekk denne saken nå» for å se den registrerte saken med en gang.",
    copyReference: "Kopier saksreferanse",
    copyAccessCode: "Kopier tilgangskode",
    copied: "Kopiert",
    copyFailed: "Kunne ikke kopiere. Marker og kopier verdien manuelt.",
    checkThisCase: "Sjekk denne saken nå",
    submitAnotherRequest: "Send en ny henvendelse",
    printDetails: "Skriv ut detaljer",
    continueEmployeeDemo: "Fortsett i ansattdemoen",
    enteringEmployeeDemo: "Åpner ansattdemo…",
    retryEmployeeDemo: "Prøv igjen",
    caseIdLabel: "Saks-ID",
    caseReferenceLabel: "Saksreferanse",
    statusAccessCodeLabel: "Tilgangskode",
    statusLookupTitle: "Sjekk saksstatus",
    statusLookupText:
      "Bruk saksreferansen og tilgangskoden du fikk da saken ble sendt inn.",
    statusLookupRequirements:
      "Du trenger både saksreferanse og tilgangskode for å se status.",
    statusLookupSubmit: "Sjekk status",
    statusLookupLoading: "Sjekker...",
    statusLookupError: "Fant ikke saken med denne kombinasjonen.",
    statusLookupResultTitle: "Status for saken",
    statusLabel: "Status",
    statusLabels: {
      new: "Mottatt",
      triage_pending: "Venter på triage",
      triaged: "Triagert",
      in_progress: "Under behandling",
      waiting_for_citizen: "Venter på deg",
      closed: "Lukket",
      rejected: "Avvist",
    },
    updatedLabel: "Sist oppdatert",
    departmentLabel: "Avdeling",
    newCase: "Ny henvendelse",
    error: "Kunne ikke sende inn henvendelsen. Prøv igjen.",
  },
  en: {
    languageLabel: "Language",
    switchLanguage: "Norsk",
    employeePortalLabel: "Employee portal",
    portfolioBannerTitle: "Public portfolio demo",
    portfolioBannerText: "Use synthetic information only.",
    badge: "Citizen portal",
    title: "Submit a request",
    intro:
      "Describe your case and the municipality will register it for processing.",
    statusPageTitle: "Check a case",
    statusPageIntro:
      "Enter your case reference and access code to view its current status.",
    tenantLabel: "Municipality",
    tenantPlaceholder: "Select municipality…",
    tenantRequired: "Select a municipality before continuing.",
    tenantHelp:
      "Choose the municipality for this case. The request is stored under the selected municipality.",
    submitNewRequestTab: "Submit new request",
    checkExistingCaseTab: "Check existing case",
    sectionMunicipalityHelp:
      "Choose the correct municipality so the request is registered with the right recipient.",
    sectionContactTitle: "Municipality and contact",
    sectionContactHelp:
      "Provide contact details the municipality can use for follow-up.",
    sectionAddressTitle: "Address",
    sectionAddressHelp:
      "Search and confirm the address if the request concerns a specific place.",
    sectionRequestTitle: "Request details",
    sectionRequestHelp:
      "Describe what the case is about. Clear details make the request easier to process.",
    sectionDocumentsTitle: "Supporting documents",
    sectionDocumentsHelp:
      "Attach relevant files if they help the municipality understand the case.",
    sectionPrivacyTitle: "Privacy confirmation",
    sectionPrivacyHelp:
      "Confirm that the municipality may use the information to register and process the request.",
    sectionSubmitTitle: "Confirm and submit",
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
    addressConfirmedHelp:
      "The address is saved in the form. You can continue to the next section.",
    addressChange: "Change address",
    addressNoResults: "No address suggestions found.",
    addressError: "Could not validate the address right now.",
    addressNotApplicable: "This request does not concern a specific address",
    caseTitleLabel: "Title",
    caseTitleHint: "A short summary, such as “Streetlight not working”.",
    descriptionLabel: "Description",
    descriptionHint:
      "Explain what happened, where it happened, and what help is needed.",
    documentsLabel: "Files",
    documentsHelp: "Optional. Upload PDF, PNG, or JPG. Maximum 10 MB per file.",
    documentsChooseFiles: "Choose files",
    documentsNoFilesSelected: "No files selected",
    documentsSelected: "Selected documents",
    documentsRemove: "Remove",
    documentsValidationError:
      "Choose up to five PDF, PNG, or JPG files of no more than 10 MB each.",
    privacyLabel: "Privacy",
    privacyText:
      "I understand that my information and uploaded documents will be used to register and process this request.",
    privacyDetailsSummary: "More about privacy and retention",
    privacyDetailsText:
      "Important actions and document access are audited. The municipality can provide data export and privacy operations, and information is handled under documented retention and deletion rules.",
    submit: "Submit",
    submitting: "Submitting...",
    successTitle: "Request registered",
    successText: "The municipality has received the case for processing.",
    successSaveCodeWarning:
      "Save this access code. It is needed to check your case status.",
    successMunicipalityLabel: "Municipality",
    successNextStepsLabel: "Next steps",
    successNextStepsText:
      "Save the access code for later, or select “Check this case now” to view the newly registered case immediately.",
    copyReference: "Copy reference",
    copyAccessCode: "Copy access code",
    copied: "Copied",
    copyFailed: "Could not copy. Select and copy the value manually.",
    checkThisCase: "Check this case now",
    submitAnotherRequest: "Submit another request",
    printDetails: "Print details",
    continueEmployeeDemo: "Continue in employee demo",
    enteringEmployeeDemo: "Entering employee demo…",
    retryEmployeeDemo: "Try again",
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
    statusLabels: {
      new: "Received",
      triage_pending: "Waiting for triage",
      triaged: "Triaged",
      in_progress: "In progress",
      waiting_for_citizen: "Waiting for you",
      closed: "Closed",
      rejected: "Rejected",
    },
    updatedLabel: "Last updated",
    departmentLabel: "Department",
    newCase: "New request",
    error: "Could not submit the request. Please try again.",
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
