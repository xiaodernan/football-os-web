// M212 — a proof for lib/router.tsx, the module that told everyone it could not be proven.
//
// proof-coverage.mjs exempted it with the reason "needs a DOM the SSR harness does not provide".
// That reason is measured here and found false: a stub `window` (location hash, addEventListener,
// scrollTo) plus `renderToStaticMarkup` is enough to render the provider, read the context it
// publishes, drive `navigate` and print the anchor `Link` produces. So the exemption is deleted
// and this file takes its place.
//
// What the sweep found while the module was exempt:
//   · `matchRoute` calls decodeURIComponent on whatever the visitor typed. `#/players/%` is a
//     malformed escape, so it threw URIError out of the render. There is no error boundary in this
//     app (measured below), so one bad character in a hash blanks the page.
//   · AppShell's nav-active predicate carried `matchRoute(`${m}/*`, path)`, but "*" is not a
//     wildcard in this matcher — it is a literal segment. Measured 0 matches over 24 nav prefixes,
//     so the arm could never fire, and `path === m` was written twice.
//
// The matcher is checked against a model built from the module's own doc comment ("Match
// '/players/:id' style patterns"), compiled into descriptors first, so the comparison is not a
// copy of the implementation's loop. Expectations that are NUMBERS are measured and printed in the
// clause name, because the runner only shows detail on failure.
import { createServer } from "vite";
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

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
/** A gate has to fail, not die: the module under proof is loaded through here, so a broken
 *  dependency produces named red clauses instead of an UNVERIFIED line. The literal
 *  `ssrLoadModule("/lib/router.tsx")` stays visible because proof-coverage.mjs reads it. */
async function tryLoad(what) {
  try { return { mod: await what(), err: null }; }
  catch (e) { return { mod: null, err: e }; }
}

const { mod: RT, err: rtErr } = await tryLoad(() => server.ssrLoadModule("/lib/router.tsx"));
if (!RT) {
  ok("lib/router.tsx loads under the SSR harness", false, `${rtErr && rtErr.message}`);
  console.log(`\n${pass}/${pass + fail} checks passed`);
  await server.close();
  process.exit(1);
}
const { matchRoute, RouterProvider, useRouter, Link } = RT;
const read = (p) => readFileSync(join(root, p), "utf8");
const ROUTER_SRC = read("lib/router.tsx");
const APP_SRC = read("src/App.tsx");
const FW_SRC = read("features/football/FootballWorld.tsx");
const SHELL_SRC = read("features/shell/AppShell.tsx");

function walk(dir, out = []) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return out;
  for (const name of readdirSync(abs)) {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}
const APP_FILES = ["features", "src", "components", "store", "data", "domain", "lib"].flatMap((d) => walk(d));

// ---------------------------------------------------------------------------
// 1 · the surface: every export has a caller, and nothing else republishes it
// ---------------------------------------------------------------------------
const exported = [...ROUTER_SRC.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]);
const callers = {};
for (const name of exported) {
  let files = 0, uses = 0;
  for (const f of APP_FILES) {
    if (f === "lib/router.tsx") continue;
    const s = read(f);
    const n = (s.match(new RegExp(`\\b${name}\\b`, "g")) || []).length;
    if (n) { files++; uses += n; }
  }
  callers[name] = { files, uses };
}
const dead = exported.filter((n) => callers[n].uses === 0);
ok(`the module exports ${exported.length} symbols and every one has an app caller (${exported.map((n) => `${n} ${callers[n].uses}× in ${callers[n].files} files`).join(", ")})`,
  exported.length === 4 && dead.length === 0, `dead: ${dead.join(", ") || "none"}`);
ok(`the router is the only place routes are parsed (${APP_FILES.filter((f) => f !== "lib/router.tsx" && /function matchRoute/.test(read(f))).length} files redefine the matcher)`,
  APP_FILES.every((f) => f === "lib/router.tsx" || !/function matchRoute/.test(read(f))));

// ---------------------------------------------------------------------------
// 2 · the provider, rendered for real
// ---------------------------------------------------------------------------
const React = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");

function makeWindow(hash) {
  const w = {
    hash, replaces: [], scrolls: 0, listeners: {},
    addEventListener(k, fn) { (w.listeners[k] ||= []).push(fn); },
    removeEventListener(k, fn) { w.listeners[k] = (w.listeners[k] || []).filter((f) => f !== fn); },
    scrollTo() { w.scrolls++; },
  };
  w.location = {
    get hash() { return w.hash; },
    set hash(v) { w.hash = v.startsWith("#") ? v : `#${v}`; },
    replace(t) { w.replaces.push(t); w.hash = t.startsWith("#") ? t : `#${t}`; },
  };
  return w;
}

