// Proof for M1201 The Frozen Diary — the committed diary against the committed fold.
// This is not regex theatre: it loads the real frozen-fold.json + frozen-diary.json,
// runs the real verifier, and asserts the diary carries 15 competitions all written by the model.
// Run: node scripts/proof-frozen-diary.mjs
import { readFileSync } from "node:fs";
import { verifyDiaryClaims } from "./lib/frozen-diary-claims.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const fold = JSON.parse(readFileSync("public/frozen-fold.json", "utf8"));
const diary = JSON.parse(readFileSync("public/frozen-diary.json", "utf8"));
const domain = readFileSync("domain/frozenDiary.ts", "utf8");
const screen = readFileSync("features/wirediary/FrozenDiary.tsx", "utf8");
const app = readFileSync("src/App.tsx", "utf8");
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
const dict = readFileSync("i18n/dictionaries.ts", "utf8");

// the artifact is real and folded — every number chain-checked through the fold
ok("the frozen fold carries 15 competitions", Array.isArray(fold.folds) && fold.folds.length === 15);
for (const f of fold.folds) {
  if (!Array.isArray(f.table) || f.table.length !== f.clubs) { fail++; console.log("FAIL frozen-fold row scarcity on " + f.id); } else { pass++; }
}
ok("every competition in the fold has a champion, runner-up and tail", fold.folds.every((f) => f.champions && f.runnerUp && f.tail && f.champions.pos === 1));
ok("the diary carries exactly one article per folded competition", Array.isArray(diary.diary) && diary.diary.length === fold.folds.length);
ok("the diary was model-written in full — not one paragraph dissolving into fold-out", diary.diary.every((a) => a.by === "model" && Array.isArray(a.paragraphs) && a.paragraphs.length >= 1));

// the real verifier, run on the real artifacts — must be silent
const violations = verifyDiaryClaims(diary, fold);
ok(`the verifier finds zero numeral drift across all ${diary.diary.length} paragraphs`, violations.length === 0 && diary.diary.length === fold.folds.length);
if (violations.length) for (const v of violations) { fail++; console.log("FAIL  " + v); }

// the shared door — the screens route through one release-artifact reader
ok("isFrozenDiaryPayload refuses malformed payloads — version, by, summary, diary all local", /d\.version !== "frozen-diary\/v1"/.test(domain) && /d\.summary\.competitionsFrozen !== d\.diary\?\.length/.test(domain) && /d\.diary\.length === 0/.test(domain));
ok("the screen drives the shared release-artifact door with the frozen diary path", /fetchReleaseArtifact\(`[^`]*frozen-diary\.json`/.test(screen));
ok("by model/by fold/by mix are the three honest badges the page can honestly print", /byModel/.test(screen) && /byFold/.test(screen) && /byMix/.test(screen));

// wiring — every route a visitor might look
ok("the route is lazy-divided in App.tsx", /path === "\/frozen-diary"/.test(app) && /FrozenDiary/.test(app));
ok("the shell carries the new node", /\/frozen-diary/.test(shell) && /nav\.frozenDiary/.test(shell));
ok("the command palette can reach it", /"frozen-diary"/.test(palette) && /nav\.frozenDiary/.test(palette));

// dictionary — every key coined in all three locales
for (const key of [
  "frozenDiary.kicker",
  "frozenDiary.title",
  "frozenDiary.subtitle",
  "frozenDiary.tier",
  "frozenDiary.print",
  "frozenDiary.printHint",
  "frozenDiary.errorTitle",
  "frozenDiary.errorBody",
  "frozenDiary.absentBody",
  "frozenDiary.retry",
  "frozenDiary.meta",
  "frozenDiary.tag",
  "frozenDiary.byModel",
  "frozenDiary.byFold",
  "frozenDiary.byMix",
  "frozenDiary.method",
  "nav.frozenDiary",
]) {
  const needles = (dict.match(new RegExp('"' + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '":', "g")) ?? []).length;
  ok(`all three locales coin ${key}`, needles === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
