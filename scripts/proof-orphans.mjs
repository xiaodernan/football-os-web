// M428: the orphan module -- a shipped .ts/.tsx file that no entry point's import graph
// reaches. Both existing censuses are blind to it: its exports are dead and its imports are dead,
// but neither walks from an entry. The entries are DERIVED (index.html's module script and any
// Deno.serve module under functions/), so the gate names no app path of its own.
// M776: the reader, the walker and the walk are scripts/lib/appGraph.mjs now, because a second
// census (proof-i18n's population) charges the same debt and the two gates must not disagree about
// which files the app is. This gate keeps the claims; the graph lives once.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_DIRS, skipReason } from "./lib/appTree.mjs";
import { stripComments, readSpecs, resolveSpec, htmlEntries, denoEntries, reachableFrom, moduleGraph } from "./lib/appGraph.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- 1. The reader, armed on fixtures whose paths live under `pkg/` (not a shipped root), so ---
// --- the gate's own test data cannot be mistaken for a per-file exemption in clause 5. --------
const H = new Set(["pkg/App.tsx", "pkg/lib/utils.ts", "pkg/a/X.tsx", "pkg/a/n.tsx", "pkg/a/dir/index.ts"]);
const has = (p) => H.has(p);
const r1 = resolveSpec("pkg/App.tsx", "@/pkg/lib/utils", has);
const r2 = resolveSpec("pkg/a/X.tsx", "./n", has);
const r3 = resolveSpec("pkg/a/X.tsx", "./dir", has);
const r4 = resolveSpec("pkg/App.tsx", "react", has);
const r5 = resolveSpec("pkg/App.tsx", "./globals.css", has);
const r6 = resolveSpec("pkg/App.tsx", "./missing", has);
const specSample = [
  'import { a } from "@/pkg/lib/utils";',
  'import "./globals.css";',
  'const D = lazy(() => import("@/pkg/a/X").then((m) => ({ default: m.X })));',
  'export { b } from "@/pkg/b";',
  'export * from "@/pkg/c";',
  '// import { ghost } from "@/pkg/ghost";',
  'const copy = "from \\"@/pkg/string\\"";',
].join("\n");
const specs = readSpecs(specSample);
const fEdges = new Map([
  ["pkg/a.ts", new Set(["pkg/b.ts"])],
  ["pkg/b.ts", new Set(["pkg/c.ts"])],
  ["pkg/c.ts", new Set(["pkg/a.ts"])],
  ["pkg/d.ts", new Set(["pkg/a.ts"])],
]);
const fReach = reachableFrom(["pkg/a.ts"], fEdges);
const hEntries = htmlEntries('<script src="/pkg/entry.tsx" type="module"></script><script src="/pkg/dead.js"></script>');
const dEntries = denoEntries(["pkg/index.ts", "pkg/plain.ts"], { "pkg/index.ts": "Deno.serve(handler);", "pkg/plain.ts": "export const x = 1;" }, "pkg");
ok(`the reader resolves @/, relative, extensionless and index specifiers, ignores packages and assets, and reports a missing module (utils ${r1.target}, sibling ${r2.target}, index ${r3.target}, package ${r4.kind}, asset ${r5.kind}, missing ${r6.kind}); it reads every import shape and no comment (specs [${specs.join(",")}]); the graph walk follows a cycle and leaves an unreachable file out (${[...fReach].sort().join(",")} of 4); the entries come from the html's module script and from Deno.serve (${hEntries.join(",")} / ${dEntries.join(",")})`,
  r1.kind === "file" && r1.target === "pkg/lib/utils.ts" && r2.target === "pkg/a/n.tsx" && r3.target === "pkg/a/dir/index.ts" &&
  r4.kind === "package" && r5.kind === "asset" && r6.kind === "unresolved" &&
  specs.slice().sort().join() === ["./globals.css", "@/pkg/a/X", "@/pkg/b", "@/pkg/c", "@/pkg/lib/utils"].sort().join() &&
  fReach.size === 3 && fReach.has("pkg/a.ts") && fReach.has("pkg/b.ts") && fReach.has("pkg/c.ts") && !fReach.has("pkg/d.ts") &&
  hEntries.join() === "pkg/entry.tsx" && dEntries.join() === "pkg/index.ts");

