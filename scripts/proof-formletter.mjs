// Proof for the outcome-letter door — `formLetter` in domain/attributes.ts. The W/D/L-from-goals rule was
// spelled twice in two dialects: analytics' team form (loss-tested-first: `g > c ? "W" : g < c ? "L" :
// "D"`) and `resultPoints`' own body (draw-tested-first) — same football contract, so it is a door now
// (M421). Another semantic duplicate the shape censuses could not see: the two dialects share no syntax.
//
// The census charges the goals-to-letter ternary — either test order, any field names — across the whole
// tree and asserts the only occurrence left is the door body, so a re-inline at any reader reddens it.
// The scan keys on a goal comparison producing a letter, not on ternaries in general: the flag spelling
// (Manager OS's `w ? "W" : d ? "D" : "L"` — already-computed booleans, a different contract), the
// form-letter TONE mappings (`r === "W" ? "bg-success" : …`) and the 3/1/0 ladder itself
// (`letter === "W" ? 3 : …`, a points rule, not a letter rule) stay uncharged — the must-not-unify plants
// prove exactly that. Run: node scripts/proof-formletter.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-formletter-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { formLetter, resultPoints, leaguePoints } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = ["domain/analytics.ts"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The goals-to-letter ternary, either test order: A > B ? "W" : A (===|<) B ? "D"|"L". The two dialects
// differ only in which comparison comes second, and the backreferences keep A and B the same on both sides.
// Dotted identifiers count as one name (analytics spells its fields `r.g` / `r.c`).
const LETTER_RULE = /([\w.]+)\s*>\s*([\w.]+)\s*\?\s*"W"\s*:\s*\1\s*(?:===|<)\s*\2\s*\?\s*"[DL]"/g;
const letterRuleCount = (text) => count(text, LETTER_RULE);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. The flag spelling, the tone mappings and the points ladder are different contracts.
const plantDrawFirst = letterRuleCount("const l = (r.ourGoals > r.oppGoals ? \"W\" : r.ourGoals === r.oppGoals ? \"D\" : \"L\");");
const plantLossFirst = letterRuleCount("const l = (r.g > r.c ? \"W\" : r.g < r.c ? \"L\" : \"D\");");
const plantConverted = letterRuleCount("const l = formLetter(r.g, r.c);");
const plantRides = letterRuleCount("const p = leaguePoints(formLetter(a, b));");
const plantFlags = letterRuleCount("const l = w ? \"W\" : d ? \"D\" : \"L\";");
const plantTone = letterRuleCount("const cls = r === \"W\" ? \"bg-success\" : r === \"L\" ? \"bg-destructive\" : \"bg-muted\";");
const plantLadder = letterRuleCount("const p = letter === \"W\" ? 3 : letter === \"D\" ? 1 : 0;");
ok(`the letter-rule census is armed on both test orders and the converted calls, and refuses the flag spelling, the tone mappings and the points ladder (draw-first ${plantDrawFirst}, loss-first ${plantLossFirst}, converted ${plantConverted}, rides ${plantRides}, flags ${plantFlags}, tone ${plantTone}, ladder ${plantLadder})`,
  plantDrawFirst === 1 && plantLossFirst === 1 && plantConverted === 0 && plantRides === 0 &&
  plantFlags === 0 && plantTone === 0 && plantLadder === 0);

// --- Door declaration: formLetter declared exactly once, in attributes.ts. ------------------------------
const DECL = /\nexport function formLetter\b/g;
const plantDecl = count(`\nexport function formLetter(a, b) { return "W"; }`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`formLetter is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the rule (draw-tested-first), and resultPoints rides it rather than re-spelling. --
const doorBody = (src[HOME].match(/export function formLetter[\s\S]*?return \w+ > \w+ \? "W"[\s\S]*?;/) || [""])[0];
const resultBody = (src[HOME].match(/export const resultPoints[\s\S]*?leaguePoints\(formLetter\([^\n]*/) || [""])[0];
ok(`the door body is the comparison-to-letter rule and resultPoints rides the door rather than re-spelling it ("${doorBody.replace(/\s+/g, " ").trim()}")`,
  /ourGoals > oppGoals \? "W" : ourGoals === oppGoals \? "D" : "L"/.test(doorBody) &&
  resultBody.includes("leaguePoints(formLetter("));

// --- Population floor + the reader present. ------------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and the reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} reader present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only letter rule in the whole tree is the door body. -----------------
const treeCount = carriers.reduce((s, f) => s + letterRuleCount(src[f]), 0);
const homeCount = letterRuleCount(src[HOME]);
ok(`the only goals-to-letter rule in the whole tree is the door body — the reader was converted (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantLossFirst})`,
  plantLossFirst === 1 && treeCount === 1 && homeCount === 1);

// --- The reader calls the door and inlines no rule; the flag spelling is the documented survivor. -------
const CALL = /\bformLetter\(/g;
const readerCalls = count(src[READERS[0]], CALL);
const flagSite = (src["features/manager/ManagerOS.tsx"].match(/[^\n]*w \? "W" : d \? "D" : "L"[^\n]*/) || [""])[0];
ok(`the reader calls formLetter and inlines no rule, and Manager OS's flag spelling survives as the documented different contract (calls ${readerCalls}, flag site kept: ${flagSite.trim().length > 0})`,
  readerCalls >= 1 && READERS.every((f) => letterRuleCount(src[f]) === 0) && flagSite.includes('w ? "W" : d ? "D" : "L"'));

// --- Behavioural: the door equals both old test orders on every sample and keeps the W/D/L contract. ---
const SAMPLES = [[2, 1], [1, 1], [0, 3], [0, 0], [5, 4], [3, 3], [1, 0], [7, 2]];
const eqOk = SAMPLES.every(([h, a]) =>
  formLetter(h, a) === (h > a ? "W" : h === a ? "D" : "L") &&
  formLetter(h, a) === (h > a ? "W" : h < a ? "L" : "D"));
const seamOk = SAMPLES.every(([h, a]) => resultPoints(h, a) === leaguePoints(formLetter(h, a)));
const exhaustiveOk = (() => {
  for (let h = 0; h <= 6; h++) for (let a = 0; a <= 6; a++) {
    const want = h > a ? "W" : h === a ? "D" : "L";
    if (formLetter(h, a) !== want) return false;
  }
  return true;
})();
ok(`the door equals both old test orders on every sample, resultPoints rides it, and the letter is exhaustive over a full 7x7 scoreline grid`, eqOk && seamOk && exhaustiveOk);

// --- Integration: the converted site's shape — analytics' form letters over the recent window. --------
const results = Array.from({ length: 7 }, (_, i) => ({ g: i % 3, c: (i + 1) % 3 }));
const letters = results.slice(-5).map((r) => formLetter(r.g, r.c));
ok(`the door reproduces the converted site's shape — the team form letters over the last five results (${letters.join("")})`,
  letters.length === 5 && letters.every((l) => l === "W" || l === "D" || l === "L"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
