// M239 — what the reader actually sees, measured by rendering the routed screens.
//
// Until this file, no proof in this repo rendered a screen. The i18n gates scan `.tsx` files for
// `t("key")` calls, the storage gate walks ASTs looking for reads near a `catch`, the claim rule
// reads persistence words out of the dictionary. The reachability ratchet (proof-coverage) scopes
// itself to a list of directories that stops short of the screen layer, and section 2 measures that
// boundary instead of trusting this paragraph.
//
// A text scan cannot answer three questions a reader can:
//   · does an UNRESOLVED key reach the page? `translate()` answers a missing key with the key
//     itself, and a key built at runtime (`ai.sug.${id}`) is exactly the shape a source scan can
//     only guess at — the value space, not the call site, decides.
//   · does the page print `undefined`/`NaN`/`[object Object]` where a figure should be?
//   · does the reader's LOCALE change anything at all, and does the honesty badge arrive in their
//     language rather than in English?
// So this file loads the screens the route table names and renders them through the app's own
// provider stack, in every locale the dictionary itself ships, and charges what comes out.
//
// What it CANNOT do is run an effect. That limit is not asserted here, it is demonstrated: a probe
// component whose useEffect would rewrite its own text renders the pre-effect value, and the app
// root renders its hydration skeleton at every route because `ready` is set inside an effect. Those
// two clauses are what still owes the live browser pass (#142).
import { createServer } from "vite";
import React from "react";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

