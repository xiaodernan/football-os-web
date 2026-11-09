// M775. Why an implicit `any` cannot be annotated.
//
// The ratchet counts `7006` — "parameter implicitly has an 'any' type" — as a backlog of 23 sites in
// 7 files, and a backlog of 23 reads like 23 annotations waiting to be written. They are not. A
// parameter can only be annotated with a type the file can NAME, and 22 of the 23 sit downstream of
// a name the quarantine cannot resolve: a screen that maps `footballProvider.campuses()` has no
// campus type to write, because the app has never declared that door; a screen whose array is the
// return of `useState<ClubBudget | null>` has no budget type to write, because `@/domain/finance` is
// one of the five domains M718 recorded as unwritten. Deleting those counts would mean inventing a
// shape the data does not have — a lie with an annotation on it.
//
// One site was different, and this milestone repairs it: `.drafts/features/match/SeasonSchedule.tsx`
// handed `matchStatus` a parameter with no annotation while the file's own `matches` tuple was
// perfectly typable. The helper turned out to have no reader in its own file — the screen renders
// the status inline beside it — so the repair is the deletion of dead code, not an annotation for it.
//
// So this gate stops asking HOW MANY and asks WHAT EACH SITE DEPENDS ON. For every implicit-any
// parameter it finds the expression that was being iterated or called, walks that expression back
// through the draft's own declarations, and reports the reference that could not be resolved. Two
// answers excuse a site — a door the app's provider type does not declare, and a name imported from
// a module the app does not provide. A third answer excuses nothing: a chain that runs into a name
// that exists NOWHERE (the class M717 bounded at zero) is not a missing type, it is a made-up one,
// and the site stays charged.
//
// What it charges:
//   1. the walk and the checker's `7006` are the same population, file by file, and the app's own
//      tree — read the same way — has none, so "no unexcused site" is a fact about the quarantine
//      rather than a reader that finds nothing anywhere;
//   2. NO site is left unexcused, with planted drafts of all three unexcused shapes (an unannotated
//      parameter of an exported arrow, of a function declaration, and of a chain that dead-ends in
//      an unbound name) measured beside it;
//   3. every door excuse is a property a REAL declared type lacks — and that same type does declare
//      the doors the app ships, so an empty surface cannot pass as an absence;
//   4. every module excuse is a specifier the app's own resolver does not answer, reached under the
//      name the draft really imports from it;
//   5. the excuses are a NAMED ledger: the five causes, their sites and their files, so a sixth
//      producer of `any` is a decision somebody recorded rather than a site that slipped in.
//
// Run: node scripts/proof-draft-any.mjs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { walkApp, APP_DIRS } from "./lib/appTree.mjs";
import { appOptions, census } from "./lib/draftCensus.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const draftsDir = join(root, ".drafts");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

const options = appOptions(root);
const rel = (p, base) => relative(base, p).split("\\").join("/");
const fwd = (p) => p.replace(/\\/g, "/");

/** The leftmost identifier of `a.b(x).y` — `a`. */
const leftmost = (node) => {
  let cur = node;
  while (cur) {
    if (ts.isIdentifier(cur)) return cur;
    if (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur)
      || ts.isCallExpression(cur) || ts.isParenthesizedExpression(cur) || ts.isNonNullExpression(cur)) { cur = cur.expression; continue; }
    return null;
  }
  return null;
};

/** The call this arrow is an ARGUMENT of — `setBudget(prev => …)`, `xs.map(c => …)`. */
const callAround = (node) => (ts.isCallExpression(node.parent) ? node.parent : null);

/** The declarations a symbol was written by, following a destructured binding back to its variable. */
const declarationsOf = (sym) => (sym.declarations ?? []).map((d) => (ts.isBindingElement(d) ? d.parent.parent : d));

/**
 * Walk an expression back to the references that could not be resolved.
 *
 * `door` — a property the container type does not declare, where the container IS a declared type
 * (so `xs.campuses` on an `any` is not a door: there is no surface there to lack a door);
 * `module` — a name whose import the checker could not bind to a declaration;
 * `unbound` — a name with no symbol at all: M717's class, recorded here but NOT an excuse.
 */
