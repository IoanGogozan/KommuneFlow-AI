import type { Locale } from "./i18n";
import { internalDictionaryEn } from "./internal-i18n-en";
import { internalDictionaryNb } from "./internal-i18n-nb";

export const internalDictionaries = {
  nb: internalDictionaryNb,
  en: internalDictionaryEn,
} satisfies Record<Locale, InternalDictionary>;

export type InternalDictionary = DeepString<typeof internalDictionaryNb>;

type DeepString<T> = {
  [Key in keyof T]: T[Key] extends string ? string : DeepString<T[Key]>;
};
