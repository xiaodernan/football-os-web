// M423. The rule that says which tree the app is — in one place, charged both ways.
//
// The defect, measured before it was fixed. Six proofs walk the repository's tree and print
// numbers about it: the coverage ratchet, the i18n gate, the id gate, the dead-import census, the
// dead-export census and the rng gate. Each kept its own private list of directories to leave
// alone, and the lists disagreed, so a neighbour of the repository came to be read as if it were
// the app:
//
//   · `football-os/` was a local clone of THIS repository, committed at M419 as a submodule
//     pointer with no `.gitmodules` file — a pointer no clone could resolve and a directory
//     carrying 79 modules of the same code. The coverage census measured 197 modules where the
//     app has 98, and its dead list, its exemption surface and its per-directory pin all stopped
//     describing the app. The i18n gate reported 59 of 376 checks red, the id gate 2 of 15, the
//     dead-import and dead-export gates each 1 of 4 — every one of them a number about a copy.
//   · thirteen scratch planes (`.m225-plane` … `.m326-plane`) sat untracked in the root. The two
//     gates that walk from the root read them as app source, and the id gate charged a
//     clock-derived id in a copy of `data/ai.ts` that the app had already fixed.
//
// The rule is small, and it is one sentence: **a neighbour is a neighbour**. A hidden name is not
// shipped — the build would not find it and git would not show it — and a directory carrying its
// own `.git` is another repository, with its own package.json, its own tests and its own history.
// Everything else at the top level is the app's business, and the app's business stays visible.
//
// What this file charges:
//   1. the rule reads all three cases — hidden, another repository, the app — through the SAME
//      function the gates call, on real directories on disk;
//   2. a neighbour is not read and an ordinary directory IS read, measured through the id
//      census's own shape, so "skip the neighbours" cannot become "skip what I did not expect";
//   3. the app's own population is what the coverage gate measures, and it is the same with a
//      clone of the app sitting beside it;
//   4. the gates read ONE rule: each tree-reading proof imports it, and none of them keeps a
//      private test of its own for a hidden directory;
//   5. the repository carries no pointer to another repository — the defect that started this.
//
// Run: node scripts/proof-app-tree.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { isHiddenName, carriesOwnRepo, skipReason, appDirsIn, appFilesIn, walkApp } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// ---------------------------------------------------------------------------
// 0 · a real tree to read, with the three cases in it
// ---------------------------------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), "app-tree-"));
const appDir = join(tmp, "domain");
const hiddenDir = join(tmp, ".scratch-plane");
const repoDir = join(tmp, "clone-of-us");
const plainDir = join(tmp, "brandNewApp");
for (const d of [appDir, hiddenDir, repoDir, plainDir]) mkdirSync(d, { recursive: true });
// A nested repository carries its own `.git` — a directory, as a clone does.
mkdirSync(join(repoDir, ".git"), { recursive: true });
// The shape the id census charges: an id minted from the clock.
const CLOCK_ID = /\b(id|clipId|sessionId)\s*:\s*`[^`]*\bDate\.now\(\)[^`]*`/g;
const CLOCK_FILE = "export const row = { id: `S${Date.now().toString(36)}` };\n";
for (const d of [appDir, hiddenDir, repoDir, plainDir]) writeFileSync(join(d, "row.ts"), CLOCK_FILE);

const reasons = {
  app: skipReason("domain", appDir, []),
  hidden: skipReason(".scratch-plane", hiddenDir, []),
  repo: skipReason("clone-of-us", repoDir, []),
  notApp: skipReason("dist", join(tmp, "dist"), ["dist"]),
};
ok(`the rule reads all three cases and names each one (app: ${reasons.app ?? "read"}, hidden: ${reasons.hidden ?? "read"}, another repository: ${reasons.repo ?? "read"}, a name on the caller's list: ${reasons.notApp ?? "read"})`,
  reasons.app === null && reasons.hidden === "hidden" && reasons.repo === "another repository" && reasons.notApp === "not the app");
ok(`the two facts the rule rests on are readable on their own (a dot-prefixed name: ${isHiddenName(".scratch-plane")}, a name that is not: ${isHiddenName("domain")}; a directory with its own .git: ${carriesOwnRepo(repoDir)}, one without: ${carriesOwnRepo(appDir)})`,
  isHiddenName(".scratch-plane") && !isHiddenName("domain") && carriesOwnRepo(repoDir) && !carriesOwnRepo(appDir));

// ---------------------------------------------------------------------------
// 1 · a neighbour is not read, and an ordinary directory is — through the walk the gates use
// ---------------------------------------------------------------------------
const readFiles = walkApp(tmp, { notApp: [], exts: [".ts"] });
const readNames = readFiles.map((f) => f.replace(tmp, "").replace(/\\/g, "/"));
const charged = readNames.filter((n) => {
  CLOCK_ID.lastIndex = 0;
  return CLOCK_ID.test(readFileSync(join(tmp, n), "utf8"));
});
ok(`the walk reads the app's directory and an ordinary new one, and reads neither neighbour (read [${readNames.join(", ")}]; charged ${charged.length})`,
  readNames.length === 2 && readNames.includes("/domain/row.ts") && readNames.includes("/brandNewApp/row.ts")
    && !readNames.some((n) => n.includes(".scratch-plane")) && !readNames.some((n) => n.includes("clone-of-us")));
ok(`…and the census that reads those files charges the app's own copy and the ordinary one, and never the neighbours' (${charged.length} charged of ${readNames.length} read)`,
  charged.length === 2 && charged.every((n) => n === "/domain/row.ts" || n === "/brandNewApp/row.ts"));

// The same rule, asked the other way round: a caller that names a directory on its own list is
// obeyed, and a directory that is on nobody's list is read. Otherwise "skip the neighbours"
// would be a name for "skip whatever you did not expect".
const appDirs = appDirsIn(tmp, { notApp: [] });
ok(`the top-level read names the app's directories and leaves out the neighbours (${appDirs.join(", ")})`,
  appDirs.length === 2 && appDirs.includes("domain") && appDirs.includes("brandNewApp")
    && !appDirs.includes(".scratch-plane") && !appDirs.includes("clone-of-us"));

// ---------------------------------------------------------------------------
// 2 · the app's own population, with a clone of the app sitting beside it
// ---------------------------------------------------------------------------
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];
// M444: 98 -> 99. lib/context.ts (the context-guard door) is a new app module; the pin pays in the
// same commit, which is what makes a lost directory redden instead of shrinking quietly.
// M453: 99 -> 102. domain/playerCareer.ts, features/player/TrainingTree.tsx and
// ui/charts/PotentialRadar.tsx are app modules the lane added; the pin pays for them in the
// same landing, so a lost directory reddens instead of shrinking quietly.
// M522: 162 -> 102. The lane's M463-M521 batch left for .drafts/ in two waves: the 39 screens that
// do not parse, then the 9 that parse but nothing routes, the twelve modules only they reached, and
// SeasonAwards/seasonStats (reachable only through a re-export nothing rendered). A hidden name is
// not shipped. The number is the measured population: a module that disappears from the app, or
// reappears from the drafts without this line, reddens here.
// M523: 102 -> 104. domain/coachCareer.ts and features/coach/CoachProfile.tsx — the coach résumé,
// derived from the career state the manager OS already keeps.
// M526: 104 -> 105 — features/manager/SquadPlanning.tsx resurrected from the drafts.
// M527: 105 -> 106 — features/tactical/TacticalNotebook.tsx resurrected from the drafts.
const APP_MODULE_PIN = 106;
const byDir = {};
for (const d of APP_DIRS) {
  const n = walkApp(root, { dirs: [d], exts: [".ts", ".tsx"] }).length;
  if (n) byDir[d] = n;
}
const appModules = Object.values(byDir).reduce((s, n) => s + n, 0);
ok(`the app is the ten directories it is made of, and they hold ${appModules} modules (${Object.entries(byDir).map(([d, n]) => `${d} ${n}`).join(", ")})`,
  appModules === APP_MODULE_PIN && Object.keys(byDir).length === APP_DIRS.length);

