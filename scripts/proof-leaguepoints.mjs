// Proof for the league-points doors — `leaguePoints` / `resultPoints` in domain/attributes.ts. The
// three-for-a-win / one-for-a-draw rule was spelled four times: analytics' form points (twice, straight
// from W/D/L letters) and career's recent and career points (twice, from goal comparisons) — same
// football contract, so it is a door now (M392). This is a semantic duplicate the shape censuses never
// surfaced: the letter dialect and the goal dialect share no syntax at all.
//
// The census charges all three dialects — the letter ladder (`=== "W" ? 3 : … === "D" ? 1 : 0`), the
// goal-comparison ladder (`.ourGoals > .oppGoals ? 3 : … === .oppGoals ? 1 : 0`) and, since M420, the
// if-branch credit (`.points += 3` / `+= 1` / `points++`) — across the whole tree and asserts the only
// occurrence left is the letter door body, so a re-inline at any reader reddens it. The branch spelling
// escaped the two ternary patterns for as long as they were the only shapes charged (the M387 lesson):
// career's table bump, footballSeed's double-sided standings and the sim lab's round robin all
// hand-spelled the ladder where the census could not see it. The form-letter TONE mappings (DataRoom's
// and Details' `r === "W" ? "bg-success" : …`) and the prize ladder (`? 2_000_000 : …`) are different
// contracts and stay uncharged — the must-not-unify plants prove exactly that.
// Run: node scripts/proof-leaguepoints.mjs
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
const READERS = [
  "domain/analytics.ts", "domain/career.ts", "data/footballSeed.ts",
  "features/sim/SimulationLab.tsx",
];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The dialects of the 3/1/0 ladder: the letter ternary, the goal-comparison ternary, and — added in
// M420 — the if-branch credit (`row.points += 3` / `+= 1` / `points++`). M396's census charged only the
// two ternary shapes, and the branch spelling escaped through exactly that hole (the M387 lesson again:
// three live sites — career's bump, footballSeed's double-sided table build and the sim lab's apply —
// hand-spelled the ladder where the census could not see it).
const LETTER = /===\s*"W"\s*\?\s*3\s*:\s*\w+\s*===\s*"D"\s*\?\s*1\s*:\s*0/g;
const GOALS = /(\w+)\.ourGoals\s*>\s*\w+\.oppGoals\s*\?\s*3\s*:\s*\w+\.ourGoals\s*===\s*\w+\.oppGoals\s*\?\s*1\s*:\s*0/g;
const BRANCH = /\.points\s*(?:\+=\s*[13]\b|\+\+)/g;
const ladderCount = (text) => count(text, LETTER) + count(text, GOALS) + count(text, BRANCH);

// --- Plants: arm the census so a "only the door body left" verdict is a measurement, and it refuses ----
// --- look-alikes. The form-letter tone mapping, the prize ladder and an xp credit are different contracts.
const plantLetter = ladderCount("const p = (r === \"W\" ? 3 : r === \"D\" ? 1 : 0);");
const plantGoals = ladderCount("const p = (r.ourGoals > r.oppGoals ? 3 : r.ourGoals === r.oppGoals ? 1 : 0);");
const plantBranchWin = ladderCount("row.points += 3;");
const plantBranchDraw = ladderCount("row.points += 1;");
const plantBranchInc = ladderCount("h.points++; a.points++;");
const plantConvertedLetter = ladderCount("const p = sum(form, leaguePoints);");
const plantConvertedGoals = ladderCount("const p = sum(rs, (r) => resultPoints(r.ourGoals, r.oppGoals));");
const plantConvertedBranch = ladderCount("row.points += resultPoints(gf, ga);");
const plantTone = ladderCount("const cls = r === \"W\" ? \"bg-success\" : r === \"L\" ? \"bg-destructive\" : \"bg-muted\";");
const plantPrize = ladderCount("const prize = r.ourGoals > r.oppGoals ? 2_000_000 : r.ourGoals === r.oppGoals ? 800_000 : 300_000;");
const plantXp = ladderCount("xp += 3;");
ok(`the ladder census is armed on all three dialects (letter, goals, the if-branch credit) and the converted calls, and refuses the form-letter tone mapping, the prize ladder and an xp credit (letter ${plantLetter}, goals ${plantGoals}, branch ${plantBranchWin}+${plantBranchDraw}+${plantBranchInc}, converted ${plantConvertedLetter}+${plantConvertedGoals}+${plantConvertedBranch}, tone ${plantTone}, prize ${plantPrize}, xp ${plantXp})`,
  plantLetter === 1 && plantGoals === 1 && plantBranchWin === 1 && plantBranchDraw === 1 &&
  plantBranchInc === 2 && plantConvertedLetter === 0 && plantConvertedGoals === 0 &&
  plantConvertedBranch === 0 && plantTone === 0 && plantPrize === 0 && plantXp === 0);

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
ok(`the only ladder in the whole tree is the letter door body — every reader was converted, all three dialects (tree ${treeCount}, home ${homeCount}; a planted inline would read ${plantBranchWin})`,
  plantBranchWin === 1 && treeCount === 1 && homeCount === 1);

