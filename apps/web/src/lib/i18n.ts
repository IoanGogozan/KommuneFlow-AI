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
    newCase: "New request",
    error: "Could not submit the request. Please try again.",
  },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
