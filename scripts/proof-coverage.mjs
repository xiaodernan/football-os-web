// M206 — the coverage ratchet: every module the app itself ships must be reachable from a
// proof, or declared here with a reason.
//
// M205 found by hand that seven modules were loaded by nothing, and wrote that census into a
// scratch file where it will rot. This turns the same measurement into a gate, and M241 gave it
// a second question to ask. The population is every `.ts`/`.tsx` under the app's own directories,
// walked RECURSIVELY — the original scan read three top-level directories flat, which meant the
// entire `components/` tree was invisible to it and 51 modules (6,497 lines) of shipped-but-
// unreachable code could join or leave without the gate noticing. Two claims run over it:
//   proof-reach — a module is fine if a proof loads it directly, or a reached module imports it
//     by value (a type-only edge does not count, because it executes nothing). The remainder is
//     EXEMPT, with a reason, and its line total is pinned.
//   entry-reach — a module the app's own `src/main.tsx` cannot reach contributes no JavaScript to
//     `dist/`, so no reader can render it however many proofs load it. That pile is DEAD below,
//     reason by path, with a ceiling on its total lines. Measured out-of-band at 72f10fb, on a
//     plane build: a `data-slot` literal from each of four declared-dead primitives (`combobox-chip`
//     / `tooltip-content` / `sidebar-wrapper` / `chart-container`) hits 0 of 35 `dist/assets/*.js`,
//     while the same search finds `cmdk-input-wrapper` (a reachable primitive) in a chunk — so the
//     JS claim is real. It is only the JS claim: Tailwind reads the source tree, not the module
//     graph, and two of those four dead modules' class names DO reach `dist/assets/index.css`.
//     Deleting the pile shrinks the stylesheet too; leaving it there does not make it renderable.
// Both lists can only shrink: a ceiling asserted equal to the measured surface means deleting the
// code has to be written down too, and a stale entry (one that became reachable) is refused.
//
// The resolver is exercised on synthetic graphs as well as on the repo, because a gate that only
// ever reports "clean" has never been seen to refuse anything: reachability through two hops, a
// type-only edge that must NOT count, an alias and a relative path, and a module named only in a
// comment inside a proof.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, posix } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const DIRS = ["domain", "lib", "i18n"];
const read = (p) => readFileSync(resolve(root, p), "utf8");
const lines = (p) => read(p).split(/\r?\n/).length;

// ---------------------------------------------------------------------------
// The resolver, as a pure function so it can be tested on made-up graphs.
// ---------------------------------------------------------------------------
const SPEC = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;]*?from\s*["']([^"']+)["']/g;
const DYNAMIC = /\bimport\(\s*["']([^"']+)["']\s*\)/g;
// A bare `import "./x";` runs the module too, so it is a value edge as well.
const BARE = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;

// The oracle means "a module lives here", not "the path exists". `existsSync` answers yes for
// `i18n/` as readily as for `i18n/index.tsx`, and `resolveSpec` tries `base` first — so
// `import { useI18n } from "@/i18n"` resolved to the FOLDER, and M239's first screen proof
// (which reads src/App.tsx) made the census call `readFileSync` on it: EISDIR, mid-run, on a
// proof that used to be green. The difference is a stat, and this is the only place it lives.
const realExists = (rel) => {
  const p = resolve(root, rel);
  return existsSync(p) && statSync(p).isFile();
};
const fakeExists = (rel) => Object.prototype.hasOwnProperty.call(FAKE, rel);

function resolveSpec(spec, fromPath, exists = realExists) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) base = posix.normalize(posix.join(posix.dirname(fromPath), spec));
  else return null; // a bare package specifier: node_modules, not app code
  const cand = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return cand.find((c) => exists(c)) ?? null;
}

/** edges(specs) -> {value:Set, type:Set} */
function importsOf(src) {
  const value = new Set();
  const typeOnly = new Set();
  for (const m of src.matchAll(SPEC)) {
    if (m[1]) typeOnly.add(m[2]); else value.add(m[2]);
  }
  for (const m of src.matchAll(BARE)) value.add(m[1]);
  for (const m of src.matchAll(DYNAMIC)) value.add(m[1]);
  return { value, typeOnly };
}

