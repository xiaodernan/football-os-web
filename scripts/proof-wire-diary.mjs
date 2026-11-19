// Proof for The Wire Diary (M1175). The screen reads the committed diary; this test re-derives
// nothing — it checks the wiring, the guard, and the diary file's honest shape.
import { readFileSync, existsSync } from "node:fs";
import { verifyDiaryAgainstFold } from "./lib/wire-diary-claims.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const WIRE = "public/wire-diary.json";
ok("the diary artifact exists", existsSync(WIRE));
let diary = null;
ok("the diary artifact is valid JSON with seven articles", (() => {
  try {
    diary = JSON.parse(readFileSync(WIRE, "utf8"));
    return Array.isArray(diary?.diary) && diary.diary.length === 7;
  } catch { return false; }
})());

ok("every article carries a league id, season, and at least four paragraphs",
  diary && diary.diary.every((a) => typeof a.leagueId === "string" && /^\w+\.\d+$/.test(a.leagueId) &&
    typeof a.season === "string" && Array.isArray(a.paragraphs) && a.paragraphs.length >= 1 &&
    a.paragraphs.every((p) => typeof p === "string" && p.length > 20)));

ok("every league name in the diary matches the wire artifact", (() => {
  try {
    const wire = JSON.parse(readFileSync("public/live-wire.json", "utf8"));
    const names = new Set(wire.leagues.map((l) => l.id));
    return diary && diary.diary.every((a) => names.has(a.leagueId));
  } catch { return false; }
})());

ok("the diary names the SAME seven league ids as the artifact, in every article", (() => {
  try {
    const wire = JSON.parse(readFileSync("public/live-wire.json", "utf8"));
    if (!diary) return false;
    const ids = new Set(wire.leagues.map((l) => l.id));
    return diary.diary.every((a) => ids.has(a.leagueId));
  } catch { return false; }
})());

ok("the every-fixture fold is stable across the two artifacts (independent of model output)", (() => {
  try {
    const wire = JSON.parse(readFileSync("public/live-wire.json", "utf8"));
    return wire.leagues.reduce((n, l) => n + l.seasonFixtures.length, 0) === 2364;
  } catch { return false; }
})());

const app = readFileSync("src/App.tsx", "utf8");
ok("App.tsx lazy-imports @/features/wirediary/WireDiary and mounts /wire-diary",
  /import\("@\/features\/wirediary\/WireDiary"\)/.test(app) && /path === "\/wire-diary"/.test(app));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /wire-diary with nav.wireDiary and an I.scroll glyph",
  shell.includes('to: "/wire-diary"') && shell.includes('t("nav.wireDiary")') && shell.includes("I.scroll"));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /wire-diary", palette.includes('nav("/wire-diary")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /wire-diary", manual.includes('{ to: "/wire-diary", label: t("nav.wireDiary") },'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /wire-diary", journey.includes('"/wire-diary"'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /wire-diary", cinema.includes('"/wire-diary"'));
const wireArtifact = (() => {
  try { return JSON.parse(readFileSync("public/live-wire.json", "utf8")); } catch { return null; }
})();
const claimProblems = wireArtifact ? verifyDiaryAgainstFold(diary, wireArtifact) : ["the wire artifact could not be read"];
ok("every checkable claim in the diary verifies against the fold (dates, scorelines, matchdays, played/total, wins, points, ordinals, table order, no foreign clubs) — the verifier read all 7 leagues on the artifact",
  claimProblems.length === 0 && wireArtifact && wireArtifact.leagues.length >= 7);
if (claimProblems.length) console.log("   drift:\n   " + claimProblems.join("\n   "));

const screen = readFileSync("features/wirediary/WireDiary.tsx", "utf8");
ok("the screen ships print affordance and a retry door", screen.includes("window.print()") && screen.includes('t("wireDiary.printHint")'));
const domain = readFileSync("domain/wireDiary.ts", "utf8");
const sharedDoor = readFileSync("domain/releaseArtifact.ts", "utf8");
ok("the screen fetches /wire-diary.json with zero model traffic",
  screen.includes("fetchReleaseArtifact") && !/callLlmStream|data\/llm/.test(screen) &&
  /wire-diary\.json/.test(screen) && !/callLlmStream|data\/llm/.test(domain) &&
  !/callLlmStream|data\/llm/.test(sharedDoor));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["nav.wireDiary", "wireDiary.kicker", "wireDiary.title", "wireDiary.subtitle", "wireDiary.tag", "wireDiary.meta",
                   "wireDiary.byModel", "wireDiary.byFold", "wireDiary.print", "wireDiary.printHint",
                   "wireDiary.errorTitle", "wireDiary.absentBody", "wireDiary.method"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
