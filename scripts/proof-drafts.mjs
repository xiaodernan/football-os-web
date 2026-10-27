// M525: the drafts are one-way, and this gate keeps them that way.
//
// M522 moved 61 files the app never loaded into `.drafts/`, because a dot-prefixed name is not
// shipped (`scripts/lib/appTree.mjs`). That rule has two halves, and until now only one of them was
// charged: the walkers skip the directory, but nothing said a shipped file may not import ACROSS the
// boundary. An `import { CoachProfile } from "../../.drafts/features/coach/CoachProfile"` would put
// a draft back in the module graph while the census still reported the app's old population — the
// resurrection would be invisible in every number this repository keeps.
//
// So this gate asks the one question the quarantine depends on, structurally:
//   1. the shared rule names `.drafts` hidden, and does NOT name an ordinary directory hidden;
//   2. a module inside `.drafts` does not join the app's population while its sibling does;
//   3. no shipped file imports or re-exports anything that resolves inside `.drafts`;
//   4. every draft sits at `.drafts/<its original path>`, so a `git mv` restores it exactly;
//   5. the drafts' own README carries the two mechanisms a resurrector must honour — `git mv` to
//      restore the path, and `@source not` which keeps the stylesheet from scanning the directory;
//   6. the drafts that do not parse are measured, named, and may not grow — and at a zero backlog
//      the reader is armed on a planted broken draft, so "0 broken" is a measurement, not an absence.
//
// A live copy of a drafted path is printed, not charged: that is a resurrection in progress, and
// the `git mv` that finishes it removes the draft. Run: node scripts/proof-drafts.mjs
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { appDirsIn, appFilesIn, skipReason, walkApp } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const draftsDir = join(root, ".drafts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// --- 1. The rule names the quarantine, and only the quarantine. --------------
// The directories that are not the app, as the censuses name them. `dev` and `tests` hold scratch
// analyzers and Playwright specs; `scripts` is tooling; the rest is build output and neighbours.
const NOT_APP = ["node_modules", "dist", "coverage", "test-results", "vendor", "tests", "dev", "football-os", "public"];
const appDirs = appDirsIn(root, { notApp: [...NOT_APP, "scripts"] });
const hiddenReason = skipReason(".drafts", draftsDir);
const ordinaryReason = skipReason("features", join(root, "features"));
ok(`the shared rule reports .drafts as hidden (${hiddenReason ?? "not skipped"}) and an ordinary directory as app (${ordinaryReason ?? "app"}); the app's directories are [${appDirs.join(", ")}]`,
  hiddenReason === "hidden" && ordinaryReason === null && !appDirs.includes(".drafts") && existsSync(draftsDir));

// --- 2. A plant inside the quarantine stays out of the population. -----------
const planted = mkdtempSync(join(tmpdir(), "drafts-plant-"));
try {
  mkdirSync(join(planted, ".drafts"), { recursive: true });
  mkdirSync(join(planted, "domain"), { recursive: true });
  writeFileSync(join(planted, ".drafts", "hidden.ts"), "export const hidden = 1;\n");
  writeFileSync(join(planted, "domain", "real.ts"), "export const real = 1;\n");
  const walked = walkApp(planted, { dirs: null, notApp: [], exts: [".ts", ".tsx"] }).map((f) => relative(planted, f).split(sep).join("/"));
  ok(`a module inside .drafts does not join the population, and its sibling does (${walked.length} file(s): ${walked.join(", ") || "none"})`,
    walked.length === 1 && walked[0] === "domain/real.ts");
} finally {
  rmSync(planted, { recursive: true, force: true });
}

// --- 3. Nothing shipped imports across the boundary. -------------------------
const APP_EXTS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
// The scan is wider than the app on purpose: a proof script or a Playwright spec that reaches into
// `.drafts` re-enters the quarantine just as surely as a screen does, and the tests are the likeliest
// place to import a fixture by path. `dev/` stays out — it is scratch that can vanish mid-session.
const scanDirs = [...appDirs, "scripts", "tests"].filter((d) => existsSync(join(root, d)));
const appSources = [
  ...walkApp(root, { dirs: scanDirs, notApp: [], exts: APP_EXTS }),
  ...appFilesIn(root, { notApp: [...NOT_APP, "scripts"] })
    .filter((f) => APP_EXTS.some((x) => f.endsWith(x)))
    .map((f) => join(root, f)),
];

const hasDraftsSegment = (p) => p.split(/[\\/]/).includes(".drafts");
// An alias specifier (`@/x`) is rooted at the repository; a relative one at the importing file.
const resolvesIntoDrafts = (fromRel, spec) => {
  if (spec.startsWith("@/")) return hasDraftsSegment(resolve(root, spec.slice(2)));
  if (spec.startsWith(".")) return hasDraftsSegment(resolve(join(root, dirname(fromRel)), spec));
  return false;
};

const specsOf = (rel, text) => {
  const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".jsx") ? ts.ScriptKind.JSX
    : /\.[mc]?ts$/.test(rel) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  const specs = [];
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) {
      const s = n.moduleSpecifier;
      if (s && (ts.isStringLiteral(s) || ts.isNoSubstitutionTemplateLiteral(s))) specs.push(s.text);
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference) && n.moduleReference.expression) {
      const e = n.moduleReference.expression;
      if (ts.isStringLiteral(e)) specs.push(e.text);
    } else if (ts.isCallExpression(n)) {
      const dynamic = n.expression.kind === ts.SyntaxKind.ImportKeyword;
      const req = ts.isIdentifier(n.expression) && n.expression.text === "require";
      const a = n.arguments[0];
      if ((dynamic || req) && n.arguments.length === 1 && a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) specs.push(a.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return specs;
};

const crossings = [];
let specCount = 0;
for (const abs of appSources) {
  const rel = relative(root, abs).split(sep).join("/");
  for (const spec of specsOf(rel, readFileSync(abs, "utf8"))) {
    specCount++;
    if (resolvesIntoDrafts(rel, spec)) crossings.push(`${rel}: ${spec}`);
  }
}
// The reader is armed both ways: the three shapes a crossing takes are charged, and a sibling, a
// bare package and an import-shaped string are not. Without this, "0 crossings" could be a reader
// that never looked.
const FIXTURE = [
  { rel: "features/x/Deep.tsx", spec: "../../.drafts/features/x/Deep", want: true },
  { rel: "src/y.ts", spec: "@/domain/x", want: false },
  { rel: "src/y.ts", spec: "@/.drafts/src/mobile", want: true },
  { rel: "features/x/Deep.tsx", spec: "./Deep", want: false },
  { rel: "features/x/Deep.tsx", spec: "typescript", want: false },
];
const fixtureVerdicts = FIXTURE.map(({ rel, spec }) => resolvesIntoDrafts(rel, spec));
const fixtureOk = FIXTURE.every((f, i) => fixtureVerdicts[i] === f.want);
ok(`no shipped source imports across the .drafts boundary (${appSources.length} files, ${specCount} specifiers, ${crossings.length} crossing(s)${crossings.length ? ": " + crossings.slice(0, 5).join(" | ") : ""}; reader armed: ${fixtureVerdicts.join(",")})`,
  crossings.length === 0 && fixtureOk && appSources.length > 80);

// --- 4. Every draft is at .drafts/<its original path>. ------------------------
const draftFiles = walkApp(draftsDir, { dirs: null, notApp: [], exts: APP_EXTS })
  .map((f) => relative(draftsDir, f).split(sep).join("/"));
const malformed = draftFiles.filter((rel) => rel.split("/").includes(".drafts") || rel.split("/").length < 2);
const topLevelDirs = new Set(appDirs);
topLevelDirs.add("scripts");
const orphanTops = [...new Set(draftFiles.map((rel) => rel.split("/")[0]))].filter((top) => !topLevelDirs.has(top));
ok(`every draft mirrors its original path (${draftFiles.length} file(s) under ${[...new Set(draftFiles.map((r) => r.split("/")[0]))].sort().join(", ") || "none"}; malformed ${malformed.length}; unknown top-level ${orphanTops.join(", ") || "none"})`,
  draftFiles.length > 0 && malformed.length === 0 && orphanTops.length === 0);

// --- 5. The README carries the two mechanisms. -------------------------------
const readmePath = join(draftsDir, "README.md");
const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
const carriesGitMv = /\bgit mv\b/.test(readme);
const carriesSourceRule = /@source not\s+"\.\.\/\.drafts"/.test(readme);
ok(`the drafts README carries the resurrection path and the stylesheet exclusion (${readme.length} chars; git mv ${carriesGitMv}; @source not ${carriesSourceRule})`,
  readme.length > 500 && carriesGitMv && carriesSourceRule);

// --- 6. The parse backlog is measured, named, and may not grow. ---------------
// M535: M522 moved sixty unshipped files into `.drafts/` so that the app's census would read the
// app again. The quarantine was honest about the app; it said nothing about itself. How much of
// the pile parses was a number only a person could recompute by hand, and by hand it rots.
//
// At the start of this milestone the quarantine held 80 source files, 60 of which did not parse,
// with 861 diagnostics between them. This clause measures the pile with the TypeScript parser,
// names every file in it, and holds the totals where they are.
//
// The claim is narrow on purpose, and the narrowness is the point: it is about SYNTAX. A draft
// that parses may still import a module that is itself quarantined, miss a type, or read a `t()`
// key that no locale carries — parse-clean is not shippable. What the clause buys is that the
// syntactic backlog cannot quietly grow: a draft that starts parsing has to come off the list, a
// new broken draft has to go on it, and both totals are bounded.
//
// The list is the ledger and the ceilings are the ratchet. The list is exact, because a list
// that grows with the pile proves nothing; the ceilings are a bound, because a bound is what says
// "this may not get bigger". A registered draft that has since been resurrected — the file is no
// longer in `.drafts/` — is CLOSED: it is reported, not charged, because a resurrection moves
// files OUT of the quarantine and must not redden a gate about syntax.
//
// The reader is exercised first, on a fixture: a gate that has only ever reported "clean" has
// never been seen to refuse anything.
const BROKEN = [];
// M537: the pile parses, so the registry names nothing. A list of thirteen entries against a pile
// of zero would be thirteen stale claims; a list that grows with the pile proves nothing. The rule
// the list encodes survives — a draft that starts parsing comes off the list, a new broken draft
// goes on it, and both totals are bounded.
// M535: the pile measured 60 broken files and 861 diagnostics when this clause was written. The
// nine screens and the one tool repaired in the same milestone bring it to 50 and 841.
// M536: six mechanical families — a bare template attribute, a bare expression attribute, an
// unterminated `t("key)`, a `.map(…)` whose JSX container was closed by `))`, an interpolation
// inside a double-quoted attribute, and the `)` the parser itself named — take the pile to 13
// files and 102 diagnostics.
// M537: the thirteen that remained were hand-authored one-offs — a Rust-style switch, a
// Python-style conditional, a stray quote, a mangled date literal, two mismatched closing tags —
// and each is repaired by hand with a reviewed replacement. The pile is 0 files and 0 diagnostics,
// so both ceilings are 0.
//
// A ceiling of zero only means something if a breach would be caught, so the reader is armed below
// on a planted broken draft: "0 broken" must be a measurement, not an absence.
const BROKEN_CEILING = 0;
const DIAGNOSTIC_CEILING = 0;

const kindOf = (rel) => rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".jsx") ? ts.ScriptKind.JSX
  : /\.[mc]?ts$/.test(rel) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