const walkChain = (checker, startNode, sf, isMember) => {
  const causes = [];
  const seen = new Set();
  const scan = (node, depth) => {
    if (!node || depth > 24) return;
    if (ts.isPropertyAccessExpression(node)) {
      if (!checker.getSymbolAtLocation(node.name)) {
        const container = checker.getTypeAtLocation(node.expression).getNonNullableType();
        const opaque = !!(container.getFlags() & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.Never));
        if (!opaque) {
          const surface = checker.typeToString(container);
          causes.push({
            kind: "door", name: node.name.text, surface, declared: container.getProperties().map((p) => p.getName()),
            key: `${surface}.${node.name.text}`,
          });
        }
      }
      scan(node.expression, depth + 1);
      return;
    }
    if (ts.isIdentifier(node)) {
      const sym = checker.getSymbolAtLocation(node);
      if (!sym) { causes.push({ kind: "unbound", name: node.getText(sf), key: `unbound:${node.getText(sf)}` }); return; }
      const alias = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
      if (!alias || !(alias.declarations ?? []).length) {
        let up = sym.declarations?.[0];
        while (up && !ts.isImportDeclaration(up)) up = up.parent;
        const spec = up ? up.moduleSpecifier.text : "(not an import)";
        causes.push({ kind: "module", name: node.getText(sf), spec, key: `module:${spec}#${node.getText(sf)}` });
        return;
      }
      for (const d of declarationsOf(sym)) {
        const at = d.getSourceFile();
        if (!at || !isMember(fwd(at.fileName)) || seen.has(sym)) continue;
        seen.add(sym);
        scan(d, depth + 1);
      }
      return;
    }
    node.forEachChild((child) => scan(child, depth + 1));
  };
  scan(startNode, 0);
  return [...new Map(causes.map((c) => [c.key, c])).values()];
};

/**
 * Every implicit-any parameter in a population, with the reference its own file could not resolve.
 *
 * A site is EXCUSED when the walk found a door or a module for it — the file holds no name that
 * would type the parameter — and charged otherwise. Two shapes have no upstream at all: a parameter
 * of an arrow that is not an argument, and a parameter of a function declaration. Both are the
 * author's own hole, and both are planted below so the charge is measured.
 */
const traceSites = (program, files, base) => {
  const checker = program.getTypeChecker();
  const sites = [];
  for (const file of files) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const where = rel(sf.fileName, base);
    for (const d of program.getSemanticDiagnostics(sf)) {
      if (d.code !== 7006) continue;
      const line = sf.getLineAndCharacterOfPosition(d.start ?? 0).line + 1;
      const token = ts.getTokenAtPosition(sf, d.start ?? 0);
      const param = ts.isParameter(token) ? token : token.parent;
      if (!ts.isParameter(param)) { sites.push({ where, file: sf.fileName, line, param: "(no parameter under the diagnostic)", causes: [], excused: false }); continue; }
      const name = param.name.getText(sf);
      const call = ts.isArrowFunction(param.parent) ? callAround(param.parent) : null;
      const origin = call ? leftmost(call.expression) : null;
      if (!origin) { sites.push({ where, file: sf.fileName, line, param: name, causes: [], excused: false }); continue; }
      const causes = walkChain(checker, origin, sf, (p) => p.startsWith(`${fwd(base)}/`));
      sites.push({
        where, file: sf.fileName, line, param: name, receiver: origin.getText(sf), causes,
        excused: causes.some((c) => c.kind === "door" || c.kind === "module"),
      });
    }
  }
  return sites.sort((a, b) => a.where.localeCompare(b.where) || a.line - b.line);
};

// --- the quarantine, walked ---------------------------------------------------------------------
const DRAFT_FILES = walkApp(draftsDir, { dirs: null, notApp: [], exts: [".ts", ".tsx"] });
const program = ts.createProgram(DRAFT_FILES, options);
const sites = traceSites(program, DRAFT_FILES, draftsDir);

// Clause 1a. The walk is driven by the checker's diagnostics, but it has to LAND on a parameter
// node: `getTokenAtPosition` plus the parent walk is a second reading of the same site, and if it
// mis-lands the two counts part company file by file. A floor under the population keeps an empty
// walk from passing as "nothing unexcused".
const perFile = census(DRAFT_FILES, options, draftsDir);
const checkerCount = new Map();
for (const [r, sigs] of perFile) checkerCount.set(r, sigs.filter((s) => s === "7006").length);
const walkCount = new Map();
for (const s of sites) walkCount.set(s.where, (walkCount.get(s.where) ?? 0) + 1);
const disagree = [...checkerCount].filter(([r, n]) => (walkCount.get(r) ?? 0) !== n).map(([r, n]) => `${r} checker ${n} vs walk ${walkCount.get(r) ?? 0}`);
const totalChecker = [...checkerCount.values()].reduce((a, n) => a + n, 0);
ok(`the walk lands on a parameter for every \`7006\` the census counts and on no more (${totalChecker} counted by the checker, ${sites.length} landed by the walk, over ${[...checkerCount.values()].filter((n) => n > 0).length} file(s); sites.length >= 10${disagree.length ? "; disagreement: " + disagree.join("; ") : ""})`,
  disagree.length === 0 && totalChecker === sites.length && sites.length >= 10, disagree.join("; "));
