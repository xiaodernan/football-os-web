// Resolve a domain row the way a screen does, using the app's own interpreter rather
// than a copy of it. Every proof that reads a RowText goes through here, so the gate and
// the page cannot diverge into two different ideas of what a row says.
export async function makeSay(server) {
  const { translate } = await server.ssrLoadModule("/i18n/index.tsx");
  const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
  const { DICTIONARIES, LOCALES } = await server.ssrLoadModule("/i18n/dictionaries.ts");
  const locales = LOCALES.map((l) => l.id);
  const t = (locale) => (key, vars) => translate(locale, key, vars);
  return {
    DICTIONARIES,
    locales,
    rowLine,
    translate,
    // say(locale)(row) — curried so a proof can build one reader per locale and map a
    // whole list of rows through it.
    say: (locale) => (row) => rowLine(row, t(locale)),
    keysOf: (locale) => Object.keys(DICTIONARIES[locale]),
  };
}
