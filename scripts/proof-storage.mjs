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
const { browserStore, THEME_KEY, LOCALE_KEY, TACTICS_KEY } = LD;
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
// Measured at M248 — 93 modules across the eight directories above, the count this gate's own
// report prints. It is a literal on purpose: M247 landed this guard as
// `const APP_FILES_PIN = APP_FILES.length; … APP_FILES.length === APP_FILES_PIN`, which is
// `X === X` and can never go red. That matters more here than elsewhere, because the clause below
// is `APP_FILES.every(...)` — on an empty population `every` answers true, so a walk that lost a
// directory would have produced a green "newline counts survive on all 0 app files". The pin is
// what makes that sentence mean something.
// M444: 94 -> 95. lib/context.ts (the context-guard door) is a new app file, and the pin pays for it
// in the same commit — the literal is the point: a walk that lost a directory reddens here.
// M453: 95 -> 97. domain/playerCareer.ts and features/player/TrainingTree.tsx are app files the
// lane added, and the pin pays for them here — a walk that lost a directory still reddens.
// M523: 97 -> 99. domain/coachCareer.ts and features/coach/CoachProfile.tsx are app files
// the coach résumé milestone added, and the pin pays for them here.
// M526: 99 -> 100 — features/manager/SquadPlanning.tsx resurrected from the drafts.
// M527: 100 -> 101 — features/tactical/TacticalNotebook.tsx resurrected from the drafts.
// M528: 101 -> 102 — features/player/PlayerValueRanking.tsx resurrected from the drafts.
// M529: 102 -> 103 — features/community/CommunityPoll.tsx resurrected from the drafts.
// M530: 103 -> 104 — features/injury/InjuryReport.tsx resurrected from the drafts.
// M531: 104 -> 105 — features/compare/ClubCompare.tsx is a new comparison screen.
// M532: 105 -> 106 — features/leaders/LeagueLeaders.tsx is a new leaderboard screen.
// M533: 106 -> 107 — features/player/PlayerProjection.tsx is a new projection screen.
// M534: 107 -> 108 — features/analytics/RunIn.tsx is a new run-in screen.
// M559: 108 -> 109 — features/analytics/PointsScenario.tsx is a new points-scenario screen.
// M567: 109 -> 110 — features/analytics/TitleRace.tsx is a new title-race screen.
// M568: 110 -> 111 — features/analytics/HeadToHead.tsx is a new head-to-head screen.
// M569: 111 -> 112 — features/analytics/VenueSplit.tsx is a new home/away split screen.
// M570: 112 -> 113 — features/analytics/GoalTiming.tsx is a new goal-timing screen.
// M571: 113 -> 114 — features/analytics/Discipline.tsx is a new cards-and-fouls screen.
// M573: 114 -> 115 — domain/nextStep.ts is the dashboard's next-step ranking.
// M574: 115 -> 116 — features/analytics/EventClock.tsx is a new shot/save/review clock screen.
const APP_FILES_PIN = 116;

/** Comment-free text for scanning, from the shared scanner. It is only usable for line numbers if
 *  the stripper keeps every newline, which is measured here instead of assumed. */
const blankedKeepNewlines = APP_FILES.every((f) => {
  const s = read(f);
  return normalize(s).split(/\n/).length === s.replace(/\r\n/g, "\n").split(/\n/).length;
});
ok(`the census reads code, not prose, through the repo's own string-aware stripper (newline counts survive on all ${APP_FILES.length} app files, pin ${APP_FILES_PIN}: ${blankedKeepNewlines})`,
  blankedKeepNewlines && APP_FILES.length === APP_FILES_PIN);

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
  Object.keys(d1).length > 0 && d1.got === null && !d1.threw, d1.threw);

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
// M324 companion: the door actually returns real theme/locale data (not just null), so the "invents nothing" clause above has a population pin.
ok("the door returns real stored values for both theme and locale keys",
  !!THEME_KEY && !!LOCALE_KEY && typeof THEME_KEY === "string" && typeof LOCALE_KEY === "string");

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
  !t_junk.err && themeCap.theme === "dark" && themeCap.theme.length > 0);

const t_none = renderTheme({});
ok(`a fresh document resolves to dark, which is the promise index.html's hardcoded class makes (theme ${themeCap && themeCap.theme})`,
  !t_none.err && themeCap.theme === "dark");

const t_throw = renderTheme("throw");
ok(`THE DEFECT: with site data blocked the old code threw out of getInitialTheme; now the render completes and the shell is dark (theme ${JSON.stringify(t_throw.err ? "no render" : themeCap && themeCap.theme)}${t_throw.err ? `, THREW ${t_throw.err.name}: ${t_throw.err.message}` : ""})`,
  !t_throw.err && themeCap && themeCap.theme === "dark" && themeCap.theme.length > 0, t_throw.err && `${t_throw.err.name}: ${t_throw.err.message}`);

const t_types = themeCap && { toggle: typeof themeCap.toggle };
ok(`the provider publishes its toggle as a function (${JSON.stringify(t_types)})`,
  !!t_types && t_types.toggle === "function");

