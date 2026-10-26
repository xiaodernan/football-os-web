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
import { skipReason } from "./lib/appTree.mjs";

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
 *  changes shape instead of the list quietly agreeing with itself. M522: 9 -> 20 — the lane's
 *  M458 service-worker registration grew the entry and did not pay; the exemption count is
 *  still one, only the shape it names got longer. */
const EXEMPT_CEILING = 20;

// ---------------------------------------------------------------------------
// The pile the OLD population could not see. The census used to walk three directories
// non-recursively, so `components/ui/alert.tsx` was not a module it knew existed: 47 UI
// primitives, `hooks/use-mobile.ts`, the two Edge Function files and one ambient declaration
// — 6,497 lines counted at 72f10fb — could be added to or deleted and the gate would not
// blink. Each one was unreachable from `src/main.tsx` as well, which is the sharper fact:
// no `dist/assets/*.js` chunk contains it, so no reader could render it. Its Tailwind
// utilities did reach the shipped stylesheet, because the CSS scans source files, not the graph.
// M242 measured the whole pile on a build plane before deleting any of it: 37 of those files,
// 4,398 lines, contribute exactly 0 bytes to `dist/assets/*.js` (35 chunks, 1,451,828 bytes, the
// same total before and after) and 80,635 bytes to the one stylesheet Tailwind builds by scanning
// sources. M242 deleted the 6 largest, M247 the 31 that two file-count floors had been charging,
// and M248 the 11 the last blockers protected — section 9b's proof fixtures, the two host-format
// exemptions and the sidebar's dependents, which retired in the same commit as their files.
// What is left of the dead surface is the two Edge Function files (loaded by a hosting platform
// this local-only build never calls) and one ambient declaration, 22 lines, each named below.
// ---------------------------------------------------------------------------
const DEAD = {
  "functions/index.ts": "the Sites Edge Function entry, loaded by the hosting platform and never by the SPA bundle; this build is local-only",
  "functions/handler.ts": "the Edge Function handler behind functions/index.ts — same reason, same bundle that never ships here",
  "src/vite-env.d.ts": "ambient type declarations: no runtime module exists to import, so reachability is not a property it has",
};
const DEAD_CEILING = 22;
// M248: section 9b and the HOST_OK exemptions retired with their files, POP_PIN drops by 11.
// M444: 98 -> 99. lib/context.ts (the context-guard door) is a new app module; the pin pays in the
// same commit, which is what makes a lost directory redden instead of shrinking quietly.
// M453: 99 -> 102. domain/playerCareer.ts, features/player/TrainingTree.tsx and
// ui/charts/PotentialRadar.tsx are app modules the lane added; the pin pays for them here.
// M522: the lane's sixty files — 48 screens (39 that do not parse, 9 that parse but nothing routes)
// plus the twelve modules only they reached — left for `.drafts/`, so the population is again the
// 102 the M453 pin named. This pin was measured after the quarantine, not inherited: the
// per-directory row below is what says the tree is the same shape for the right reason.
// M523: 102 -> 104. domain/coachCareer.ts and features/coach/CoachProfile.tsx join the
// population (the coach résumé screen and its domain module).
const POP_PIN = 104;
// M248 removed `hooks/use-mobile.ts`, which was the only module in `hooks/`, so the walk now reads
// 11 top-level directories and finds modules in 10 of them. The clause that used to notice that
// gap said `Object.keys(byDir).length === popDirs.length`; the honest repair is NOT the `<=` this
// file briefly carried, because a `<=` lets any directory stop contributing and calls that a pass.
// A pin names each directory and its module count, so a module joining or leaving one has to be
// written down here, and a directory going quiet is reported by name in the clause's own text.
// Same reason the recursion floor becomes a pin: after 48 deletions a `>= 42` is a taste, and only
// the measured number says what this tree actually looks like.
// M444: lib 6 -> 7 (lib/context.ts, the context-guard door). The per-directory pin pays in the same
// commit, so a file that moved directories or vanished reddens the row it left.
// M522: measured after the quarantine — the drafted screens took their domain/ui/src helpers with
// them, and the rows below name what remains. `tests` never appears here: Playwright specs are not
// app modules — see POP_SKIP.
// M523: domain 32 -> 33 (coachCareer), features 29 -> 30 (CoachProfile).
const BY_DIR_PIN = { components: 15, data: 7, domain: 33, features: 30, functions: 2, i18n: 3, lib: 7, src: 3, store: 1, ui: 3 };
// M522: 45, measured after the quarantine. The deep count moves with the population, and the five
// Playwright specs under tests/e2e/ are no longer read as app modules.
// M523: 45 -> 46. features/coach/CoachProfile.tsx sits two levels down.
const DEEP_PIN = 46;
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
// M522: `tests/` holds the Playwright specs — test entry points `npm run test:e2e` launches, never
// imported by the SPA and never loaded by a proof that renders the app. Counting them as app modules
// made every dead-code walker report the directory as "uncovered" and the entry census charge five
// specs as shipped-dead; they are not the app, and the five walkers name the same directory.
const POP_SKIP = new Set(["node_modules", "dist", "scripts", "dev", "vendor", "public", "coverage", "test-results", "tests"]);
// M423: a directory carrying its own `.git` is another repository, not a directory of this one.
// `football-os/` was a local clone of this very repository, so the population this gate measured
// was the app's 98 modules plus the clone's 79 — 177 modules the gate could not tell apart, and
// five gates that went red with numbers nobody could act on. The rule lives in
// scripts/lib/appTree.mjs so no proof has to remember it on its own.
const walk = (d) => readdirSync(resolve(root, d), { withFileTypes: true }).flatMap((e) => {
  const rel = `${d}/${e.name}`;
  if (e.isDirectory()) return POP_SKIP.has(e.name) || skipReason(e.name, resolve(root, rel)) ? [] : walk(rel);
  return /\.(ts|tsx)$/.test(e.name) ? [rel] : [];
});
const popDirs = readdirSync(root, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !POP_SKIP.has(e.name) && !skipReason(e.name, join(root, e.name)))
  .map((e) => e.name)
  .filter((d) => d !== "test-results");
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
// Reported by name rather than folded into a count: a directory that stops contributing modules is
// the exact event the old `=== popDirs.length` equality was only able to hint at.
const silentDirs = popDirs.filter((d) => !(d in byDir));
const dirDelta = [...new Set([...Object.keys(BY_DIR_PIN), ...Object.keys(byDir)])]
  .filter((d) => (byDir[d] ?? 0) !== (BY_DIR_PIN[d] ?? 0))
  .map((d) => `${d} ${byDir[d] ?? 0} vs pin ${BY_DIR_PIN[d] ?? 0}`);

