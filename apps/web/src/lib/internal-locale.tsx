"use client";

import { useState } from "react";
import type { Locale } from "./i18n";
import {
  internalDictionaries,
  type InternalDictionary,
} from "./internal-i18n";

const storageKey = "kommuneflow.internal.locale";

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
    <div className="flex rounded-md border border-slate-300 bg-white p-1">
      {(["nb", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={
            item === locale
              ? "rounded bg-slate-950 px-2 py-1 text-xs font-semibold text-white"
              : "rounded px-2 py-1 text-xs font-semibold text-slate-700"
          }
          aria-pressed={item === locale}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
