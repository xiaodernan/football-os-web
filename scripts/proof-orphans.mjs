// M428: the orphan module -- a shipped .ts/.tsx file that no entry point's import graph
// reaches. Both existing censuses are blind to it: its exports are dead and its imports are dead,
// but neither walks from an entry. The entries are DERIVED (index.html's module script and any
// Deno.serve module under functions/), so the gate names no app path of its own.
//
// M777: the reader moved to scripts/lib/appTree.mjs. It was the last private copy of the question
// "which modules does a reader reach?" — three other gates had already been told to ask it there,
// and the copy is why M776's answer and this one disagreed about the Edge Function: this gate
// derives its entries, that one was handed `["src/main.tsx"]`, so two modules a reader reaches by
// URL were counted as a quarantine nothing imports. What stays here is the ARMING — the fixtures
// that prove the shared reader ignores both comment shapes, resolves a specifier four ways and
// closes a cycle — because a rule with no planted case against it is a rule nobody can see break.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_DIRS, skipReason, walkApp, stripCommentsIn, importEdgesIn, classifySpecIn, htmlEntriesIn, denoEntriesIn, reachableModulesIn } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// The specifiers a module names, both kinds: this gate charges a broken TYPE import too, because a
// `import type` that points at nothing is a lie in the source even though no reader executes it.
const readSpecs = (text) => {
  const { value, typeOnly } = importEdgesIn(text);
  return [...value, ...typeOnly];
};

// --- 1. The reader, armed on fixtures whose paths live under `pkg/` (not a shipped root), so ---
// --- the gate's own test data cannot be mistaken for a per-file exemption in clause 5. --------
const H = new Set(["pkg/App.tsx", "pkg/lib/utils.ts", "pkg/a/X.tsx", "pkg/a/n.tsx", "pkg/a/dir/index.ts"]);
const has = (p) => H.has(p);
const r1 = classifySpecIn("@/pkg/lib/utils", "pkg/App.tsx", has);
const r2 = classifySpecIn("./n", "pkg/a/X.tsx", has);
const r3 = classifySpecIn("./dir", "pkg/a/X.tsx", has);
const r4 = classifySpecIn("react", "pkg/App.tsx", has);
const r5 = classifySpecIn("./globals.css", "pkg/App.tsx", has);
const r6 = classifySpecIn("./missing", "pkg/App.tsx", has);
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
const fSrc = {
  "pkg/a.ts": 'import { b } from "./b";',
  "pkg/b.ts": 'import { c } from "./c";',
  "pkg/c.ts": 'import { a } from "./a";',
  "pkg/d.ts": 'import { a } from "./a";',
};
const fReach = reachableModulesIn(["pkg/a.ts"], (p) => fSrc[p] ?? "", (p) => p in fSrc);
const hEntries = htmlEntriesIn('<script src="/pkg/entry.tsx" type="module"></script><script src="/pkg/dead.js"></script>');
const dEntries = denoEntriesIn(["pkg/index.ts", "pkg/plain.ts"], (p) => ({ "pkg/index.ts": "Deno.serve(handler);", "pkg/plain.ts": "export const x = 1;" })[p] ?? "", "pkg");
ok(`the reader resolves @/, relative, extensionless and index specifiers, ignores packages and assets, and reports a missing module (utils ${r1.target}, sibling ${r2.target}, index ${r3.target}, package ${r4.kind}, asset ${r5.kind}, missing ${r6.kind}); it reads every import shape and no comment (specs [${specs.join(",")}]); the graph walk follows a cycle and leaves an unreachable file out (${[...fReach].sort().join(",")} of 4); the entries come from the html's module script and from Deno.serve (${hEntries.join(",")} / ${dEntries.join(",")})`,
  r1.kind === "file" && r1.target === "pkg/lib/utils.ts" && r2.target === "pkg/a/n.tsx" && r3.target === "pkg/a/dir/index.ts" &&
  r4.kind === "package" && r5.kind === "asset" && r6.kind === "unresolved" &&
  specs.slice().sort().join() === ["./globals.css", "@/pkg/a/X", "@/pkg/b", "@/pkg/c", "@/pkg/lib/utils"].sort().join() &&
  fReach.size === 3 && fReach.has("pkg/a.ts") && fReach.has("pkg/b.ts") && fReach.has("pkg/c.ts") && !fReach.has("pkg/d.ts") &&
  hEntries.join() === "pkg/entry.tsx" && dEntries.join() === "pkg/index.ts");