ok(`${proofs.length} proofs load ${roots.length} modules directly, reaching ${population.length - unreachable.length} of the ${population.length} app modules in ${popDirs.length} directories walked recursively`,
  proofs.length >= 30 && roots.length >= 25 && population.length === POP_PIN);
ok(`…by directory: ${Object.entries(byDir).map(([d, n]) => `${d} ${n}`).join(", ")}${silentDirs.length ? ` (${silentDirs.join(", ")} contributes none)` : ""}`,
  Object.keys(byDir).length > 0 && dirDelta.length === 0 && Object.keys(byDir).length === Object.keys(BY_DIR_PIN).length
    && Object.values(byDir).reduce((n, k) => n + k, 0) === population.length);
ok(`…and the walk really is recursive (of ${population.length} modules, ${population.filter((p) => p.split("/").length > 2).length} sit two or more levels down, which the old scan could not produce)`,
  population.filter((p) => p.split("/").length > 2).length === DEEP_PIN);
ok(`…and this file counts itself: proof-coverage.mjs is one of the ${proofs.length} proofs`,
  proofs.includes("proof-coverage.mjs") && proofSrc.includes("ssrLoadModule"));

const stale = Object.keys(EXEMPT).filter((p) => !unreachable.includes(p));
const undeclared = unreachable.filter((p) => !(p in EXEMPT) && !(p in DEAD));
ok(`every unreachable module is declared, with a reason (${unreachable.length} unreachable, ${Object.keys(EXEMPT).length} entry-exempt + ${Object.keys(DEAD).length} dead)`,
  undeclared.length === 0,
  `undeclared: ${undeclared.join(", ") || "none"}`);
ok(`…and no exemption has gone stale (a module that became reachable must be deleted from this list)`,
  Object.keys(EXEMPT).length > 0 && stale.length === 0, `stale: ${stale.join(", ") || "none"}`);
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