const parseDiags = (rel, text) => {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kindOf(rel));
  return sf.parseDiagnostics ?? [];
};
// The reader, armed both ways: a broken snippet is seen, a sound one is not.
const readerSeesBroken = parseDiags("fixture.ts", "export const x = ( => 1;\n").length > 0;
const readerSeesClean = parseDiags("fixture.ts", "export const x = (1);\n").length === 0;

// The census: read a list of draft-relative paths out of a quarantine directory and report which
// of them do not parse. The directory is a parameter so the same reader can be armed on a mirror.
const scan = (baseDir, rels) => {
  const broken = [];
  let diagnostics = 0;
  for (const rel of rels) {
    const d = parseDiags(rel, readFileSync(join(baseDir, rel), "utf8"));
    if (d.length) { broken.push(rel); diagnostics += d.length; }
  }
  broken.sort();
  return { broken, diagnostics };
};

const { broken: brokenNow, diagnostics: diagnosticsNow } = scan(draftsDir, draftFiles);

const registered = new Set(BROKEN);
const undeclared = brokenNow.filter((p) => !registered.has(p));
const closed = BROKEN.filter((p) => !existsSync(join(draftsDir, p)));
const stale = BROKEN.filter((p) => existsSync(join(draftsDir, p)) && !brokenNow.includes(p));