// The neighbour that caused this: a clone of this repository, sitting in the root, carrying its
// own copy of the app. M437 removed the clone the milestone found, so the case is PLANTED now —
// and a planted case is the stronger claim, because the rule is exercised on a neighbour that is
// really there rather than on one that was there once.
const cloneTree = mkdtempSync(join(tmpdir(), "app-tree-clone-"));
mkdirSync(join(cloneTree, "domain"), { recursive: true });
mkdirSync(join(cloneTree, "clone-of-us", ".git"), { recursive: true });
writeFileSync(join(cloneTree, "domain", "real.ts"), "export const real = 1;\n");
writeFileSync(join(cloneTree, "clone-of-us", "copy.ts"), "export const copy = 1;\n");
const cloneWalk = walkApp(cloneTree, { dirs: null, notApp: ["node_modules"], exts: [".ts", ".tsx"] })
  .map((f) => f.replace(/\\/g, "/"));
const cloneModules = cloneWalk.filter((f) => f.includes("clone-of-us/")).length;
const cloneReal = cloneWalk.filter((f) => f.includes("domain/")).length;
rmSync(cloneTree, { recursive: true, force: true });
ok(`a clone of the app sitting beside the app does not join its population (${cloneModules} of the clone's modules in the walk's ${cloneReal} app module(s))`,
  cloneModules === 0 && cloneReal === 1);

