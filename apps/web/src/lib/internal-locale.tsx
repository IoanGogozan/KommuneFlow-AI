"use client";

import { useState } from "react";
import type { Locale } from "./i18n";
import {
  internalDictionaries,
  type InternalDictionary,
} from "./internal-i18n";

const storageKey = "kommuneflow.internal.locale";
const languageLabels = {
  nb: "Norsk",
  en: "English",
} as const;

export function useInternalI18n(): {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: InternalDictionary;
} {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "nb";
    }

    const stored = window.localStorage.getItem(storageKey);
    return stored === "nb" || stored === "en" ? stored : "nb";
  });

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem(storageKey, nextLocale);
  }

  return {
    locale,
    setLocale,
    t: internalDictionaries[locale],
  };
}

export function InternalLanguageToggle({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}) {
  return (
    <div className="flex border border-[#c8d9e8] bg-white p-1">
      {(["nb", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={
            item === locale
              ? "bg-[#003b71] px-3 py-1.5 text-sm font-semibold text-white"
              : "px-3 py-1.5 text-sm font-semibold text-[#003b71] hover:bg-[#eaf4fb]"
          }
          aria-pressed={item === locale}
        >
          {languageLabels[item]}
        </button>
      ))}
    </div>
  );
}