// ---------------------------------------------------------------------------
// 2c · the record's claims about this ratchet must be this ratchet's
// ---------------------------------------------------------------------------
// M209's block named four modules as unexercised and four exemptions as "real gaps, not solved
// ones". By M368 every one of those four modules had a proof of its own and the exemptions were
// one — the claims had outlived their own repairs, which is M299/M300/M305's class arriving a
// third time. Striking them by hand is what M300 and M305 already did, and it did not stop the
// recurrence, so the two files are welded here instead: a module the record names as having no
// proof must be one this ratchet measures as unreachable, or the claim has to go.
//
// The reading is a sentence that names a module AND asserts it is unproven — not every paragraph
// that contains the word "ungated", because most of those are the historical record of a milestone
// where it *was* true, and rewriting those would be falsifying history rather than fixing a claim.
// Present tense only. M210's intro says `lib/rng.ts` "had no proof of its own" and then writes
// one — a true historical account of that milestone, not a live claim, and reading it as one would
// make the clause punish a section for describing the gap it was written to close.
const NO_PROOF_PHRASE = /(?<!had )(no proof of its own|has no proof|no proof can load|outside any proof|remain outside any proof|is ungated|remains ungated|ungated module|ungated domain module)/i;
const APP_MODULE = /^(domain|lib|data|features|store|src|components)\/[\w./-]+\.tsx?$/;
/** The modules a set of outstanding blocks names in a sentence claiming they have no proof. */
const claimsIn = (blocks) =>
  [...new Set(blocks
    .flatMap((b) => b.split(/(?<=\.)\s+/))
    .filter((s) => NO_PROOF_PHRASE.test(s))
    .flatMap((s) => [...s.matchAll(/[\w./-]+\/[\w.-]+\.tsx?/g)].map((m) => m[0])))
  ].filter((p) => APP_MODULE.test(p));
// The live claims are the **"Still outstanding"** blocks — the project's own convention since M208,
// and the blocks M300 and M305 struck charges out of. Section prose is the historical record: M196's
// opening says `domain/career.ts` was the largest module without a proof, and it was, at M196. Only a
// block that says it is still outstanding is speaking about the tree as it is.
//
// Scoping this way also keeps the reader off quoted spans: this milestone's own section quotes the
// seven charges it strikes, and a reader that could not tell a quote from an assertion would refuse
// the section documenting the repair. (A first attempt blanked quotes by pattern and mispaired them
// against the README's 1540 quotation marks, merging sentences across paragraph boundaries — the
// convention is a better boundary than a pattern.)
const README_SRC = readFileSync(resolve(root, "README.md"), "utf8");
const OUTSTANDING_BLOCK = /\*\*Still outstanding\*\*[\s\S]*?(?=\n\s*\n|\n###|$)/g;
const outstandingBlocks = README_SRC.match(OUTSTANDING_BLOCK) ?? [];
const claimSentences = outstandingBlocks
  .flatMap((b) => b.split(/(?<=\.)\s+/))
  .filter((s) => NO_PROOF_PHRASE.test(s)).length;
const claimedModules = claimsIn(outstandingBlocks);
const closedSince = claimedModules.filter((p) => !unreachable.includes(p));
ok(`every module the record names as unproven is one this ratchet measures as unreachable (${claimSentences} claim sentence(s) read, ${claimedModules.length} module(s) named: ${claimedModules.join(", ") || "none"}; ${closedSince.length} of them have proofs now)`,
  claimedModules.length >= 1 && closedSince.length === 0,
  `stale claims: ${closedSince.join(", ") || "none"}`);
// The reader is one function used by both the clause and this plant, so a mutation of the predicate
// cannot leave the witness measuring a different idea (M313).
const plantedStale = "**Still outstanding**: `lib/rng.ts` is reached transitively but has no proof of its own.";
const plantedLive = "**Still outstanding**: `src/main.tsx` remains the one module no proof can load, because createRoot needs a DOM node.";
const staleRead = claimsIn([plantedStale]);
const liveRead = claimsIn([plantedLive]);
ok(`the unproven-claim reader, planted both ways, flags a module this ratchet reaches and accepts the one it does not (stale plant: ${staleRead.join(", ") || "none"} named, all reachable: ${staleRead.length > 0 && staleRead.every((p) => !unreachable.includes(p))}; live plant: ${liveRead.join(", ") || "none"} named, all unreachable: ${liveRead.length > 0 && liveRead.every((p) => unreachable.includes(p))})`,
  staleRead.length === 1 && staleRead.every((p) => !unreachable.includes(p)) &&
  liveRead.length === 1 && liveRead.every((p) => unreachable.includes(p)));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
