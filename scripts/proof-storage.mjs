// M225 — the two providers that decide what the reader sees read browser storage through a guard
// that does not guard.
//
// `typeof localStorage !== "undefined"` asks whether a name is declared. `localStorage` is declared
// in every browser as an *accessor on window*, and reading that accessor throws SecurityError when
// site data is blocked — which a document inside another vendor's frame hits during the first
// render. Both root providers did this (lib/theme.tsx getInitialTheme, i18n/index.tsx detectLocale)
// while their own write side was wrapped, and lib/hooks.ts had already written the rule correctly
// twice. This app has no error boundary (measured below), so the throw is not a degraded theme or a
// wrong language — it is a blank page.
//
// proof-coverage.mjs excused lib/theme.tsx with "theme provider: needs a DOM". M212 measured the
// same excuse for the router and found it false; it is false here too, which is the only reason the
// defect could be proven: a stub localStorage plus renderToStaticMarkup renders both providers.
//
// The rest of the app is not silently allowed: the same census files every storage touch it cannot
// account for as declared, shrinking debt (M206's shape). Comments are stripped with the repo's own
// string-aware scanner, because three of the sites this run first reported were prose.
import { createServer } from "vite";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalize } from "./lib/rawUiScan.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
/** A gate has to fail, not die: the modules under proof are loaded through here, and proof-coverage
 *  reads the literal ssrLoadModule("/…") call out of this file, so the wrapper keeps it visible. */
async function tryLoad(what) {
  try { return { mod: await what(), err: null }; }
  catch (e) { return { mod: null, err: e }; }
}

const { mod: LD, err: ldErr } = await tryLoad(() => server.ssrLoadModule("/domain/localData.ts"));
const { mod: TH, err: thErr } = await tryLoad(() => server.ssrLoadModule("/lib/theme.tsx"));
const { mod: IB, err: ibErr } = await tryLoad(() => server.ssrLoadModule("/i18n/index.tsx"));
if (!LD || !TH || !IB) {
  ok("the door and both root providers load under the SSR harness", false,
    `localData ${ldErr && ldErr.message} / theme ${thErr && thErr.message} / i18n ${ibErr && ibErr.message}`);
  console.log(`\n${pass}/${pass + fail} checks passed`);
  await server.close();
  process.exit(1);
}
const { browserStore, THEME_KEY, LOCALE_KEY } = LD;
const { ThemeProvider, useTheme } = TH;
const { I18nProvider, useI18n } = IB;
const read = (p) => readFileSync(join(root, p), "utf8");
const DOOR_SRC = read("domain/localData.ts");

function walkDir(dir, out = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) walkDir(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}
const APP_FILES = ["features", "src", "components", "store", "data", "domain", "lib", "i18n"].flatMap((d) => walkDir(d));

/** Comment-free text for scanning, from the shared scanner. It is only usable for line numbers if
 *  the stripper keeps every newline, which is measured here instead of assumed. */
const blankedKeepNewlines = APP_FILES.every((f) => {
  const s = read(f);
  return normalize(s).split(/\n/).length === s.replace(/\r\n/g, "\n").split(/\n/).length;
});
ok(`the census reads code, not prose, through the repo's own string-aware stripper (newline counts survive on all ${APP_FILES.length} app files: ${blankedKeepNewlines})`,
  blankedKeepNewlines && APP_FILES.length > 100);

// ---------------------------------------------------------------------------
// 1 · browserStore: three documents, one answer each
// ---------------------------------------------------------------------------
/** Each call is wrapped HERE so a mutation that removes the door's own try/catch produces named
 *  red clauses instead of killing the run (M210: a mutant that crashes the proof is not evidence). */
function probeDoor() {
  try { return { got: browserStore(), threw: null }; }
  catch (e) { return { got: "NO THROW ESCAPED", threw: `${e.constructor.name}: ${e.message}` }; }
}
const savedStore = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
function setStore(value) {
  if (value === undefined) Reflect.deleteProperty(globalThis, "localStorage");
  else Object.defineProperty(globalThis, "localStorage", { value, configurable: true, writable: true });
}
function setThrowingStore() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { const e = new Error("Access is denied for this document"); e.name = "SecurityError"; throw e; },
  });
}
function fakeStore(rows = {}) {
  const map = new Map(Object.entries(rows));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    _rows: map,
  };
}

