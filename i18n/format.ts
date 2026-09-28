import { DICTIONARIES, type Locale } from "./dictionaries";
import type { RowText } from "@/domain/rowText";

// One module for the words a non-screen may need. Kept out of index.tsx on purpose: a domain
// module builds a date into a row it hands a screen (footprint's last-activity line) and names an
// archetype to the demo provider, and it must be able to do both without importing React.

/** Format an instant the way the reader's own language writes it.
 *
 *  `date.toLocaleDateString()` with no locale argument means "the BROWSER's", so a screen
 *  whose visitor picked 繁體中文 still prints `Sep 12` — the page's own `lang` attribute,
 *  which the provider sets from this same locale, contradicts the dates on it. `locale` is
 *  a required first argument for that reason: a call site that forgets it should not
 *  compile, and check 33 of proof-i18n refuses every other way of formatting a date. */
export function formatDate(
  locale: Locale,
  value: string | number | Date,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, opts).format(new Date(value));
}

/** Measure one instant against now, and hand the screen a ROW rather than a sentence.
 *
 *  A helper that returns `string` is the one shape the raw-UI scan cannot see: the words
 *  are typed here and printed from somewhere else, so no position it reads carries a
 *  literal. `Dashboard.relTime` was that helper, and it had two defects the scan could
 *  not have reported — a past instant was printed with its negative sign intact
 *  (`-2d ago`), and both branches' words were English for a reader in either Chinese
 *  locale while the clock branch beside them followed the locale. So the day count is
 *  always a positive whole number here and the direction lives in the key it rides.
 *  Within a day of now there is no honest day count, and the instant's own clock time,
 *  formatted the reader's way, is what answers. */
export function relativeDay(locale: Locale, iso: string): RowText {
  const d = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (d > 1) return { key: "time.inDays", vars: { n: d } };
  if (d < -1) return { key: "time.agoDay", vars: { n: -d } };
  return { value: formatDate(locale, iso, { hour: "2-digit", minute: "2-digit" }) };
}

/** One English row of the dictionary, for text that is model input rather than copy.
 *
 *  The demo provider matches on Latin tokens (`data/intelligence.ts` strips everything outside
 *  `a-z0-9' -` from the question) and composes in English, so the archetype name handed to it
 *  through `archetypeLabelEn` and the sample prompts on `AiStudio` stay English while the
 *  sentence beside them follows the reader. This is the only place outside `i18n/` allowed to
 *  name a dictionary row directly: `t()` would give such a caller the reader's language, which
 *  is wrong for provider input and right for everything a person reads, so the two needs must
 *  not share one call. Proof-i18n's 26d reads the callers of this function and refuses a `.tsx`
 *  file that reaches for it, and refuses any module outside `i18n/` that reads `DICTIONARIES`
 *  itself. */
export function englishWord(key: string): string {
  return DICTIONARIES.en[key] ?? key;
}