let cap = null;
function Grab() { cap = useRouter(); return null; }
/** Render the provider around `child`, or render `child` bare to prove the guard fires. */
function renderAt(hash, opts = {}) {
  const w = makeWindow(hash);
  globalThis.window = w;
  cap = null;
  const tree = opts.bare
    ? React.createElement(Grab, null)
    : React.createElement(RouterProvider, null, opts.child || React.createElement(Grab, null));
  try {
    return { html: renderToStaticMarkup(tree), w, err: null };
  } catch (e) {
    return { html: null, w, err: e };
  }
}

const r1 = renderAt("#/players/p1?tab=stats&q=one");
ok(`the provider renders under this harness, so the module's own exemption is no longer true (markup ${JSON.stringify(r1.html)}, context ${cap ? "published" : "NOT published"}${r1.err ? `, threw ${r1.err.constructor.name}` : ""})`,
  !r1.err && cap !== null, r1.err && r1.err.message);

const shape = cap && { path: cap.path, segments: cap.segments, query: [...cap.query.entries()] };
ok(`a hash is parsed into path / segments / query exactly as documented (#/players/p1?tab=stats&q=one -> ${JSON.stringify(shape)})`,
  !!shape && shape.path === "/players/p1" && shape.segments.join(",") === "players,p1" &&
  shape.query.map(([k, v]) => `${k}=${v}`).join(",") === "tab=stats,q=one");

const r2 = renderAt("");
ok(`an unset hash still reports a root path, because the app dispatches on strings and "" matches nothing (path ${JSON.stringify(r2.err ? `threw ${r2.err.constructor.name}` : cap && cap.path)})`,
  !r2.err && cap && cap.path === "/");

const r3 = renderAt("#/players/");
ok(`a trailing slash does not invent a segment (#/players/ -> ${JSON.stringify(cap && cap.segments)})`,
  !r3.err && cap && cap.segments.join(",") === "players");

const r4 = renderAt("#/search?q=%zz");
ok(`a query is read by URLSearchParams, which tolerates a malformed escape instead of throwing (#/search?q=%zz -> ${JSON.stringify(cap && [...cap.query.entries()])}${r4.err ? `, threw ${r4.err.constructor.name}` : ""})`,
  !r4.err && cap && cap.query.get("q") === "%zz");

const r5 = renderAt("#/players/%");
ok(`the hash itself is not decoded by the provider, so the crash risk lives only at the capture site (path ${JSON.stringify(cap && cap.path)})`,
  !r5.err && cap && cap.path === "/players/%");

const r6 = renderAt("#/players/p1", { child: React.createElement(Link, { to: "/players/p1" }, "P1") });
ok(`Link renders a real anchor whose href carries the hash, so middle-click and open-in-new-tab ask for a route this app owns (markup ${JSON.stringify(r6.html)})`,
  !r6.err && r6.html === '<a href="#/players/p1">P1</a>');

const r7 = renderAt("#/players/p1", { bare: true });
ok(`useRouter refuses to answer outside the provider, by name (message ${JSON.stringify(r7.err ? r7.err.message : "no throw")})`,
  !!r7.err && /useRouter must be used within RouterProvider/.test(r7.err.message));

// navigate: push, replace, and the scroll the reader expects of a page change.
const nav = renderAt("#/");
const navFails = [];
const seen = [];
const step = (label, fn) => {
  try { fn(); } catch (e) { navFails.push(`${label} → ${e.constructor.name}: ${e.message}`); }
  seen.push([nav.w.hash, nav.w.scrolls, nav.w.replaces.length]);
};
step("push", () => cap.navigate("/clubs/c1"));
step("re-# prefix", () => cap.navigate("#/news/n9"));
step("replace", () => cap.navigate("/matches/m1", { replace: true }));
ok(`navigate writes exactly one hash, never a doubled one, and returns the reader to the top (push ${seen[0][0]} after ${seen[0][1]} scroll; re-# ${seen[1][0]}; replace ${seen[2][0]} via ${JSON.stringify(nav.w.replaces)}${navFails.length ? ` · FAILED ${navFails.join(" ;; ")}` : ""})`,
  navFails.length === 0 &&
  seen[0][0] === "#/clubs/c1" && seen[0][1] === 1 && seen[0][2] === 0 &&
  seen[1][0] === "#/news/n9" && seen[1][1] === 2 &&
  seen[2][0] === "#/matches/m1" && nav.w.replaces.length === 1 && nav.w.replaces[0] === "#/matches/m1");