/** Reachability from a set of root module paths, over value-imports only. */
function reach(roots, source, exists = realExists) {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const p = stack.pop();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    for (const spec of importsOf(source(p)).value) {
      const next = resolveSpec(spec, p, exists);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// The declared exemptions. Keyed by module path — never by line number — and each one has
// to say why it is unreachable, which is the part that stops being true someday.
// ---------------------------------------------------------------------------
// `src/main.tsx` is the one module the ratchet cannot ever reach: it calls createRoot on a
// DOM node that an SSR render does not have, so loading it from a proof throws before it
// returns. Its tree is what proof-screens proves, by loading the App it mounts. M238 retired
// the last library exemption (`lib/hooks.ts`, once proof-storage started rendering it) and
// M239's screen proof put src/App.tsx among the roots, which reaches `lib/utils.ts` through
// the feature files that import `cn`.
const EXEMPT = {
  "src/main.tsx": "the SPA entry: createRoot needs a DOM node, so no proof can load it; proof-screens loads the App it mounts",
};
/** The ratchet's own number, not the list's taste: M241 measured this entry at 9 lines by
 *  this file's own `lines()`, and the ceiling is what makes the figure move when the entry
 *  changes shape instead of the list quietly agreeing with itself. */
const EXEMPT_CEILING = 9;

// ---------------------------------------------------------------------------
// The pile the OLD population could not see. The census used to walk three directories
// non-recursively, so `components/ui/alert.tsx` was not a module it knew existed: 47 UI
// primitives, `hooks/use-mobile.ts`, the two Edge Function files and one ambient declaration
// — 6,497 lines counted at 72f10fb — could be added to or deleted and the gate would not
// blink. Each one is unreachable from `src/main.tsx` as well, which is the sharper fact:
// it is not merely unproven, no `dist/assets/*.js` chunk contains it (the marker test in the
// header), so no reader can render it. Its Tailwind utilities still reach the shipped
// stylesheet, because the CSS scans source files rather than the module graph.
// M242 measured the whole pile on a build plane before deleting any of it: 37 of these files,
// 4,398 lines, contribute exactly 0 bytes to `dist/assets/*.js` (35 chunks, 1,451,828 bytes, the
// same total before and after) and 80,635 bytes to the one stylesheet Tailwind builds by scanning
// sources. It deletes the 6 largest here (1,547 lines) because two file-count floors in
// scripts/proof-i18n.mjs are charged on the same tree; the other 31 are declared below by name.
// That is the only reason the ceiling is a number that moves: a deletion has to be written down
// here, in the same commit, or the gate reports the difference as a stale declaration. What stays,
// stays for a reason that names the artifact which has to move first — see the reason constants.
// ---------------------------------------------------------------------------
const DEAD_UI = [
  "breadcrumb", "carousel", "message-scroller", "pagination", "sidebar", "spinner",
].map((n) => `components/ui/${n}.tsx`);
const DEAD_REASON_PROOF = "scripts/proof-i18n.mjs section 9b loads and renders it, so it is a proof's own fixture even though no reader can reach it — delete it together with that section";
const DEAD_REASON_HOST = "scripts/proof-i18n.mjs carries a live browser-locale exemption keyed by this path (HOST_OK_NUMBER for chart, HOST_OK_UNMOUNTED for calendar), so file and exemption retire in one commit";
const DEAD_REASON_SIDEBAR = "imported by components/ui/sidebar.tsx, which section 9b loads: no reader reaches it, but it cannot go while the sidebar is a proof's fixture";
// M247: the two population floors are now pins (TSX_PIN, SRC_PIN in proof-i18n),
// so the 31 budget UI primitives are deleted. The remaining dead surface is the
// six proof fixtures (DEAD_UI), the two host exemptions (chart/calendar), and the
// three sidebar dependents (separator/tooltip/use-mobile), plus the two Edge
// functions and the ambient types file.
const DEAD = {
  ...Object.fromEntries(DEAD_UI.map((p) => [p, DEAD_REASON_PROOF])),
  "components/ui/chart.tsx": DEAD_REASON_HOST,
  "components/ui/calendar.tsx": DEAD_REASON_HOST,
  "components/ui/separator.tsx": DEAD_REASON_SIDEBAR,
  "components/ui/tooltip.tsx": DEAD_REASON_SIDEBAR,
  "hooks/use-mobile.ts": DEAD_REASON_SIDEBAR,
  "functions/index.ts": "the Sites Edge Function entry, loaded by the hosting platform and never by the SPA bundle; this build is local-only",
  "functions/handler.ts": "the Edge Function handler behind functions/index.ts — same reason, same bundle that never ships here",
  "src/vite-env.d.ts": "ambient type declarations: no runtime module exists to import, so reachability is not a property it has",
};
const DEAD_CEILING = 2099;
// M247: the two population floors in proof-i18n are now pins (TSX_PIN, SRC_PIN),
// so the 31 budget files are gone and the ceiling drops with them.
const POP_PIN = 108;
// A name on this list is a claim about a file, and the gate has to survive the claim being
// false. Existence is reported by the clause that says so; every later read of a declared name
// goes through this, so inventing a path can never kill the run with an ENOENT before the
// tally prints (the first draft guarded only the line-sum, and a witness arm still found the
// second `lines()` call in the biggest-three clause).
const safeLines = (p) => (realExists(p) ? lines(p) : 0);
// ---------------------------------------------------------------------------
// 1 · the resolver, on synthetic graphs (both directions)
// ---------------------------------------------------------------------------
const FAKE = {
  "domain/a.ts": `import { b } from "@/domain/b";\nimport type { T } from "@/domain/td";\nexport const a = () => b();`,
  "domain/b.ts": `import "../lib/c";\nexport const b = () => 1;`,
  "lib/c.ts": `export const c = 1;`,
  "domain/td.ts": `export type T = number;`,
  "domain/orphan.ts": `export const o = 1;`,
  "domain/dyn.ts": `const m = await import("@/domain/a");`,
};
const src = (p) => FAKE[p] ?? "";
const r1 = reach(["domain/a.ts"], src, fakeExists);
ok(`the resolver follows a two-hop value chain (a -> b -> c reaches ${r1.size} modules)`,
  r1.has("domain/a.ts") && r1.has("domain/b.ts") && r1.has("lib/c.ts"));
ok("…and a type-only import does NOT count as executing the target",
  !r1.has("domain/td.ts"));
ok("…nor does an unrelated module get pulled in by proximity",
  !r1.has("domain/orphan.ts"));
const r2 = reach(["domain/dyn.ts"], src, fakeExists);
ok("a dynamic import counts (a proof could reach a module that way)",
  r2.has("domain/a.ts") && r2.has("lib/c.ts"));
ok(`alias and relative specifiers both resolve (of ${Object.keys(FAKE).length} fake files, the chain found ${r1.size})`,
  resolveSpec("@/domain/b", "domain/a.ts", fakeExists) === "domain/b.ts" &&
  resolveSpec("../lib/c", "domain/b.ts", fakeExists) === "lib/c.ts" &&
  resolveSpec("react", "domain/b.ts", fakeExists) === null);

// …and the same two directions on the oracle itself, in the repo: `i18n/` really is a folder
// and `i18n/index.tsx` really is the module it holds, so a predicate answering plain
// `existsSync` accepts the folder, resolves `@/i18n` to it, and the census dies reading it.
// Both halves are asserted, because "no crash" alone would also be printed by a resolver that
// had stopped following the import at all.
ok(`the oracle means a file, not a folder (i18n: folder ${realExists("i18n")}, module ${realExists("i18n/index.tsx")})`,
  realExists("i18n") === false && realExists("i18n/index.tsx") === true);
ok(`…so @/i18n resolves to the index that holds it, not to the directory (${resolveSpec("@/i18n", "src/App.tsx")})`,
  resolveSpec("@/i18n", "src/App.tsx") === "i18n/index.tsx");

// ---------------------------------------------------------------------------
// 2 · the real repo
// ---------------------------------------------------------------------------
// The population is the whole app graph, walked RECURSIVELY. The old three-directory,
// non-recursive scan is what let 47 UI primitives hide in plain sight: `components/` was not
// even one of the directories it read, so a file could be added under components/ui/ and the
// census would report the same clean numbers it printed before.
// A skip list is a hiding place too, so POP_SKIP is charged twice: the floors below pin that
// the walked population still contains the directories the app is made of, and the entry
// census below re-reads every module it finds.
const POP_SKIP = new Set(["node_modules", "dist", "scripts", "dev", "vendor", "public", "coverage"]);
const walk = (d) => readdirSync(resolve(root, d), { withFileTypes: true }).flatMap((e) => {
  const rel = `${d}/${e.name}`;
  if (e.isDirectory()) return POP_SKIP.has(e.name) ? [] : walk(rel);
  return /\.(ts|tsx)$/.test(e.name) ? [rel] : [];
});
const popDirs = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !POP_SKIP.has(e.name) && !e.name.startsWith("."))
  .map((e) => e.name);
const APP_ENTRY = "src/main.tsx";

const population = popDirs.flatMap(walk);
const proofs = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));
const proofSrc = proofs.map((p) => read(`scripts/${p}`)).join("\n");
const roots = [...new Set([...proofSrc.matchAll(/ssrLoadModule\(\s*["'`]\/([\w./-]+?)["'`]/g)].map((m) => m[1]))].filter((p) => existsSync(resolve(root, p)));
const reached = reach(roots, read);
const unreachable = population.filter((p) => !reached.has(p));
// …and the second question, which is the one that decides whether a reader can ever see it:
// does the app's own entry reach it through value-imports? If not, it is not in dist/ at all.
const entryReached = reach([APP_ENTRY], read);
const dead = population.filter((p) => !entryReached.has(p));
const byDir = {};
for (const p of population) byDir[p.split("/")[0]] = (byDir[p.split("/")[0]] ?? 0) + 1;

ok(`${proofs.length} proofs load ${roots.length} modules directly, reaching ${population.length - unreachable.length} of the ${population.length} app modules in ${popDirs.length} directories walked recursively`,
  proofs.length >= 30 && roots.length >= 25 && population.length === POP_PIN);
ok(`…by directory: ${Object.entries(byDir).map(([d, n]) => `${d} ${n}`).join(", ")}`,
  Object.keys(byDir).length === popDirs.length
    && Object.values(byDir).reduce((n, k) => n + k, 0) === population.length
    && byDir.features >= 25 && byDir.domain >= 25 && byDir.components >= Object.keys(DEAD).length);
ok(`…and the walk really is recursive (of ${population.length} modules, ${population.filter((p) => p.split("/").length > 2).length} sit two or more levels down, which the old scan could not produce)`,
  population.filter((p) => p.split("/").length > 2).length >= 50);
ok(`…and this file counts itself: proof-coverage.mjs is one of the ${proofs.length} proofs`,
  proofs.includes("proof-coverage.mjs") && proofSrc.includes("ssrLoadModule"));

const stale = Object.keys(EXEMPT).filter((p) => !unreachable.includes(p));
const undeclared = unreachable.filter((p) => !(p in EXEMPT) && !(p in DEAD));
ok(`every unreachable module is declared, with a reason (${unreachable.length} unreachable, ${Object.keys(EXEMPT).length} entry-exempt + ${Object.keys(DEAD).length} dead)`,
  undeclared.length === 0,
  `undeclared: ${undeclared.join(", ") || "none"}`);
ok(`…and no exemption has gone stale (a module that became reachable must be deleted from this list)`,
  stale.length === 0, `stale: ${stale.join(", ") || "none"}`);
const exemptLines = Object.keys(EXEMPT).reduce((n, p) => n + lines(p), 0);
ok(`the exempt surface is ${exemptLines} lines of app code against a ceiling of ${EXEMPT_CEILING}, and every entry states why (${Object.entries(EXEMPT).map(([p, why]) => `${p}:${why.length > 12 ? "why given" : "TOO SHORT"}`).join(" ")})`,
  Object.values(EXEMPT).every((why) => typeof why === "string" && why.length > 12) && exemptLines === EXEMPT_CEILING);

// ---------------------------------------------------------------------------
// 2b · the entry census: shipped code no reader can reach
// ---------------------------------------------------------------------------
const deadUndeclared = dead.filter((p) => !(p in DEAD));
// A dead entry that has left the population is the same hiding place as one that became
// reachable: an arm that narrows the walk would keep the list intact and print a comfortable
// zero, so both directions are refused here, and the declared paths are checked against the
// walk that is supposed to have found them.
const deadStale = Object.keys(DEAD).filter((p) => entryReached.has(p) || !population.includes(p));
ok(`${dead.length} of the ${population.length} modules are unreachable from ${APP_ENTRY} and every one is declared as dead (${deadUndeclared.length} undeclared, ${deadStale.length} stale)`,
  deadUndeclared.length === 0 && deadStale.length === 0,
  `undeclared: ${deadUndeclared.join(", ") || "none"}; stale: ${deadStale.join(", ") || "none"}`);
ok(`…and nothing the app mounts is on the dead list (dead ${dead.length} ⊆ unreachable ${unreachable.length}; the entry itself is exempt, not dead)`,
  dead.every((p) => unreachable.includes(p)) && !(APP_ENTRY in DEAD));
// The names are checked before their sizes: a path invented into this list should be reported
// by the clause that says so, not raise ENOENT from a `readFileSync` two lines later and leave
// the whole gate without a tally.
ok(`…and every dead entry is a real module the scanner read, with a reason worth reading (${Object.keys(DEAD).length} named, ${Object.keys(DEAD).filter((p) => realExists(p)).length} present, all >12 chars)`,
  Object.keys(DEAD).every((p) => realExists(p) && lines(p) > 0 && typeof DEAD[p] === "string" && DEAD[p].length > 12),
  `not on disk: ${Object.keys(DEAD).filter((p) => !realExists(p)).join(", ") || "none"}`);
const deadLines = dead.reduce((n, p) => n + lines(p), 0);
const declaredDeadLines = Object.keys(DEAD).reduce((n, p) => n + safeLines(p), 0);
ok(`the dead surface is ${deadLines} lines against a ceiling of ${DEAD_CEILING}, measured by reading every declared file (${declaredDeadLines} by name) — the number only goes down, and deleting a file has to pay for it here too`,
  deadLines === DEAD_CEILING && declaredDeadLines === deadLines);

// A ratchet has to be seen to refuse: a new module that nothing loads must land in the
// undeclared set, and one that a proof loads must not be exposable by declaring it.
// The deep plant is the point of M241 — a module two levels down is exactly what the old
// non-recursive walk never looked at.
const SHALLOW_PLANT = "domain/brand_new.ts";
const DEEP_PLANT = "components/ui/m241_planted.tsx";
const stillMissing = [...population, SHALLOW_PLANT, DEEP_PLANT]
  .filter((p) => !reached.has(p) && !(p in EXEMPT) && !(p in DEAD));
ok(`planting two ungated modules makes the gate speak up (${stillMissing.length} undeclared instead of ${undeclared.length}, plants ${stillMissing.includes(SHALLOW_PLANT) ? "shallow named" : "SHALLOW MISSED"}/${stillMissing.includes(DEEP_PLANT) ? "deep named" : "DEEP MISSED"})`,
  stillMissing.includes(SHALLOW_PLANT) && stillMissing.includes(DEEP_PLANT)
    && stillMissing.length === undeclared.length + 2);
const deadMissing = [...population, DEEP_PLANT].filter((p) => !entryReached.has(p) && !(p in DEAD));
ok(`…and a module two directories deep is charged as shipped-dead, not waved through (${deadMissing.length} undeclared-dead instead of ${deadUndeclared.length}, plant ${deadMissing.includes(DEEP_PLANT) ? "named" : "MISSED"})`,
  deadMissing.includes(DEEP_PLANT) && deadMissing.length === deadUndeclared.length + 1);
ok(`…and a module a proof actually loads can never be quieted by an exemption (the list is checked against reachability, not against taste)`,
  !Object.keys(EXEMPT).some((p) => reached.has(p)) && !Object.keys(DEAD).some((p) => entryReached.has(p)));

// The dead list is only honest if the entry graph is real: an entry that reached everything
// would make this section print a comfortable zero, so the census pins that the walk found
// the entry at all, and that the modules it does reach are the ones the reader sees.
ok(`the entry census is anchored on a module that exists and imports the app (${APP_ENTRY} is in the population, and it reaches ${[...entryReached].filter((p) => population.includes(p)).length} shipped modules including every ${byDir.features} under features/)`,
  population.includes(APP_ENTRY) && realExists(APP_ENTRY)
    && byDir.features > 0 && [...entryReached].filter((p) => p.startsWith("features/")).length === byDir.features);

// ---------------------------------------------------------------------------
// 3 · the directories the ratchet started with, so the claim is measured not remembered
// ---------------------------------------------------------------------------
const seed = DIRS.flatMap((d) =>
  readdirSync(resolve(root, d)).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => `${d}/${f}`));
ok(`the ${seed.length} modules in ${DIRS.join("/")}, the directories this gate was built around, carry not one exemption between them (M238 retired the last one: lib/hooks.ts is loaded and rendered by proof-storage, and every exemption now is the SPA entry)`,
  seed.every((p) => !(p in EXEMPT)) && Object.keys(EXEMPT).length === 1 && APP_ENTRY in EXEMPT
    && seed.every((p) => reached.has(p) || p in DEAD));
const biggest = Object.keys(DEAD).map((p) => [p, safeLines(p)]).sort((a, b) => b[1] - a[1]).slice(0, 3);
ok(`the dead list is measured by reading the files, not by trusting the names: ${biggest.map(([p, n]) => `${p} ${n} lines`).join(", ")} are the three biggest of ${Object.keys(DEAD).length}`,
  biggest.every(([p, n]) => n === safeLines(p) && n > 0) && biggest.every(([p]) => p in DEAD) && biggest[1][1] >= biggest[2][1]);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
