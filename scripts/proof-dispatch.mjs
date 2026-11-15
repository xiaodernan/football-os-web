// Proof for the Dispatch (M1156). The broadsheet prints what the seven wires carry — this proof
// keeps that honesty checkable: the route is real everywhere a route can hide, the print ruleset
// actually reaches the DOM the screen renders, and the i18n keys all exist. The numbers on the
// page are the artifact's own; the proof for those lives in proof-live-wire and proof-grand-tour.
// Run: node scripts/proof-dispatch.mjs
import { readFileSync, existsSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const src = readFileSync("features/dispatch/Dispatch.tsx", "utf8");
const printRules = [
  "print:bg-white",
  "print:rounded-none",
  "break-inside-avoid",
  "print:border-black",
  "print:hidden",
];
for (const rule of printRules) {
  ok(`the print ruleset deploys \`${rule}\``, src.includes(rule));
}

const appTsx = readFileSync("src/App.tsx", "utf8");
ok("src/App.tsx lazy-imports @/features/dispatch/Dispatch", /import\("@\/features\/dispatch\/Dispatch"\)/.test(appTsx));
ok("src/App.tsx mounts /dispatch", /path === "\/dispatch"/.test(appTsx));
const shell = readFileSync("features/shell/AppShell.tsx", "utf8");
ok("the shell nav carries /dispatch with nav.dispatch", /to: "\/dispatch", label: t\("nav\.dispatch"\)/.test(shell));
const palette = readFileSync("features/command/CommandPalette.tsx", "utf8");
ok("the command palette goto group carries /dispatch", palette.includes('nav("/dispatch")'));
const manual = readFileSync("features/manual/Manual.tsx", "utf8");
ok("the manual's chapter-3 link list carries /dispatch", manual.includes('{ to: "/dispatch", label: t("nav.dispatch") },'));
const cinema = readFileSync("tests/e2e/cinematic.spec.ts", "utf8");
ok("the cinematic catalogue walks /dispatch", cinema.includes('"/dispatch"'));
const journey = readFileSync("domain/journey.ts", "utf8");
ok("the Journey's watch chapter carries /dispatch", journey.includes('"/dispatch"'));

ok("the screen renders from the committed artifact via fetchLiveWire + foldGrandTour (no network at runtime)",
  /import \{ fetchLiveWire/.test(src) && /foldGrandTour/.test(src) && !/fetch\(/.test(src.replace(/fetchLiveWire/g, "")));

const dict = readFileSync("i18n/dictionaries.ts", "utf8");
for (const key of [
  "dispatch.kicker", "dispatch.title", "dispatch.subtitle",
  "dispatch.edition", "dispatch.print", "nav.dispatch", "tour.loudestHint",
]) {
  ok(`all three locales declare ${key}`, (dict.match(new RegExp(`"${key.replace(/\./g, "\\.")}":`, "g")) ?? []).length === 3);
}

// the edition stamp is rendered from the payload's own generated_at — never hard-coded
ok("the edition stamp interpolates {at} from the artifact, not a literal",
  /t\("dispatch\.edition", \{ at: generated\.slice\(0, 10\) \}\)/.test(src));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
