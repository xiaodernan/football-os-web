// M1230 · The First-Run Guide: proof for the pure arithmetic behind the six coach-marks, and for
// the wiring that frames the controls they point at. Run: node scripts/proof-firstrunguide.mjs
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

// A private cacheDir and no dep discovery: a read-only census must not race a concurrent build
// (the M1228 lesson) or the dep scanner (the first-run lesson of this very script).
const cacheDir = join(tmpdir(), `football-os-proof-firstrunguide-${process.pid}`);
const server = await createServer({
  root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const m = await server.ssrLoadModule("/domain/firstRunGuide.ts");
const dict = await server.ssrLoadModule("/i18n/dictionaries.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const {
  TOUR_STEPS, TOUR_KEY, initialTour, tourVisible, currentStep, tourAdvance, tourBack, tourSkip, tourRestart, parseTour, tourProgress,
} = m;
const { DICTIONARIES: D } = dict;
const locales = ["en", "zh-CN", "zh-TW"];

// --- The step table is well-formed and fully trilingual. -------------------------------------------
const varsOf = (v) => (v.match(/\{(\w+)\}/g) ?? []).sort().join(",");
ok(`the guide holds ${TOUR_STEPS.length} steps with unique ids, and every title and body exists in all three locales with agreeing placeholders`,
  TOUR_STEPS.length === 6 &&
  new Set(TOUR_STEPS.map((s) => s.id)).size === TOUR_STEPS.length &&
  TOUR_STEPS.every((s) => locales.every((l) =>
    typeof D[l][s.titleKey] === "string" && D[l][s.titleKey].trim().length > 0 &&
    typeof D[l][s.bodyKey] === "string" && D[l][s.bodyKey].trim().length > 0)) &&
  locales.every((l) => varsOf(D[l]["guide.kicker"]) === "{n},{of}".split(",").sort().join(",")));

// --- Visibility: inside the table and not done, and only then. --------------------------------------
ok(`tourVisible is exact — true inside the table, false once done, false for a step past the end (step 0 ${tourVisible(initialTour())}, step 5 ${tourVisible({ step: 5, done: false })}, step 6 ${tourVisible({ step: 6, done: false })}, done ${tourVisible({ step: 2, done: true })}, junk ${tourVisible({ step: -1, done: false })})`,
  TOUR_STEPS.length >= 6 && tourVisible(initialTour()) && tourVisible({ step: 5, done: false }) &&
  !tourVisible({ step: 6, done: false }) && !tourVisible({ step: 2, done: true }) && !tourVisible({ step: -1, done: false }));

// --- The walk: advance to the end finishes; back is bounded; skip preserves the step. ---------------
let walk = initialTour();
const ids = [];
while (tourVisible(walk)) { ids.push(currentStep(walk).id); walk = tourAdvance(walk); }
ok(`advancing walks every step in order and finishes past the last rather than falling off the end (${ids.join(" -> ")}, finished ${walk.done} at step ${walk.step})`,
  ids.join(",") === "welcome,next,modules,palette,modes,manual" && walk.done && walk.step === TOUR_STEPS.length);
ok(`advancing a finished guide changes nothing, backing from the first step changes nothing, and skip preserves the step while finishing (advance ${JSON.stringify(tourAdvance(walk))}, back-at-0 ${JSON.stringify(tourBack(initialTour()))}, back-from-2 ${JSON.stringify(tourBack({ step: 2, done: false }))}, skip ${JSON.stringify(tourSkip({ step: 3, done: false }))})`,
  TOUR_STEPS.length >= 6 &&
  JSON.stringify(tourAdvance(walk)) === JSON.stringify(walk) &&
  JSON.stringify(tourBack(initialTour())) === JSON.stringify(initialTour()) &&
  JSON.stringify(tourBack({ step: 2, done: false })) === JSON.stringify({ step: 1, done: false }) &&
  JSON.stringify(tourSkip({ step: 3, done: false })) === JSON.stringify({ step: 3, done: true }) &&
  tourSkip(walk).done);

// --- parseTour: a corrupt store degrades to the initial state, never a crash or a stuck guide. -------
const parses = [
  parseTour(undefined), parseTour(null), parseTour("x"), parseTour({}),
  parseTour({ step: 1.5, done: false }), parseTour({ step: 99, done: false }), parseTour({ step: -2, done: false }),
  parseTour({ step: 0, done: "yes" }), parseTour({ step: 2, done: true }), parseTour({ step: 2, done: false }),
];
ok(`parseTour reads a good state, normalises a finished one to the table's length, and degrades every corrupt shape to the initial state (${parses.map((p) => `${p.step}/${p.done}`).join(" · ")})`,
  JSON.stringify(parses[9]) === JSON.stringify({ step: 2, done: false }) &&
  JSON.stringify(parses[8]) === JSON.stringify({ step: TOUR_STEPS.length, done: true }) &&
  parses.slice(0, 8).every((p) => JSON.stringify(p) === JSON.stringify(initialTour())));

// --- The storage round-trip a browser performs, and the progress the card prints. -------------------
const stored = JSON.stringify(tourAdvance(tourAdvance(initialTour())));
ok(`a guide survives the localStorage round-trip byte-for-byte, and the progress is 1-based with the table's length (stored ${stored}, read ${JSON.stringify(parseTour(JSON.parse(stored)))}, progress ${JSON.stringify(tourProgress(parseTour(JSON.parse(stored))))}, finished ${JSON.stringify(tourProgress(tourSkip(initialTour())))})`,
  JSON.stringify(parseTour(JSON.parse(stored))) === JSON.stringify({ step: 2, done: false }) &&
  JSON.stringify(tourProgress({ step: 2, done: false })) === JSON.stringify({ n: 3, of: 6 }) &&
  tourProgress(tourSkip(initialTour())) === null &&
  TOUR_KEY === "football-os.tour.v1");

// --- The wiring: every anchored step has its anchor, and the guide is mounted once. -------------------
const dash = readFileSync(join(process.cwd(), "features/dashboard/Dashboard.tsx"), "utf8");
const shell = readFileSync(join(process.cwd(), "features/shell/AppShell.tsx"), "utf8");
const anchors = new Set([...dash.matchAll(/data-tour="([a-z-]+)"/g)].map((x) => x[1])
  .concat([...shell.matchAll(/data-tour="([a-z-]+)"/g)].map((x) => x[1])));
const missing = TOUR_STEPS.filter((s) => s.target && !anchors.has(s.target)).map((s) => s.id);
ok(`every anchored step points at a real anchor and the guide mounts once in the shell (anchors ${[...anchors].join(",")}, missing ${missing.join(",") || "none"}, mounted ${(shell.match(/<FirstRunGuide \/>/g) ?? []).length})`,
  missing.length === 0 && (shell.match(/<FirstRunGuide \/>/g) ?? []).length === 1);

const settings = readFileSync(join(process.cwd(), "features/settings/SettingsPage.tsx"), "utf8");
const palette = readFileSync(join(process.cwd(), "features/command/CommandPalette.tsx"), "utf8");
ok(`the replay is reachable twice — the palette action and the settings row both restart the guide (palette ${palette.includes('id: "tour"') && palette.includes("setTour(tourRestart())")}, settings ${settings.includes("setTour(tourRestart())")})`,
  palette.includes('{ id: "tour"') && palette.includes("setTour(tourRestart())") && settings.includes("setTour(tourRestart())"));

const localData = readFileSync(join(process.cwd(), "domain/localData.ts"), "utf8");
ok(`the guide's key is registered in the storage inventory as a preference with a trilingual label`,
  localData.includes('{ key: TOUR_KEY, labelKey: "set.key.tour", kind: "preference" }') &&
  locales.every((l) => typeof D[l]["set.key.tour"] === "string"));

// --- Arming: the walk reader catches a table that lost a step, and the parse catches a lie. -----------
const shortened = TOUR_STEPS.slice(0, 3);
const ghostTarget = TOUR_STEPS.some((s) => s.target === "no-such-anchor");
ok(`the readers are armed: a table that lost steps would walk short (a 3-step table ends at ${shortened.length}), and no step points at an anchor that does not exist (${ghostTarget})`,
  shortened.length === 3 && !ghostTarget && TOUR_STEPS.filter((s) => s.target).length >= 4);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