// ---------------------------------------------------------------------------
// 3 · the gates read ONE rule
// ---------------------------------------------------------------------------
const TREE_PROOFS = ["proof-coverage.mjs", "proof-dead-exports.mjs", "proof-dead-imports.mjs", "proof-i18n.mjs", "proof-ids.mjs", "proof-rng.mjs", "proof-orphans.mjs", "proof-unused-locals.mjs", "proof-unused-params.mjs"];
const importLine = /from "\.\/lib\/appTree\.mjs"/;
const imported = [], forked = [];
for (const f of TREE_PROOFS) {
  const src = readFileSync(join(root, "scripts", f), "utf8");
  if (importLine.test(src)) imported.push(f);
  // A private test of its own for a hidden directory is the fork this rule exists to stop.
  // The shape is a directory entry's NAME: `e.name.startsWith(".")`. A relative import
  // specifier (`spec.startsWith(".")`) is a different thing and is not a fork.
  if (/\.name\.startsWith\("\."\)/.test(src)) forked.push(f);
}
ok(`every proof that walks the tree reads the one rule (${imported.length} of ${TREE_PROOFS.length} import scripts/lib/appTree.mjs${forked.length ? `; forked: ${forked.join(", ")}` : ""})`,
  imported.length === TREE_PROOFS.length && forked.length === 0, `missing: ${TREE_PROOFS.filter((f) => !imported.includes(f)).join(", ")}`);