// Clause 1b. The same walk over the app's own modules: the app compiles under these options, so it
// has no implicit-any parameter — and the reader that reports that has just reported 22 next door.
const appFiles = APP_DIRS.flatMap((d) => walkApp(join(root, d), { exts: [".ts", ".tsx"] }));
const appProgram = ts.createProgram(appFiles, options);
const appAny = appFiles
  .flatMap((f) => { const sf = appProgram.getSourceFile(f); return sf ? appProgram.getSemanticDiagnostics(sf).filter((d) => d.code === 7006).map(() => rel(sf.fileName, root)) : []; });
ok(`the reader is not simply blind: the app's own tree, read with the app's own options, carries 0 implicit-any parameter(s) across ${appFiles.length} module(s) (appFiles.length >= 100) while the quarantine next door carries ${sites.length}`,
  appAny.length === 0 && appFiles.length >= 100, appAny.slice(0, 6).join(", "));

// --- the mirror, so each zero is a measurement and not an empty walk -------------------------------
const mirror = mkdtempSync(join(tmpdir(), "draft-any-"));
let plant = null;
try {
  const md = join(mirror, ".drafts");
  mkdirSync(join(md, "features", "plant"), { recursive: true });
  const files = {
    BareArrow: join(md, "features", "plant", "BareArrow.ts"),
    BareFunction: join(md, "features", "plant", "BareFunction.ts"),
    UnboundChain: join(md, "features", "plant", "UnboundChain.ts"),
    MissingDoor: join(md, "features", "plant", "MissingDoor.ts"),
    UnwrittenModule: join(md, "features", "plant", "UnwrittenModule.ts"),
    Sound: join(md, "features", "plant", "Sound.ts"),
  };
  writeFileSync(files.BareArrow, "export const f = (xs) => xs.length;\n");
  writeFileSync(files.BareFunction, "export function helper(v) { return v; }\n");
  writeFileSync(files.UnboundChain, "const xs = nobodyProvidesThis();\nexport const f = () => xs.map((x) => x);\n");
  writeFileSync(files.MissingDoor, "interface P { clubs(): number[] }\ndeclare const p: P;\nconst xs = p.campuses();\nexport const f = () => xs.map((c) => c.id);\n");
  writeFileSync(files.UnwrittenModule, "import { makeThings } from \"@/nobody/holds/this\";\nconst xs = makeThings();\nexport const f = () => xs.map((t) => t.name);\n");
  writeFileSync(files.Sound, "const ys: string[] = [];\nexport const f = (n: number) => n;\nexport const g = () => ys.map((y) => y.length);\n");
  const mirrorProgram = ts.createProgram(Object.values(files), options);
  const planted = traceSites(mirrorProgram, Object.values(files), md);
  const at = (name) => planted.find((s) => s.where === `features/plant/${name}.ts`);
  plant = {
    bareArrow: at("BareArrow")?.excused === false,
    bareFunction: at("BareFunction")?.excused === false,
    unbound: at("UnboundChain")?.excused === false && at("UnboundChain").causes.some((c) => c.kind === "unbound"),
    door: at("MissingDoor")?.excused === true && at("MissingDoor").causes.some((c) => c.kind === "door" && c.name === "campuses" && c.surface === "P" && c.declared.includes("clubs")),
    module: at("UnwrittenModule")?.excused === true && at("UnwrittenModule").causes.some((c) => c.kind === "module" && c.name === "makeThings" && c.spec === "@/nobody/holds/this"),
    soundSites: planted.filter((s) => s.where === "features/plant/Sound.ts").length,
  };
} finally {
  rmSync(mirror, { recursive: true, force: true });
}

// --- the charges --------------------------------------------------------------------------------
const unexcused = sites.filter((s) => !s.excused);
ok(`no site is left without a name to annotate it with (${unexcused.length} unexcused: ${unexcused.map((s) => `${s.where}:${s.line} '${s.param}'`).join("; ") || "none"}), while all three unexcused shapes are caught when planted (bare arrow ${plant.bareArrow}, bare function ${plant.bareFunction}, chain dead-ending in an unbound name ${plant.unbound})`,
  unexcused.length === 0 && plant.bareArrow === true && plant.bareFunction === true && plant.unbound === true,
  `${unexcused.length} unexcused site(s)`);

