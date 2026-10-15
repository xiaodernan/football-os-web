// Proof for the shared day-in-milliseconds constant (lib/utils.ts's `DAY_MS = 86400000`).
// "How many milliseconds is one day" is not a computation — it is a NUMBER — and until this unit the
// tree spelled that one number four ways: domain/load named it `const DAY = 86400000`, domain/review
// and the Review page multiplied a raw `* 86400000`, the History page subtracted a bare `- 86400000`
// for yesterday, and i18n/format divided a `86_400_000`. Two of those spellings already differ only by
// the underscore separator, and each is a missing or doubled zero away from a wrong window. The door
// shares ONLY the number: the three arithmetic shapes folded around it are deliberately NOT merged,
// because they are genuinely different measurements —
//   · the WINDOW (load, review, ReviewPage) is `nowMs - days * DAY_MS`: UTC elapsed 24-hour blocks.
//   · the DAY-DIFF (i18n/format) is `Math.round((localMidnight(a) - localMidnight(b)) / DAY_MS)`: a
//     DST-aware count of wall-calendar days — a 23/25h day rounds to the day the reader sees. Folding
//     this into the elapsed-block window re-introduces M216's bug (a fixture tomorrow 00:30 read as
//     today), so it must stay a divide between local midnights.
//   · the FIXED-YESTERDAY (HistoryPage) is `new Date(now.getTime() - DAY_MS)`: one day off a chosen
//     instant, neither a window span nor a rounded diff.
// The census keys on the literal `86[_]?400[_]?000`; it reads 0 in every consumer, 1 in the door
// (its explanatory comment names the old spellings and is counted with the declaration, which the
// door-only clause accounts for) — and, since M370 folded the last two writer sites (seed's kickoff
// offset and service's scheduled-match window), nowhere else at all. The two data files that used to
// carry them are charged zero-and-imports by a dedicated clause, so a re-inline reddens instead of
// being excused by an identity exemption. scripts/ is not walked, so the plants below arm the scans
// rather than enter the census.
// Run: node scripts/proof-day-ms.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { DAY_MS } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// Clean modules that dropped their own day-ms spelling for the door.
const CONSUMERS = [
  "domain/load.ts", "domain/review.ts", "features/review/ReviewPage.tsx",
  "features/history/HistoryPage.tsx", "i18n/format.ts",
];
// Former writer data files: M370 folded their hand-stitched literals onto the door, so they are
// charged zero-and-imports rather than pinned as residue.
const FORMER = ["data/footballSeed.ts", "data/footballService.ts"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The one day-ms literal, in both its numeric spellings.
const LIT = /\b86[_]?400[_]?000\b/g;
const DECL_DAY_MS = /\nexport const DAY_MS\s*=\s*86400000\s*;/g;
const IMPORT_DAY_MS = /import[^;]*\bDAY_MS\b[^;]*from ["']@\/lib\/utils["']/g;
const USE_DAY_MS = /\bDAY_MS\b/g;
// The three arithmetic shapes the door must NOT fold together.
const WINDOW_MUL = /\*\s*DAY_MS\b/g;
const DIFF_DIV = /\/\s*DAY_MS\b/g;
const FIXED_SUB = /-\s*DAY_MS\b/g;

// --- Plants: arm every scan so a "gone" or "once" verdict is a measurement, not an empty set. ----
const plantLit = count(`x / 86_400_000 + y * 86400000`, LIT);
const plantDecl = count(`\nexport const DAY_MS = 86400000;`, DECL_DAY_MS);
const plantImport = count(`import { cn, DAY_MS } from "@/lib/utils";`, IMPORT_DAY_MS);
const plantMul = count(`nowMs - days * DAY_MS`, WINDOW_MUL);
const plantDiv = count(`(a - b) / DAY_MS`, DIFF_DIV);
const plantSub = count(`t.getTime() - DAY_MS`, FIXED_SUB);
ok(`the six scans are armed (literal ${plantLit}, decl ${plantDecl}, import ${plantImport}, mul ${plantMul}, div ${plantDiv}, sub ${plantSub})`,
  plantLit === 2 && plantDecl === 1 && plantImport === 1 && plantMul === 1 && plantDiv === 1 && plantSub === 1);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). --
const present = CONSUMERS.concat([HOME], FORMER).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: the constant is declared exactly once, and only in the door. --------------------
const declByFile = carriers.filter((f) => count(src[f], DECL_DAY_MS) > 0);
ok(`DAY_MS is declared exactly once, in the door (home ${count(src[HOME], DECL_DAY_MS)}, tree ${declByFile.join(",") || "none"})`,
  count(src[HOME], DECL_DAY_MS) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- The door's own body reads the number it names, and only declares once (not a re-inline). ----
const doorBody = (src[HOME].match(/export const DAY_MS[^\n]*\n?/) || [""])[0];
ok(`the door body is the single assignment DAY_MS = 86400000 (reads "${doorBody.trim()}")`,
  /^export const DAY_MS = 86400000;/.test(doorBody.trim()) && count(doorBody, LIT) === 1);

// --- No clean consumer still hand-stitches the literal — every one imports and reads the door. ----
const consumerLit = CONSUMERS.reduce((s, f) => s + count(src[f], LIT), 0);
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_DAY_MS) >= 1);
const using = CONSUMERS.map((f) => [f, count(src[f], USE_DAY_MS) - count(src[f], IMPORT_DAY_MS)]);
ok(`all five consumers re-inlined nothing and read the door instead (consumer literals ${consumerLit}, importers ${importing.length}/${CONSUMERS.length}, per-file uses ${using.map(([, n]) => n).join(",")}; planted literal reads ${plantLit})`,
  consumerLit === 0 && plantLit === 2 && importing.length === CONSUMERS.length && using.every(([, n]) => n >= 1));

