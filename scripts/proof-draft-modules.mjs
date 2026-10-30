// M718. What a draft's missing module actually is.
//
// The quarantine's ratchet counts `2307` — "cannot find module" — as ONE family of eight sites,
// and eight is a number a lane can leave alone for a milestone at a time. But the eight are not
// one fact. Seven of them name a module the quarantine itself is holding, unwritten into the app
// at exactly the mirrored path: the screen and its domain were shelved together, and what the
// draft is missing is a shipping decision, not a file. One of them names a module the quarantine
// holds somewhere ELSE — a draft that reached for `@/world/seasonStats` while its own pile carries
// `features/world/seasonStats.ts`. That site is not waiting for a decision; it is a wrong path,
// and it will still be broken on the day the module ships.
//
// A count cannot tell those apart, because the count is of a failure the module's absence causes
// either way. So this gate asks the compiler's own resolver, on two planes: does the APP provide
// this specifier (the question the checker asks, asked the same way), and does the PILE provide it
// at the same relative path (the question the draft's author implicitly asked). The answer sorts
// every site into the classes, and the two classes that are defects rather than decisions —
// wrong-shelf and invented — are charged at zero, along with a third the flat count cannot see at
// all: a screen that asks its unwritten sibling for a name the sibling does not export, so even
// shipping the sibling as it stands would leave the screen broken.
//
// What it charges:
//   1. the resolver is the compiler's, and the app passes it: every `@/…` the app's own modules
//      import resolves, and the walk reads a real population on both sides — an index that
//      collapsed to nothing cannot pass as "no violations";
//   2. the reading is the checker's reading: the sites this walk calls unresolvable are, file by
//      file, exactly the `2307` diagnostics the type census reports. Neither number is quoted
//      from the other; they are computed apart and required to agree;
//   3. NO draft points at the wrong shelf, NO draft invents a module nothing anywhere holds, and
//      NO screen asks its unwritten sibling for a name that sibling never exported — each with a
//      planted draft of its own shape in a mirror of the quarantine, so the zero is measured;
//   4. the decisions are a NAMED ledger: the exact set of specifiers the app has never shipped and
//      the pile holds, so a sixth one is a decision somebody took, not a site that slipped in.
//
// Run: node scripts/proof-draft-modules.mjs
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
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

// --- the two questions, asked the way the compiler asks them -------------------------------------
const options = appOptions(root);
// The app plane is the checker's own question: the app's options, the draft's own file as the
// containing directory, and the app's `@/* → ./*` mapping under the app's root.
const appPlane = (spec, from) => ts.resolveModuleName(spec, from, options, ts.sys).resolvedModule?.resolvedFileName;
// The pile plane is the same question with the root moved into the quarantine: "does a module sit
// at this path in the pile?" A wrong-SHELF specifier fails it and the app plane alike, while a
// site the two shelved together fails only the app plane.
const pilePlane = (spec, from, pile) =>
  ts.resolveModuleName(spec, from, { ...options, baseUrl: pile, paths: { "@/*": ["./*"] } }, ts.sys).resolvedModule?.resolvedFileName;

// The names a module exports, read from its own declarations by the parser — never by a regex, or
// an `export async function` reads as no export and the gate invents a defect.
const exportedNames = (file) => {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true);
  const names = new Set();
  for (const st of sf.statements) {
    if (!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    if (ts.isVariableStatement(st)) {
      for (const decl of st.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.add(decl.name.text);
        else if (ts.isObjectBindingPattern(decl.name)) {
          for (const el of decl.name.elements) if (ts.isIdentifier(el.name)) names.add(el.name.text);
        }
      }
    } else if (st.name && ts.isIdentifier(st.name)) {
      names.add(st.name.text);
    } else if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const el of st.exportClause.elements) names.add(el.name.text);
    }
  }
  return names;
};

// Every import site in a population, with what it asks for.
const importSites = (files) => {
  const sites = [];
  for (const file of files) {
    const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ES2022, true);
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const nb = st.importClause?.namedBindings;
      sites.push({
        file,
        spec: st.moduleSpecifier.text,
        names: nb && ts.isNamedImports(nb) ? nb.elements.map((e) => e.name.text) : [],
      });
    }
  }
  return sites;
};

const rel = (p, base) => relative(base, p).split("\\").join("/");