// --- 1b. M777: a commented import is not an edge, whichever way it was commented. The fixture ---
// --- above only tried a line comment; a block comment can put `import` at the start of a line, ---
// --- which is the shape a dead-code sweep leaves when it wraps an import, and the shape the ---
// --- anchored matcher in the shared reader used to miss. --------
const struckSrc = {
  "pkg/live.ts": [
    'import { g } from "./ghost";',
    "/*",
    'import { s } from "./struck";',
    "*/",
    "// import { l } from \"./line-struck\";",
  ].join("\n"),
  "pkg/ghost.ts": "export const g = 1;",
  "pkg/struck.ts": "export const s = 1;",
  "pkg/line-struck.ts": "export const l = 1;",
};
const struckRead = (p) => struckSrc[p] ?? "";
const struckHas = (p) => p in struckSrc;
const struckReach = [...reachableModulesIn(["pkg/live.ts"], struckRead, struckHas)].sort();
const liveEdges = importEdgesIn(struckSrc["pkg/live.ts"]);
const rawLineMatched = /import\s+\{\s*s\s*\}\s+from\s+"\.[^"]*struck"/.test(struckSrc["pkg/live.ts"]);
ok(`the reader is blind to both comment shapes (${struckReach.join(",")} reached of ${Object.keys(struckSrc).length}; block ${liveEdges.value.has("./struck")}, line ${liveEdges.value.has("./line-struck")}; the same source matches a struck import when it is NOT stripped: ${rawLineMatched}; a comment marker survives as whitespace: ${stripCommentsIn("/* x */\nconst a = 1;").includes("const a")})`,
  struckReach.join() === "pkg/ghost.ts,pkg/live.ts" &&
  !liveEdges.value.has("./struck") && !liveEdges.value.has("./line-struck") && rawLineMatched &&
  stripCommentsIn("/* x */\nconst a = 1;").includes("const a"));

// --- 2. The walk is the real tree, the roots are derived, and both entries are inside it. -----
// M423/M777: the directories the app is made of are APP_DIRS, from the same file that decides
// which directories are neighbours — a hidden one and one carrying its own `.git`.
// M522: `tests/` carries the Playwright specs — test entry points, not app modules; coverage's
// POP_SKIP names the same directory.
const NON_APP = ["scripts", "dev", "dist", "node_modules", "test-results", "vendor", "tests"];
const topDirs = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const carriesTs = (d) => {
  try {
    const entries = readdirSync(join(root, d), { withFileTypes: true });
    if (entries.some((e) => e.isFile() && /\.tsx?$/.test(e.name))) return true;
    return entries.some((e) => e.isDirectory() && e.name !== "node_modules" && carriesTs(`${d}/${e.name}`));
  } catch { return false; }
};
const uncovered = topDirs.filter((d) => !APP_DIRS.includes(d) && !skipReason(d, join(root, d), NON_APP) && carriesTs(d));
const rel = (f) => f.slice(root.length + 1).split("\\").join("/");
const files = walkApp(root, { dirs: APP_DIRS }).map(rel).filter((f) => !f.endsWith(".d.ts"));
const fileSet = new Set(files);
const raw = Object.fromEntries(files.map((f) => [f, readFileSync(join(root, f), "utf8")]));
const readSource = (p) => raw[p] ?? "";
const spaEntries = htmlEntriesIn(readFileSync(join(root, "index.html"), "utf8"));
const denoDeclared = denoEntriesIn(files, readSource);
const entries = [...spaEntries, ...denoDeclared];
ok(`the walk covers every top-level TypeScript directory and reads the real app (${files.length} files, floor 90; ${uncovered.length} uncovered; entries ${entries.join(", ")}; both inside the walk ${entries.every((e) => fileSet.has(e))})`,
  files.length >= 90 && uncovered.length === 0 && entries.length >= 1 && entries.every((e) => fileSet.has(e)));