// --- Every reader uses a door (invoked or passed as the selector — analytics passes leaguePoints itself)
const CALL = /\b(leaguePoints|resultPoints)\b/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call a points door and inline no ladder (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 4 && READERS.every((f) => ladderCount(src[f]) === 0));

// --- Behavioural: both doors equal the old spellings on every sample — letter, goal ternary AND the
// --- if-branch credit (`win ? += 3 : draw ? += 1 : 0`) — and resultPoints rides leaguePoints.
const LETTERS = ["W", "D", "L"];
const MATCHES = [[2, 1], [1, 1], [0, 3], [0, 0], [5, 4], [3, 3], [1, 0]];
const letterOk = LETTERS.every((l) => leaguePoints(l) === (l === "W" ? 3 : l === "D" ? 1 : 0));
const goalsOk = MATCHES.every(([h, a]) =>
  resultPoints(h, a) === (h > a ? 3 : h === a ? 1 : 0));
const branchOk = MATCHES.every(([h, a]) =>
  resultPoints(h, a) === (h > a ? 3 : h === a ? 1 : 0) &&
  resultPoints(a, h) === (a > h ? 3 : a === h ? 1 : 0));
const seamOk = MATCHES.every(([h, a]) =>
  resultPoints(h, a) === leaguePoints(h > a ? "W" : h === a ? "D" : "L"));
ok(`both doors equal the old spellings on every sample — the letter ternary, the goal ternary and the if-branch credit on both sides — and resultPoints rides leaguePoints rather than re-spelling the ladder`, letterOk && goalsOk && branchOk && seamOk);

// --- Integration: the converted sites' shapes — analytics' form sum, career's points sum, and the
// --- double-sided table builds (footballSeed's standings, the sim lab's round robin): three points to
// --- the winner and none to the loser, one to each on a draw, whichever table credits them.
const formPts = ["W", "D", "W", "L", "W"];
const formSum = formPts.reduce((s, l) => s + leaguePoints(l), 0);
const results = [{ ourGoals: 2, oppGoals: 1 }, { ourGoals: 1, oppGoals: 1 }, { ourGoals: 0, oppGoals: 2 }];
const careerSum = results.reduce((s, r) => s + resultPoints(r.ourGoals, r.oppGoals), 0);
const tableSum = (hg, ag) => resultPoints(hg, ag) + resultPoints(ag, hg);
ok(`the doors reproduce the converted sites' shapes — the analytics form sum (3W 1D 1L = 10), the career points sum (W D L = 4) and the double-sided table credit (3 total for a win, 2 for a draw) (form ${formSum}, career ${careerSum}, table ${tableSum(2, 1)}/${tableSum(1, 1)})`,
  formSum === 10 && careerSum === 4 && tableSum(2, 1) === 3 && tableSum(1, 1) === 2 && tableSum(0, 2) === 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