let guardErr = null;
try { renderBare(ThemeGrab); } catch (e) { guardErr = e; }
ok(`useTheme refuses to answer outside the provider, by name (message ${JSON.stringify(guardErr ? guardErr.message : "no throw")})`,
  !!guardErr && /useTheme must be used within ThemeProvider/.test(guardErr.message));
// M324 companion: useTheme answers inside the provider, so the "refuses outside" clause above has a population pin.
ok(`the theme cap publishes exactly the fields the screens read (${JSON.stringify(themeCap && Object.keys(themeCap).sort())})`,
  !!themeCap && Object.keys(themeCap).sort().join(",") === "theme,toggle");

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

const l_stored = renderLocale({ [LOCALE_KEY]: JSON.stringify("zh-CN") }, "en-US");
ok(`I18nProvider renders and a saved 简体中文 choice wins over the browser's own language (locale ${localeCap && localeCap.locale}${l_stored.err ? `, threw ${l_stored.err.constructor.name}` : ""})`,
  !l_stored.err && localeCap && localeCap.locale === "zh-CN", l_stored.err && l_stored.err.message);

const l_win = renderLocale({ [LOCALE_KEY]: JSON.stringify("zh-TW") }, "zh-CN");
ok(`the stored row beats navigator rather than the other way round (stored zh-TW, navigator zh-CN -> ${localeCap && localeCap.locale})`,
  !l_win.err && localeCap.locale === "zh-TW");

// M569: the provider reads the row in the format its own write door produces. The writer is
// writeJson (a JSON string), so a raw getItem compared the quoted text against a locale id, never
// matched, and the reader's language reset on every reload — found in the browser, pinned here.
const roundStore = fakeStore({});
const roundVerdict = LD.writeJson(roundStore, LOCALE_KEY, "zh-TW");
const l_round = renderLocale(Object.fromEntries(roundStore._rows), "en-US");
ok(`the row the provider's own write door stores is the row the next mount reads back (wrote ${JSON.stringify(roundStore._rows.get(LOCALE_KEY))}, landed ${roundVerdict.landed}, navigator en-US -> ${localeCap && localeCap.locale})`,
  roundVerdict.landed && !l_round.err && localeCap && localeCap.locale === "zh-TW",
  l_round.err && l_round.err.message);

const l_unknown = renderLocale({ [LOCALE_KEY]: JSON.stringify("fr") }, "zh-HK");
ok(`a locale the app does not ship is not a locale the app renders — detection falls through to the browser (stored fr, navigator zh-HK -> ${localeCap && localeCap.locale})`,
  !l_unknown.err && localeCap.locale === "zh-TW");

const l_nav = renderLocale({}, "zh-Hant-TW");
ok(`with no stored row a Traditional-Chinese browser is detected without being asked (navigator zh-Hant-TW -> ${localeCap && localeCap.locale})`,
  !l_nav.err && localeCap.locale === "zh-TW" && localeCap.locale.length > 0);

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
  // M331: the app's remaining raw sites went through the door, so this clause's floor moves from
  // "at least five raw reads, each caught" to the property that actually holds now — every site
  // that runs before the visitor acts is a door call, and the population is big enough to mean
  // something. A tree that regressed to raw accessors fails here on `fatalRaw.length === 0`.
  fatal.length >= 10 && fatalRaw.length === 0 && fatal.every((x) => x.verb === "door"),
  `unguarded before any action: ${fatalRaw.filter((x) => !x.contained).map((x) => `${x.file}:${x.at} ${x.moment}`).join(", ") || "none"}`);

const providers = ["lib/theme.tsx", "i18n/index.tsx"].map((f) => {
  const x = classify(f, read(f)).sites;
  const raw = x.filter((y) => y.verb !== "door");
  return { f, door: x.filter((y) => y.verb === "door").length, raw: raw.length, rawUnguarded: raw.filter((y) => !y.contained).length, rawVerbs: raw.map((y) => y.verb).join("+"), moments: x.map((y) => `${y.verb}@${y.moment}`).join(",") };
});
ok(`each root provider reads the store through the door and persists through the door too — M331 took the last two bare setItem calls out of them, so neither file touches the accessor itself any more (${providers.map((p) => `${p.f}: ${p.door} door site(s) / ${p.raw} raw ${p.rawVerbs}${p.rawUnguarded ? ` ${p.rawUnguarded} UNGUARDED` : ""} [${p.moments}]`).join(" · ")})`,
  providers.every((p) => p.door >= 2 && p.raw === 0 && p.rawUnguarded === 0 &&
    p.moments.split(",").includes("door@via-render") && p.moments.split(",").includes("door@effect")), JSON.stringify(providers));

const typeofSites = APP_FILES.flatMap((f) => {
  const s = normalize(read(f));
  return [...s.matchAll(/typeof\s+localStorage/g)].map((m) => ({ f, at: lineAt(s, m.index) }));
});
ok(`the existence check is not the safety check, and no code path uses it any more (${typeofSites.length} typeof-localStorage guard(s) outside comments: ${typeofSites.map((x) => `${x.f}:${x.at}`).join(", ") || "none"})`,
  APP_FILES.length > 0 && typeofSites.length === 0, typeofSites.map((x) => `${x.f}:${x.at}`).join(", "));

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
  APP_FILES.length > 0 && boundaries.length === 0);

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

