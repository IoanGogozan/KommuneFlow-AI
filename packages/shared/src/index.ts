export const SUPPORTED_LOCALES = ["nb", "en"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
