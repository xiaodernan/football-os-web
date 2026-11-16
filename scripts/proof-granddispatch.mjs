// Proof for The Grand Dispatch (M1169). The artifact is the only source the screen will ever
// consult; the model is an optionalizer gated by LLM_CONFIG, not a truth-setter.
// Run: node scripts/proof-granddispatch.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const wire = readFileSync("public/live-wire.json", "utf8");
const isV3 = (() => { try { return JSON.parse(wire).schema === "live-wire/v3"; } catch { return false; } })();
ok("the committed wire is live-wire/v3, required by every fold and system branch", isV3);

const app = readFileSync("src/App.tsx", "utf8");
ok("App.tsx lazy-imports @/features/granddispatch/GrandDispatch and mounts /grand-dispatch",
  /import\("@\/features\/granddispatch\/GrandDispatch"\)/.test(app) && /path === "\/grand-dispatch"/.test(app));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /grand-dispatch with nav.grandDispatch and an I.newspaper glyph",
  shell.includes('to: "/grand-dispatch"') && shell.includes('t("nav.grandDispatch")') && shell.includes("I.newspaper"));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /grand-dispatch", palette.includes('nav("/grand-dispatch")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /grand-dispatch", manual.includes('{ to: "/grand-dispatch", label: t("nav.grandDispatch") },'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /grand-dispatch", journey.includes('"/grand-dispatch"'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /grand-dispatch", cinema.includes('"/grand-dispatch"'));

const screen = readFileSync("features/granddispatch/GrandDispatch.tsx", "utf8");
ok("the screen wires the ONE streaming door with buildSystem improvised from the SAME artifact (payload)",
  /buildSystem\(payload, locale\)/.test(screen) && /callLlmStream\(\s*\n?\s*"Write the season dispatch\."/.test(screen));
ok("the screen's fallback route is the deterministic fold over the SAME artifact, never an invented answer",
  /buildFallback\(payload, t\)/.test(screen) && /foldBadge/.test(screen));
ok("the imposter system names only artifact-carried facts (summit, form weights, totals) — never news, injuries or players",
  /formLeaders/.test(screen) && !/playerNames|newsFeed|injuries|suspended/.test(screen));
ok("no screen may print the artifact rater directly — the fold rides strictly through t() and the sum() door",
  /sum\(payload\.leagues, \(l\) => l\.totalFixtures\)/.test(screen));
ok("the print affordance rides window.print() with grandDispatch.printHint",
  screen.includes("window.print()") && screen.includes('t("grandDispatch.printHint")'));
ok("exactly one illustration of composed-throughstate shows per dispatch (single article block)",
  (screen.match(/<article/g) ?? []).length === 1);

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of ["nav.grandDispatch", "grandDispatch.kicker", "grandDispatch.title", "grandDispatch.subtitle", "grandDispatch.tag",
                   "grandDispatch.print", "grandDispatch.printHint", "grandDispatch.ask", "grandDispatch.askHint",
                   "grandDispatch.awaiting", "grandDispatch.awaitingBody", "grandDispatch.foldBadge",
                   "grandDispatch.par", "grandDispatch.method"]) {
  ok(`all three locales coin ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