// The classifier: one site in, one class out. `pile` is the quarantine the site's own draft lives
// in, so a mirror of the pile classifies with the same code the population does.
const classify = (site, pile) => {
  if (appPlane(site.spec, site.file)) return { kind: "provided" };
  const sibling = pilePlane(site.spec, site.file, pile);
  if (sibling) {
    const have = exportedNames(sibling);
    return { kind: "unwritten-sibling", sibling: rel(sibling, pile), falsePromises: site.names.filter((n) => !have.has(n)) };
  }
  // Nothing at that path. Is there a module of that NAME elsewhere in the pile? Then the author
  // pointed at the wrong shelf, and the site will still fail the day its module ships.
  const wanted = basename(site.spec.startsWith("@/") ? site.spec.slice(2) : site.spec);
  const candidates = walkApp(pile, { dirs: null, notApp: [], exts: [".ts", ".tsx"] })
    .filter((p) => [".ts", ".tsx"].some((e) => basename(p) === wanted + e));
  return candidates.length
    ? { kind: "wrong-shelf", near: candidates.map((c) => rel(c, pile)) }
    : { kind: "invented" };
};

// --- the app's own plane, read as the reverse control ---------------------------------------------
// A resolver configured wrong reports nothing missing and nothing found, and every charge below
// would pass on an empty set. So the same resolver is run over the app's own imports first: the
// app must answer all of them, and the count of sites it answers is the floor under the reading.
const appFiles = APP_DIRS.flatMap((d) => walkApp(join(root, d), { exts: [".ts", ".tsx"] }));
const appSites = importSites(appFiles).filter((s) => s.spec.startsWith("@/"));
const appUnanswered = appSites.filter((s) => !appPlane(s.spec, s.file));

const DRAFT_FILES = walkApp(draftsDir, { dirs: null, notApp: [], exts: [".ts", ".tsx"] });
const PILE_FLOOR = 50, APP_SITE_FLOOR = 400;
ok(`the resolver is the compiler's own and the app passes it (${appFiles.length} app module(s) read, ${appSites.length} \`@/…\` site(s) the app answers, ${appUnanswered.length} it does not; the quarantine holds ${DRAFT_FILES.length} file(s))`,
  appUnanswered.length === 0 && appSites.length >= APP_SITE_FLOOR && appFiles.length >= PILE_FLOOR && DRAFT_FILES.length >= PILE_FLOOR,
  `unanswered: ${appUnanswered.map((s) => `${rel(s.file, root)} ${s.spec}`).join(", ") || "none"}`);

// --- the quarantine's reaches, classified ----------------------------------------------------------
const draftSites = importSites(DRAFT_FILES);
const reaches = draftSites
  .map((s) => ({ ...s, ...classify(s, draftsDir) }))
  .filter((s) => s.kind !== "provided")
  .sort((a, b) => rel(a.file, draftsDir).localeCompare(rel(b.file, draftsDir)) || a.spec.localeCompare(b.spec));

// The same population, read by the type census rather than by this walk. Two independent readings
// of one fact; if they disagree, one of them is blind, and the disagreement says which.
const perFile = census(DRAFT_FILES, options, draftsDir);
const checkerCount = new Map();
for (const [r, sigs] of perFile) checkerCount.set(r, sigs.filter((s) => s === "2307").length);
const walkCount = new Map();
for (const s of reaches) {
  const key = rel(s.file, draftsDir);
  walkCount.set(key, (walkCount.get(key) ?? 0) + 1);
}
const checkerOnly = [...checkerCount].filter(([r, n]) => (walkCount.get(r) ?? 0) !== n).map(([r, n]) => `${r} checker ${n} vs walk ${walkCount.get(r) ?? 0}`);
const totalChecker = [...checkerCount.values()].reduce((a, n) => a + n, 0);
ok(`this walk's unresolvable sites and the checker's \`2307\` are the same population, file by file (${totalChecker} counted by the checker, ${reaches.length} classified by the walk, over ${perFile.size} file(s); ${checkerOnly.length ? "disagreement: " + checkerOnly.join("; ") : "no file disagrees"})`,
  checkerOnly.length === 0 && totalChecker === reaches.length && reaches.length >= 1,
  checkerOnly.join("; "));

const wrongShelf = reaches.filter((s) => s.kind === "wrong-shelf");
const invented = reaches.filter((s) => s.kind === "invented");
const siblings = reaches.filter((s) => s.kind === "unwritten-sibling");
const falsePromises = siblings.filter((s) => s.falsePromises.length > 0);

