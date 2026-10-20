// Proof for the REACH of every door the app has.
//
// M402 taught the shape: the money door moved, and two censuses had to learn that a file
// which CALLS a door either IMPORTS it or IS the door's home. That relation was worth
// charging in the two scripts where a move happened to expose it — but the shape is general:
// every door in the app has it, and only two scripts were checking it. This census charges it
// for ALL of them at once, and it charges the three ways the reach can be wrong:
//
//   1. A CALLER that does not import the door from the door's home. In TypeScript that is
//      usually a compile error, but it is a RUNTIME error in the one shape a scan can see: a
//      module that calls a name it never brought in — which works only if the name is a global.
//   2. An IMPORT of a name the home no longer exports. This is the M396/M401 failure exactly:
//      a door that moved behind another door left a stale import behind. The compiler catches
//      it, so the census's job is to say WHERE it happened, and to keep the set of doors and
//      the set of importers reconciled.
//   3. A SECOND NAME for one door: a file outside the homes that exports a name a door already
//      exports. Two doors with one name is a second convention waiting to drift.
//
// The door list is DERIVED from the homes, and so is the caller set. Nothing here is typed
// from a plan, so a door added tomorrow is charged tomorrow.
//
// The import reader has to be right, or the whole census is noise. A naive
// `import[^;]*from` spans several statements in the files that do not use semicolons, and the
// tree has both styles. So an import statement is read as: from the `import` keyword to its
// OWN `from "..."`, and a statement's `from` is never stolen by a later one. The resolver
// turns a specifier into a path — "@/lib/utils" and "./attributes" and "../lib/utils" all
// have to land on the same file, or the home check would be a coin toss.
//
// Run: node scripts/proof-doors.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// The two homes. Every door the app has lives in one of them; a door in a third file would
// not be charged here, and the clause below says so.
const HOMES = ["lib/utils.ts", "domain/attributes.ts"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const DIRS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"];
const carriers = DIRS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
// Code state: a comment line is not code, and the tree's comments quote door names.
const code = Object.fromEntries(carriers.map((f) => [f, raw[f].split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n")]));
const n = (text, re) => (text.match(re) || []).length;

// --- The import reader. One statement at a time, and a statement's `from` is its own. ---------
const importStatements = (text) => {
  const out = [];
  const re = /import\b/g;
  let m;
  while ((m = re.exec(text))) {
    const rest = text.slice(m.index);
    const from = /from\s*["']([^"']+)["']/.exec(rest);
    if (!from) continue;
    // If ANOTHER `import` keyword sits between this one and the `from`, that `from` belongs
    // to that later statement and this one has none of its own. The slice starts AFTER this
    // statement's own keyword, or the check would always trip on it.
    if (/\bimport\b/.test(rest.slice(m[0].length, from.index))) continue;
    const stmt = rest.slice(0, from.index + from[0].length);
    const braces = /\{([^}]*)\}/.exec(stmt);
    const names = braces
      ? braces[1].split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.split(/\s+as\s+/)[0].trim())
      : [];
    const namespace = /import\s+\*\s+as\s+(\w+)/.exec(stmt);
    out.push({ spec: from[1], names, namespace: namespace ? namespace[1] : null, stmt });
    re.lastIndex = m.index + from.index + from[0].length;
  }
  return out;
};

// --- The resolver: a specifier is a PATH, and the path is what the home check compares. ------
// The result is relative to the project root, so "@/lib/utils" and "./attributes" and
// "../lib/utils" all land on the same string and the home check is a comparison, not a guess.
const ROOT = process.cwd().replace(/\\/g, "/");
const resolveSpec = (spec, fromFile) => {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith(".")) base = pathResolve(dirname(fromFile), spec).replace(/\\/g, "/");
  else return null; // a package, not one of the app's own modules
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    const norm = pathResolve(cand).replace(/\\/g, "/");
    if (norm.startsWith(ROOT)) {
      const rel = norm.slice(ROOT.length + 1);
      if (existsSync(rel)) return rel;
    }
  }
  return null;
};

// --- 1. Plants: arm the reader and the resolver, so a "zero"/"every" verdict is measured. -----
const pImport = importStatements('import { cn, fmt1 } from "@/lib/utils";').length;
const pImportMulti = importStatements('import {\n  a,\n  b,\n} from "@/lib/utils";').length;
const pImportNoSemi = importStatements('import { cn } from "@/lib/utils"\nimport { Dialog } from "@/components/ui/dialog"').length;
const pNames = importStatements('import { cn, fmt1 } from "@/lib/utils";')[0]?.names.join(",");
const pAliased = importStatements('import { cn as klass } from "@/lib/utils";')[0]?.names.join(",");
const pResolve = resolveSpec("@/lib/utils", "features/x.tsx");
const pResolveRel = resolveSpec("./attributes", "domain/x.ts");
const pResolveUp = resolveSpec("../lib/utils", "domain/x.ts");
const pResolveBad = resolveSpec("@/lib/nope", "features/x.tsx");
ok(`the import reader and the resolver are armed (one statement ${pImport}, a multi-line braced ${pImportMulti}, two statements without a semicolon ${pImportNoSemi}, names "${pNames}", an aliased name "${pAliased}"; resolved "@/lib/utils" -> ${pResolve}, "./attributes" -> ${pResolveRel}, "../lib/utils" -> ${pResolveUp}, an unknown specifier -> ${pResolveBad === null ? "null" : pResolveBad})`,
  pImport === 1 && pImportMulti === 1 && pImportNoSemi === 2 && pNames === "cn,fmt1" && pAliased === "cn" &&
  pResolve === "lib/utils.ts" && pResolveRel === "domain/attributes.ts" && pResolveUp === "lib/utils.ts" && pResolveBad === null);