setStore(undefined);
const d1 = probeDoor();
ok(`a document with no localStorage at all gets null, not a ReferenceError (${JSON.stringify(d1.got)}${d1.threw ? `, threw ${d1.threw}` : ""})`,
  d1.got === null && !d1.threw, d1.threw);

const store = fakeStore({ [THEME_KEY]: "light" });
setStore(store);
const d2 = probeDoor();
ok(`a document that is allowed one gets that exact object back, so the door is a pass-through and not a cache (${d2.got === store ? "same object" : "different object"}${d2.threw ? `, threw ${d2.threw}` : ""})`,
  d2.got === store && !d2.threw, d2.threw);

setThrowingStore();
const d3 = probeDoor();
ok(`a blocked document throws ON THE ACCESSOR, which is the case typeof cannot see: the door answers null instead of propagating it (${JSON.stringify(d3.got)}${d3.threw ? `, THREW ${d3.threw}` : ""})`,
  d3.got === null && !d3.threw, d3.threw);

const doorBody = (normalize(DOOR_SRC).match(/export function browserStore[\s\S]*?\n\}/) || [""])[0];
ok(`…and that is the door's own structure, read out of its source: the accessor is inside a try with a catch (${doorBody.includes("try") ? "try" : "NO try"} / ${doorBody.includes("catch") ? "catch" : "NO catch"})`,
  /try\s*\{[\s\S]{0,160}catch/.test(doorBody) && /globalThis/.test(doorBody));
const doorReturns = (doorBody.match(/\breturn\b/g) || []).length;
const doorInvents = (doorBody.match(/\bdefault\b|\|\|\s*\{|\bnew Map\b|"football-os\./g) || []).length;
ok(`the door answers with the store or with null, and invents nothing else (${doorReturns} return statement(s), ${doorInvents} invented-default forms)`,
  doorReturns === 2 && doorInvents === 0, `returns ${doorReturns}, invents ${doorInvents}`);

// ---------------------------------------------------------------------------
// 2 · the two providers, rendered for real on this harness
// ---------------------------------------------------------------------------
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");

function renderTree(Provider, Grab) { return renderToStaticMarkup(React.createElement(Provider, null, React.createElement(Grab))); }
function renderBare(Grab) { return renderToStaticMarkup(React.createElement(Grab)); }

let themeCap = null;
function ThemeGrab() { themeCap = useTheme(); return null; }
function renderTheme(rows) {
  if (rows === "throw") setThrowingStore();
  else setStore(fakeStore(rows || {}));
  themeCap = null;
  try { return { html: renderTree(ThemeProvider, ThemeGrab), err: null }; }
  catch (e) { return { html: null, err: e }; }
}

const t_light = renderTheme({ [THEME_KEY]: "light" });
ok(`ThemeProvider renders here, so its old exemption "needs a DOM" was false (theme ${themeCap && themeCap.theme}${t_light.err ? `, threw ${t_light.err.constructor.name}` : ""})`,
  !t_light.err && themeCap && themeCap.theme === "light", t_light.err && t_light.err.message);

const t_dark = renderTheme({ [THEME_KEY]: "dark" });
ok(`a saved dark reads as dark (${themeCap && themeCap.theme})`, !t_dark.err && themeCap.theme === "dark");

const t_junk = renderTheme({ [THEME_KEY]: "sepia" });
ok(`a stored value the app cannot honour is ignored rather than trusted — the reader gets the dark-first shell, not a class that styles nothing (${themeCap && themeCap.theme})`,
  !t_junk.err && themeCap.theme === "dark");

const t_none = renderTheme({});
ok(`a fresh document resolves to dark, which is the promise index.html's hardcoded class makes (theme ${themeCap && themeCap.theme})`,
  !t_none.err && themeCap.theme === "dark");

const t_throw = renderTheme("throw");
ok(`THE DEFECT: with site data blocked the old code threw out of getInitialTheme; now the render completes and the shell is dark (theme ${JSON.stringify(t_throw.err ? "no render" : themeCap && themeCap.theme)}${t_throw.err ? `, THREW ${t_throw.err.name}: ${t_throw.err.message}` : ""})`,
  !t_throw.err && themeCap && themeCap.theme === "dark", t_throw.err && `${t_throw.err.name}: ${t_throw.err.message}`);

const t_types = themeCap && { setTheme: typeof themeCap.setTheme, toggle: typeof themeCap.toggle };
ok(`the provider publishes both mutators as functions (${JSON.stringify(t_types)})`,
  !!t_types && t_types.setTheme === "function" && t_types.toggle === "function");

let guardErr = null;
try { renderBare(ThemeGrab); } catch (e) { guardErr = e; }
ok(`useTheme refuses to answer outside the provider, by name (message ${JSON.stringify(guardErr ? guardErr.message : "no throw")})`,
  !!guardErr && /useTheme must be used within ThemeProvider/.test(guardErr.message));

let localeCap = null;
function LocaleGrab() { localeCap = useI18n(); return null; }
function renderLocale(rows, navLang) {
  if (rows === "throw") setThrowingStore();
  else setStore(fakeStore(rows || {}));
  Object.defineProperty(globalThis, "navigator", { value: { language: navLang }, configurable: true, writable: true });
  localeCap = null;
  try { return { html: renderTree(I18nProvider, LocaleGrab), err: null }; }
  catch (e) { return { html: null, err: e }; }
}

const l_stored = renderLocale({ [LOCALE_KEY]: "zh-CN" }, "en-US");
ok(`I18nProvider renders and a saved 简体中文 choice wins over the browser's own language (locale ${localeCap && localeCap.locale}${l_stored.err ? `, threw ${l_stored.err.constructor.name}` : ""})`,
  !l_stored.err && localeCap && localeCap.locale === "zh-CN", l_stored.err && l_stored.err.message);

const l_win = renderLocale({ [LOCALE_KEY]: "zh-TW" }, "zh-CN");
ok(`the stored row beats navigator rather than the other way round (stored zh-TW, navigator zh-CN -> ${localeCap && localeCap.locale})`,
  !l_win.err && localeCap.locale === "zh-TW");

const l_unknown = renderLocale({ [LOCALE_KEY]: "fr" }, "zh-HK");
ok(`a locale the app does not ship is not a locale the app renders — detection falls through to the browser (stored fr, navigator zh-HK -> ${localeCap && localeCap.locale})`,
  !l_unknown.err && localeCap.locale === "zh-TW");

const l_nav = renderLocale({}, "zh-Hant-TW");
ok(`with no stored row a Traditional-Chinese browser is detected without being asked (navigator zh-Hant-TW -> ${localeCap && localeCap.locale})`,
  !l_nav.err && localeCap.locale === "zh-TW");

const l_en = renderLocale({}, "pt-BR");
ok(`an unrecognised browser language lands on the authored locale (navigator pt-BR -> ${localeCap && localeCap.locale})`,
  !l_en.err && localeCap.locale === "en");

const l_throw = renderLocale("throw", "zh-CN");
ok(`THE SAME DEFECT, SECOND PROVIDER: blocked site data used to blank the app before it could say a word; now it reads the browser instead (locale ${JSON.stringify(l_throw.err ? "no render" : localeCap && localeCap.locale)}${l_throw.err ? `, THREW ${l_throw.err.name}` : ""})`,
  !l_throw.err && localeCap && localeCap.locale === "zh-CN", l_throw.err && `${l_throw.err.name}: ${l_throw.err.message}`);

/** One row, both readings: the mounted provider must print the dictionary's own 简体中文 line. The
 *  key is chosen by comparing the shipped tables, so this clause cannot be satisfied by a row that
 *  happens to be identical in every locale. */
const DICT = await (async () => {
  const { mod, err } = await tryLoad(() => server.ssrLoadModule("/i18n/dictionaries.ts"));
  if (!mod) { ok("i18n/dictionaries.ts loads to supply the row expectation", false, err && err.message); return null; }
  return mod;
})();
if (DICT) {
  const en = DICT.DICTIONARIES.en, zh = DICT.DICTIONARIES["zh-CN"];
  const differing = Object.keys(en).filter((k) => typeof zh[k] === "string" && zh[k] !== en[k]).sort();
  const probeKey = differing[0];
  const printed = localeCap && probeKey ? localeCap.t(probeKey) : null;
  ok(`and the reader's words really come from the reader's locale: the mounted zh-CN provider prints ${JSON.stringify(printed)} for ${JSON.stringify(probeKey)}, the dictionary's own row, where ${differing.length} of ${Object.keys(en).length} en rows differ (${JSON.stringify(en[probeKey])} would be the frozen answer)`,
    !!probeKey && printed === zh[probeKey] && printed !== en[probeKey],
    `printed ${JSON.stringify(printed)}, zh ${JSON.stringify(zh[probeKey])}, en ${JSON.stringify(en[probeKey])}`);
}

// ---------------------------------------------------------------------------
// 3 · the census: every storage touch is guarded, through the door, or declared debt
// ---------------------------------------------------------------------------
const LOOK_BACK = 240, LOOK_FWD = 240;
const lineAt = (src, i) => src.slice(0, i).split(/\n/).length;
function doorSpan(src) {
  const s = normalize(src);
  const at = s.indexOf("export function browserStore");
  if (at < 0) return null;
  const end = s.indexOf("\n}", at);
  return end < 0 ? null : [at, end + 2];
}
function classify(src) {
  const s = normalize(src);
  const span = doorSpan(src);
  const out = [];
  for (const m of s.matchAll(/localStorage/g)) {
    if (span && m.index >= span[0] && m.index < span[1]) continue;
    const before = s.slice(Math.max(0, m.index - LOOK_BACK), m.index);
    const after = s.slice(m.index + m[0].length, Math.min(s.length, m.index + m[0].length + LOOK_FWD));
    out.push({
      at: lineAt(s, m.index),
      viaDoor: /browserStore\s*\(\s*\)/.test(before.slice(-120)),
      guarded: /try\s*\{/.test(before) && /\bcatch\b/.test(after.slice(0, LOOK_FWD)),
      verb: (after.match(/^\s*\.(getItem|setItem|removeItem)/) || [])[1] || "bare",
    });
  }
  for (const m of s.matchAll(/browserStore\s*\(\s*\)(?!:)/g)) {
    out.push({ at: lineAt(s, m.index), viaDoor: true, guarded: false, verb: "door" });
  }
  return out;
}
const sites = APP_FILES.flatMap((f) => classify(read(f)).map((x) => ({ file: f, ...x })));
const doorSites = sites.filter((x) => x.verb === "door");
const rawSites = sites.filter((x) => x.verb !== "door");
const debt = rawSites.filter((x) => !x.guarded);

/** Every remaining unguarded touch is declared here, keyed by file — never by line, which moves —
 *  with a reason. The ceiling is the number this milestone measured; it can only shrink. */
const DEBT = {
  "features/community/CommunityHub.tsx": "reads a stored career row in a memo and a handler",
  "features/learn/LearnHub.tsx": "migrates and clears a legacy academy key",
  "features/profile/ProfilePage.tsx": "reads career and community rows while the page renders",
  "features/settings/SettingsPage.tsx": "hands the raw accessor to the export/inventory/apply helpers",
};
const DEBT_CEILING = 8;
const byFile = {};
for (const x of debt) byFile[x.file] = (byFile[x.file] || 0) + 1;
const undeclared = Object.entries(byFile).filter(([f]) => !(f in DEBT));
const staleRows = Object.keys(DEBT).filter((f) => !byFile[f]);
ok(`the app touches browser storage in ${sites.length} site(s) across ${new Set(sites.map((x) => x.file)).size} file(s): ${doorSites.length} through the door, ${rawSites.length - debt.length} in a try/catch, ${debt.length} declared unguarded (${debt.map((x) => `${x.file}:${x.at} ${x.verb}`).join(", ") || "none"})`,
  sites.length >= 20 && doorSites.length >= 2 && undeclared.length === 0 && staleRows.length === 0 && debt.length <= DEBT_CEILING,
  `undeclared ${undeclared.map(([f, n]) => `${f}×${n}`).join(", ") || "none"} · stale rows ${staleRows.join(", ") || "none"} · debt ${debt.length}/${DEBT_CEILING}`);
ok(`…and the ledger's rows are all read: ${Object.keys(DEBT).length} file(s) with a reason, every one of them ${Object.values(DEBT).every((w) => w.length > 20) ? "explained" : "MISSING AN EXPLANATION"}`,
  Object.values(DEBT).every((w) => typeof w === "string" && w.length > 20) && staleRows.length === 0);

const providers = ["lib/theme.tsx", "i18n/index.tsx"].map((f) => {
  const x = classify(read(f));
  const raw = x.filter((y) => y.verb !== "door");
  return { f, door: x.filter((y) => y.verb === "door").length, raw: raw.length, rawUnguarded: raw.filter((y) => !y.guarded).length, rawVerbs: raw.map((y) => y.verb).join("+") };
});
ok(`each root provider reads the store through the door and touches the accessor only to persist (${providers.map((p) => `${p.f}: ${p.door} door read / ${p.raw} raw ${p.rawVerbs}${p.rawUnguarded ? ` ${p.rawUnguarded} UNGUARDED` : ""}`).join(" · ")})`,
  providers.every((p) => p.door === 1 && p.raw === 1 && p.rawUnguarded === 0 && p.rawVerbs === "setItem"), JSON.stringify(providers));

const typeofSites = APP_FILES.flatMap((f) => {
  const s = normalize(read(f));
  return [...s.matchAll(/typeof\s+localStorage/g)].map((m) => ({ f, at: lineAt(s, m.index) }));
});
ok(`the existence check is not the safety check, and no code path uses it any more (${typeofSites.length} typeof-localStorage guard(s) outside comments: ${typeofSites.map((x) => `${x.f}:${x.at}`).join(", ") || "none"})`,
  typeofSites.length === 0, typeofSites.map((x) => `${x.f}:${x.at}`).join(", "));

{
  const planted = 'function readIt() {\n  const raw = localStorage.getItem("x");\n  return raw;\n}\n';
  const withTry = 'function readIt() {\n  try {\n    return localStorage.getItem("x");\n  } catch { return null; }\n}\n';
  const inComment = '// the callers pass something localStorage-shaped\nconst x = 1;\n';
  const cPlant = classify(planted), cTry = classify(withTry), cComment = classify(inComment);
  ok(`planted three ways, the SAME classifier reports the unguarded site, excuses the wrapped one, and does not count prose (planted ${JSON.stringify(cPlant)} · wrapped ${JSON.stringify(cTry)} · comment ${JSON.stringify(cComment)})`,
    cPlant.length === 1 && !cPlant[0].guarded && cTry.length === 1 && cTry[0].guarded && cComment.length === 0);
}

// ---------------------------------------------------------------------------
// 4 · why a throw here is fatal, and what this harness still cannot see
// ---------------------------------------------------------------------------
const boundaries = APP_FILES.filter((f) => /componentDidCatch|getDerivedStateFromError|ErrorBoundary/.test(read(f)));
ok(`there is no error boundary for either throw to be caught by instead (${boundaries.length} boundary implementations across ${APP_FILES.length} app files — the door is the only defence)`,
  boundaries.length === 0);

const rootOrder = read("src/App.tsx");
const themeFirst = rootOrder.indexOf("ThemeProvider") < rootOrder.indexOf("I18nProvider");
ok(`both readers run before anything the visitor can act on: App mounts them outermost and the theme outside the language (ThemeProvider ${themeFirst ? "outside" : "inside"} I18nProvider)`,
  /<ThemeProvider>/.test(rootOrder) && /<I18nProvider>/.test(rootOrder) && themeFirst);

let docWrites = 0;
const doc = { documentElement: { classList: { toggle: () => { docWrites++; } }, lang: "" } };
Object.defineProperty(globalThis, "document", { value: doc, configurable: true, writable: true });
renderTheme({ [THEME_KEY]: "light" });
renderLocale({ [LOCALE_KEY]: "zh-CN" }, "en-US");
ok(`NOT COVERED HERE, measured rather than assumed: renderToStaticMarkup never runs useEffect, so the <html class> sync, the lang write and the setItem persist are unproven by this file (document writes during render: ${docWrites})`,
  docWrites === 0);

const setItemSites = rawSites.filter((x) => x.verb === "setItem").length;
ok(`…which is why the write side is read structurally instead: ${setItemSites} raw setItem site(s) and every one inside a try — the app accepts a session that cannot persist`,
  setItemSites >= 2 && rawSites.every((x) => x.verb !== "setItem" || x.guarded),
  `${setItemSites} setItem, unguarded setItem: ${rawSites.filter((x) => x.verb === "setItem" && !x.guarded).length}`);

// ---------------------------------------------------------------------------
// 5 · the exemption this file replaces
// ---------------------------------------------------------------------------
const exemptNow = (read("scripts/proof-coverage.mjs").match(/"lib\/theme\.tsx"/g) || []).length;
ok(`the exemption this file replaces is gone from the coverage ratchet (occurrences of "lib/theme.tsx" in proof-coverage.mjs: ${exemptNow})`,
  exemptNow === 0);

if (savedStore) Object.defineProperty(globalThis, "localStorage", savedStore);
else Reflect.deleteProperty(globalThis, "localStorage");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