// --- the mirror, so each zero is a measurement and not an empty scan --------------------------------
// The same classifier, run over a mirror of the quarantine carrying one planted draft per class it
// forbids and one sound draft that must stay out of every list. Without the plants, "no wrong-shelf
// site" is what a broken classifier prints.
const mirror = mkdtempSync(join(tmpdir(), "draft-modules-"));
let plant = null;
try {
  const md = join(mirror, ".drafts");
  mkdirSync(join(md, "features", "plant"), { recursive: true });
  writeFileSync(join(md, "features", "plant", "Mod.ts"), "export const Planted = 1;\nexport const AlsoPlanted = 2;\n");
  const files = {
    Sound: join(md, "features", "plant", "Sound.ts"),
    Sibling: join(md, "features", "plant", "Sibling.ts"),
    FalsePromise: join(md, "features", "plant", "FalsePromise.ts"),
    WrongShelf: join(md, "features", "plant", "WrongShelf.ts"),
    Invented: join(md, "features", "plant", "Invented.ts"),
  };
  writeFileSync(files.Sound, "import { EmptyState } from \"@/ui/primitives\";\nexport const s = EmptyState;\n");
  writeFileSync(files.Sibling, "import { Planted } from \"@/features/plant/Mod\";\nexport const s = Planted;\n");
  writeFileSync(files.FalsePromise, "import { NeverWrittenHere } from \"@/features/plant/Mod\";\nexport const s = NeverWrittenHere;\n");
  writeFileSync(files.WrongShelf, "import { Planted } from \"@/plant/Mod\";\nexport const s = Planted;\n");
  writeFileSync(files.Invented, "import { Whatever } from \"@/nobody/holds/this/one\";\nexport const s = Whatever;\n");
  const planted = importSites(Object.values(files)).map((s) => ({ ...s, ...classify(s, md) }));
  const at = (name) => planted.find((s) => rel(s.file, md) === `features/plant/${name}.ts`);
  plant = {
    sound: at("Sound")?.kind === "provided",
    sibling: at("Sibling")?.kind === "unwritten-sibling" && at("Sibling").falsePromises.length === 0,
    falsePromise: at("FalsePromise")?.kind === "unwritten-sibling" && at("FalsePromise").falsePromises.join() === "NeverWrittenHere",
    wrongShelf: at("WrongShelf")?.kind === "wrong-shelf" && at("WrongShelf").near.join() === "features/plant/Mod.ts",
    invented: at("Invented")?.kind === "invented",
  };
} finally {
  rmSync(mirror, { recursive: true, force: true });
}

ok(`no draft points at a shelf the pile does not hold it on (${wrongShelf.length} site(s): ${wrongShelf.map((s) => `${rel(s.file, draftsDir)} → ${s.spec} [pile holds ${s.near.join(", ")}]`).join("; ") || "none"}), while the planted wrong-shelf draft is caught (${plant.wrongShelf})`,
  wrongShelf.length === 0 && plant.wrongShelf === true, `${wrongShelf.length} wrong-shelf site(s)`);

ok(`no draft invents a module nothing anywhere holds (${invented.length} site(s): ${invented.map((s) => `${rel(s.file, draftsDir)} → ${s.spec}`).join("; ") || "none"}), while the planted invented module is caught (${plant.invented})`,
  invented.length === 0 && plant.invented === true, `${invented.length} invented site(s)`);

ok(`no screen asks its unwritten sibling for a name that sibling never exported (${falsePromises.length} site(s): ${falsePromises.map((s) => `${rel(s.file, draftsDir)} → ${s.spec} asks for ${s.falsePromises.join(", ")}`).join("; ") || "none"}), while the planted false promise is caught (${plant.falsePromise}) and the planted sibling that does export what it asks is left alone (${plant.sibling})`,
  falsePromises.length === 0 && plant.falsePromise === true && plant.sibling === true, `${falsePromises.length} false-promise site(s)`);

ok(`and the planted sound draft — one that imports what the app really exports — joins no list (${plant.sound})`,
  plant.sound === true, "the classifier charged a draft that imports the app's own module");

// --- the decisions, named ---------------------------------------------------------------------------
// What the app has never shipped and the pile holds is not a defect this gate can close; it is a
// ledger. Pinning the exact set of specifiers means a sixth unwritten domain is a decision someone
// recorded rather than a site that entered the census beside the others.
const unwritten = [...new Set(siblings.map((s) => s.spec))].sort();
const LEDGER = ["@/domain/finance", "@/domain/league", "@/domain/sync", "@/domain/transfer", "@/features/world/seasonStats"];
const added = unwritten.filter((s) => !LEDGER.includes(s));
const retired = LEDGER.filter((s) => !unwritten.includes(s));
ok(`the domains the app has never shipped, and the screens waiting on them, are a named ledger (${unwritten.length} specifier(s) over ${siblings.length} site(s): ${unwritten.join(", ")}; ${retired.length ? "no site reaches for " + retired.join(", ") + " any more" : "every entry still reached for"}${added.length ? "; UNLISTED: " + added.join(", ") : ""})`,
  added.length === 0 && retired.length === 0 && unwritten.length === LEDGER.length && siblings.length >= 1,
  added.length ? `${added.join(", ")} not in the ledger` : retired.length ? `${retired.join(", ")} gone from the quarantine` : "ledger holds");

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
