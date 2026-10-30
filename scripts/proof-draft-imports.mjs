// M540. The drafts and the app's EXPORTS.   ·   M717. The charge widened to every unbound name.
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
// from two modules is ambiguous.
//
// M540 closed that class and left the rest of the checker's `2304` list UNCHARGED, calling the
// names the app never exported "a different defect" and printing them. Four were: three reads left
// under a memo's name from before it was renamed, and one setter's own parameter read outside the
// setter that bound it — plus a call to a fee door the app has never had. They were the same defect
// as the nine: `2304` says "this name is bound NOWHERE", and whether the app happens to own it is
// only how the repair is found, not what is wrong with the draft. A boundary that lets four sites
// out because the app is not their home is a boundary drawn around the fix, not around the defect.
//
// So the charge is the whole class now, and the index stays for what it is genuinely for: naming
// which repair a site needs.
//
// What it charges:
//   1. the index is derived from the app's own modules, and it is not empty: a floor on the
//      modules read and on the names collected, so an index that collapsed to nothing cannot
//      pass as "no violations";
//   2. the class is CLOSED: no draft reads a name that is bound nowhere — neither imported nor
//      declared in its own scope — and each site is reported as one of the two repairs (the app
//      owns the name and the draft forgot to import it / nobody owns it and the draft invented it);
//   3. the reader is armed: a MIRROR of the quarantine carrying one draft that uses an
//      app-exported name without importing it, one that uses a name NOBODY has, and one sound
//      draft beside them must name the first two and leave the third alone. Both spellings are
//      planted because the boundary moved: a reader that still keyed on the index would let the
//      invented-symbol plant walk out uncharged.
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

// Every name the checker says is bound nowhere, split by the repair each one needs. The split is
// reporting, not admission: both halves are charged.
const unboundSites = [];
for (const [rel, sigs] of [...perFile].sort()) {
  for (const sig of sigs) {
    const m = /^2304:(.+)$/.exec(sig);
    if (!m) continue;
    const name = m[1];
    unboundSites.push({ rel, name, forgotImport: index.has(name), homes: index.get(name) ?? [] });
  }
}
const forgot = unboundSites.filter((s) => s.forgotImport);
const invented = unboundSites.filter((s) => !s.forgotImport);

ok(`no draft reads a name that is bound nowhere (${unboundSites.length} site(s) over ${perFile.size} draft file(s) read: ${forgot.length} that forgot to import the app's own, ${invented.length} that invented a symbol)`,
  unboundSites.length === 0,
  unboundSites.map((v) => `${v.rel} ${v.name}${v.forgotImport ? ` [${v.homes.join(",")}]` : " [invented]"}`).join("; "));

// The index still earns its keep here: it is what turns a site into a repair. A name the app owns
// has a home to import from; a name nobody owns has no repair but deletion, and the gate says so.
if (unboundSites.length) {
  console.log(`       ${invented.length} of them name no module in the app at all — the draft invented the symbol, and no import can fix it.`);
}

// --- the reader, armed ------------------------------------------------------------------------------
// A closed class is only a measurement if the reader can still see what it forbids. So the same
// reader is run over a MIRROR of the quarantine carrying one draft that uses an app-exported name
// without importing it, one that uses a name NOBODY has, and one sound draft beside them. It must
// name the first two and leave the third alone.
//
// Both spellings are planted on purpose. When the charge keyed on the index, the invented plant
// walked out uncharged — that was the blind spot M540 shipped with — so it is the plant that proves
// the boundary moved rather than the clause text claiming it did.
//
// The mirror carries no import of its own, so the app's own declarations are pulled in BY NAME —
// the same declarations the drafts reach through their own import — or the planted name would be
// an unknown name rather than the app's, and the arm would prove nothing about the class.
const mirror = mkdtempSync(join(tmpdir(), "draft-imports-mirror-"));
let sawPlant = 0, sawInvented = 0, sawSound = 0, inventedClassified = false;
try {
  const md = join(mirror, ".drafts");
  mkdirSync(join(md, "features", "plant"), { recursive: true });
  writeFileSync(join(md, "features", "plant", "MissingImport.ts"),
    "export const Plant = () => EmptyState({ title: \"x\" });\n");
  writeFileSync(join(md, "features", "plant", "InventedSymbol.ts"),
    "export const Invented = () => ledgerOfUnwrittenNames({ title: \"x\" });\n");
  writeFileSync(join(md, "features", "plant", "Sound.ts"),
    "import { EmptyState } from \"@/ui/primitives\";\nexport const Sound = () => EmptyState({ title: \"x\" });\n");
  // `baseUrl` is the app's root, so the mirror's own `@/…` specifier reaches the app's modules
  // from a directory that is not the app's.
  const mirrorOptions = { ...options, baseUrl: root };
  const seen = census([
    join(md, "features", "plant", "MissingImport.ts"),
    join(md, "features", "plant", "InventedSymbol.ts"),
    join(md, "features", "plant", "Sound.ts"),
  ], mirrorOptions, md);
  const namesIn = (rel) => (seen.get(rel) ?? []).filter((s) => s.startsWith("2304:")).map((s) => s.slice(5));
  sawPlant = namesIn("features/plant/MissingImport.ts").filter((n) => n === "EmptyState").length;
  sawInvented = namesIn("features/plant/InventedSymbol.ts").filter((n) => n === "ledgerOfUnwrittenNames").length;
  sawSound = namesIn("features/plant/Sound.ts").length;
  // And the split the clause reports must be the right one for each plant.
  inventedClassified = index.has("EmptyState") && !index.has("ledgerOfUnwrittenNames");
} finally {
  rmSync(mirror, { recursive: true, force: true });
}
ok(`the reader still finds BOTH forbidden spellings with two planted drafts in a mirror of the quarantine, and leaves the sound draft alone (forgot-the-import ${sawPlant}, invented-symbol ${sawInvented}, sound draft ${sawSound} unbound, classes split right: ${inventedClassified})`,
  sawPlant === 1 && sawInvented === 1 && sawSound === 0 && inventedClassified,
  `forgot ${sawPlant}, invented ${sawInvented}, sound ${sawSound}, classified ${inventedClassified}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
