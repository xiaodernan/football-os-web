import { DICTIONARIES, type Locale } from "./dictionaries";
import type { RowText, RowVars } from "@/domain/rowText";
import { DAY_MS } from "@/lib/utils";

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

// The local midnight an instant fell on — the day the reader's wall calendar shows. A DST day is
// 23 or 25 hours, so whoever differences these rounds.
const localMidnight = (value: string | number | Date): number => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Measure one instant against the reader's own today, and hand the screen a ROW rather than a
 *  sentence.
 *
 *  A helper that returns `string` is the one shape the raw-UI scan cannot see: the words
 *  are typed here and printed from somewhere else, so no position it reads carries a
 *  literal. `Dashboard.relTime` was that helper, and it had two defects the scan could
 *  not have reported — a past instant was printed with its negative sign intact
 *  (`-2d ago`), and both branches' words were English for a reader in either Chinese
 *  locale while the clock branch beside them followed the locale. So the day count is
 *  always a positive whole number here and the direction lives in the key it rides.
 *
 *  M216 changed *which* day count that is. The shipped boundary was elapsed 24-hour blocks, so
 *  a fixture tomorrow at 00:30 was "0 days away" and printed only a clock time: tomorrow read
 *  as today. A reader does not count hours since the last midnight, they count the days the
 *  wall calendar shows, so the arithmetic now runs between the two local midnights (rounded,
 *  because a DST day is 23 or 25 hours) and ±1 day has its own word. Within the reader's own
 *  day there is no honest day count either, so the instant rides the locale's today word and
 *  its clock time — formatted their way — rides along as the variable; until M292 the branch
 *  printed the bare clock alone, the last arm with no reader word.
 *
 *  M293 lets the caller say WHICH now to measure against. The default is still the reader's
 *  clock — a timestamp the reader wrote (an activity line's completedAt) is theirs to read.
 *  But a panel that selects on the demo world's clock must label on it too: the dashboard's
 *  today panel picked its fixtures off the world's anchor (M289) and then measured every
 *  kickoff against the reader's midnight, so on a tree whose anchor drifted two weeks behind,
 *  the panel promised "today" and printed "14d ago" on every row, and a fixture the world
 *  counts six days out read "8d ago" — the direction inverted by drift alone. */
export function relativeDay(locale: Locale, iso: string, now: string | number | Date = Date.now()): RowText {
  const d = Math.round((localMidnight(new Date(iso)) - localMidnight(now)) / DAY_MS);
  if (d > 1) return { key: "time.inDays", vars: { n: d } };
  if (d === 1) return { key: "time.tomorrow" };
  if (d === 0) return { key: "time.today", vars: { at: formatDate(locale, iso, { hour: "2-digit", minute: "2-digit" }) } };
  if (d === -1) return { key: "time.yesterday" };
  return { key: "time.agoDay", vars: { n: -d } };
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
export function englishWord(key: string, vars?: RowVars): string {
  return interpolate(DICTIONARIES.en[key] ?? key, vars);
}

/** The app's ONE interpolator: fill every `{name}` of a template with the row's own values.
 *
 *  It lives here rather than beside `translate` (i18n/index.tsx) for the reason `formatDate`
 *  and `englishWord` do — the provider door reads a template the same way a screen does and
 *  cannot import React to do it. `translate` calls it for the reader's column and `englishWord`
 *  for the English one, so a screen and a provider cannot drift into two readings of one
 *  `{focus}`. Exported as a plain function so a proof can resolve a row through the shipped
 *  code path instead of a hand-copy of it. */
export function interpolate(template: string, vars?: RowVars): string {
  let str = template;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.split("{" + k + "}").join(String(v));
    }
  }
  return str;
}
