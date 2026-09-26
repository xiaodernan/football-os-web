import type { Locale } from "./dictionaries";

// One door for instants. Kept out of index.tsx on purpose: a domain module may build a
// date into a row it hands a screen (footprint's last-activity line), and it must be able
// to do that without importing React.

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