// --- 2. Population floor + the homes are in the tree. ----------------------------------------
const homesPresent = HOMES.every((h) => Object.prototype.hasOwnProperty.call(raw, h));
ok(`the census walks the real source tree and both door homes are inside it (${carriers.length} .ts/.tsx, floor 90; homes ${HOMES.join(", ")})`,
  carriers.length >= 90 && homesPresent);

// --- 3. The door list is DERIVED from the homes, and every door is declared exactly once. ---
// --- A door declared in a third file would not be charged by this census, so the clause says
// --- so: the count of doors outside the homes must be zero. -----------------------------------
const doors = [];
for (const h of HOMES) {
  for (const m of code[h].matchAll(/^export (?:const|function) ([A-Za-z_][\w]*)/gm)) doors.push([m[1], h]);
}
const doorNames = new Set(doors.map(([d]) => d));
// A second name for one door: a file outside the homes that EXPORTS a name a door owns.
const duplicateExports = [];
for (const f of carriers) {
  if (HOMES.includes(f)) continue;
  for (const m of code[f].matchAll(/^export (?:const|function|class) ([A-Za-z_][\w]*)/gm)) {
    if (doorNames.has(m[1])) duplicateExports.push(`${f}:${m[1]}`);
  }
}
ok(`the door list is derived from the two homes and no door has a second name (${doors.length} doors over ${HOMES.length} homes [${HOMES.map((h) => `${h}=${doors.filter(([, d]) => d === h).length}`).join(", ")}]; duplicate exports outside the homes: ${duplicateExports.length} [${duplicateExports.join(",")}])`,
  doors.length >= 45 && duplicateExports.length === 0);

// --- 4. REACH: every file that CALLS a door imports that door from the door's home. This is
// --- the relation M402 had to learn in two scripts, charged here for all of them. -------------
// --- The import is found by NAME and then resolved to a PATH, so a module that brought a
// --- same-named thing from somewhere else is caught, and a door reached through a namespace
// --- import is caught too (the namespace form is a caller the call-paren scan cannot see). ---
const reachMiss = [];
let callerFiles = 0, callSites = 0;
for (const [name, home] of doors) {
  const CALL = new RegExp("\\b" + name + "\\s*\\(", "g");
  for (const f of carriers) {
    if (f === home) continue;
    const calls = n(code[f], CALL);
    if (!calls) continue;
    callerFiles++;
    callSites += calls;
    // The names this file brought, and where from.
    const imps = importStatements(code[f]);
    const brought = imps.filter((im) => im.names.includes(name) || im.namespace);
    const fromHome = brought.some((im) => resolveSpec(im.spec, f) === home);
    if (!fromHome) {
      const via = brought.map((im) => `${im.spec}->${resolveSpec(im.spec, f) ?? "?"}`).join(",") || "nothing";
      reachMiss.push(`${name} in ${f} (brought: ${via})`);
    }
  }
}
ok(`every door a file CALLS is imported by that file from the door's home (${doors.length} doors, ${callerFiles} caller file(s), ${callSites} call site(s); mis-reached ${reachMiss.length} [${reachMiss.join("; ")}])`,
  reachMiss.length === 0 && callerFiles >= 100 && callSites >= 300);

// --- 5. IMPORTS OF NAMES THE HOME NO LONGER EXPORTS: the M396/M401 shape, charged for every
// --- door at once. A door that moved behind another door leaves a stale import behind; the
// --- compiler catches it, and this clause says which door and which file. --------------------
// --- The home's export list includes its TYPES and interfaces, not only its values: a
// --- `import type { CategoryAverage }` is a real import of a real name, and a scan that
// --- counted only `export const` would call it stale and charge a defect that is not there.
const staleImports = [];
let importEdges = 0;
for (const f of carriers) {
  for (const im of importStatements(code[f])) {
    const target = resolveSpec(im.spec, f);
    if (!target) continue;
    if (!HOMES.includes(target)) continue;
    const exported = new Set([...code[target].matchAll(/^export (?:const|function|class|type|interface|enum) ([A-Za-z_][\w]*)/gm)].map((m) => m[1]));
    for (const name of im.names) {
      importEdges++;
      if (!exported.has(name)) staleImports.push(`${f} imports ${name} from ${target}, which does not export it`);
    }
  }
}
ok(`no file imports a name a door home no longer exports — the M396/M401 shape, charged for every door (${importEdges} import edge(s) into the homes, ${staleImports.length} stale [${staleImports.join("; ")}])`,
  staleImports.length === 0 && importEdges >= 250);

// --- 6. The census is not blind: a planted caller that imports the door from the WRONG module
// --- must be caught, and a planted caller that imports it from the RIGHT module must not. -----
const wrongHome = 'import { cn } from "@/components/ui/dialog";\nconst x = cn("a");';
const rightHome = 'import { cn } from "@/lib/utils";\nconst x = cn("a");';
const wrongImps = importStatements(wrongHome);
const rightImps = importStatements(rightHome);
const wrongResolved = wrongImps[0] ? resolveSpec(wrongImps[0].spec, "features/x.tsx") : null;
const rightResolved = rightImps[0] ? resolveSpec(rightImps[0].spec, "features/x.tsx") : null;
ok(`the reach check is armed both ways: a planted caller that brought the door from the wrong module resolves to ${wrongResolved} (not the home), and the same call brought from the home resolves to ${rightResolved} (the home)`,
  wrongResolved !== "lib/utils.ts" && rightResolved === "lib/utils.ts" && wrongImps.length === 1 && rightImps.length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