// --- 3. Every local specifier resolves. A silently unresolved edge would make the graph lie; ---
// --- assets are counted apart because a .css file is not a module this census walks. ---------
const edges = new Map(files.map((f) => [f, new Set()]));
const unresolved = [];
const assets = [];
const packageSpecs = new Set();
for (const f of files) {
  for (const spec of readSpecs(raw[f])) {
    const r = classifySpecIn(spec, f, (p) => fileSet.has(p));
    if (r.kind === "file") edges.get(f).add(r.target);
    else if (r.kind === "unresolved") unresolved.push(`${f}: ${spec}`);
    else if (r.kind === "asset") assets.push(`${f}: ${spec}`);
    else packageSpecs.add(spec);
  }
}
const edgeCount = [...edges.values()].reduce((s, x) => s + x.size, 0);
ok(`every local specifier resolves (${edgeCount} edges, floor 500; ${unresolved.length} unresolved; ${assets.length} asset import(s) [${assets.join(", ")}]; ${packageSpecs.size} package names)`,
  edgeCount >= 500 && unresolved.length === 0 && assets.length >= 1);

// --- 4. No shipped module is an orphan. A file named only by a proof script is measured apart: ---
// --- a proof is a consumer, so it is not an orphan, but an app-only reading would not see it. --
// M777: the closure is the shared walk over the EDGES this gate just resolved, asked through the
// same `reachableModulesIn` the other three censuses call — so the answer this clause charges is
// the answer they print, not a fifth opinion.
const reachable = reachableModulesIn(entries, readSource, (p) => fileSet.has(p));
const unreachable = files.filter((f) => !reachable.has(f));
const proofTexts = walkApp(root, { dirs: ["scripts"], exts: [".mjs", ".ts"] }).map((f) => readFileSync(f, "utf8"));
const mentionedByProof = (relPath) => proofTexts.some((t) => t.includes(`"/${relPath}"`) || t.includes(`'/${relPath}'`));
const proofOnly = unreachable.filter((relPath) => mentionedByProof(relPath));
const orphans = unreachable.filter((relPath) => !mentionedByProof(relPath));
ok(`no shipped module is an orphan (${files.length - unreachable.length} of ${files.length} reached from an entry; ${proofOnly.length} proof-only; ${orphans.length} orphan(s)${orphans.length ? `: ${orphans.join(", ")}` : ""})`,
  orphans.length === 0 && proofOnly.length === 0);

// --- 4b. M777: the two answers this gate used to hold are now ONE answer, and the entry the ---
// --- hardcoded root would have dropped is named. `functions/index.ts` has no importer — the ---
// --- runtime calls it — so a closure started only at the SPA entry reads it, and everything ---
// --- only it imports, as a quarantine. That is not a leaf, it is a deployed endpoint. --------
// M777: the entries are DERIVED, so this clause names no shipped path and still asks the question.
// `spaAlone` starts at what index.html loads; `reachable` starts there AND at every module that
// calls Deno.serve. The difference is the population a hardcoded root would have lost.
const denoReached = denoDeclared.filter((f) => reachable.has(f));
const spaAlone = reachableModulesIn(spaEntries, readSource, (p) => fileSet.has(p));
const onlyByDeno = [...reachable].filter((f) => !spaAlone.has(f)).sort();
ok(`the entries are derived, not remembered (${entries.length} entry(ies): ${entries.join(", ")}; ${denoReached.length} Deno.serve module(s) among them; ${onlyByDeno.length} module(s) the reader reaches ONLY through a non-SPA entry [${onlyByDeno.join(", ")}]; a closure started at the SPA alone would call ${reachable.size - spaAlone.size} of them a quarantine)`,
  entries.length >= 2 && denoReached.length >= 1 && onlyByDeno.length >= 1 &&
  onlyByDeno.every((f) => f.startsWith("functions/")));

// --- 5. No per-file exemption. The entries are derived, so the gate names no shipped path in ---
// --- code; a planted skip list is charged, proving the scan reads the right thing. ------------
const self = stripCommentsIn(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const quoted = (text) => [...text.matchAll(/["']((?:domain|data|lib|features|components|ui|src|store|i18n|functions)\/[^"']+)["']/g)].map((m) => m[1]);
const selfPaths = quoted(self);
const planted = 'const SKIP_LIST = ["' + ["domain", "legacy.ts"].join("/") + '"];';
const plantedPaths = quoted(planted);
ok(`the gate carries no per-file exemption (${selfPaths.length} shipped path(s) quoted in code [${selfPaths.join(",")}]; the entries come from index.html and Deno.serve; a planted skip list names ${plantedPaths.length})`,
  selfPaths.length === 0 && plantedPaths.length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