const doorCauses = new Map();
const moduleCauses = new Map();
for (const s of sites) for (const c of s.causes) {
  const into = c.kind === "door" ? doorCauses : c.kind === "module" ? moduleCauses : null;
  if (!into) continue;
  const had = into.get(c.key);
  into.set(c.key, { ...c, file: had?.file ?? s.file, sites: [...(had?.sites ?? []), `${s.where}:${s.line}`] });
}

// Clause 3. A door is only an excuse if the thing it is missing FROM is a real declared type that
// does have doors — otherwise "absent" is what an empty or `any`-typed surface also reports.
const doorTruth = [...doorCauses.values()].map((c) => ({
  key: c.key, lacks: !c.declared.includes(c.name), surfaceHasDoors: c.declared.length >= 1, usedBy: c.sites.length,
}));
ok(`every door excuse is a property a real declared surface lacks, and that surface does declare the doors the app ships (${doorTruth.map((d) => `${d.key} absent from [${doorCauses.get(d.key).declared.join(", ")}], ${d.usedBy} site(s)`).join("; ")}), while the planted missing door is caught (${plant.door})`,
  doorTruth.every((d) => d.lacks && d.surfaceHasDoors && d.usedBy >= 1) && plant.door === true,
  doorTruth.filter((d) => !d.lacks || !d.surfaceHasDoors).map((d) => d.key).join(", "));

// Clause 4. A module is only an excuse if the app's resolver really does not answer it, and the name
// the chain reached for is really one the draft imports from that specifier.
const moduleTruth = [...moduleCauses.values()].map((c) => {
  const answered = !!ts.resolveModuleName(c.spec, c.file, options, ts.sys).resolvedModule;
  const sf = program.getSourceFile(c.file);
  const importers = new Set();
  if (sf) for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.moduleSpecifier.text === c.spec) {
      const nb = st.importClause?.namedBindings;
      if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) importers.add(e.name.text);
    }
  }
  return { key: c.key, spec: c.spec, name: c.name, answered, imported: importers.has(c.name), usedBy: c.sites.length };
});
ok(`every module excuse is a specifier the app's own resolver does not answer, reached under a name the draft really imports from it (${moduleTruth.map((m) => `${m.spec} → ${m.name}, ${m.usedBy} site(s)`).join("; ")}), while the planted unwritten module is caught (${plant.module})`,
  moduleTruth.every((m) => !m.answered && m.imported && m.usedBy >= 1) && plant.module === true,
  moduleTruth.filter((m) => m.answered || !m.imported).map((m) => m.key).join(", "));

// --- the ledger ---------------------------------------------------------------------------------
// The producers of `any` are not a count; they are five names. Pinning the set means a sixth — a new
// unwritten domain, or a new door the app does not have — is a decision somebody recorded, and so is
// a seventh site hanging off a cause that is already here.
// M1023: 10 — the League#League sites retired with the league's resurrection.
const LEDGER = [
  "FootballDataProvider.campuses", "FootballDataProvider.coaches",
  "module:@/domain/transfer#getFreeAgents",
];
const found = [...new Set([...doorCauses.keys(), ...moduleCauses.keys()])].sort();
const retired = LEDGER.filter((k) => !found.includes(k));
const unlisted = found.filter((k) => !LEDGER.includes(k));
const ledgerFiles = new Set(sites.map((s) => s.where));
ok(`the names behind the ${sites.length} site(s) are a ledger of ${LEDGER.length} over ${ledgerFiles.size} file(s): ${found.join(", ")} (sites.length >= 10, ceiling 20)${retired.length ? "; NO SITE any more: " + retired.join(", ") : ""}${unlisted.length ? "; UNLISTED: " + unlisted.join(", ") : ""}`,
  retired.length === 0 && unlisted.length === 0 && found.length === LEDGER.length && sites.length >= 10 && sites.length <= 20,
  `${unlisted.length} unlisted, ${retired.length} retired`);

// And the repair itself: the file that lost its site still carries the defects that are NOT this
// family, so the zero came from deleting a helper nothing in the file read, not from muting the file.
const schedule = perFile.get("features/match/SeasonSchedule.tsx") ?? [];
ok(`the repaired draft is still measured, not muted — SeasonSchedule.tsx has 0 \`7006\` but ${schedule.length} defect(s) of the other families left in it (${schedule.join(", ") || "none"}), while the planted sound draft — annotated parameter, typed array, contextual callback — joins no list at all (${plant.soundSites} site(s))`,
  !schedule.includes("7006") && schedule.length >= 1 && plant.soundSites === 0,
  `schedule: ${schedule.join(", ")}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
