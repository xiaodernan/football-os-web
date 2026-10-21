// Proof for the form-window doors — `FORM_WINDOW` / `recentResults` in domain/attributes.ts. The "last
// five results" window was hand-written as a bare `slice(-5)` in three places — analytics' team form,
// career's recent points and Manager OS's latest-results list — same contract, so it is a door now
// (M419). This is a duplication the shape census used to report and skip ("slice(-5)", four characters,
// no compute), but a window is a decision: change it in one place and three screens disagree about how
// much form they read.
//
// The census charges the bare window across the whole tree and asserts nothing is left — the door body
// rides the FORM_WINDOW constant, so a re-inlined literal at any reader reddens it. The scan keys on the
// last-five window, not on slicing in general: a first-five display list (`slice(0, 5)`) and other
// windows (`slice(-3)`) are different contracts and stay uncharged — the must-not-unify plants prove
// exactly that. Run: node scripts/proof-recentresults.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-recentresults-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { FORM_WINDOW, recentResults } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = ["domain/analytics.ts", "domain/career.ts", "features/manager/ManagerOS.tsx"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The bare last-five window. The door body rides FORM_WINDOW, so it never matches its own census.
const WINDOW = /\.slice\(-5\)/g;
const windowCount = (text) => count(text, WINDOW);

// --- Plants: arm the census so a "nothing left" verdict is a measurement, and it refuses look-alikes. --
const plantWindow = windowCount("const r = xs.slice(-5);");
const plantFirstFive = windowCount("const r = xs.slice(0, 5);");
const plantOtherWindow = windowCount("const r = xs.slice(-3);");
const plantConverted = windowCount("const r = recentResults(xs);");
ok(`the window census is armed on the bare last-five window and the converted call, and refuses a first-five display list and a different window (window ${plantWindow}, first-five ${plantFirstFive}, other ${plantOtherWindow}, converted ${plantConverted})`,
  plantWindow === 1 && plantFirstFive === 0 && plantOtherWindow === 0 && plantConverted === 0);

// --- Door declarations: recentResults and FORM_WINDOW each declared exactly once, in attributes.ts. -----
const DECL_FN = /\nexport function recentResults\b/g;
const DECL_CONST = /\nexport const FORM_WINDOW\s*=/g;
const plantDecl = count(`\nexport function recentResults(xs) { return xs.slice(-5); }`, DECL_FN) +
  count(`\nexport const FORM_WINDOW = 5;`, DECL_CONST);
const declFnFiles = carriers.filter((f) => count(src[f], DECL_FN) > 0);
const declConstFiles = carriers.filter((f) => count(src[f], DECL_CONST) > 0);
ok(`recentResults and FORM_WINDOW are each declared exactly once, in the door (planted ${plantDecl}, recentResults ${declFnFiles.join(",") || "none"}, FORM_WINDOW ${declConstFiles.join(",") || "none"})`,
  plantDecl === 2 && declFnFiles.length === 1 && declFnFiles[0] === HOME &&
  declConstFiles.length === 1 && declConstFiles[0] === HOME);

// --- The window is five, and the door body rides the constant rather than re-spelling the literal. -----
const constLine = (src[HOME].match(/export const FORM_WINDOW\s*=\s*(\d+);/) || []);
const bodyLine = (src[HOME].match(/export function recentResults[\s\S]*?return xs\.slice\(-FORM_WINDOW\);/) || [""])[0];
ok(`the window is five and the door body rides the constant rather than re-spelling the literal ("${constLine[0]}" | "${bodyLine.replace(/\s+/g, " ").trim()}")`,
  constLine[1] === "5" && /xs\.slice\(-FORM_WINDOW\)/.test(bodyLine));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: no bare window is left anywhere in the tree. -----------------------------
const treeCount = carriers.reduce((s, f) => s + windowCount(src[f]), 0);
ok(`no bare last-five window is left anywhere in the tree — every reader was converted (tree ${treeCount}; a planted inline would read ${plantWindow})`,
  plantWindow === 1 && treeCount === 0);

// --- Every reader calls the door and inlines no window. --------------------------------------------------
const CALL = /\brecentResults\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call recentResults and inline no window (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 3 && READERS.every((f) => windowCount(src[f]) === 0));

// --- Behavioural: the door equals the inline slice on every sample and never mutates its input. -------
const SAMPLES = [
  [1, 2, 3, 4, 5, 6, 7],
  [1, 2, 3],
  [],
  ["a"],
  Array.from({ length: 12 }, (_, i) => i),
];
const eqOk = SAMPLES.every((xs) =>
  recentResults(xs).length === xs.slice(-5).length &&
  recentResults(xs).every((v, i) => v === xs.slice(-5)[i]));
const noMutateOk = (() => {
  const xs = [1, 2, 3, 4, 5, 6];
  const r = recentResults(xs);
  r.reverse();
  return xs.length === 6 && xs[5] === 6;
})();
ok(`the door equals the inline slice on every sample, keeps short and empty inputs whole and never mutates its input (the reversed-display reader stays safe)`, eqOk && noMutateOk);

// --- Integration: the three converted sites' shapes — form letters, recent points, reversed display. ---
const results = Array.from({ length: 7 }, (_, i) => ({ ourGoals: i % 3, oppGoals: (i + 1) % 3 }));
const letters = recentResults(results).map((r) => (r.ourGoals > r.oppGoals ? "W" : r.ourGoals === r.oppGoals ? "D" : "L"));
const recentPts = recentResults(results).reduce((s, r) => s + (r.ourGoals > r.oppGoals ? 3 : r.ourGoals === r.oppGoals ? 1 : 0), 0);
const display = recentResults(results).reverse();
ok(`the door reproduces the converted sites' shapes — the form letters (${letters.length} letters), the recent points (${recentPts}) and the reversed display list (first shown is the newest) (window ${FORM_WINDOW})`,
  letters.length === 5 && recentPts >= 0 && display[0] === results[results.length - 1] && display.length === 5);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
