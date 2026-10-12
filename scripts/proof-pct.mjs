// Proof for the shared ratio-to-whole-percent helper (lib/utils.ts's pct). A credibility, a role
// readiness, a goal's progress and a lesson completion rate are all stored as a 0..1 fraction, and
// the figure a reader is shown is `Math.round(fraction * 100)`. Six domain modules each spelled that
// inline. Identical today, so nothing a reader sees moves — but six formulas that part company the
// moment one gains a rounding tweak or a clamp. They now call one door.
//
// This census keys on the STRUCTURAL spelling, never a bare number: an inline percent site is a
// `Math.round( … * 100 )` whose closing paren is NOT followed by `/ 100`. That exclusion is the
// load-bearing subtlety — round2 in the very same lib/utils.ts is `Math.round(v * 100) / 100`, a
// different denominator (keep two decimals for a stored rating, not a displayed percentage), and the
// proof PINS that the two doors stay distinct so a future "just use pct" reddens instead of silently
// rescaling a stored figure. domain/career.ts is a declared residue: its writer lane is dirty and its
// site is pinned (charged by file identity, not by line) rather than converged here.
// Run: node scripts/proof-pct.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { pct, round2, round3, clamp } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// The six domain modules that now read the door.
const CONSUMERS = [
  "domain/community.ts", "domain/gap.ts", "domain/goals.ts",
  "domain/learn.ts", "domain/newsImpact.ts", "domain/rowText.ts",
];
// A declared, pinned residue: the writer's dirty career.ts still carries one inline percent site.
const RESIDUE = "domain/career.ts";

// Walk the shipped source roots. scripts/ is NOT walked, so the plants below are the reference the
// scans are armed against, never a second charge in the census population.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The inline percent shape, one nesting level deep, whose closing paren is NOT the round2 `/ 100`.
const PERCENT = /Math\.round\((?:[^()]|\([^()]*\))*\* *100\)(?! *\/ *100)/g;
const DECL_PCT = /\nexport const pct[ \t]*=/g;
const IMPORT_PCT = /import[^;]*\bpct\b[^;]*from ["']@\/lib\/utils["']/g;

// --- Plants: arm every scan so a "0 found" or "appears once" verdict is a measurement. ---------
const synthPercent = `  const p = Math.round(n.credibility * 100);\n  const q = Math.round((a / b) * 100);`;
const plantPercent = count(synthPercent, PERCENT);
const plantDecl = count(`\nexport const pct = (ratio: number): number => Math.round(ratio * 100);\n`, DECL_PCT);
const plantImport = count(`import { pct, clamp } from "@/lib/utils";`, IMPORT_PCT);
// The round2 form must NOT read as a percent site — a plant proves the exclusion is load-bearing.
const plantRound2Excluded = count(`  export const round2 = (v: number): number => Math.round(v * 100) / 100;`, PERCENT);
ok(`the three scans are armed and the exclusion bites (percent ${plantPercent}, decl ${plantDecl}, import ${plantImport}, round2-form charged ${plantRound2Excluded})`,
  plantPercent === 2 && plantDecl === 1 && plantImport === 1 && plantRound2Excluded === 0);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). --
const present = CONSUMERS.concat([HOME, RESIDUE]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: the door is declared exactly once, in lib/utils, and nowhere else. ------------
const declByFile = carriers.filter((f) => count(src[f], DECL_PCT) > 0);
ok(`pct is declared exactly once, in the door (home ${count(src[HOME], DECL_PCT)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_PCT) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- Must-not-unify: pct drops the fraction; round2 keeps two decimals. ------------------------
// Both bodies share the `Math.round(… * 100)` prefix, so the difference is the trailing `/ 100`.
// Reading each body's denominator from source is the guard: if someone edits pct to `/ 100` (or
// round2 to drop it) this clause reddens rather than shipping a rescaled stored rating.
const pctBody = (src[HOME].match(/export const pct[\s\S]*?;/) || [""])[0];
const r2Body = (src[HOME].match(/export const round2[\s\S]*?;/) || [""])[0];
ok(`pct is Math.round(ratio * 100) with no denominator, while round2 keeps / 100 — the two doors are deliberately different`,
  /Math\.round\([^)]*\* *100\)/.test(pctBody) && !/\/ *100/.test(pctBody) && pctBody.length > 20 &&
    /Math\.round\([^)]*\* *100\) *\/ *100/.test(r2Body));

// --- Every consumer imports the door. ----------------------------------------------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_PCT) >= 1);
ok(`all six domain modules import pct from @/lib/utils (${importing.length}/${CONSUMERS.length}: ${importing.join(", ")})`,
  importing.length === CONSUMERS.length);

// --- No inline percent site survives in a converged consumer (planted, so the zero is measured).
const consumerPercent = CONSUMERS.map((f) => [f, count(src[f], PERCENT)]);
const plantConsumerHasSite = count(`  cred: Math.round(n.credibility * 100),`, PERCENT);
ok(`none of the six consumers still spells the percent inline (read ${consumerPercent.map(([, n]) => n).join(",")}; planted inline reads ${plantConsumerHasSite})`,
  plantConsumerHasSite === 1 && consumerPercent.every(([, n]) => n === 0));

// --- career.ts is the ONLY domain residue, charged by file identity, not by line. --------------
const domainFiles = carriers.filter((f) => f.startsWith("domain/"));
const domainPercentSites = domainFiles.filter((f) => count(src[f], PERCENT) > 0);
ok(`exactly one domain module still carries an inline percent site and it is the pinned career.ts residue (${domainPercentSites.join(",") || "none"})`,
  domainPercentSites.length === 1 && domainPercentSites[0] === RESIDUE);

// --- Behavioural: the shipped door reproduces the formula on the values the app feeds it. ------
// Ratios the six consumers actually pass: credibility/readiness/completion/goal fractions, plus the
// half-boundary the toFixed-vs-Math.round family is sensitive to. pct must equal `Math.round(x*100)`
// on every one (equality to the formula it replaced, not to a hand-typed number).
const RATIOS = [0, 0.004, 0.5, 0.625, 0.75, 0.87, 0.999, 1, 0.4999];
const agrees = RATIOS.every((r) => pct(r) === Math.round(r * 100));
ok(`the shipped pct answers Math.round(ratio * 100) for every ratio the consumers pass (${RATIOS.length} ratios), incl a .625→${pct(0.625)} half case`,
  agrees && pct(0.5) === 50 && pct(1) === 100 && pct(0) === 0);

// --- Must-not-unify, behavioural: pct and round2 give different answers on the same input. -----
// The proof-timeline day-key census uses this device for a deliberate sibling pair; here the two
// doors share a prefix but a caller that swapped one for the other would move every stored rating
// by two orders of magnitude, so a 0-on-one / large-on-the-other reading is the witness.
ok(`pct and round2 disagree on a shared ratio so they cannot be silently unified (pct(0.87)=${pct(0.87)} vs round2(0.87)=${round2(0.87)})`,
  pct(0.87) === 87 && round2(0.87) !== pct(0.87) && round3(0.87) === 0.87);

// --- goals.ts composes the door under clamp, preserving its 0..100 cap. -----------------------
// goalProgressPct now reads clamp(pct(fraction), 0, 100); the residue proof is that clamp is the
// same door the rest of the app uses (M341), imported in the same statement — not a fresh clamp.
ok(`goals.ts reaches both doors from one lib/utils import (pct + clamp co-imported)`,
  /import[^;]*\bclamp\b[^;]*\bpct\b|import[^;]*\bpct\b[^;]*\bclamp\b/.test(src["domain/goals.ts"]));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
