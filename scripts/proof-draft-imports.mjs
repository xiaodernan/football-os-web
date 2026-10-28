// M540. The drafts and the app's EXPORTS.
//
// M539 measured the quarantine's types and named a class a rule can repair mechanically: a draft
// reaches for a name the APP EXPORTS and never imports it. The name is not a global and not a
// local — it is the app's, and the draft forgot to say so.
//
// This gate derives the app's export index from the app's own modules and asks the quarantine one
// question: does any draft use a name the app exports without importing it? The answer is a
// number, and the number may not come back.
//
// The mapping is DERIVED, never written down. The app's own modules are parsed, their exported
// names collected, and a name's home module decided by that reading — so a name the app exports
// from two modules is ambiguous and is left alone, and a name the app never exported is a
// DIFFERENT defect (the draft invents a symbol) and is left alone too. A list of nine mappings
// written by hand would fix the pile and teach the next draft nothing.
//
// What it charges:
//   1. the index is derived from the app's own modules, and it is not empty: a floor on the
//      modules read and on the names collected, so an index that collapsed to nothing cannot
//      pass as "no violations";
//   2. the class is CLOSED: no draft reaches for a name the app exports without importing it;
//   3. the reader is armed: a MIRROR of the quarantine carrying a draft that uses an app-exported
//      name without importing it, beside one that imports it, must name the first and leave the
//      second alone.
//
// Run: node scripts/proof-draft-imports.mjs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { walkApp, APP_DIRS } from "./lib/appTree.mjs";
import { appOptions, signature, census } from "./lib/draftCensus.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const draftsDir = join(root, ".drafts");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// --- the app's export index, derived ----------------------------------------------------------------
// The names a module exports, read from the module's own declarations. A module that exports a
// name through `export const`, `export function`, `export class` or an `export { … }` clause
// exports it; a name that is only mentioned inside it does not.
const exportedNames = (sf) => {
  const names = [];
  for (const st of sf.statements) {
    if (!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.push(decl.name.text);
        else if (ts.isObjectBindingPattern(decl.name)) {
          for (const el of decl.name.elements) if (ts.isIdentifier(el.name)) names.push(el.name.text);
        }
      }
    } else if (st.name && ts.isIdentifier(st.name)) {
      names.push(st.name.text);
    } else if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) names.push(el.name.text);
    }
  }
  return names;
};

const index = new Map();
let modulesRead = 0;
for (const d of APP_DIRS) {
  for (const f of walkApp(join(root, d), { exts: [".ts", ".tsx"] })) {
    modulesRead++;
    const sf = ts.createSourceFile(f, readFileSync(f, "utf8"), ts.ScriptTarget.ES2022, true);
    const rel = relative(root, f).split("\\").join("/");
    for (const name of exportedNames(sf)) {
      if (!index.has(name)) index.set(name, []);
      index.get(name).push(rel);
    }
  }
}
const ambiguous = [...index].filter(([, homes]) => homes.length > 1);
const MODULE_FLOOR = 100;
const NAME_FLOOR = 600;
ok(`the export index is derived from the app's own modules and is not empty (${modulesRead} module(s) read, ${index.size} name(s) collected, ${ambiguous.length} ambiguous [${ambiguous.map(([n]) => n).join(", ")}])`,
  modulesRead >= MODULE_FLOOR && index.size >= NAME_FLOOR,
  `modules ${modulesRead} < ${MODULE_FLOOR}; names ${index.size} < ${NAME_FLOOR}`);

// --- the quarantine's reading -----------------------------------------------------------------------
const options = appOptions(root);
const draftFiles = walkApp(draftsDir, { dirs: null, notApp: [], exts: [".ts", ".tsx"] });
const perFile = census(draftFiles, options, draftsDir);

// The names the checker says are unbound, and the ones among them the app exports.
const violations = [];
const invented = [];
for (const [rel, sigs] of [...perFile].sort()) {
  for (const sig of sigs) {
    const m = /^2304:(.+)$/.exec(sig);
    if (!m) continue;
    const name = m[1];
    if (index.has(name)) violations.push({ rel, name, homes: index.get(name) });
    else invented.push({ rel, name });
  }
}

ok(`no draft reaches for a name the app exports without importing it (${violations.length} site(s) over ${perFile.size} draft file(s) read)`,
  violations.length === 0,
  violations.map((v) => `${v.rel} ${v.name}`).join("; "));

// The names the app never exported are a different defect — the draft invents a symbol — and
// they are named here so the boundary between the two classes is visible rather than assumed.
if (invented.length) {
  console.log(`       ${invented.length} unbound name(s) the app never exported (a different defect class): ${invented.map((v) => `${v.rel} ${v.name}`).join(", ")}`);
}

// --- the reader, armed ------------------------------------------------------------------------------
// A closed class is only a measurement if the reader can still see what it forbids. So the same
// reader is run over a MIRROR of the quarantine carrying a draft that uses an app-exported name
// without importing it, beside one that imports it. It must name the first and leave the second
// alone.
//
// The mirror carries no import of its own, so the app's own declarations are pulled in BY NAME —
// the same declarations the drafts reach through their own import — or the planted name would be
// an unknown name rather than the app's, and the arm would prove nothing about the class.
const mirror = mkdtempSync(join(tmpdir(), "draft-imports-mirror-"));
let sawPlant = 0, sawSound = 0;
try {
  const md = join(mirror, ".drafts");
  mkdirSync(join(md, "features", "plant"), { recursive: true });
  writeFileSync(join(md, "features", "plant", "MissingImport.ts"),
    "export const Plant = () => EmptyState({ title: \"x\" });\n");
  writeFileSync(join(md, "features", "plant", "Sound.ts"),
    "import { EmptyState } from \"@/ui/primitives\";\nexport const Sound = () => EmptyState({ title: \"x\" });\n");
  // `baseUrl` is the app's root, so the mirror's own `@/…` specifier reaches the app's modules
  // from a directory that is not the app's.
  const mirrorOptions = { ...options, baseUrl: root };
  const seen = census([
    join(md, "features", "plant", "MissingImport.ts"),
    join(md, "features", "plant", "Sound.ts"),
  ], mirrorOptions, md);
  sawPlant = (seen.get("features/plant/MissingImport.ts") ?? []).filter((s) => s === "2304:EmptyState").length;
  sawSound = (seen.get("features/plant/Sound.ts") ?? []).filter((s) => s === "2304:EmptyState").length;
} finally {
  rmSync(mirror, { recursive: true, force: true });
}
ok(`the reader still finds the forbidden class with a planted draft in a mirror of the quarantine, and leaves the importing draft alone (planted ${sawPlant}, importing ${sawSound})`,
  sawPlant === 1 && sawSound === 0, `planted ${sawPlant}, importing ${sawSound}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
