// M227 — the two providers that decide what the reader sees read browser storage through a guard
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
//
// M228 — that census judged a read by how many characters separated it from the words `try {` and
// `catch`, which is a proximity test wearing a safety name. Read through the repo's own TypeScript
// parser instead — is this reference inside a try block that has a catch? — 8 of the 28 sites turn
// out to be 2, not 8: six reads the window called debt sit inside a catch it had simply drifted away
// from, and the two that really were unguarded are the exact defect class M227 closed (an inventory
// computed inside a useMemo, a reset clear inside a handler), now routed through the door. The window
// is kept as a second reader rather than deleted: containment and proximity disagree in both
// directions, and a row where the window says safe while containment says debt is the one that can
// blank the page, so the clause names the disagreement instead of averaging it away. The same parser
// also sees the call graph one hop: `useState(getInitialTheme)` runs that function during render, so
// a read inside it is a render-phase read, not a `later` one.
import { createServer } from "vite";
import ts from "typescript";
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
// 3 · the census: every storage read is contained, through the door, or declared debt
// ---------------------------------------------------------------------------
/** Two readers of the same question, both kept on purpose.
 *
 *  WINDOW is the test this file shipped at M227: a `try {` within LOOK_BACK characters before the
 *  name and a `catch` within LOOK_FWD after it. That measures character distances, not control flow.
 *  It approves a read sitting between somebody else's closed try and somebody else's later catch,
 *  and it refuses a read that is genuinely inside a long try whose `try` has drifted out of reach.
 *  PARSER asks what the code says: does an enclosing TryStatement hold this reference in ITS block,
 *  and does THAT statement have a catch clause? A `try { … } finally { … }` catches nothing.
 *
 *  The population is enumerated twice for the same reason: a census that reads nothing also reports
 *  no debt, and the two readers disagree the moment a storage touch arrives in a form only one of
 *  them recognises. Both skip the door's own function, which has a clause to itself below. */
const LOOK_BACK = 240, LOOK_FWD = 240;
const lineAt = (src, i) => src.slice(0, i).split(/\n/).length;
const RENDER_HOOKS = new Set(["useMemo", "useState"]);
const EFFECT_HOOKS = new Set(["useEffect", "useLayoutEffect"]);

