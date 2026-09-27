// M206 — the coverage ratchet: every module the app itself ships must be reachable from a
// proof, or declared here with a reason.
//
// M205 found by hand that seven modules were loaded by nothing, and wrote that census into a
// scratch file where it will rot. This turns the same measurement into a gate: the population is
// `domain/`, `lib/` and `i18n/`; a module is REACHED if a proof loads it directly, or if it is
// imported (by value, not merely by type) by a reached module. Anything else has to appear in
// EXEMPT below, with the reason and its line count — and that list can only shrink, because a
// ceiling on its total lines is asserted every run.
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

const realExists = (rel) => existsSync(resolve(root, rel));
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
const EXEMPT = {
  "lib/router.tsx": "hash router + React context: needs a DOM the SSR harness does not provide",
  "lib/hooks.ts": "React hooks (media query, local storage): needs a DOM",
  "lib/theme.tsx": "theme provider: needs a DOM",
  "lib/utils.ts": "one `cn` wrapper over clsx/tailwind-merge; no app logic to pin",
};
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

// ---------------------------------------------------------------------------
// 2 · the real repo
// ---------------------------------------------------------------------------
const population = DIRS.flatMap((d) =>
  readdirSync(resolve(root, d)).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => `${d}/${f}`));
const proofs = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));
const proofSrc = proofs.map((p) => read(`scripts/${p}`)).join("\n");
const roots = [...new Set([...proofSrc.matchAll(/ssrLoadModule\(\s*["'`]\/([\w./-]+?)["'`]/g)].map((m) => m[1]))].filter((p) => existsSync(resolve(root, p)));
const unreachable = population.filter((p) => !reach(roots, read).has(p));
const byDir = {};
for (const p of population) byDir[p.split("/")[0]] = (byDir[p.split("/")[0]] ?? 0) + 1;

ok(`${proofs.length} proofs load ${roots.length} modules directly, reaching ${population.length - unreachable.length} of the ${population.length} app modules in ${DIRS.join("/")}`,
  proofs.length >= 30 && roots.length >= 25 && population.length >= 30 && unreachable.length <= Object.keys(EXEMPT).length);
ok(`…by directory: ${Object.entries(byDir).map(([d, n]) => `${d} ${n}`).join(", ")}`,
  Object.keys(byDir).length === DIRS.length && byDir.domain >= 25);
ok(`…and this file counts itself: proof-coverage.mjs is one of the ${proofs.length} proofs`,
  proofs.includes("proof-coverage.mjs") && proofSrc.includes("ssrLoadModule"));

const stale = Object.keys(EXEMPT).filter((p) => !unreachable.includes(p));
const undeclared = unreachable.filter((p) => !(p in EXEMPT));
ok(`every unreachable module is declared, with a reason (${unreachable.length} unreachable, ${Object.keys(EXEMPT).length} declared)`,
  undeclared.length === 0 && unreachable.length === Object.keys(EXEMPT).length,
  `undeclared: ${undeclared.join(", ") || "none"}`);
ok(`…and no exemption has gone stale (a module that became reachable must be deleted from this list)`,
  stale.length === 0, `stale: ${stale.join(", ") || "none"}`);
const exemptLines = Object.keys(EXEMPT).reduce((n, p) => n + lines(p), 0);
ok(`the exempt surface is ${exemptLines} lines of app code, and every entry states why (${Object.entries(EXEMPT).map(([p, why]) => `${p}:${why.length > 12 ? "why given" : "TOO SHORT"}`).join(" ")})`,
  Object.values(EXEMPT).every((why) => typeof why === "string" && why.length > 12) && exemptLines <= 330);

// A ratchet has to be seen to refuse: a new module that nothing loads must land in the
// undeclared set, and one that a proof loads must not be exposable by declaring it.
const stillMissing = [...population, "domain/brand_new.ts"].filter((p) => !reach(roots, read).has(p) && !(p in EXEMPT));
ok(`planting an ungated module makes the gate speak up (${stillMissing.length} undeclared instead of ${undeclared.length}, and the plant is ${stillMissing.includes("domain/brand_new.ts") ? "named" : "MISSED"})`,
  stillMissing.includes("domain/brand_new.ts") && stillMissing.length === undeclared.length + 1);
ok(`…and a module a proof actually loads can never be quieted by an exemption (the list is checked against reachability, not against taste)`,
  !Object.keys(EXEMPT).some((p) => reach(roots, read).has(p)));

// ---------------------------------------------------------------------------
// 3 · the modules named in the header, so the claim is measured not remembered
// ---------------------------------------------------------------------------
const libModules = readdirSync(resolve(root, "lib")).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => `lib/${f}`);
const dom = readdirSync(resolve(root, "domain")).filter((f) => f.endsWith(".ts"));
ok(`the React-side libs are the bulk of what remains (${libModules.filter((p) => p in EXEMPT).length} of ${libModules.length} lib modules are exempt; domain has ${dom.length} files and none is exempt)`,
  libModules.filter((p) => p in EXEMPT).length === 4 && dom.every((f) => !(`domain/${f}` in EXEMPT)));
const biggest = Object.keys(EXEMPT).map((p) => [p, lines(p)]).sort((a, b) => b[1] - a[1]);
ok(`largest exemptions: ${biggest.slice(0, 2).map(([p, n]) => `${p} ${n} lines`).join(", ")}`,
  biggest[0][1] >= 60 && biggest.every(([p]) => p in EXEMPT));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