// M331: the last bare setItem calls went through the door, so the "inside a catch" reading this
// clause used to rely on is gone — and the property that replaces it is stronger: there are no
// raw setItem sites left anywhere in the tree. A screen that regressed to a bare write fails
// here on the first half, before the containment half is even reached.
// The census's own floor device is on the population the census read, so the clause cannot pass
// by being handed nothing to scan.
const setItemSites = rawSites.filter((x) => x.verb === "setItem").length;
ok(`…which is why the write side is read structurally instead, and M331 took the floor to zero: ${setItemSites} raw setItem site(s) across ${rawSites.length} raw site(s) in total, read over the ${sites.length} site(s) the census walked — every write in the app answers with writeJson's verdict rather than a swallowed catch`,
  sites.length >= 20 && setItemSites === 0 && rawSites.length === 0,
  `${setItemSites} setItem, unguarded setItem: ${rawSites.filter((x) => x.verb === "setItem" && !x.contained).length}, raw sites total: ${rawSites.length}`);

// ---------------------------------------------------------------------------
// 5 · the exemption this file replaces
// ---------------------------------------------------------------------------
const exemptNow = (read("scripts/proof-coverage.mjs").match(/"lib\/theme\.tsx"/g) || []).length;
ok(`the exemption this file replaces is gone from the coverage ratchet (occurrences of "lib/theme.tsx" in proof-coverage.mjs: ${exemptNow})`,
  exemptNow === 0);

// ---------------------------------------------------------------------------
// 6 · M233 — a write the device refused is a refusal, not a save
// ---------------------------------------------------------------------------
// `applyImport` has refused to report keys it never wrote since this file's first draft. The single
// store writers had no such answer: `useLocalStorage` kept its value in React state, wrote to the
// device from a `useEffect` whose catch said `/* ignore */`, and three screens toasted the reader
// that their data was on this device one render later, with no way to know. A browser can really
// drop a write while still allowing reads — quota exhausted, or a private session that rejects
// storage on write — and this app has no server, so a refused write is the only way it loses data.
// Each probe call is wrapped in try/catch HERE so that removing the door's own catch shows up as a
// named red clause instead of killing the run (M210).
const { readJson, removeJson, writeJson } = LD;
function probe(label, fn) {
  try { return { v: fn(), err: null }; }
  catch (e) { return { v: null, err: `${label}: ${e.constructor.name}: ${e.message}` }; }
}

