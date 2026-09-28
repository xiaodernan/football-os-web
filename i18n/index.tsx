import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DICTIONARIES, type Locale, LOCALES } from "./dictionaries";
import { interpolate } from "./format";
import { LOCALE_KEY } from "@/domain/localData";

export type { Locale } from "./dictionaries";

const STORAGE_KEY = LOCALE_KEY;

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locales: typeof LOCALES;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Read the reader's own row and fill every occurrence of `{name}`. The interpolation itself
 *  lives in i18n/format.ts, because the provider door reads a template the same way and cannot
 *  import React to do it. Exported as a plain function so the proof scripts resolve rows through
 *  this same code path instead of a hand-copy of it — a copy can drift from what the screen
 *  prints, and then the gate measures the copy. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const table = DICTIONARIES[locale] ?? DICTIONARIES.en;
  return interpolate(table[key] ?? DICTIONARIES.en[key] ?? key, vars);
}

/** Format an instant the reader's own language writes it, and measure one against now —
 *  see i18n/format.ts, which holds them so a domain module can reach them without
 *  importing React. Re-exported here so a screen's `import { formatDate } from "@/i18n"`
 *  reads the same as its `t`. */
export { formatDate, relativeDay } from "./format";

function detectLocale(): Locale {
  if (typeof localStorage !== "undefined") {
    const s = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (s && LOCALES.some((l) => l.id === s)) return s;
  }
  if (typeof navigator !== "undefined") {
    const n = navigator.language.toLowerCase();
    if (n.includes("tw") || n.includes("hk") || n.includes("hant")) return "zh-TW";
    if (n.includes("cn") || n.includes("hans") || n === "zh") return "zh-CN";
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, locales: LOCALES }),
    [locale, setLocale, t],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