// M432: the rule has to be READ, not remembered. Two gates were written AFTER this rule landed —
// the dead-code boundary's first direction (proof-orphans) and its fourth (proof-unused-locals) —
// and each read the repository's TOP-LEVEL directories to ask whether every one of them is
// covered. Without the rule, each of the eleven scratch planes an old experiment left in the root
// read as an uncovered directory, and the suite was red with two failures that had nothing to do
// with the app. So the rule is now checked against the WHOLE suite rather than against a list
// this file remembers: a proof script that reads the root's directories must import the rule.
const scriptFiles = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f)).sort();
// A script that reads the ROOT's own directory list — the top-level directories — as opposed to a
// NAMED directory under the root, which is the app's business and needs no rule. The shared rule's
// own readers count too: appDirsIn(root, …) and walkApp(root, …) are the same question asked
// through the rule rather than beside it.
const readsRoot = (src) => /readdirSync\(\s*(?:root|resolve\(root\))\s*,/.test(src)
  || /readdirSync\(\s*join\(root,\s*""\s*\)\s*,/.test(src)
  || /\b(?:appDirsIn|walkApp)\(\s*root\b/.test(src);
const rootReaders = scriptFiles.filter((f) => readsRoot(readFileSync(join(root, "scripts", f), "utf8")));
const rootReadersMissing = rootReaders.filter((f) => !importLine.test(readFileSync(join(root, "scripts", f), "utf8")));
ok(`every proof that reads the repository's top-level directories imports the rule, so a new gate cannot forget it (${rootReaders.length} such script(s): ${rootReaders.join(", ")}; ${rootReadersMissing.length} without it [${rootReadersMissing.join(", ")}])`,
  rootReadersMissing.length === 0 && rootReaders.length === 9,
  `without the rule: ${rootReadersMissing.join(", ")}`);

// ---------------------------------------------------------------------------
// 4 · the repository points at no other repository
// ---------------------------------------------------------------------------
// M437: the root's FILES are the app's too. The rule above settles which DIRECTORIES are the
// app's; a file the app does not name is a neighbour's, and a visible one is a stray in the tree
// — the shape the census could not see, because it read directories only. The app's own files are
// named here, and the list is pinned: a file added to the root without a line here is a stray.
const APP_ROOT_FILES = [
  "components.json",
  "index.html",
  "package-lock.json",
  "package.json",
  "PLAN-LONGTERM.md",
  "playwright.config.ts",
  "postcss.config.mjs",
  "PROVENANCE.md",
  "README.md",
  "tsconfig.json",
  "vite.config.ts",
];
const rootFiles = appFilesIn(root);
const strayFiles = rootFiles.filter((f) => !APP_ROOT_FILES.includes(f));
const missingFiles = APP_ROOT_FILES.filter((f) => !rootFiles.includes(f));
// The reader is armed: a file the app does not name is a stray, read in a planted root.
const pStray = (() => {
  const planted = mkdtempSync(join(tmpdir(), "app-tree-files-"));
  writeFileSync(join(planted, "stray.txt"), "not the app's\n");
  writeFileSync(join(planted, "README.md"), "the app's\n");
  const read = appFilesIn(planted).filter((f) => !APP_ROOT_FILES.includes(f));
  rmSync(planted, { recursive: true, force: true });
  return read.length;
})();
ok(`every visible file at the root is one the app names (${rootFiles.length} visible file(s), ${strayFiles.length} stray [${strayFiles.join(", ")}], ${missingFiles.length} named but absent [${missingFiles.join(", ")}]; a planted stray reads ${pStray})`,
  strayFiles.length === 0 && missingFiles.length === 0 && rootFiles.length === APP_ROOT_FILES.length && pStray === 1,
  `stray: ${strayFiles.join(", ")}; absent: ${missingFiles.join(", ")}`);

/** The paths the index records as a pointer to another repository (mode 160000). */
const gitlinksIn = (cwd) => {
  let out = "";
  try {
    out = execFileSync("git", ["ls-files", "-s"], { cwd, encoding: "utf8" });
  } catch { return []; }
  return out.split(/\r?\n/)
    .filter((l) => l.startsWith("160000 "))
    .map((l) => l.split(/\s+/).pop());
};
const gitlinks = gitlinksIn(root);
// The reader, planted both ways: a pointer in a real index is seen, so the zero above is a
// measurement and not a blind spot. The plant is a fresh repository whose index really does
// carry a gitlink — the shape M419 committed by accident.
const plantRepo = mkdtempSync(join(tmpdir(), "app-tree-git-"));
execFileSync("git", ["init", "-q"], { cwd: plantRepo });
execFileSync("git", ["update-index", "--add", "--cacheinfo",
  "160000,1234567890123456789012345678901234567890,clone-of-us"], { cwd: plantRepo });
const plantedLinks = gitlinksIn(plantRepo);
rmSync(plantRepo, { recursive: true, force: true });

ok(`the repository carries no pointer to another repository (${gitlinks.length} found${gitlinks.length ? `: ${gitlinks.join(", ")}` : ""})`,
  gitlinks.length === 0, `pointers: ${gitlinks.join(", ")}`);
ok(`the index reader finds a pointer when one is there (planted ${plantedLinks.length} in a fresh index, the repository's own ${gitlinks.length})`,
  plantedLinks.length === 1 && plantedLinks[0] === "clone-of-us");

rmSync(tmp, { recursive: true, force: true });

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