// --- Convergence completeness: outside the door (decl + its explanatory comment) no file in the
// --- walked tree carries the literal any more — the writer exemption is gone, not narrowed. ------
const litByFile = carriers.filter((f) => count(src[f], LIT) > 0);
const strays = litByFile.filter((f) => f !== HOME);
ok(`the literal survives only in the door — no residue remains (carriers ${litByFile.join(",")}; strays ${strays.length}; planted literal reads ${plantLit})`,
  litByFile.length === 1 && litByFile[0] === HOME && strays.length === 0 && plantLit === 2);

// --- The two former writer data files re-inlined nothing and read the door instead — a re-inline
// --- reddens this clause rather than being excused by an identity exemption. ---------------------
const formerLit = FORMER.map((f) => [f.split("/").pop(), count(src[f], LIT)]);
const formerImport = FORMER.filter((f) => count(src[f], IMPORT_DAY_MS) >= 1);
const formerUse = FORMER.map((f) => [f.split("/").pop(), count(src[f], USE_DAY_MS) - count(src[f], IMPORT_DAY_MS)]);
ok(`the two former writer data files hand-stitch nothing and read the door (literal ${formerLit.map(([n, c]) => `${n}=${c}`).join(", ")}; importers ${formerImport.length}/2; uses ${formerUse.map(([n, c]) => `${n}=${c}`).join(", ")})`,
  formerLit.every(([, c]) => c === 0) && formerImport.length === FORMER.length && formerUse.every(([, c]) => c >= 1));

// --- Must-not-unify, shape census: the three arithmetic folds coexist and stay in their lanes. ----
const mulFiles = CONSUMERS.filter((f) => count(src[f], WINDOW_MUL) >= 1);
const divFiles = CONSUMERS.filter((f) => count(src[f], DIFF_DIV) >= 1);
const subFiles = CONSUMERS.filter((f) => count(src[f], FIXED_SUB) >= 1);
ok(`the window-multiply, day-diff-divide and fixed-subtract shapes each have their own file (mul ${mulFiles.join(",")}; div ${divFiles.join(",")}; sub ${subFiles.join(",")})`,
  mulFiles.length >= 3 && divFiles.length === 1 && subFiles.length === 1);

// --- Must-not-unify, DST: format.ts's day count divides two LOCAL midnights, never a raw window. ---
const fmt = src["i18n/format.ts"];
const load = src["domain/load.ts"];
ok(`the day-diff stays a DST-aware divide between local midnights, not an elapsed-block window (blind spot a merged helper would drop)`,
  count(fmt, DIFF_DIV) === 1 && /localMidnight/.test(fmt) && count(fmt, WINDOW_MUL) === 0 && count(load, WINDOW_MUL) >= 3 && count(load, DIFF_DIV) === 0);

// --- Behavioural: the underscore spelling the door replaced is the same number, so nothing moved. --
ok(`DAY_MS is exactly 86400000 == 24*60*60*1000 == the 86_400_000 form it replaced (${DAY_MS})`,
  DAY_MS === 86400000 && DAY_MS === 24 * 60 * 60 * 1000 && DAY_MS === 86_400_000);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
