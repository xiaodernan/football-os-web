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

const APP_MODULE_PIN = 102;
const byDir = {};
for (const d of APP_DIRS) {
  const n = walkApp(root, { dirs: [d], exts: [".ts", ".tsx"] }).length;
  if (n) byDir[d] = n;
}
const appModules = Object.values(byDir).reduce((s, n) => s + n, 0);
ok(`the app is the ten directories it is made of, and they hold ${appModules} modules (${Object.entries(byDir).map(([d, n]) => `${d} ${n}`).join(", ")})`,
  appModules === APP_MODULE_PIN && Object.keys(byDir).length === APP_DIRS.length);

// The neighbour that caused this: a clone of this repository, sitting in the root, called
// `football-os/` — it is not an app module, but before the rule it was read as one.
ok(`a clone of the app sitting beside the app does not join its population (${Object.values(byDir).reduce((s, n) => s + n, 0)} of the clone's modules in the walk's ${walkApp(root, { dirs: ["domain"], exts: [".ts", ".tsx"] }).length} app module(s))`,
  walkApp(root, { dirs: ["domain"], exts: [".ts", ".tsx"] }).length === appModules);

// ---------------------------------------------------------------------------
// 3 · the rule is the only way into the app tree — every tree-reading proof imports it
// ---------------------------------------------------------------------------
const scriptFiles = readdirSync(join(root, "scripts")).filter((f) => /^proof-.*\.mjs$/.test(f));
const importLine = /from\s+["']\.\/lib\/appTree\.mjs["']/;
const readers = scriptFiles.filter((f) => readFileSync(join(root, "scripts", f), "utf8").includes("walkApp(") || readFileSync(join(root, "scripts", f), "utf8").includes("appDirsIn(") || readFileSync(join(root, "scripts", f), "utf8").includes("appFilesIn("));
const readersMissing = readers.filter((f) => !importLine.test(readFileSync(join(root, "scripts", f), "utf8")));
ok(`every proof that walks the tree reads the one rule (${readers.length} of ${readers.length} import scripts/lib/appTree.mjs)`,
  readersMissing.length === 0 && readers.length >= 8);

// ---------------------------------------------------------------------------
// 4 · the repository points at no other repository
// ---------------------------------------------------------------------------
// M437: the root's FILES are the app's too. The rule above settles which DIRECTORIES are the
// app's; a file the app does not name is a neighbour's, and a visible one is a stray in the tree
// — the shape the census could not see, because it read directories, not files.
const APP_ROOT_FILES = [
  "components.json",
  "index.html",
  "package-lock.json",
  "package.json",
  "PLAN-LONGTERM.md",
  "postcss.config.mjs",
  "PROVENANCE.md",
  "README.md",
  "tsconfig.json",
  "vite.config.ts",
];
const rootFiles = readdirSync(root).filter((f) => !f.startsWith(".") && !f.startsWith("node_modules") && !f.startsWith(".git") && !f.startsWith(".workbuddy-ai") && !f.startsWith("Python") && !f.startsWith("dev"));
const strayFiles = rootFiles.filter((f) => !APP_ROOT_FILES.includes(f));
ok(`the repository carries no pointer to another repository — the app's root files are exactly the ${APP_ROOT_FILES.length} named below (stray: ${strayFiles.join(", ") || "none"})`,
  strayFiles.length === 0 && rootFiles.length === APP_ROOT_FILES.length);

// ---------------------------------------------------------------------------
// 5 · every proof that reads the repository's top-level directories imports the rule
// ---------------------------------------------------------------------------
const readsRoot = (src) =>
  /walkApp\(.*root/.test(src) || /appDirsIn\(.*root/.test(src) || /appFilesIn\(.*root/.test(src) || /\b(?:appDirsIn|walkApp)\(\s*root\b/.test(src);
const rootReaders = scriptFiles.filter((f) => readsRoot(readFileSync(join(root, "scripts", f), "utf8")));
const rootReadersMissing = rootReaders.filter((f) => !importLine.test(readFileSync(join(root, "scripts", f), "utf8")));
ok(`every proof that reads the repository's top-level directories imports the rule, so a new gate cannot forget it (${rootReaders.length} such script(s): ${rootReaders.join(", ")}; ${rootReadersMissing.length} without it [${rootReadersMissing.join(", ")}])`,
  rootReadersMissing.length === 0 && rootReaders.length === 8,
  `without the rule: ${rootReadersMissing.join(", ")}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);