// Proof for the league-points doors — `leaguePoints` / `resultPoints` in domain/attributes.ts. The
// three-for-a-win / one-for-a-draw rule was spelled four times: analytics' form points (twice, straight
// from W/D/L letters) and career's recent and career points (twice, from goal comparisons) — same
// football contract, so it is a door now (M392). This is a semantic duplicate the shape censuses never
// surfaced: the letter dialect and the goal dialect share no syntax at all.
//
// The census charges both dialects — the letter ladder (`=== "W" ? 3 : … === "D" ? 1 : 0`) and the
// goal-comparison ladder (`.ourGoals > .oppGoals ? 3 : … === .oppGoals ? 1 : 0`) — across the whole tree
// and asserts the only occurrence left is the letter door body, so a re-inline at any reader reddens it.
// The form-letter TONE mappings (DataRoom's and Details' `r === "W" ? "bg-success" : …`) and the prize
// ladder (`? 2_000_000 : …`) are different contracts and stay uncharged — the must-not-unify plants prove
// exactly that. Run: node scripts/proof-leaguepoints.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-leaguepoints-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { leaguePoints, resultPoints } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = ["domain/analytics.ts", "domain/career.ts"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The two dialects of the 3/1/0 ladder.
const LETTER = /===\s*"W"\s*\?\s*3\s*:\s*\w+\s*===\s*"D"\s*\?\s*1\s*:\s*0/g;
const GOALS = /(\w+)\.ourGoals\s*>\s*\w+\.oppGoals\s*\?\s*3\s*:\s*\w+\.ourGoals\s*===\s*\w+\.oppGoals\s*\?\s*1\s*:\s*0/g;
const ladderCount = (text) => count(text, LETTER) + count(text, GOALS);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. The form-letter tone mapping and the prize ladder are different contracts.
const plantLetter = ladderCount("const p = (r === \"W\" ? 3 : r === \"D\" ? 1 : 0);");
const plantGoals = ladderCount("const p = (r.ourGoals > r.oppGoals ? 3 : r.ourGoals === r.oppGoals ? 1 : 0);");
const plantConvertedLetter = ladderCount("const p = sum(form, leaguePoints);");
const plantConvertedGoals = ladderCount("const p = sum(rs, (r) => resultPoints(r.ourGoals, r.oppGoals));");
const plantTone = ladderCount("const cls = r === \"W\" ? \"bg-success\" : r === \"L\" ? \"bg-destructive\" : \"bg-muted\";");
const plantPrize = ladderCount("const prize = r.ourGoals > r.oppGoals ? 2_000_000 : r.ourGoals === r.oppGoals ? 800_000 : 300_000;");
ok(`the ladder census is armed on both dialects and the converted calls, and refuses the form-letter tone mapping and the prize ladder (letter ${plantLetter}, goals ${plantGoals}, converted ${plantConvertedLetter}+${plantConvertedGoals}, tone ${plantTone}, prize ${plantPrize})`,
  plantLetter === 1 && plantGoals === 1 && plantConvertedLetter === 0 && plantConvertedGoals === 0 &&
  plantTone === 0 && plantPrize === 0);

// --- Door declarations: leaguePoints and resultPoints each declared exactly once, in attributes.ts. -----
const DECL_POINTS = /\nexport const leaguePoints\s*=/g;
const DECL_RESULT = /\nexport const resultPoints\s*=/g;
const plantDecl = count(`\nexport const leaguePoints = (l) => 0;`, DECL_POINTS) + count(`\nexport const resultPoints = (a, b) => 0;`, DECL_RESULT);
const declPointsFiles = carriers.filter((f) => count(src[f], DECL_POINTS) > 0);
const declResultFiles = carriers.filter((f) => count(src[f], DECL_RESULT) > 0);
ok(`leaguePoints and resultPoints are each declared exactly once, in the door (planted ${plantDecl}, points ${declPointsFiles.join(",") || "none"}, result ${declResultFiles.join(",") || "none"})`,
  plantDecl === 2 && declPointsFiles.length === 1 && declPointsFiles[0] === HOME &&
  declResultFiles.length === 1 && declResultFiles[0] === HOME);

// --- The letter body is the 3/1/0 ladder, and the goal body rides the letter door. ---------------------
const pointsBody = (src[HOME].match(/export const leaguePoints[\s\S]*?1 : 0;/) || [""])[0];
const resultBody = (src[HOME].match(/export const resultPoints[\s\S]*?\n\s*leaguePoints\(/) || [""])[0];
ok(`the letter body is the 3/1/0 ladder and the goal body rides the letter door rather than re-spelling it ("${pointsBody.replace(/\s+/g, " ").trim().slice(0, 90)}…")`,
  /letter === "W" \? 3 : letter === "D" \? 1 : 0/.test(pointsBody) && resultBody.includes("leaguePoints("));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader is inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: the only ladder in the whole tree is the letter door body. ---------------
const treeCount = carriers.reduce((s, f) => s + ladderCount(src[f]), 0);
const homeCount = ladderCount(src[HOME]);
ok(`the only ladder in the whole tree is the letter door body — every reader was converted, both dialects (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantGoals})`,
  plantGoals === 1 && treeCount === 1 && homeCount === 1);

// --- Every reader uses a door (invoked or passed as the selector — analytics passes leaguePoints itself)
const CALL = /\b(leaguePoints|resultPoints)\b/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call a points door and inline no ladder (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 4 && READERS.every((f) => ladderCount(src[f]) === 0));

// --- Behavioural: both doors equal the old spellings on every sample, and resultPoints rides leaguePoints.
const LETTERS = ["W", "D", "L"];
const MATCHES = [[2, 1], [1, 1], [0, 3], [0, 0], [5, 4], [3, 3], [1, 0]];
const letterOk = LETTERS.every((l) => leaguePoints(l) === (l === "W" ? 3 : l === "D" ? 1 : 0));
const goalsOk = MATCHES.every(([h, a]) =>
  resultPoints(h, a) === (h > a ? 3 : h === a ? 1 : 0));
const seamOk = MATCHES.every(([h, a]) =>
  resultPoints(h, a) === leaguePoints(h > a ? "W" : h === a ? "D" : "L"));
ok(`both doors equal the old spellings on every sample, and resultPoints rides leaguePoints rather than re-spelling the ladder`, letterOk && goalsOk && seamOk);

// --- Integration: the converted sites' shapes — analytics' form sum and career's points sum. -----------
const formPts = ["W", "D", "W", "L", "W"];
const formSum = formPts.reduce((s, l) => s + leaguePoints(l), 0);
const results = [{ ourGoals: 2, oppGoals: 1 }, { ourGoals: 1, oppGoals: 1 }, { ourGoals: 0, oppGoals: 2 }];
const careerSum = results.reduce((s, r) => s + resultPoints(r.ourGoals, r.oppGoals), 0);
ok(`the doors reproduce the converted sites' shapes — the analytics form sum (3W 1D 1L = 10) and the career points sum (W D L = 4) (form ${formSum}, career ${careerSum})`,
  formSum === 10 && careerSum === 4);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