const parseFile = (f, src) =>
  ts.createSourceFile(f, src.replace(/\r\n/g, "\n"), ts.ScriptTarget.ESLatest, true,
    f.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

/** The innermost function a reference sits in, mapped to the moment its code runs. `render` and
 *  `effect` both happen without the visitor asking, and with the 0 error boundaries measured below
 *  either one blanks the page; `module` happens before the first render; `later` needs an action. */
function momentOf(fn) {
  const p = fn.parent;
  if (p && ts.isCallExpression(p) && p.arguments.some((a) => a === fn)) {
    const callee = p.expression.getText();
    if (RENDER_HOOKS.has(callee)) return "render";
    if (EFFECT_HOOKS.has(callee)) return "effect";
    return "later";
  }
  const name = fn.name ? fn.name.getText() : p && ts.isVariableDeclaration(p) ? p.name.getText() : "";
  if (/^[A-Z]/.test(name)) return "render";
  return "later";
}
function moment(node) {
  for (let cur = node.parent; cur && !ts.isSourceFile(cur); cur = cur.parent) {
    if (ts.isFunctionLike(cur)) return momentOf(cur);
  }
  return "module";
}

/** One hop of the call graph, measured from what a hook is handed. `useState(getInitialTheme)` runs
 *  getInitialTheme during render and `useState(() => loadElapsed())` runs loadElapsed there too, so
 *  a read inside those functions is a render-phase read even though the function's own name and
 *  position say otherwise — momentOf alone would call it `later`. One hop only: a function reached
 *  *through* one of these is still labelled `later`, and the `twoHop` plant below pins that as this
 *  file's stated limit rather than a claim of completeness. The limit is on naming, not on coverage,
 *  because the ceiling-of-zero clause judges every read by containment whatever moment it runs in. */
function reachFromHooks(sf) {
  const reach = new Map();
  const add = (name, phase) => {
    const s = reach.get(name) || new Set();
    s.add(phase);
    reach.set(name, s);
  };
  const scan = (n) => {
    if (ts.isCallExpression(n)) {
      const callee = ts.isIdentifier(n.expression) ? n.expression.text : "";
      const phase = RENDER_HOOKS.has(callee) ? "render" : EFFECT_HOOKS.has(callee) ? "effect" : null;
      if (phase) {
        const see = (m) => {
          if (ts.isIdentifier(m)) add(m.text, phase);
          if (ts.isCallExpression(m) && ts.isIdentifier(m.expression)) add(m.expression.text, phase);
          ts.forEachChild(m, see);
        };
        for (const arg of n.arguments) see(arg);
      }
    }
    ts.forEachChild(n, scan);
  };
  scan(sf);
  return reach;
}

/** Innermost try that holds the reference in its own block — not one that merely precedes it. */
function containment(node) {
  for (let cur = node.parent; cur && !ts.isSourceFile(cur); cur = cur.parent) {
    if (!ts.isTryStatement(cur)) continue;
    const blk = cur.tryBlock || cur.block;
    if (!blk || node.getStart() < blk.getStart() || node.getStart() >= blk.getEnd()) continue;
    return { contained: !!cur.catchClause, shape: cur.catchClause ? "try+catch" : cur.finallyBlock ? "try+finally-no-catch" : "try-only" };
  }
  return { contained: false, shape: "outside-try" };
}

/** The window's own verdict, recomputed here so a row can be judged by both readers side by side. */
function windowVerdict(s, at) {
  const before = s.slice(Math.max(0, at - LOOK_BACK), at);
  const after = s.slice(at + 12, Math.min(s.length, at + 12 + LOOK_FWD));
  return /try\s*\{/.test(before) && /\bcatch\b/.test(after);
}

function classify(f, src) {
  const norm = src.replace(/\r\n/g, "\n");
  const blanked = normalize(src);
  const sf = parseFile(f, src);
  let doorFn = null;
  {
    const hunt = (n) => { if (ts.isFunctionDeclaration(n) && n.name && n.name.text === "browserStore") doorFn = n; ts.forEachChild(n, hunt); };
    hunt(sf);
  }
  const inDoor = (n) => !!doorFn && n.getStart() >= doorFn.getStart() && n.getStart() < doorFn.getEnd();

  const reach = reachFromHooks(sf);
  const enclosingName = (node) => {
    for (let cur = node.parent; cur && !ts.isSourceFile(cur); cur = cur.parent) {
      if (!ts.isFunctionLike(cur)) continue;
      if (cur.name) return cur.name.getText();
      return cur.parent && ts.isVariableDeclaration(cur.parent) ? cur.parent.name.getText() : "";
    }
    return "";
  };
  /** `later` is only `later` until the call graph says otherwise. */
  const labeled = (node) => {
    const base = moment(node);
    if (base !== "later") return base;
    const ph = reach.get(enclosingName(node));
    if (ph && ph.has("render")) return "via-render";
    if (ph && ph.has("effect")) return "via-effect";
    return base;
  };

  const sites = [], doorRefs = [], doorCalls = [];
  const visit = (n) => {
    if (ts.isIdentifier(n) && n.text === "localStorage") {
      const p = n.parent;
      const typeMember = p && (ts.isPropertySignature(p) || ts.isPropertyAssignment(p)) && p.name === n;
      // `window.localStorage`, `(globalThis as { localStorage?: T }).localStorage` and a bare
      // `localStorage` are all the same read; only a declaration's own name is not one.
      if (!typeMember) {
        const after = norm.slice(n.getStart() + 12, n.getStart() + 40);
        const c = containment(n);
        const row = { at: lineAt(norm, n.getStart()), verb: (after.match(/^\s*\.(getItem|setItem|removeItem)/) || [])[1] || "bare", contained: c.contained, shape: c.shape, moment: inDoor(n) ? "door-body" : labeled(n), window: false };
        (inDoor(n) ? doorRefs : sites).push(row);
      }
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "browserStore" && !inDoor(n)) {
      const c = containment(n);
      doorCalls.push({ at: lineAt(norm, n.getStart()), verb: "door", contained: c.contained, shape: c.shape, moment: labeled(n), window: false });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);

  /** The same population, counted without a parser: every localStorage name the comment stripper
   *  leaves outside the door's own function, in source order. Paired with the parser's rows below,
   *  which is what makes an enumeration that quietly reads nothing go red. */
  const doorSpan = (() => {
    const a = blanked.indexOf("export function browserStore");
    if (a < 0) return null;
    const b = blanked.indexOf("\n}", a);
    return b < 0 ? null : [a, b + 2];
  })();
  const textSites = [];
  for (const m of blanked.matchAll(/localStorage/g)) {
    if (doorSpan && m.index >= doorSpan[0] && m.index < doorSpan[1]) continue;
    textSites.push({ at: lineAt(blanked, m.index), window: windowVerdict(blanked, m.index) });
  }
  const ordered = [...sites, ...doorCalls].sort((a, b) => a.at - b.at);
  for (let i = 0, k = 0; i < ordered.length; i++) {
    if (ordered[i].verb === "door") continue;
    ordered[i].window = k < textSites.length ? textSites[k].window : null;
    k++;
  }
  return { sites: ordered, textSites, doorRefs, doorFn: !!doorFn };
}

const census = APP_FILES.map((f) => ({ f, ...classify(f, read(f)) }));
const sites = census.flatMap((c) => c.sites.map((x) => ({ file: c.f, ...x })));
const doorSites = sites.filter((x) => x.verb === "door");
const rawSites = sites.filter((x) => x.verb !== "door");
const debt = rawSites.filter((x) => !x.contained);

const parsedRows = census.map((c) => ({ f: c.f, refs: c.sites.filter((x) => x.verb !== "door"), text: c.textSites }));
const drift = parsedRows
  .filter((r) => r.refs.length !== r.text.length || r.refs.some((x, k) => x.at !== r.text[k].at))
  .map((r) => `${r.f}: parser ${r.refs.map((x) => x.at).join(",") || "nothing"} vs stripped text ${r.text.map((x) => x.at).join(",") || "nothing"}`);
ok(`the census's population is counted by two readers that do not share a method — the parser's references and the comment-stripped text's occurrences — and they agree site-for-site across all ${census.length} files (${sites.length} site(s) in ${new Set(sites.map((x) => x.file)).size} file(s), ${drift.length} drifting)`,
  drift.length === 0 && sites.length >= 20, drift.join(" · "));

const lenient = rawSites.filter((x) => x.window === true && !x.contained);
const strict = rawSites.filter((x) => x.window === false && x.contained);
ok(`…and read by containment the app's exposure is smaller than the window claimed: ${lenient.length} read(s) the distance test called safe sit outside any catch (the dangerous direction) while ${strict.length} the distance test called debt are inside one (${strict.map((x) => `${x.file}:${x.at} ${x.shape}`).join(", ") || "none"})`,
  lenient.length === 0,
  `lenient ${lenient.map((x) => `${x.file}:${x.at}`).join(", ") || "none"} · strict ${strict.length} · debt ${debt.length}`);

/** Debt is what the parser cannot account for. M227's ledger named four files; read by containment,
 *  ${debt.length} of its rows were reads inside a catch that the window had simply drifted away
 *  from, and the two that really were unguarded — an inventory read during render and a clear
 *  inside the reset handler — now go through the door. The ceiling is that measurement: an empty
 *  ledger, so any unguarded read in any file is a red rather than a new row someone can add. */
const DEBT = {};
const DEBT_CEILING = 0;
const byFile = {};
for (const x of debt) byFile[x.file] = (byFile[x.file] || 0) + 1;
const undeclared = Object.entries(byFile).filter(([f]) => !(f in DEBT));
const staleRows = Object.keys(DEBT).filter((f) => !byFile[f]);
ok(`the app touches browser storage in ${sites.length} site(s) across ${new Set(sites.map((x) => x.file)).size} file(s): ${doorSites.length} through the door, ${rawSites.length - debt.length} inside a catch, ${debt.length} unguarded (${debt.map((x) => `${x.file}:${x.at} ${x.verb} ${x.shape} in ${x.moment}`).join(", ") || "none"})`,
  sites.length >= 20 && doorSites.length >= 2 && undeclared.length === 0 && staleRows.length === 0 && debt.length <= DEBT_CEILING,
  `undeclared ${undeclared.map(([f, n]) => `${f}×${n}`).join(", ") || "none"} · stale rows ${staleRows.join(", ") || "none"} · debt ${debt.length}/${DEBT_CEILING}`);
ok(`…and nothing is declared any more: the ledger holds ${Object.keys(DEBT).length} row(s) against a ceiling of ${DEBT_CEILING}, so an unguarded read is a failure and not an exemption`,
  Object.keys(DEBT).length === 0 && DEBT_CEILING === 0 && debt.length === 0, `${Object.keys(DEBT).length} rows · ceiling ${DEBT_CEILING} · debt ${debt.length}`);

const doorCensus = census.find((c) => c.f === "domain/localData.ts");
ok(`the door's own function is the one place the accessor is read without a caller's guard, and that read is inside the catch that makes it safe (${doorCensus ? `${doorCensus.doorRefs.length} read(s) in ${doorCensus.doorFn ? "browserStore" : "NO browserStore"}: ${doorCensus.doorRefs.map((x) => `line ${x.at} ${x.shape} ${x.contained ? "contained" : "NOT CONTAINED"} (${x.moment})`).join(", ") || "none"}` : "domain/localData.ts missing from the census"})`,
  !!doorCensus && doorCensus.doorFn === true && doorCensus.doorRefs.length === 1 &&
  doorCensus.doorRefs[0].contained === true && doorCensus.doorRefs[0].moment === "door-body",
  doorCensus && JSON.stringify(doorCensus.doorRefs));

const byMoment = {};
for (const x of sites) byMoment[x.moment] = (byMoment[x.moment] || 0) + 1;
const BEFORE_ACTION = new Set(["render", "effect", "module", "via-render", "via-effect"]);
const fatal = sites.filter((x) => BEFORE_ACTION.has(x.moment));
const fatalRaw = fatal.filter((x) => x.verb !== "door");
ok(`the census also knows when a read runs — lexically in a hook (${byMoment.render || 0} render, ${byMoment.effect || 0} effect), one hop away through the function a hook is handed (${byMoment["via-render"] || 0} via-render, ${byMoment["via-effect"] || 0} via-effect), or at module scope — so the ${fatal.length} site(s) that run before the visitor acts are named separately, and the ${fatalRaw.length} of those that touch the accessor itself are all inside a catch (${fatalRaw.map((x) => `${x.file}:${x.at} ${x.moment} ${x.shape}`).join(", ") || "none"})`,
  fatal.length >= 10 && fatalRaw.length >= 5 && fatalRaw.every((x) => x.contained),
  `unguarded before any action: ${fatalRaw.filter((x) => !x.contained).map((x) => `${x.file}:${x.at} ${x.moment}`).join(", ") || "none"}`);

const providers = ["lib/theme.tsx", "i18n/index.tsx"].map((f) => {
  const x = classify(f, read(f)).sites;
  const raw = x.filter((y) => y.verb !== "door");
  return { f, door: x.filter((y) => y.verb === "door").length, raw: raw.length, rawUnguarded: raw.filter((y) => !y.contained).length, rawVerbs: raw.map((y) => y.verb).join("+"), moments: x.map((y) => `${y.verb}@${y.moment}`).join(",") };
});
ok(`each root provider reads the store through the door, touches the accessor only to persist, and is named as a render-phase reader rather than excused as a later one (${providers.map((p) => `${p.f}: ${p.door} door read / ${p.raw} raw ${p.rawVerbs}${p.rawUnguarded ? ` ${p.rawUnguarded} UNGUARDED` : ""} [${p.moments}]`).join(" · ")})`,
  providers.every((p) => p.door === 1 && p.raw === 1 && p.rawUnguarded === 0 && p.rawVerbs === "setItem" &&
    p.moments.split(",").includes("door@via-render")), JSON.stringify(providers));

const typeofSites = APP_FILES.flatMap((f) => {
  const s = normalize(read(f));
  return [...s.matchAll(/typeof\s+localStorage/g)].map((m) => ({ f, at: lineAt(s, m.index) }));
});
ok(`the existence check is not the safety check, and no code path uses it any more (${typeofSites.length} typeof-localStorage guard(s) outside comments: ${typeofSites.map((x) => `${x.f}:${x.at}`).join(", ") || "none"})`,
  typeofSites.length === 0, typeofSites.map((x) => `${x.f}:${x.at}`).join(", "));

{
  /** The classifier is tested against the shapes a distance test gets wrong, not against prose
   *  about them: each plant below states its predicted verdict, and a plant whose prediction is
   *  wrong is a hole in this file rather than a passing check. */
  const PLANTS = {
    bare: 'function readIt() {\n  const raw = localStorage.getItem("x");\n  return raw;\n}\n',
    caught: 'function readIt() {\n  try {\n    return localStorage.getItem("x");\n  } catch { return null; }\n}\n',
    finaled: 'function readIt() {\n  try {\n    return localStorage.getItem("x");\n  } finally { cleanup(); }\n}\n',
    prose: '// the callers pass something localStorage-shaped\nconst x = 1;\n',
    shadow: 'function earlier() {\n  try { return 1; } catch { return 2; }\n}\nfunction unsafe(k) {\n  const v = localStorage.getItem(k);\n  return v;\n}\nfunction later() {\n  try { return 3; } catch { return 4; }\n}\n',
    longTry: 'function readIt() {\n  try {\n' + "    const filler = 1;\n".repeat(30) + '    return localStorage.getItem("x");\n  } catch { return null; }\n}\n',
    typed: 'declare const bag: { localStorage: never };\nconst y = 1;\n',
    windowForm: 'function readIt() {\n  try {\n    return window.localStorage.getItem("x");\n  } catch { return null; }\n}\n',
    renderPhase: 'function Page() {\n  const v = useMemo(() => localStorage.getItem("x"), []);\n  return v;\n}\n',
    effectPhase: 'function Page() {\n  useEffect(() => { localStorage.setItem("x", "1"); }, []);\n}\n',
    doorShaped: 'export function browserStore(): unknown {\n  try {\n    return (globalThis as { localStorage?: never }).localStorage ?? null;\n  } catch {\n    return null;\n  }\n}\nfunction elsewhere() {\n  return 1;\n}\n',
    // The providers' real shape: the read is not lexically inside a hook, the hook is handed a
    // named function that contains it. `useState<Theme>(getInitialTheme)` in lib/theme.tsx.
    viaRender: 'function Page() {\n  const t = useState(getInitialTheme);\n  return t;\n}\nfunction getInitialTheme() {\n  return localStorage.getItem("x");\n}\n',
    viaEffect: 'function Page() {\n  useEffect(flushIt);\n}\nfunction flushIt() {\n  localStorage.setItem("x", "1");\n}\n',
    // And the limit, planted so it is measured instead of assumed: one hop is all this sees.
    twoHop: 'function Page() {\n  const t = useState(getInitialTheme);\n  return t;\n}\nfunction getInitialTheme() {\n  return readStore();\n}\nfunction readStore() {\n  return localStorage.getItem("x");\n}\n',
  };
  const p = Object.fromEntries(Object.entries(PLANTS).map(([k, src]) => [k, classify(`plant-${k}.tsx`, src)]));
  const one = (k) => p[k].sites[0] || null;
  const shape = (k) => { const s = one(k); return s ? `${s.shape}${s.window ? " window=SAFE" : " window=debt"} @${s.moment}` : "no site"; };
  const printed = Object.keys(PLANTS).map((k) => `${k}: ${p[k].sites.length} ${shape(k)}`).join(" · ");
  ok(`planted fourteen ways through the SAME classifier and every prediction held: an unwrapped read is debt; a catch excuses it; a bare finally does NOT (${JSON.stringify(one("finaled") && one("finaled").shape)}); prose is not a site; a read in the shadow of somebody else's closed try is the row the window calls SAFE and containment calls debt; a read deep inside a long try is the row the window calls debt and containment excuses; a type position is a site for the text reader and not for the parser (${p.typed.textSites.length} vs ${p.typed.sites.length}); window.localStorage is a read; the moment column names the render and effect phases, reaches through the function a hook is handed (@${one("viaRender") && one("viaRender").moment}, @${one("viaEffect") && one("viaEffect").moment}) and stops at that one hop, so a read two functions deep is still called later (@${one("twoHop") && one("twoHop").moment} — the containment ceiling is what covers it) (${printed})`,
    one("bare") && !one("bare").contained && one("bare").shape === "outside-try" && one("bare").window === false
    && one("caught").contained && one("caught").shape === "try+catch"
    && one("finaled").shape === "try+finally-no-catch" && !one("finaled").contained
    && p.prose.sites.length === 0 && p.prose.textSites.length === 0
    && one("shadow").window === true && one("shadow").contained === false && one("shadow").shape === "outside-try"
    && one("longTry").window === false && one("longTry").contained === true
    && p.typed.sites.length === 0 && p.typed.textSites.length === 1
    && one("windowForm").contained === true && one("windowForm").verb === "getItem"
    && one("renderPhase").moment === "render" && one("effectPhase").moment === "effect"
    && one("renderPhase").shape === "outside-try" && one("effectPhase").shape === "outside-try"
    && p.doorShaped.doorRefs.length === 1 && p.doorShaped.doorRefs[0].contained === true &&
      p.doorShaped.doorRefs[0].moment === "door-body" && p.doorShaped.sites.length === 0 &&
      p.doorShaped.textSites.length === 0
    && one("viaRender").moment === "via-render" && one("viaRender").shape === "outside-try" &&
      one("viaRender").window === false
    && one("viaEffect").moment === "via-effect" && one("viaEffect").verb === "setItem" &&
      !one("viaEffect").contained
    && one("twoHop").moment === "later" && one("twoHop").contained === false,
    printed);
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
ok(`…which is why the write side is read structurally instead: ${setItemSites} raw setItem site(s) and every one inside a block a catch can reach — the app accepts a session that cannot persist`,
  setItemSites >= 2 && rawSites.every((x) => x.verb !== "setItem" || x.contained),
  `${setItemSites} setItem, unguarded setItem: ${rawSites.filter((x) => x.verb === "setItem" && !x.contained).length}`);

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