// --- the fixtures a browser would supply. Named here because a render proof that hides its own
// --- fixtures is measuring the fixture, not the app: `sonner` writes to `document` while it is
// --- being loaded, so a screen that imports the toast primitive cannot even be EVALUATED without
// --- createTextNode, and the router reads `window.location.hash` during render.
const installed = [];
const mem = new Map();
const define = (name, value) => { installed.push(name); Object.defineProperty(globalThis, name, { value, configurable: true, writable: true }); };
define("localStorage", {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => void mem.set(k, String(v)),
  removeItem: (k) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
});
const fakeEl = () => ({
  style: { setProperty: () => {} }, classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
  setAttribute: () => {}, getAttribute: () => null, removeAttribute: () => {}, appendChild: () => {}, removeChild: () => {},
  insertBefore: () => {}, addEventListener: () => {}, removeEventListener: () => {}, textContent: "", innerHTML: "", dataset: {},
  cloneNode: fakeEl, ownerDocument: globalThis.document, nodeType: 1,
});
define("document", {
  documentElement: { classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }, setAttribute: () => {}, getAttribute: () => null, lang: "", style: {} },
  createElement: fakeEl, createTextNode: (x) => ({ nodeValue: String(x) }),
  head: { appendChild: () => {} }, body: { appendChild: () => {} },
  addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null, getElementById: () => null,
});
define("window", {
  location: { hash: "#/", replace(h) { this.hash = h; } },
  addEventListener: () => {}, removeEventListener: () => {}, scrollTo: () => {},
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  innerWidth: 1280,
});
define("navigator", { language: "en-US", languages: ["en-US"], userAgent: "node" });
define("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
define("IntersectionObserver", class { observe() {} unobserve() {} disconnect() {} });

const { renderToStaticMarkup } = await import("react-dom/server");
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const read = (p) => readFileSync(join(root, p), "utf8");
/** The two LOOPS below build their path from a variable, so proof-coverage's root scan cannot see
 *  them; the calls that pass a literal path are visible to it. Section 2 measures which is which
 *  instead of pretending otherwise. */
async function tryLoad(what) {
  try { return { mod: await what(), err: null }; }
  catch (e) { return { mod: null, err: e }; }
}

// ---------------------------------------------------------------------------
// 1 · the provider stack, asserted against the files that declare it
// ---------------------------------------------------------------------------
const PROVIDERS = [
  ["lib/theme.tsx", "ThemeProvider"],
  ["i18n/index.tsx", "I18nProvider"],
  ["lib/router.tsx", "RouterProvider"],
  ["store/useFootballOS.tsx", "OsProvider"],
];
const loaded = {};
const provProblems = [];
for (const [file, exportName] of PROVIDERS) {
  const { mod, err } = await tryLoad(() => server.ssrLoadModule("/" + file));
  loaded[file] = mod;
  const declares = [...read(file).matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
  if (err) provProblems.push(`${file} THREW ${err.message}`);
  else if (typeof mod?.[exportName] !== "function") provProblems.push(`${file} has no ${exportName}`);
  else if (!declares.includes(exportName)) provProblems.push(`${exportName} used from ${file} is not a function that file declares`);
}
ok(`the proof wraps screens in the app's own four providers, and each one is a function the named file declares (${PROVIDERS.map(([f, n]) => `${f.split("/").pop()}=${typeof loaded[f]?.[n]}`).join(" ")})`,
  provProblems.length === 0 && PROVIDERS.length === 4, provProblems.join(" / "));

const DICTS = (await tryLoad(() => server.ssrLoadModule("/i18n/dictionaries.ts"))).mod;
const LOCALDATA = await tryLoad(() => server.ssrLoadModule("/domain/localData.ts"));
const LOCALES = Object.keys(DICTS.DICTIONARIES);
const EN = DICTS.DICTIONARIES.en;
const KEYS = new Set(Object.keys(EN));
const NAMESPACES = new Set([...KEYS].map((k) => k.split(".")[0]));
ok(`the locale list comes from the dictionary itself, not from this file (${LOCALES.length}: ${LOCALES.join(", ")}; ${KEYS.size} English rows in ${NAMESPACES.size} namespaces)`,
  LOCALES.length >= 3 && LOCALES.includes("en") && KEYS.size >= 1000 && NAMESPACES.size >= 10);

function tree(node) {
  let cur = node;
  cur = React.createElement(loaded["store/useFootballOS.tsx"].OsProvider, null, cur);
  cur = React.createElement(loaded["lib/router.tsx"].RouterProvider, null, cur);
  cur = React.createElement(loaded["i18n/index.tsx"].I18nProvider, null, cur);
  cur = React.createElement(loaded["lib/theme.tsx"].ThemeProvider, null, cur);
  return cur;
}

// ---------------------------------------------------------------------------
// 2 · the population: the components the route table can put on screen
// ---------------------------------------------------------------------------
const APP_SRC = read("src/App.tsx");
// A component is rendered AS THE ROUTE TABLE USES IT: `initialTab="graph"` selects a different
// branch than `initialTab="chat"`, so each JSX usage of a routed component is its own entry, with
// the attributes that usage passes, rather than one render per module.
const lazy = [...APP_SRC.matchAll(/lazy\(\(\) => import\("@([^"]+)"\)\.then\(\(m\) => \(\{ default: m\.(\w+) \}\)\)/g)]
  .map((m) => ({ spec: m[1].replace(/^\//, ""), name: m[2], via: "lazy" }));
const direct = [...APP_SRC.matchAll(/import \{ (\w+) \} from "@(\/features\/[^"]+)"/g)]
  .map((m) => ({ spec: m[2].replace(/^\//, ""), name: m[1], via: "direct" }));
const byName = new Map([...lazy, ...direct].map((e) => [e.name, e]));
const attrs = (raw) => {
  const props = {};
  for (const a of (raw || "").matchAll(/([a-zA-Z]+)="([^"]*)"/g)) props[a[1]] = a[2];
  return props;
};
// Every JSX tag App.tsx opens for a route-table name, split by whether the tag CLOSES ITSELF.
// A tag with children is chrome or a wrapper (AppShell wraps every route), and rendering it alone
// would show a page the app never paints — an empty main column — so it is named, not rendered.
const tagsAll = [...APP_SRC.matchAll(/<(\w+)((?: [a-zA-Z]+="[^"]*")*)\s*(\/?)>/g)]
  .filter((m) => byName.has(m[1]))
  .map((m) => ({ ...byName.get(m[1]), name: m[1], props: attrs(m[2]), leaf: m[3] === "/" }));
const POP = tagsAll.filter((t) => t.leaf);
POP.forEach((p, i) => { p.id = `${p.name}#${i}`; });
const wrappers = [...new Set(tagsAll.filter((t) => !t.leaf).map((t) => t.name))];
const unusedModules = [...byName.keys()].filter((n) => !tagsAll.some((t) => t.name === n));
// The two regexes above could match fewer modules without anything noticing, because POP is built
// from them. So the belt is a SET comparison against an independent scan of what App.tsx imports
// out of the feature layer: every one of those modules must be accounted for as a render site or
// as a wrapper, and no render site may name a module App.tsx never imports. An equality of counts
// would pass by coincidence (AiStudio is mounted twice, AppShell is mounted as a wrapper).
const importSpecs = new Set([...APP_SRC.matchAll(/["']@\/(features\/[^"']+)["']/g)].map((m) => m[1]));
const coveredSpecs = new Set(tagsAll.map((t) => t.spec));
const unaccounted = [...importSpecs].filter((s) => !coveredSpecs.has(s));
const unsourced = [...coveredSpecs].filter((s) => !importSpecs.has(s));
ok(`…and the population is accounted for module by module against an independent scan of App.tsx's feature imports (${importSpecs.size} imported = ${new Set(POP.map((p) => p.spec)).size} rendered at ${POP.length} call sites + ${wrappers.length} wrapper; ${unaccounted.length} unaccounted, ${unsourced.length} unsourced)`,
  unaccounted.length === 0 && unsourced.length === 0 && importSpecs.size >= 20,
  `unaccounted: ${unaccounted.join(", ")} / unsourced: ${unsourced.join(", ")}`);
ok(`the screen population is derived from src/App.tsx's own route table, per call site (${lazy.length} lazy() entries and ${direct.length} directly imported components = ${byName.size} names, used at ${POP.length} self-closing JSX sites; ${unusedModules.length} of them never used)`,
  lazy.length + direct.length === byName.size && unusedModules.length === 0 && POP.length >= lazy.length,
  `unused: ${unusedModules.join(", ")}`);
ok(`…and the ${wrappers.length} name(s) whose JSX tag takes children are chrome, not a route, so they are reported here instead of rendered alone (${wrappers.join(", ") || "none"})`,
  wrappers.length <= 1, wrappers.join(", "));

const ROUTE_OF = {};
for (const m of APP_SRC.matchAll(/path === "(\/[^"]+)"[^\n]*?inner = <(\w+)([^>]*)\/>/g)) ROUTE_OF[`${m[2]} ${m[3].trim()}`] = m[1];
for (const p of POP) p.route = ROUTE_OF[`${p.name} ${Object.entries(p.props).map(([k, v]) => `${k}="${v}"`).join(" ")}`] || (p.name === "Landing" ? "/" : "/");

const screens = [];
const unresolved = [];
for (const s of POP) {
  const { mod, err } = await tryLoad(() => server.ssrLoadModule("/" + s.spec));
  if (err) { unresolved.push(`${s.name}: load threw ${err.message.slice(0, 60)}`); continue; }
  if (typeof mod?.[s.name] !== "function") { unresolved.push(`${s.name}: ${s.spec} exports ${Object.keys(mod || {}).slice(0, 5).join(",") || "nothing"} — no ${s.name}`); continue; }
  const file = s.spec + (existsSync(join(root, s.spec)) ? "" : ".tsx");
  const declares = [...read(file).matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
  if (!declares.includes(s.name)) { unresolved.push(`${s.name}: rendered from ${file}, which declares ${declares.join(",") || "nothing at line start"}`); continue; }
  screens.push({ ...s, C: mod[s.name], file });
}
ok(`every name the route table reaches for is a component that file declares and the harness can load (${screens.length} of ${POP.length} screens; ${screens.filter((s) => Object.keys(s.props).length).length} rendered with the props App passes them)`,
  unresolved.length === 0 && screens.length === POP.length, unresolved.join(" / "));

// The boundary this file exists to cross, MEASURED rather than described.
// M241 moved it. This clause used to read proof-coverage's `const DIRS = [...]` and claim the
// screens lived outside the ratchet's population — which stopped being true the moment that
// census became a recursive walk, and a green clause asserting a dead premise is worse than no
// clause. It now derives the walk's own skip list from the shipped file and claims the opposite:
// every screen this file renders IS inside the ratchet's population, so if coverage ever narrows
// back to a flat directory list, or a screen stops being found on disk, this goes red.
const COV_SKIP = ((read("scripts/proof-coverage.mjs").match(/const POP_SKIP = new Set\(\[([^\]]*)\]/) || [, ""])[1].match(/"([^"]+)"/g) || []).map((s) => s.slice(1, -1));
const POP_DIRS = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !COV_SKIP.includes(e.name) && !e.name.startsWith("."))
  .map((e) => e.name);
const walk = (d) => readdirSync(join(root, d), { withFileTypes: true }).flatMap((e) => {
  const p = d ? `${d}/${e.name}` : e.name;
  if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
  return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
});
const APP_MODULES = walk("").filter((p) => !p.startsWith("scripts/"));
const SCREEN_DIRS = [...new Set(screens.map((s) => s.file.split("/")[0]))];
const FEATURE_MODULES = APP_MODULES.filter((p) => p.startsWith("features/"));
ok(`the ratchet counts the screen layer it used to miss: proof-coverage walks ${POP_DIRS.length} directories (${POP_DIRS.join(", ")}) recursively, ${SCREEN_DIRS.join(", ")} is among them, and all ${screens.filter((s) => APP_MODULES.includes(s.file)).length}/${screens.length} screens rendered here are modules that walk found (${FEATURE_MODULES.length} feature modules in total)`,
  POP_DIRS.length >= 8 && POP_DIRS.includes(SCREEN_DIRS[0]) && SCREEN_DIRS.length === 1
    && screens.every((s) => APP_MODULES.includes(s.file)) && FEATURE_MODULES.length >= 20,
  `popDirs=${POP_DIRS.join(",")} missing=${screens.filter((s) => !APP_MODULES.includes(s.file)).map((s) => s.file).join(",")}`);

// And the half of the boundary that is about THIS file: proof-coverage attributes a root only where
// the path is a literal inside the call, so the two loops below are invisible to it. This clause
// exists because the alternative was a comment claiming the opposite.
const OWN_SRC = read("scripts/proof-screens.mjs");
const OWN_ROOT_RE = /ssrLoadModule\(\s*["'`]\/([\w./-]+?)["'`]/g;
const ownLiteral = [...OWN_SRC.matchAll(OWN_ROOT_RE)].map((m) => m[1]);
const ownVariable = (OWN_SRC.match(/ssrLoadModule\("\/" \+/g) || []).length;
ok(`this file's own loads are split by how visible they are to that ratchet: ${ownLiteral.length} literal-path loads (${ownLiteral.join(", ")}) it can attribute, ${ownVariable} computed-path loads (the ${screens.length} screens, the ${PROVIDERS.length} providers, this file's live-record fixtures) it cannot`,
  ownLiteral.length >= 1 && ownVariable >= 1 && ownLiteral.filter((p) => p.startsWith("features/")).length === 0,
  `literal=${ownLiteral.length} variable=${ownVariable}`);

// ---------------------------------------------------------------------------
// 3 · the render matrix
// ---------------------------------------------------------------------------
const SHAPED = /\b[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9_]+)+\b/g;
const BROKEN = /undefined|NaN|\[object Object\]/g;
const nodesOf = (html) => (html.match(/>([^<>]+)</g) || []).map((m) => m.slice(1, -1).replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&gt;/g, ">").trim()).filter(Boolean);

const renders = [];
const threw = [];
for (const s of screens) {
  for (const loc of LOCALES) {
    mem.set(LOCALDATA.mod.LOCALE_KEY, loc);
    globalThis.window.location.hash = "#" + (ROUTE_OF[s.name] || "/");
    let html;
    try {
      html = renderToStaticMarkup(tree(React.createElement(s.C, s.props)));
    } catch (e) {
      threw.push(`${s.name}@${loc}: ${e.message.slice(0, 70)}`);
      continue;
    }
    const nodes = nodesOf(html);
    const text = nodes.join(" ");
    const shaped = [...new Set(text.match(SHAPED) || [])];
    renders.push({
      screen: s.name, id: s.id, locale: loc, html, nodes,
      leaks: shaped.filter((k) => NAMESPACES.has(k.split(".")[0]) && !KEYS.has(k)),
      printed: shaped.filter((k) => KEYS.has(k)),
      shaped: shaped.length,
      broken: [...new Set(text.match(BROKEN) || [])],
      badgeEn: text.includes(EN["common.demo"]),
      badgeHere: text.includes(DICTS.DICTIONARIES[loc]["common.demo"]),
    });
  }
}
ok(`every screen renders in every locale without throwing (${screens.length} screens x ${LOCALES.length} locales = ${screens.length * LOCALES.length} renders, ${renders.length} returned markup, ${threw.length} threw)`,
  threw.length === 0 && renders.length === screens.length * LOCALES.length, threw.slice(0, 3).join(" / "));

const blank = renders.filter((r) => r.nodes.length === 0);
const minNodes = Math.min(...renders.map((r) => r.nodes.length));
ok(`no render is a blank page — a screen whose first paint holds no visible text is the failure a page with zero error boundaries cannot recover from (${renders.length} renders, fewest visible text nodes ${minNodes} at ${renders.find((r) => r.nodes.length === minNodes)?.screen}@${renders.find((r) => r.nodes.length === minNodes)?.locale})`,
  blank.length === 0 && minNodes > 0, blank.map((r) => `${r.screen}@${r.locale}`).join(", "));

// ---------------------------------------------------------------------------
// 4 · the three charges a source scan cannot make
// ---------------------------------------------------------------------------
const leakRows = renders.filter((r) => r.leaks.length);
ok(`an unresolved key never reaches the reader: translate() answers a missing key with the key itself, so a dictionary-shaped word on the page is the leak (0 of ${renders.length} renders carry one; the detector's ${NAMESPACES.size} namespaces are read from the dictionary, not typed here)`,
  leakRows.length === 0, leakRows.map((r) => `${r.screen}@${r.locale}: ${r.leaks.join(",")}`).join(" / "));

const printedRows = renders.filter((r) => r.printed.length);
ok(`a screen never prints a key that IS in the dictionary either — that is the other half: the code had the key and displayed it instead of its row (0 of ${renders.length} renders)`,
  printedRows.length === 0, printedRows.map((r) => `${r.screen}@${r.locale}: ${r.printed.join(",")}`).join(" / "));

const brokenRows = renders.filter((r) => r.broken.length);
ok(`no figure slot prints undefined, NaN or [object Object] to the reader (0 of ${renders.length} renders)`,
  brokenRows.length === 0, brokenRows.map((r) => `${r.screen}@${r.locale}: ${r.broken.join(",")}`).join(" / "));

// The inventory panel is the counter-example that keeps the detector honest: it prints the storage
// keys on purpose, and they ARE dotted-lowercase words. They are not charged because `football-os`
// is not one of the dictionary's namespaces — so this clause fails if the detector ever goes blind.
const inventory = renders.find((r) => r.screen === "SettingsPage" && r.locale === "en");
const inventoryShaped = inventory ? inventory.shaped : 0;
ok(`the detector is not blind to dotted words — the settings screen prints ${inventoryShaped} of them and charges ${inventory ? inventory.leaks.length + inventory.printed.length : 0}, because the ${inventory ? inventory.shaped : 0} it shows are storage keys like football-os.state.v2, whose first segment is not a dictionary namespace`,
  inventoryShaped > 0 && inventory && inventory.leaks.length === 0 && inventory.printed.length === 0,
  `settings screen shaped=${inventoryShaped}`);

// ---------------------------------------------------------------------------
// 5 · the reader's locale, and the honesty label
// ---------------------------------------------------------------------------
const byScreen = {};
for (const r of renders) (byScreen[r.id] ??= {})[r.locale] = r;
const nameOf = (id) => id.split("#")[0];
const inert = [];
for (const [id, per] of Object.entries(byScreen)) {
  for (const loc of LOCALES.filter((l) => l !== "en")) {
    // Keyed by CALL SITE, not by component name: AiStudio is mounted twice with different props,
    // and a map keyed on the name would silently keep only the last tab and compare one render.
    if (per[loc] && per.en && per[loc].nodes.join("|") === per.en.nodes.join("|")) inert.push(`${id}@${loc}`);
  }
}
ok(`the reader's locale changes the page: no call site's ${LOCALES.filter((l) => l !== "en").join("/")} visible-text vector is identical to its English one (${Object.keys(byScreen).length} call sites, ${inert.length} identical)`,
  inert.length === 0 && Object.keys(byScreen).length === screens.length, inert.join(", "));

const badged = renders.filter((r) => r.badgeEn);
const englishBadge = badged.filter((r) => !r.badgeHere);
ok(`the honesty label arrives in the reader's language: ${badged.length} renders show the demo badge in English and ${englishBadge.length} of them show it to a ${LOCALES.filter((l) => l !== "en").join("/")} reader in English only`,
  badged.length > 0 && englishBadge.length === 0, englishBadge.map((r) => `${r.screen}@${r.locale}`).join(", "));

const noBadge = [...new Set(Object.entries(byScreen).filter(([, per]) => per.en && !per.en.badgeEn).map(([id]) => nameOf(id)))];
ok(`…and the census names the screens whose FIRST paint shows no badge at all, so the clause above is read as an equivalence, not as a claim that every screen is labelled (${noBadge.length} of ${new Set(screens.map((s) => s.name)).size} distinct components: ${noBadge.join(", ")})`,
  noBadge.length < new Set(screens.map((s) => s.name)).size, "");

// ---------------------------------------------------------------------------
// 5b · the status renders: a LIVE fixture's record must reach the glass
// ---------------------------------------------------------------------------
// The seed writes a full record for a fixture in play — score, real-named events,
// a 12-field stats pair (the data side is pinned by proof-matchstats' LIVE
// clause). M288: the match page gated that record on status === "FINISHED", so a
// LIVE page printed its scoreline beside an empty timeline and a "No simulation
// yet" board — measured on the shipped world: 49 live fixtures carrying 736
// events, and the sample page showed 0 of its 9 event names. This section
// renders every LIVE fixture's page and charges the record to the text.
const DETAILS = (await tryLoad(() => server.ssrLoadModule("/" + "features/football/Details.tsx"))).mod;
const FOOT = (await tryLoad(() => server.ssrLoadModule("/" + "data/footballService.ts"))).mod;
const liveFixtures = DETAILS && FOOT ? FOOT.matchesByStatus("LIVE") : [];
const livePages = [];
for (const lm of liveFixtures) {
  mem.set(LOCALDATA.mod.LOCALE_KEY, "en");
  globalThis.window.location.hash = "#/matches/" + lm.id;
  let html = "";
  try { html = renderToStaticMarkup(tree(React.createElement(DETAILS.MatchDetail, { id: lm.id }))); } catch { html = ""; }
  livePages.push({ lm, text: nodesOf(html).join(" ") });
}
const liveNameMiss = livePages.filter((r) => (r.lm.events ?? []).some((e) => !r.text.includes(e.player)));
const liveBoardMiss = livePages.filter((r) => !r.text.includes(EN["det.engine.statsRecorded"]) || r.text.includes(EN["det.engine.emptySimTitle"]));
const livePossMiss = livePages.filter((r) => !r.text.includes(`${Math.round(r.lm.stats.home.possession)}%`) || !r.text.includes(`${Math.round(r.lm.stats.away.possession)}%`));
const liveScoreMiss = livePages.filter((r) => !r.text.includes(`${r.lm.homeGoals}–${r.lm.awayGoals}`));
ok(`a LIVE fixture's record reaches the glass: every event name, the board's own figures and the recorded title render on the live page (${livePages.length} live pages, ${liveNameMiss.length} dropping a name, ${liveBoardMiss.length} showing the not-simulated board, ${livePossMiss.length} missing a possession figure, ${liveScoreMiss.length} missing the scoreline)`,
  livePages.length >= 10 && liveNameMiss.length === 0 && liveBoardMiss.length === 0 && livePossMiss.length === 0 && liveScoreMiss.length === 0,
  `names:${liveNameMiss.map((r) => r.lm.id).join(",")} board:${liveBoardMiss.map((r) => r.lm.id).join(",")}`);

// ---------------------------------------------------------------------------
// 6 · what this harness cannot see, demonstrated rather than asserted
// ---------------------------------------------------------------------------
const Probe = () => {
  const [n, setN] = React.useState(0);
  React.useEffect(() => setN(99), []);
  return React.createElement("span", null, `effectRan:${n}`);
};
const probeHtml = renderToStaticMarkup(tree(React.createElement(Probe)));
ok(`the reason a green render here is not a green browser: useEffect never runs under renderToStaticMarkup, so a probe whose effect would rewrite its own text still prints its initial value (${JSON.stringify(probeHtml.match(/effectRan:\d+/)?.[0])})`,
  probeHtml.includes("effectRan:0") && !probeHtml.includes("effectRan:99"), probeHtml.slice(0, 120));

const APP = await tryLoad(() => server.ssrLoadModule("/src/App.tsx"));
let rootHtml = "", rootSame = true, rootNodes = [];
if (APP.err) rootSame = false;
else {
  const seen = [];
  for (const hash of ["/", "/settings", "/learn"]) {
    mem.delete(LOCALDATA.mod.LOCALE_KEY);
    globalThis.window.location.hash = "#" + hash;
    rootHtml = renderToStaticMarkup(React.createElement(APP.mod.default));
    seen.push(rootHtml);
    rootNodes.push(nodesOf(rootHtml).length);
  }
  rootSame = seen.every((h) => h === seen[0]);
}
ok(`NOT COVERED HERE, measured: the app root cannot be pinned from this harness at all — <App/> renders the SAME ${rootHtml.length}-character hydration skeleton at three different routes because \`ready\` is set inside an effect, and its visible text is ${rootNodes.join("/")||"?"} node(s), so the hydrated shell, the <html class> write and the persist-on-effect path still owe the live browser pass (#142)`,
  APP.mod && rootSame && rootHtml.length > 0 && rootNodes.every((n) => n === 0), `rootSame=${rootSame} chars=${rootHtml.length} nodes=${rootNodes.join(",")} err=${APP.err && APP.err.message}`);

// ---------------------------------------------------------------------------
// 7 · plants: every detector above, run against the thing it is meant to catch
// ---------------------------------------------------------------------------
const translate = DICTS ? (await tryLoad(() => server.ssrLoadModule("/i18n/index.tsx"))).mod.translate : null;
const classify = (text) => {
  const shaped = [...new Set(text.match(SHAPED) || [])];
  return {
    leaks: shaped.filter((k) => NAMESPACES.has(k.split(".")[0]) && !KEYS.has(k)).length,
    printed: shaped.filter((k) => KEYS.has(k)).length,
    broken: new Set(text.match(BROKEN) || []).size,
  };
};
// The plants go through the shipped resolver, not through a string I typed: `translate` answers a
// missing key with the key itself, and the key has to live in a REAL namespace — `gate.planted.x`
// would be correct Chinese for the classifier (first segment is not a dictionary namespace) and the
// plant would prove nothing. Same for the printed key: planting the row's English text is not a
// printed key, planting the key is.
const ZH = LOCALES.find((l) => l !== "en");
const plantedMissing = classify(translate("en", "hist.planted_missing_row"));
const plantedPrinted = classify(`Progress common.demo for the panel`);
const plantedBroken = classify(`Overall ${String(undefined)} and ${Number("x")} and ${String({ a: 1 })}`);
const plantedClean = classify("The low block defends and the high press wins it back.");
ok(`the same classifier, pointed at planted rows, catches each one exactly once and none of them twice: a missing key resolved through the shipped translate() (${plantedMissing.leaks} leak, ${plantedMissing.printed} printed), a real key printed instead of its row (${plantedPrinted.printed}), a broken figure (${plantedBroken.broken} shapes) — and prose that looks like none of them (${plantedClean.leaks + plantedClean.printed + plantedClean.broken})`,
  plantedMissing.leaks === 1 && plantedMissing.printed === 0 && plantedPrinted.printed === 1 &&
  plantedBroken.broken === 3 && plantedClean.leaks + plantedClean.printed + plantedClean.broken === 0,
  JSON.stringify({ plantedMissing, plantedPrinted, plantedBroken, plantedClean }));

// The clause above compares vectors. This one names the ROW: the reader's locale has to arrive as
// the dictionary's own badge text, and the English row must be absent from the zh page (and the
// other way round), so a "differing vector" cannot be some unrelated reflow.
const histId = Object.keys(byScreen).find((id) => nameOf(id) === "HistoryPage");
const enText = byScreen[histId]?.en?.nodes.join(" ") || "";
const zhText = byScreen[histId]?.[ZH]?.nodes.join(" ") || "";
const EN_ROW = EN["common.demo"], ZH_ROW = DICTS.DICTIONARIES[ZH]["common.demo"];
ok(`and the locale reached the tree as a ROW, not just as a different string: ${nameOf(histId)} paints "${EN_ROW}" in en and "${ZH_ROW}" in ${ZH}, and neither row appears on the other's page`,
  histId && enText.includes(EN_ROW) && !enText.includes(ZH_ROW) && zhText.includes(ZH_ROW) && !zhText.includes(EN_ROW) && enText !== zhText,
  `en ${enText.length}c hasEn=${enText.includes(EN_ROW)} hasZh=${enText.includes(ZH_ROW)} · ${ZH} ${zhText.length}c hasEn=${zhText.includes(EN_ROW)} hasZh=${zhText.includes(ZH_ROW)}`);

// This matrix renders a FRESH visitor: no seeded session state, because OsProvider hydrates from
// storage inside an effect, and effects do not run here. So a row that only appears once the reader
// has data is legitimately absent, and that is a limit of the harness, not a finding about the app.
// The honesty rows are the clearest case, so the census is printed instead of guessed — derived
// from the dictionary's own row names, not typed here.
const honestyKeys = [...KEYS].filter((k) => /^(disclaimer|demoNote)/.test(k.split(".").pop()));
const enTexts = renders.filter((r) => r.locale === "en").map((r) => r.nodes);
const honesty = honestyKeys.map((k) => ({ key: k, row: EN[k], shown: enTexts.some((ns) => ns.includes(EN[k])) }));
const honestyShown = honesty.filter((h) => h.shown);
ok(`the fresh-visitor limit is named, not hidden: the dictionary holds ${honestyKeys.length} honesty rows (keys whose last segment starts with disclaimer/demoNote), ${honestyShown.length} of them are a whole text node on some first paint, and ${honesty.length - honestyShown.length} are only reachable with data, which is #142's populated-state walk, not this file (${honesty.filter((h) => !h.shown).map((h) => h.key).join(", ") || "none"})`,
  honestyKeys.length >= 10 && honestyShown.length >= 1, `shown=${honestyShown.map((h) => h.key).join(", ")}`);

console.log(`\nshipped readings: ${screens.length} screen(s) x ${LOCALES.length} locale(s) = ${renders.length} render(s); ` +
  `${leakRows.length} unresolved key(s), ${printedRows.length} printed key(s), ${brokenRows.length} broken figure(s), ${inert.length} locale-inert screen(s), ${englishBadge.length} English-only badge(s); ` +
  `${installed.length} browser global(s) installed by this file: ${installed.join(", ")}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