ok(`the registry and the pile agree in both directions (${draftFiles.length} source drafts, ${brokenNow.length} broken, ${diagnosticsNow} diagnostics; ${undeclared.length} unnamed [${undeclared.join(", ")}]; ${stale.length} stale; ${closed.length} closed by a resurrection, reported and not charged; reader armed: broken ${readerSeesBroken}, clean ${readerSeesClean})`,
  undeclared.length === 0 && stale.length === 0 && readerSeesBroken && readerSeesClean);

// The reader must still find breakage at a zero backlog. The pile alone cannot show that: a census
// that returned nothing for any reason would read the same. So the same reader is run over a
// mirror of the quarantine carrying one broken draft and one sound one, and it must name the first
// and leave the second alone.
const mirror = mkdtempSync(join(tmpdir(), "drafts-mirror-"));
let plantedBroken = 0, plantedWrongly = 0;
try {
  const mirrorDrafts = join(mirror, ".drafts");
  mkdirSync(join(mirrorDrafts, "features", "plant"), { recursive: true });
  writeFileSync(join(mirrorDrafts, "features", "plant", "Broken.tsx"), "export const x = ( => 1;\n");
  writeFileSync(join(mirrorDrafts, "features", "plant", "Sound.tsx"), "export const x = (1);\n");
  const seen = scan(mirrorDrafts, ["features/plant/Broken.tsx", "features/plant/Sound.tsx"]);
  plantedBroken = seen.broken.filter((p) => p === "features/plant/Broken.tsx").length;
  plantedWrongly = seen.broken.filter((p) => p === "features/plant/Sound.tsx").length;
} finally {
  rmSync(mirror, { recursive: true, force: true });
}
ok(`the reader still finds breakage with one broken draft planted in a mirror of the quarantine (planted broken ${plantedBroken}, planted sound wrongly broken ${plantedWrongly})`,
  plantedBroken === 1 && plantedWrongly === 0);

ok(`the backlog may not grow (${brokenNow.length} broken <= ${BROKEN_CEILING}; ${diagnosticsNow} diagnostics <= ${DIAGNOSTIC_CEILING})`,
  brokenNow.length <= BROKEN_CEILING && diagnosticsNow <= DIAGNOSTIC_CEILING);

// --- What is not charged: a live copy of a draft is a resurrection in progress. ---
const liveCopies = draftFiles.filter((rel) => existsSync(join(root, rel)));
console.log(`       resurrections in progress: ${liveCopies.length}${liveCopies.length ? " — " + liveCopies.slice(0, 8).join(", ") : ""}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