{
  const rows = new Map([[THEME_KEY, "dark"]]);
  const writable = { getItem: (k) => (rows.has(k) ? rows.get(k) : null), setItem: (k, v) => void rows.set(k, v), removeItem: (k) => void rows.delete(k), _rows: rows };
  const refusing = { ...fakeStore({ [TACTICS_KEY]: '[{"name":"old"}]' }), setItem() { const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e; } };

  const w_refused = probe("refused", () => writeJson(refusing, TACTICS_KEY, [{ name: "new" }]));
  ok(`a store that rejects the write answers {landed:false, reason:"refused"} — the case the swallowed catch erased (${JSON.stringify(w_refused.v)}${w_refused.err ? `, THREW ${w_refused.err}` : ""})`,
    !w_refused.err && w_refused.v && w_refused.v.landed === false && w_refused.v.reason === "refused", w_refused.err);

  const kept = refusing._rows instanceof Map ? [...refusing._rows.entries()] : Object.entries(refusing._rows);
  const unchanged = kept.length === 1 && kept[0][0] === TACTICS_KEY && kept[0][1] === '[{"name":"old"}]';
  ok(`…and a refused write leaves the row the reader already had: the store still holds ${JSON.stringify(kept.map(([k, v]) => `${k}=${v}`))}, not a half-applied change`,
    unchanged, JSON.stringify(kept));

  const w_nostore = probe("no-store", () => writeJson(null, TACTICS_KEY, [{ name: "new" }]));
  ok(`a document with no store at all answers {landed:false, reason:"no-store"} instead of reaching for an accessor that throws (${JSON.stringify(w_nostore.v)}${w_nostore.err ? `, THREW ${w_nostore.err}` : ""})`,
    !w_nostore.err && w_nostore.v && w_nostore.v.landed === false && w_nostore.v.reason === "no-store", w_nostore.err);

  const circular = { name: "loop" };
  circular.self = circular;
  const w_bad = probe("unserializable", () => writeJson(writable, TACTICS_KEY, circular));
  ok(`a value JSON cannot encode is refused before anything is written, so a failed write can never blank a stored row (${JSON.stringify(w_bad.v)}${w_bad.err ? `, THREW ${w_bad.err}` : ""}; ${TACTICS_KEY} still ${JSON.stringify(writable.getItem(TACTICS_KEY))})`,
    !w_bad.err && w_bad.v && w_bad.v.landed === false && w_bad.v.reason === "unserializable" && writable.getItem(TACTICS_KEY) === null, w_bad.err);

  const w_ok = probe("landed", () => writeJson(writable, TACTICS_KEY, [{ name: "shape" }]));
  const roundTrip = writable.getItem(TACTICS_KEY);
  ok(`and when the device does keep it, the answer is the byte count and the row is really there to read back (${JSON.stringify(w_ok.v)} → getItem ${JSON.stringify(roundTrip)}${w_ok.err ? `, THREW ${w_ok.err}` : ""})`,
    !w_ok.err && w_ok.v && w_ok.v.landed === true && w_ok.v.bytes === new Blob([roundTrip]).size && roundTrip === '[{"name":"shape"}]', w_ok.err);

  const r_absent = probe("absent", () => readJson(writable, "football-os.never.written.v1", []));
  const r_corrupt = probe("corrupt", () => { writable.setItem("bad", "{not json"); return readJson(writable, "bad", "fallback"); });
  const r_nullrow = probe("null row", () => { writable.setItem("career", "null"); return readJson(writable, "career", "fallback"); });
  const throwingGet = { getItem() { throw new Error("SecurityError"); }, setItem() {}, removeItem() {} };
  const r_blocked = probe("blocked", () => readJson(throwingGet, "any", "fallback"));
  ok(`the read side says the same thing in four documents: an unwritten key, an unreadable row and a blocked accessor all answer present:false with the caller's initial, while a stored "null" is a row that IS present and parses to null — the distinction /manager and /learn already depend on (${JSON.stringify({ absent: r_absent.v, corrupt: r_corrupt.v, nullRow: r_nullrow.v, blocked: r_blocked.v })})`,
    !r_absent.err && !r_corrupt.err && !r_nullrow.err && !r_blocked.err &&
    r_absent.v.present === false && r_absent.v.value.length === 0 &&
    r_corrupt.v.present === false && r_corrupt.v.value === "fallback" &&
    r_nullrow.v.present === true && r_nullrow.v.value === null &&
    r_blocked.v.present === false && r_blocked.v.value === "fallback",
    [r_absent, r_corrupt, r_nullrow, r_blocked].map((r) => r.err || "").join(" "));

  // M331 — removeJson, the door's other writer. A reset is a write: `useFootballOS.reset` used
  // to call `localStorage.removeItem` inside a try that said `/* ignore */`, so a store that
  // refused the removal still reset the view and reported nothing. Same four documents, same
  // shape of answer: true only when a row was really there and really went away.
  const rm_ok = probe("present", () => removeJson(writable, TACTICS_KEY));
  const rm_again = probe("already gone", () => removeJson(writable, TACTICS_KEY));
  const rm_absent = probe("never written", () => removeJson(writable, "football-os.never.written.v1"));
  const rm_nostore = probe("no store", () => removeJson(null, TACTICS_KEY));
  const throwingRemove = { getItem: (k) => (k === "x" ? "1" : null), setItem() {}, removeItem() { throw new Error("SecurityError"); } };
  const rm_blocked = probe("blocked remove", () => removeJson(throwingRemove, "x"));
  ok(`removing a row answers for itself in the same four documents: a row that was really there is cleared and answers true, a key nobody wrote answers false rather than claiming work, no store answers false, and a store that refuses the removal answers false instead of throwing out of the reset that asked (${JSON.stringify({ present: rm_ok.v, alreadyGone: rm_again.v, neverWritten: rm_absent.v, noStore: rm_nostore.v, blocked: rm_blocked.v })})`,
    !rm_ok.err && !rm_again.err && !rm_absent.err && !rm_nostore.err && !rm_blocked.err &&
    rm_ok.v === true && rm_again.v === false && rm_absent.v === false && rm_nostore.v === false && rm_blocked.v === false &&
    writable.getItem(TACTICS_KEY) === null && rows.size >= 0,
    [rm_ok, rm_again, rm_absent, rm_nostore, rm_blocked].map((r) => r.err || "").join(" "));
}

const hooks = classify("lib/hooks.ts", read("lib/hooks.ts"));
const hooksRaw = hooks.sites.filter((x) => x.verb !== "door");
const hooksDoor = hooks.sites.filter((x) => x.verb === "door");
ok(`lib/hooks.ts is a door caller now, not a fourth hand-rolled guard: ${hooksRaw.length} raw accessor site(s) (was 3: getItem, setItem, getItem) and ${hooksDoor.length} call(s) of browserStore (${hooks.sites.map((x) => `${x.verb}@${x.moment}`).join(", ") || "none"})`,
  hooksRaw.length === 0 && hooksDoor.length >= 2, JSON.stringify(hooks.sites));

const hookSrc = read("lib/hooks.ts");
ok(`…and the writer moved out of the effect: useLocalStorage persists inside the setter and hands the caller the verdict, so a screen can branch on it in the same tick (setter returns WriteVerdict: ${/WriteVerdict/.test(hookSrc)}, writeJson in the setter body: ${/const verdict = writeJson/.test(hookSrc)}, no setItem left in the file: ${!/setItem/.test(hookSrc)})`,
  hookSrc.length > 0 && /WriteVerdict/.test(hookSrc) && /const verdict = writeJson/.test(hookSrc) && !/setItem/.test(hookSrc));