// ---------------------------------------------------------------------------
// 3 · the matcher, against a model compiled from the documented rule
// ---------------------------------------------------------------------------
/** The documented rule, as descriptors: literal segments, ":name" captures, ":name?" optional. */
function compile(pattern) {
  return pattern.split("/").filter(Boolean).map((seg) =>
    seg.startsWith(":") ? { capture: seg.slice(1).replace(/\?$/, ""), optional: seg.endsWith("?") } : { literal: seg },
  );
}
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
function model(pattern, path) {
  const parts = compile(pattern);
  const cp = path.split("/").filter(Boolean);
  const required = parts.filter((p) => !p.optional).length;
  if (cp.length < required || cp.length > parts.length) return null;
  const params = {};
  for (let i = 0; i < cp.length; i++) {
    const part = parts[i];
    if (part.capture !== undefined) {
      if (part.capture) params[part.capture] = safeDecode(cp[i]);
    } else if (part.literal !== cp[i]) return null;
  }
  return params;
}

const callSites = [];
for (const f of APP_FILES) {
  const s = read(f);
  for (const m of s.matchAll(/matchRoute\(\s*[`"]([^`"]+)[`"]/g)) callSites.push({ pattern: m[1], file: f, template: /\$\{/.test(m[1]) });
}
const navPrefixes = [...new Set([...SHELL_SRC.matchAll(/match:\s*\["([^"]+)"\]/g)].map((m) => m[1]))];
const expanded = [];
for (const site of callSites) {
  if (!site.template) { expanded.push({ ...site, pattern: site.pattern }); continue; }
  for (const m of navPrefixes) expanded.push({ ...site, pattern: site.pattern.replace(/\$\{m\}/, m), fromNav: m });
}
const patterns = [...new Set(expanded.map((e) => e.pattern))];
const SEGLIT = /^[\w.-]+$/, SEGCAP = /^:\w+\?$/;
const literalSegments = patterns.flatMap((p) => p.split("/").filter(Boolean))
  .filter((s) => !SEGLIT.test(s) && !/^:\w+$/.test(s) && !SEGCAP.test(s));
ok(`the app asks about ${patterns.length} distinct patterns (${callSites.length} call sites, template arms expanded over ${navPrefixes.length} nav prefixes), and every segment is a literal or a capture (${literalSegments.length ? `uninterpretable: ${[...new Set(literalSegments)].join(", ")}` : "0 uninterpretable segments"})`,
  patterns.length >= 6 && literalSegments.length === 0, [...new Set(literalSegments)].join(", "));

const PATHS = ["/", "//", "/players", "/players/", "/players/p1", "/players/p1/", "/players/p1/extra",
  "/players//p1", "/players/%", "/players/%zz", "/players/a%b", "/players/%E4%B8%AD", "/players/+",
  "/clubs", "/clubs/c1", "/competitions/x1", "/matches/m1", "/news/n9", "/search", "/player",
  "/player/stats", "/player/stats/deep", "/world", "/world/season", "/film/x", "/settings/y"];
const diverge = [], threw = [];
for (const p of patterns) for (const q of PATHS) {
  let got;
  try { got = matchRoute(p, q); } catch (e) { threw.push(`${p} × ${q} → ${e.constructor.name}: ${e.message}`); continue; }
  const want = model(p, q);
  const same = (got === null && want === null) || (got && want && JSON.stringify(got) === JSON.stringify(want));
  if (!same) diverge.push(`${p} × ${q} → ${JSON.stringify(got)} but the rule says ${JSON.stringify(want)}`);
}
ok(`the shipped matcher agrees with the documented rule over ${patterns.length} patterns × ${PATHS.length} paths = ${patterns.length * PATHS.length} rows (0 divergences)`,
  diverge.length === 0, diverge.slice(0, 4).join(" ;; "));
ok(`no pattern/path row throws at all (${threw.length} threw over ${patterns.length * PATHS.length} rows)`,
  threw.length === 0, threw.slice(0, 3).join(" ;; "));

const dec = matchRoute("/players/:id", "/players/%E4%B8%AD");
const bad = ["/players/%", "/players/%zz", "/players/a%b"].map((p) => {
  try { return [p, JSON.stringify(matchRoute("/players/:id", p))]; } catch (e) { return [p, `THREW ${e.constructor.name}`]; }
});
ok(`a percent-escaped id arrives decoded (${JSON.stringify(dec)})`,
  !!dec && dec.id === "中");
ok(`a malformed escape is not a crash — the visitor's own characters reach the page, which then shows its real not-found state (${bad.map(([p, r]) => `${p} → ${r}`).join(", ")})`,
  bad.every(([p, r]) => r === JSON.stringify({ id: p.slice("/players/".length) })));

const crashSurface = APP_FILES.filter((f) => /decodeURIComponent\(/.test(read(f)));
const guarded = crashSurface.filter((f) => /try\s*\{[\s\S]{0,120}decodeURIComponent\([\s\S]{0,160}catch/.test(read(f)));
ok(`decoding a visitor-supplied string happens in ${crashSurface.length} file(s) and every one of them wraps it in a try/catch (${crashSurface.map((f) => `${f}${guarded.includes(f) ? " guarded" : " UNGUARDED"}`).join(", ")})`,
  crashSurface.length === 1 && guarded.length === 1);

const noBoundary = APP_FILES.filter((f) => /componentDidCatch|getDerivedStateFromError|ErrorBoundary/.test(read(f)));
ok(`there is no error boundary anywhere for this crash to be caught by instead (${noBoundary.length} boundary implementations found across ${APP_FILES.length} app files — the refusal above is the only defence)`,
  noBoundary.length === 0);

// ---------------------------------------------------------------------------
// 4 · the dispatcher's ORDER, which is the part a route table can silently break
// ---------------------------------------------------------------------------
const fwOrder = [...FW_SRC.matchAll(/matchRoute\(\s*"([^"]+)"/g)].map((m) => m[1]);
const basePath = (p) => "/" + p.split("/").filter(Boolean).map((s) => (s.startsWith(":") ? "sample" : s)).join("/");
const shadowed = [];
for (let i = 0; i < fwOrder.length; i++) {
  for (let j = i + 1; j < fwOrder.length; j++) {
    const path = basePath(fwOrder[j]);
    let m = null;
    try { m = matchRoute(fwOrder[i], path); } catch { m = "threw"; }
    if (m) shadowed.push(`${fwOrder[i]} takes ${path} before ${fwOrder[j]} can}`);
  }
}
ok(`no route is shadowed by an earlier one in ${FW_SRC.split(/\r?\n/).length} lines of dispatcher order (${fwOrder.length} patterns, ${shadowed.length} swallowed)`,
  fwOrder.length >= 10 && shadowed.length === 0, shadowed.join(" ;; "));

const detailKeepsList = [];
for (const base of ["players", "clubs", "competitions", "matches", "news"]) {
  const one = matchRoute(`/${base}/:id`, `/${base}`);
  const two = matchRoute(`/${base}/:id`, `/${base}/sample`);
  detailKeepsList.push(`${base}:${one === null ? "list-free" : "SHADOWED"}/${two ? "detail" : "MISSING"}`);
}
ok(`each list page stays reachable under its own detail pattern (${detailKeepsList.join(" ")})`,
  detailKeepsList.every((s) => /list-free\/detail$/.test(s)));

const footballPrefixes = [...new Set((APP_SRC.match(/const FOOTBALL_PREFIXES = \[([^\]]+)\]/) || [, ""])[1].split(",").map((s) => s.trim().replace(/"/g, "")).filter(Boolean))];
const unparented = fwOrder.filter((p) => !footballPrefixes.some((pre) => `/${p.split("/").filter(Boolean)[0]}` === pre || `/${p.split("/").filter(Boolean)[0]}`.startsWith(pre + "/")));
ok(`every Football World route is inside a prefix App hands to the dispatcher (${footballPrefixes.length} prefixes ${JSON.stringify(footballPrefixes)}, ${unparented.length} unparented patterns)`,
  footballPrefixes.length === 7 && unparented.length === 0, unparented.join(", "));

const everyNavLinkLands = navPrefixes.filter((to) => {
  if (to === "/" || footballPrefixes.includes(to)) return false;
  return !new RegExp(`path === "${to}"`).test(APP_SRC) && !(APP_SRC.match(/path\.startsWith\("([^"]+)\//g) || []).map((s) => s.match(/"([^"]+)\//)[1]).includes(to);
});
ok(`every nav destination is dispatched by App itself — no nav item can render the not-ready page (${navPrefixes.length} navs, ${everyNavLinkLands.length} dead links${everyNavLinkLands.length ? `: ${everyNavLinkLands.join(", ")}` : ""})`,
  navPrefixes.length >= 20 && everyNavLinkLands.length === 0, everyNavLinkLands.join(", "));

// ---------------------------------------------------------------------------
// 5 · AppShell's active-nav predicate: every arm has to be able to fire
// ---------------------------------------------------------------------------
const isActiveSrc = (SHELL_SRC.match(/const isActive = \(n: NavItem\) =>[\s\S]*?;/) || [""])[0];
const someBody = (isActiveSrc.match(/\.some\(\(m\) => ([^;]*)\)/) || [, ""])[1];
const arms = someBody.split("||").map((s) => s.trim()).filter(Boolean);
const dupArms = arms.filter((a, i) => arms.indexOf(a) !== i);
const reachable = [...new Set([
  "/",
  ...navPrefixes,
  ...(APP_SRC.match(/path === "\/[^"]*"/g) || []).map((s) => s.replace('path === ', "").replace(/"/g, "")),
  ...footballPrefixes,
  ...expanded.filter((e) => !e.template).map((e) => basePath(e.pattern)),
  ...navPrefixes.map((m) => `${m}/child`),
])];
const armFire = {}, unknownArms = [];
for (const arm of arms) {
  let hits = [];
  if (/^path === m$/.test(arm)) hits = reachable.filter((p) => navPrefixes.includes(p));
  else if (/^path\.startsWith\(m \+ "\/"\)$/.test(arm)) hits = reachable.filter((p) => navPrefixes.some((m) => p.startsWith(m + "/")));
  else {
    const t = arm.match(/matchRoute\(`\$\{m\}([^`]*)`,\s*path\)/);
    if (t) hits = reachable.filter((p) => navPrefixes.some((m) => { try { return matchRoute(m + t[1], p); } catch { return true; } }));
    else { unknownArms.push(arm); armFire[arm] = null; continue; }
  }
  armFire[arm] = hits;
}
const vacuous = arms.filter((a) => armFire[a] && armFire[a].length === 0);
ok(`the nav predicate has ${arms.length} arm(s), all recognised by this census and all able to fire on a reachable path (${arms.map((a) => `${a} → ${armFire[a] === null ? "UNREAD" : armFire[a].length + " paths"}`).join(" ;; ")} over ${reachable.length} reachable paths)`,
  arms.length >= 2 && vacuous.length === 0 && unknownArms.length === 0,
  `vacuous: ${vacuous.join(" ;; ") || "none"} · unreadable: ${unknownArms.join(" ;; ") || "none"}`);
ok(`…and no arm is written twice (${dupArms.length} duplicates: ${dupArms.join(" | ") || "none"})`,
  dupArms.length === 0, dupArms.join(", "));

const firesAlone = reachable.filter((p) => navPrefixes.some((m) => p.startsWith(m + "/") && p !== m) && !navPrefixes.includes(p));
ok(`the prefix arm is load-bearing rather than decorative (${firesAlone.length} reachable paths activate only because of startsWith, e.g. ${JSON.stringify(firesAlone.slice(0, 2))})`,
  firesAlone.length >= 1);

// ---------------------------------------------------------------------------
// 6 · what this harness genuinely cannot see, said out loud
// ---------------------------------------------------------------------------
const effectListeners = (renderAt("#/players/p1").w.listeners.hashchange || []).length;
ok(`NOT COVERED HERE, measured rather than assumed: renderToStaticMarkup never runs useEffect, so the hashchange subscription, the #/ bootstrap and Link's click guard are unproven by this file (listeners registered during render: ${effectListeners}, location.replace calls during render: ${renderAt("").w.replaces.length})`,
  effectListeners === 0);

const exemptNow = (read("scripts/proof-coverage.mjs").match(/"lib\/router\.tsx"/g) || []).length;
ok(`the exemption this file replaces is gone from the coverage ratchet (occurrences of "lib/router.tsx" in proof-coverage.mjs: ${exemptNow})`,
  exemptNow === 0);

// readLocation protects the empty path twice, so deleting either copy alone changes nothing —
// that equivalence is measured here so the arm that discovers it is declared, not counted as a
// hole in this file.
const rootGuards = (ROUTER_SRC.match(/\|\|\s*"\//g) || []).length;
const rootRows = ["", "#", "#/", "#?q=1"].map((h) => {
  renderAt(h);
  const q = cap ? [...cap.query.entries()].map(([k, v]) => `${k}=${v}`).join(",") : "";
  return { h, path: cap ? cap.path : "no context", dest: cap ? `${cap.path}${q ? `?${q}` : ""}` : "no context" };
});
ok(`readLocation guards an empty path twice and all four empty-ish hashes land on the root path either way (${rootGuards} guards; ${rootRows.map((r) => `${JSON.stringify(r.h)}→${JSON.stringify(r.dest)}`).join(" ")})`,
  rootGuards === 2 && rootRows.every((r) => r.path === "/"),
  rootRows.map((r) => `${JSON.stringify(r.h)}→${JSON.stringify(r.dest)}`).join(" "));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