// --- 2. The walk is the real tree, the roots are derived, and both entries are inside it. -----
// M522: `tests/` carries the Playwright specs — test entry points, not app modules; coverage's
// POP_SKIP names the same directory.
const NON_APP = ["scripts", "dev", "dist", "node_modules", "test-results", "vendor", "tests"];
// M423: the rule that says which tree this is lives in scripts/lib/appTree.mjs now — a hidden
// directory is not shipped and a directory carrying its own `.git` is another repository. Without
// it the scratch planes left in the root by old experiments each read as an uncovered directory.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = `${d}/${e.name}`;
  if (e.isDirectory()) return skipReason(e.name, p) ? [] : walk(p);
  return [p];
});
const topDirs = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const carriesTs = (d) => {
  try {
    const entries = readdirSync(join(root, d), { withFileTypes: true });
    if (entries.some((e) => e.isFile() && /\.tsx?$/.test(e.name))) return true;
    return entries.some((e) => e.isDirectory() && e.name !== "node_modules" && carriesTs(`${d}/${e.name}`));
  } catch { return false; }
};
// The claim is about the ROOT: a top-level directory holding TypeScript that no census walks. The
// graph's own ten directories come from appTree, so this compares the tree against the walk that
// built it rather than against a second list of the same names.
const uncovered = topDirs.filter((d) => !APP_DIRS.includes(d) && !skipReason(d, join(root, d), NON_APP) && carriesTs(d));
const graph = moduleGraph(root);
const { files, fileSet, entries, edges, unresolved, assets, packageSpecs, edgeCount, reachable } = graph;
ok(`the walk covers every top-level TypeScript directory and reads the real app (${files.length} files, floor 90; ${uncovered.length} uncovered; entries ${entries.join(", ")}; both inside the walk ${entries.every((e) => fileSet.has(e))})`,
  files.length >= 90 && uncovered.length === 0 && entries.length >= 1 && entries.every((e) => fileSet.has(e)));

// --- 3. Every local specifier resolves. A silently unresolved edge would make the graph lie; ---
// --- assets are counted apart because a .css file is not a module this census walks. ---------
ok(`every local specifier resolves (${edgeCount} edges, floor 500; ${unresolved.length} unresolved; ${assets.length} asset import(s) [${assets.join(", ")}]; ${packageSpecs.size} package names)`,
  edgeCount >= 500 && unresolved.length === 0 && assets.length >= 1);

// --- 4. No shipped module is an orphan. A file named only by a proof script is measured apart: ---
// --- a proof is a consumer, so it is not an orphan, but an app-only reading would not see it. --
const unreachable = graph.unreached;
const proofTexts = walk(join(root, "scripts")).filter((f) => /\.(mjs|ts)$/.test(f)).map((f) => readFileSync(f, "utf8"));
const mentionedByProof = (rel) => proofTexts.some((t) => t.includes(`"/${rel}"`) || t.includes(`'/${rel}'`));
const proofOnly = unreachable.filter((rel) => mentionedByProof(rel));
const orphans = unreachable.filter((rel) => !mentionedByProof(rel));
ok(`no shipped module is an orphan (${files.length - unreachable.length} of ${files.length} reached from an entry; ${proofOnly.length} proof-only; ${orphans.length} orphan(s)${orphans.length ? `: ${orphans.join(", ")}` : ""})`,
  orphans.length === 0 && proofOnly.length === 0);

// --- 5. No per-file exemption. The entries are derived, so the gate names no shipped path in ---
// --- code; a planted skip list is charged, proving the scan reads the right thing. ------------
const self = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const quoted = (text) => [...text.matchAll(/["']((?:domain|data|lib|features|components|ui|src|store|i18n|functions)\/[^"']+)["']/g)].map((m) => m[1]);
const selfPaths = quoted(self);
const planted = 'const SKIP_LIST = ["' + ["domain", "legacy.ts"].join("/") + '"];';
const plantedPaths = quoted(planted);
ok(`the gate carries no per-file exemption (${selfPaths.length} shipped path(s) quoted in code [${selfPaths.join(",")}]; the entries come from index.html and Deno.serve; a planted skip list names ${plantedPaths.length})`,
  selfPaths.length === 0 && plantedPaths.length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