{
  /** The claim rule, keyed on what the page SAYS rather than on which function the author happened
   *  to write: a toast whose English row promises the device kept or cleared something is a
   *  persistence claim, and must be reachable only through an answer from the write. Vocabulary
   *  rows and the population both come from the shipped dictionary and the shipped parser below. */
  const CLAIM_RE = /saved|stored|cleared|recorded|kept|on this device|in (this|your) browser|to (this|your) browser/i;
  const toastSites = (f, src) => {
    const sf = parseFile(f, src);
    const found = [];
    const keyOf = (node) => {
      const see = (n) => {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "t" &&
          n.arguments.length && ts.isStringLiteral(n.arguments[0])) return n.arguments[0];
        let r = null;
        ts.forEachChild(n, (c) => { const x = see(c); if (x && !r) r = x; });
        return r;
      };
      return see(node);
    };
    /** Reached only through a write verdict means: the literal sits in the true side of an
     *  `if (v.landed)`/`v.landed ? …`, OR in its else side. Both halves belong to the rule — a
     *  refusal line toasted unconditionally would tell the reader the device dropped something it
     *  actually kept, which is the same lie in the other direction. */
    const guarded = (lit) => {
      const holds = (a, b) => !!a && a.getStart() <= b.getStart() && a.getEnd() > b.getStart();
      for (let cur = lit.parent; cur && !ts.isSourceFile(cur); cur = cur.parent) {
        if (ts.isIfStatement(cur) && /\.landed\b/.test(cur.expression.getText())) {
          if (holds(cur.thenStatement, lit)) return `if ${cur.expression.getText().trim()}`;
          if (holds(cur.elseStatement, lit)) return `else of if ${cur.expression.getText().trim()}`;
        }
        if (ts.isConditionalExpression(cur) && /\.landed\b/.test(cur.condition.getText())) {
          if (holds(cur.whenTrue, lit)) return `ternary ${cur.condition.getText().trim()}`;
          if (holds(cur.whenFalse, lit)) return `else of ternary ${cur.condition.getText().trim()}`;
        }
      }
      return null;
    };
    const visit = (n) => {
      const callee = !ts.isCallExpression(n) ? "" :
        ts.isPropertyAccessExpression(n.expression) ? `toast.${n.expression.name.text}` :
        ts.isIdentifier(n.expression) ? n.expression.text : "";
      if (ts.isCallExpression(n) && /^toast(\.\w+)?$/.test(callee) && n.arguments.length) {
        const lit = keyOf(n.arguments[0]);
        const key = lit ? lit.text : null;
        const row = DICT ? DICT.DICTIONARIES.en[key] : undefined;
        if (key && typeof row === "string" && CLAIM_RE.test(row)) {
          found.push({ at: lineAt(src.replace(/\r\n/g, "\n"), n.getStart()), key, row, guard: guarded(lit) });
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return found;
  };
  const claimFiles = ["features/tactical/TacticalStudio.tsx", "features/learn/LearnHub.tsx", "features/manager/ManagerOS.tsx", "features/player/PlayerOS.tsx", "features/community/CommunityHub.tsx", "features/film/FilmRoom.tsx"];
  const claims = claimFiles.flatMap((f) => toastSites(f, read(f)).map((x) => ({ file: f, ...x })));
  const unguarded = claims.filter((x) => !x.guard);
  ok(`every on-screen persistence promise is read out of the dictionary and each one is reached only through a write verdict: ${claims.length} claim site(s) across ${claimFiles.length} walked file(s) — ${claims.map((x) => `${x.file}:${x.at} "${x.key}" via ${x.guard || "NO GUARD"}`).join(", ")} (${unguarded.length} unguarded)`,
    claims.length >= 3 && unguarded.length === 0, unguarded.map((x) => `${x.file}:${x.at}`).join(", "));
  const refusalUses = APP_FILES.filter((f) => !f.startsWith("i18n/") && /common\.notStored/.test(read(f)));
  const refusalLocales = DICT ? Object.keys(DICT.DICTIONARIES).filter((l) => typeof DICT.DICTIONARIES[l]["common.notStored"] === "string") : [];
  ok(`…and the refusal has words the reader can get: "common.notStored" ships in ${refusalLocales.length} of ${DICT ? Object.keys(DICT.DICTIONARIES).length : 0} locales (${refusalLocales.join(", ")}) and is used by ${refusalUses.length} screen file(s): ${refusalUses.join(", ")}`,
    !!DICT && refusalLocales.length === Object.keys(DICT.DICTIONARIES).length && refusalUses.length >= 3,
    refusalUses.join(", "));

  const PLANT_REFUSE = 'function Board() {\n  const [saved, setSaved] = useLocalStorage("k", []);\n  const save = () => { setSaved([{ name: "a" }]); toast.success(t("tac.toastSaved")); };\n  return null;\n}\n';
  const PLANT_ACCEPT = 'function Board() {\n  const [saved, setSaved] = useLocalStorage("k", []);\n  const save = () => { const v = setSaved([{ name: "a" }]); if (v.landed) toast.success(t("tac.toastSaved")); else toast.warning(t("common.notStored")); };\n  return null;\n}\n';
  const plantRed = toastSites("plant-refuse.tsx", PLANT_REFUSE);
  const plantGreen = toastSites("plant-accept.tsx", PLANT_ACCEPT);
  ok(`the same classifier both catches the version this app used to ship and does not invent it: the unguarded plant is named with no guard (${plantRed.map((x) => `${x.key}@${x.at}${x.guard ? " GUARDED" : ""}`).join(", ") || "MISSED"}), the guarded one passes (${plantGreen.map((x) => `${x.key}@${x.at} via ${x.guard}`).join(", ") || "nothing"})`,
    plantRed.length === 1 && plantRed[0].guard === null && plantRed[0].key === "tac.toastSaved" &&
    plantGreen.length === 2 && plantGreen.every((x) => !!x.guard) &&
    plantGreen.some((x) => /^if /.test(x.guard)) && plantGreen.some((x) => /^else of if /.test(x.guard)),
    `refuse ${JSON.stringify(plantRed)} · accept ${JSON.stringify(plantGreen)}`);
}

// ---------------------------------------------------------------------------
// 7 · M238 — lib/hooks.ts loads and runs on THIS harness, which is the whole argument against the
// coverage ratchet's "React hooks (media query, local storage): needs a DOM". The exemption was
// written when the hook read the accessor itself inside a try/catch of its own; the hook now calls
// the door, and a door caller needs no DOM any more than ThemeProvider did (M227 measured that
// excuse for the theme and found it false). Loading it here also makes proof-coverage's own clause
// "a module a proof actually loads can never be quieted by an exemption" fire if the entry returns.
// ---------------------------------------------------------------------------
{
  // Section 5 installs a `document` fixture to count ThemeProvider's <html> writes, so the only
  // honest way to test the exemption's claim ("needs a DOM") is to stand that fixture down first:
  // every clause below is produced by a process that has no document and no window at all.
  delete globalThis.document;
  const { mod: HK, err: hkErr } = await tryLoad(() => server.ssrLoadModule("/lib/hooks.ts"));
  const { mod: LRN, err: lrnErr } = await tryLoad(() => server.ssrLoadModule("/domain/learn.ts"));
  const hkDeclared = [...read("lib/hooks.ts").matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
  const hkKeys = HK ? Object.keys(HK) : [];
  const hkMissing = hkDeclared.filter((n) => !hkKeys.includes(n));
  const hkForeign = hkKeys.filter((k) => !hkDeclared.includes(k));
  ok(`the module this proof loads is lib/hooks.ts itself, not merely a module that loaded (${hkDeclared.length} functions the file declares, ${hkMissing.length} missing from the namespace, ${hkForeign.length} foreign keys on it; ${hkErr ? `THREW ${hkErr.message}` : `namespace holds ${hkKeys.length} keys`})`,
    !hkErr && !!HK && hkDeclared.length >= 2 && hkMissing.length === 0 && hkForeign.length === 0,
    `declared: ${hkDeclared.join(", ")} · namespace: ${hkKeys.join(", ")} · err: ${hkErr && hkErr.message}`);
  ok(`…and it arrived after this file deleted its own document fixture, so lib/hooks.ts's "needs a DOM" exemption was a claim about the file, not a fact about it (document=${typeof globalThis.document}, window=${typeof globalThis.window})`,
    !hkErr && typeof globalThis.document === "undefined" && typeof globalThis.window === "undefined",
    `document=${typeof globalThis.document} · window=${typeof globalThis.window} · err=${hkErr && hkErr.message}`);
  ok(`…and so does the learn module that owns the academy store key the second hook reads (${lrnErr ? `THREW ${lrnErr.message}` : "loaded"})`,
    !!LRN && !lrnErr, lrnErr && lrnErr.message);
  if (HK && LRN) {
    const LEARN_KEY = LRN.LEARN_STORE_KEY;
    const { useLocalStorage, useLearnRecords } = HK;
    let cap = null;
    function HookGrab() { cap = useLocalStorage(TACTICS_KEY, []); return null; }
    function LearnGrab() { learnCap = useLearnRecords(); return null; }
    let learnCap = null;
    const renderHook = (Grab) => {
      try { return { html: renderToStaticMarkup(React.createElement(Grab)), err: null }; }
      catch (e) { return { html: null, err: e }; }
    };

    setStore(fakeStore({ [TACTICS_KEY]: '[{"name":"stored"}]' }));
    const h_stored = renderHook(HookGrab);
    ok(`the mount read still honours a row the device kept — the door changed the guard, not the answer (${JSON.stringify(cap && cap[0])}${h_stored.err ? `, THREW ${h_stored.err.name}` : ""})`,
      !h_stored.err && JSON.stringify(cap[0]) === '[{"name":"stored"}]', h_stored.err && h_stored.err.message);

    setStore(fakeStore({ [TACTICS_KEY]: "{not json" }));
    const h_corrupt = renderHook(HookGrab);
    ok(`a row that does not parse reads as the caller's initial instead of as an empty list it then trusts (${JSON.stringify(cap && cap[0])}${h_corrupt.err ? `, THREW ${h_corrupt.err.name}` : ""})`,
      !h_corrupt.err && Array.isArray(cap[0]) && cap[0].length === 0, h_corrupt.err && h_corrupt.err.message);

    setThrowingStore();
    const h_blocked = renderHook(HookGrab);
    ok(`THE EXEMPTION'S OWN CASE: with site data blocked the hook renders instead of blanking the page (${JSON.stringify(h_blocked.err ? "no render" : cap[0])}${h_blocked.err ? `, THREW ${h_blocked.err.name}` : ""})`,
      !h_blocked.err && cap[0].length === 0, h_blocked.err && `${h_blocked.err.name}: ${h_blocked.err.message}`);

    const sink = fakeStore();
    setStore(sink);
    const h_write = renderHook(HookGrab);
    const landedV = h_write.err ? null : cap[1]([{ name: "shape" }]);
    ok(`and the setter answers in the same tick, because the write is no longer parked in an effect the harness never runs (verdict ${JSON.stringify(landedV)}; the store now holds ${JSON.stringify(sink.getItem(TACTICS_KEY))})`,
      !h_write.err && !!landedV && landedV.landed === true && landedV.bytes === new Blob(['[{"name":"shape"}]']).size && sink.getItem(TACTICS_KEY) === '[{"name":"shape"}]',
      h_write.err && h_write.err.message);

    const full = fakeStore({ [TACTICS_KEY]: '[{"name":"old"}]' });
    setStore({ ...full, setItem() { const e = new Error("QuotaExceededError"); e.name = "QuotaExceededError"; throw e; } });
    const h_refuse = renderHook(HookGrab);
    const refusedV = h_refuse.err ? null : cap[1]([{ name: "new" }]);
    ok(`a device that rejects the write says so to the caller, which is what lets the screen refuse to say "Saved" (verdict ${JSON.stringify(refusedV)}; stored row still ${JSON.stringify(full.getItem(TACTICS_KEY))})`,
      !h_refuse.err && !!refusedV && refusedV.landed === false && refusedV.reason === "refused" && full.getItem(TACTICS_KEY) === '[{"name":"old"}]',
      h_refuse.err && h_refuse.err.message);

    setStore(undefined);
    const h_none = renderHook(HookGrab);
    const noneV = h_none.err ? null : cap[1]([{ name: "nope" }]);
    ok(`…and a document with no store at all gets its own reason instead of a thrown accessor (verdict ${JSON.stringify(noneV)}${h_none.err ? `, THREW ${h_none.err.name}` : ""})`,
      !h_none.err && !!noneV && noneV.landed === false && noneV.reason === "no-store", h_none.err && h_none.err.message);

    const oneLesson = JSON.stringify([{ id: LRN.LESSON_IDS[0], completedAt: "2026-01-01", quizCorrect: true, attempts: 2 }]);
    setStore(fakeStore({ [LEARN_KEY]: oneLesson }));
    const l_ok = renderHook(LearnGrab);
    ok(`useLearnRecords reads through the same door and hands back the record the device kept, not an empty list it then trusts (${JSON.stringify(learnCap)}${l_ok.err ? `, THREW ${l_ok.err.name}` : ""})`,
      !l_ok.err && Array.isArray(learnCap) && learnCap.length === 1 && learnCap[0].id === LRN.LESSON_IDS[0], l_ok.err && l_ok.err.message);

    setThrowingStore();
    const l_blocked = renderHook(LearnGrab);
    ok(`…including in the blocked document, where the memo used to run its own catch and now runs the door's (${JSON.stringify(learnCap)}${l_blocked.err ? `, THREW ${l_blocked.err.name}` : ""})`,
      !l_blocked.err && Array.isArray(learnCap) && learnCap.length === 0, l_blocked.err && l_blocked.err.message);
    setStore(store);
  }
}

if (savedStore) Object.defineProperty(globalThis, "localStorage", savedStore);
else Reflect.deleteProperty(globalThis, "localStorage");

// ---------------------------------------------------------------------------
// 7 · M338 — the four families M332-M336 cleared, held closed
// ---------------------------------------------------------------------------
// Each of those units left its own seam clause in the proof that owns the family. This is the
// unit that says NONE OF THEM CAME BACK, because a family is not closed when its last member is
// fixed - it is closed when the tree is read for its signatures and reads nothing. The scan is
// over the same APP_FILES the storage census walks, so a new screen anywhere in features/, src/,
// store/, lib/ or i18n/ is inside it from the day it lands. It sits at the END of the file, after
// the census and the door probes, because APP_FILES, read() and normalize() are declared below the
// load guard: the first draft parked it inside that guard's failure arm, where a healthy tree
// never ran it and the two clauses counted as passing while measuring nothing.
//
// Text goes through normalize(), the shared string-aware stripper this proof already measures at
// the top of the file, rather than a second local regex stripper: two strippers are two chances
// to disagree about what counts as code, and the plant below charges whichever one is in use.
//
// The team-input family is scanned OUTSIDE domain/ on purpose. domain/career.ts is where
// clubInput lives - it is the formula's home, not a copy of it, and M334's own clause reads the
// three call sites that must all reach it. What was cleared, and what must not come back, is that
// formula written out anywhere else in the app.
const FAMILY_RAW = /localStorage\.(get|set|remove)Item/;
const FAMILY_TEAM = [/possessionBias:\s*0\.5\s*\+/, /\bm\s*\*\s*3\b/, /attack:\s*attack\s*\+/];
// The callback's own parentheses are why this cannot be `[^)]*` — the first version of it read
// nothing, and the arm that caught that is recorded in the README.
const FAMILY_HALF = /\.reduce\([\s\S]{0,200}?played[\s\S]{0,80}?\)\s*\/\s*2\b/;
const familyScan = (file) => {
  const code = normalize(read(file));
  return {
    f: file,
    // 1 · the raw storage accessor outside the door (M332). domain/localData.ts is the door and
    //     still does not write the accessor form, so this one is charged over the whole tree.
    rawAccessor: FAMILY_RAW.test(code),
    // 2 · a team-input formula outside the domain (M333/M334): the possession bias, the mental
    //     adjustment, the fatigue term - any one of them means someone rebuilt clubInput.
    teamInput: file.startsWith("domain/") ? false : FAMILY_TEAM.some((r) => r.test(code)),
    // 3 · a per-team sum halved for a competition-level count (M336), charged over the whole tree.
    halvedCount: FAMILY_HALF.test(code),
  };
};
const familySites = APP_FILES.map(familyScan);
const rawAccessorSites = familySites.filter((x) => x.rawAccessor);
const teamInputSites = familySites.filter((x) => x.teamInput);
const halvedCountSites = familySites.filter((x) => x.halvedCount);
// Every scan above answers "0 found" on the shipped tree, and a zero that nothing can redden is
// not a measurement. Each regex family is therefore fired here at a planted witness of its own
// shape, and the stripper is charged with a witness of each comment form: if the stripper stopped
// working, the comment plant would go from clean to a hit and the population clause below would
// name it rather than quietly widening the population it reports.
const familyPlants = {
  raw: FAMILY_RAW.test(normalize("  const v = localStorage.getItem(KEY);")),
  teamBias: FAMILY_TEAM.some((r) => r.test(normalize("    possessionBias: 0.5 + (a - b) * 0.1,"))),
  teamMental: FAMILY_TEAM.some((r) => r.test(normalize("    attack: a.attack + m * 3,"))),
  teamFatigue: FAMILY_TEAM.some((r) => r.test(normalize("    attack: attack + Math.round(x),"))),
  halved: FAMILY_HALF.test(normalize(
    "  const total = fx.reduce((s, f) => s + (f.home.played + f.away.played), 0) / 2 | 0;")),
  commentLine: FAMILY_RAW.test(normalize("// we used to call localStorage.getItem here\nconst x = 1;")),
  commentBlock: FAMILY_RAW.test(normalize("/* localStorage.getItem(KEY) */\nconst x = 1;")),
};
ok(`the four families M332-M336 cleared stay closed: over the ${APP_FILES.length} app files the storage census walks, the raw storage accessor appears in ${rawAccessorSites.length} file(s), the team-input arithmetic outside the domain in ${teamInputSites.length}, and a per-team sum halved into a competition count in ${halvedCountSites.length} (${[...rawAccessorSites, ...teamInputSites, ...halvedCountSites].map((x) => x.f).join(", ") || "none anywhere"}; plants armed: raw ${familyPlants.raw}, bias ${familyPlants.teamBias}, mental ${familyPlants.teamMental}, fatigue ${familyPlants.teamFatigue}, halved ${familyPlants.halved})`,
  familySites.length === APP_FILES.length && APP_FILES.length === APP_FILES_PIN &&
    familyPlants.raw && familyPlants.teamBias && familyPlants.teamMental && familyPlants.teamFatigue && familyPlants.halved &&
    rawAccessorSites.length === 0 && teamInputSites.length === 0 && halvedCountSites.length === 0,
  `raw: ${rawAccessorSites.map((x) => x.f).join(", ") || "none"} · teamInput: ${teamInputSites.map((x) => x.f).join(", ") || "none"} · halved: ${halvedCountSites.map((x) => x.f).join(", ") || "none"}`);
// …and the stripper is charged in both directions, so the zeros above cannot be produced by a
// stripper that stopped stripping and started reporting every comment that names a removed call.
ok(`…and the scan is reading code rather than comments: both comment forms are blanked before the family regexes see them (line-comment plant ${familyPlants.commentLine}, block-comment plant ${familyPlants.commentBlock} — each must be CLEAN, i.e. false)`,
  familyPlants.commentLine === false && familyPlants.commentBlock === false,
  `line plant ${familyPlants.commentLine}, block plant ${familyPlants.commentBlock}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
