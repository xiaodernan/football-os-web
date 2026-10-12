import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

// Pins domain/matchProbability.ts — the deterministic Monte-Carlo projection that
// powers Simulation Lab's "Project odds" and the Manager OS fixture preview. Its
// header claims the distribution is fully reproducible and an emergent property of
// the model + the two sides' real inputs, never a guessed feed number. The single
// most important guarantee is that every user-visible percentage (win/draw/loss,
// over-2.5, BTTS, avg goals, top scorelines) is exactly the tally of the very
// simulateMatch runs it says it ran. So this proof replays those runs independently
// and compares field-for-field, then checks determinism, the runs clamp/floor, the
// score-histogram ordering and edge cases, and that a lopsided matchup projects
// lopsided (i.e. the model drives the numbers, not a constant).

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { matchProbability } = await server.ssrLoadModule("/domain/matchProbability.ts");
const { simulateMatch } = await server.ssrLoadModule("/domain/matchEngine.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const round3 = (v) => Math.round(v * 1000) / 1000;
const team = (o = {}) => ({
  name: "Team", overall: 75, attack: 70, midfield: 72, defense: 68, possessionBias: 0.5,
  press: 0.5, tempo: 0.5, fatigue: 0.1, morale: 0.1, form: 0, ...o,
});

// Replay matchProbability's exact loop independently so we can compare its
// aggregates against a hand-computed source of truth (not a re-derived copy of
// the same code — this is the tally of raw simulateMatch outcomes).
function recompute(seedBase, home, away, runs) {
  let hw = 0, dr = 0, aw = 0, hg = 0, ag = 0, hx = 0, ax = 0, btts = 0, over = 0;
  const scores = new Map();
  for (let i = 0; i < runs; i++) {
    const r = simulateMatch({ seed: `${seedBase}:r${i}`, home, away });
    if (r.homeGoals > r.awayGoals) hw++; else if (r.homeGoals === r.awayGoals) dr++; else aw++;
    hg += r.homeGoals; ag += r.awayGoals;
    hx += r.stats.home.xg; ax += r.stats.away.xg;
    if (r.homeGoals > 0 && r.awayGoals > 0) btts++;
    if (r.homeGoals + r.awayGoals >= 3) over++;
    const key = `${r.homeGoals}-${r.awayGoals}`;
    scores.set(key, (scores.get(key) ?? 0) + 1);
  }
  return { hw, dr, aw, hg, ag, hx, ax, btts, over, scores };
}

const home = team({ name: "Man City", attack: 88, midfield: 86, defense: 82 });
const away = team({ name: "Brighton", attack: 74, midfield: 72, defense: 70 });
const seedBase = "proj-mci-bha-2026-09-24";
const RUNS = 40;

// --- field-for-field equality with an independent tally --------------------
const p = matchProbability({ seedBase, home, away, runs: RUNS });
const t = recompute(seedBase, home, away, RUNS);
ok("runs equals the requested count", p.runs === RUNS);
ok("homeName/awayName echo the inputs, not fabricated labels", p.homeName === "Man City" && p.awayName === "Brighton");
ok("seedBase is echoed back verbatim", p.seedBase === seedBase);
ok("homeWinPct is the tally of home wins / runs", p.homeWinPct === round3(t.hw / RUNS));
ok("drawPct is the tally of draws / runs", p.drawPct === round3(t.dr / RUNS));
ok("awayWinPct is the tally of away wins / runs", p.awayWinPct === round3(t.aw / RUNS));
ok("avgHomeGoals is the exact mean of the runs' home goals", p.avgHomeGoals === round3(t.hg / RUNS));
ok("avgAwayGoals is the exact mean of the runs' away goals", p.avgAwayGoals === round3(t.ag / RUNS));
ok("avgHomeXg averages the engine's own xG, not a new estimate", p.avgHomeXg === round3(t.hx / RUNS));
ok("avgAwayXg averages the engine's own xG, not a new estimate", p.avgAwayXg === round3(t.ax / RUNS));
ok("bttsPct is the share of runs where both sides scored", p.bttsPct === round3(t.btts / RUNS));
ok("over25Pct is the share of runs with 3+ total goals", p.over25Pct === round3(t.over / RUNS));

// --- the three result probabilities cover every run exactly ----------------
ok("the outcome tallies partition all runs (hw+dr+aw === runs)", t.hw + t.dr + t.aw === RUNS);
ok("win+draw+loss percentages sum to 1 (within 3-decimal rounding)", Math.abs(p.homeWinPct + p.drawPct + p.awayWinPct - 1) <= 0.003);
ok("every percentage sits in [0,1]",
  [p.homeWinPct, p.drawPct, p.awayWinPct, p.bttsPct, p.over25Pct].every((v) => v >= 0 && v <= 1));
ok("average goals are non-negative", p.avgHomeGoals >= 0 && p.avgAwayGoals >= 0 && p.avgHomeXg >= 0 && p.avgAwayXg >= 0);

// --- mostLikely is a real, correctly-ordered histogram slice ---------------
ok("mostLikely lists at most five scorelines", p.mostLikely.length > 0 && p.mostLikely.length <= 5);
ok("each mostLikely pct equals that scoreline's raw count / runs",
  p.mostLikely.every((s) => s.pct === (t.scores.get(s.score) ?? 0) / RUNS));
ok("scorelines are well-formed H-A integer pairs", p.mostLikely.every((s) => /^\d+-\d+$/.test(s.score)));
ok("mostLikely is sorted by frequency desc, then score asc",
  p.mostLikely.every((s, i) => i === 0 ||
    p.mostLikely[i - 1].pct > s.pct ||
    (p.mostLikely[i - 1].pct === s.pct && p.mostLikely[i - 1].score.localeCompare(s.score) <= 0)));
ok("the listed top scorelines never exceed a total probability of 1",
  p.mostLikely.reduce((sum, s) => sum + s.pct, 0) <= 1 + 1e-9);
ok("every scoreline the histogram reports actually occurred",
  p.mostLikely.every((s) => (t.scores.get(s.score) ?? 0) > 0));

// --- determinism + seed sensitivity ----------------------------------------
const pAgain = matchProbability({ seedBase, home, away, runs: RUNS });
ok("the same seedBase + inputs + runs reproduce an identical projection", JSON.stringify(p) === JSON.stringify(pAgain));
const pAlt = matchProbability({ seedBase: seedBase + "-X", home, away, runs: RUNS });
ok("a different seedBase projects a different distribution", JSON.stringify(pAlt) !== JSON.stringify(p));

// --- the runs clamp/floor is the guardrail the UI's "150 runs" relies on ----
ok("runs defaults to 250 when omitted", matchProbability({ seedBase: "d", home, away }).runs === 250);
ok("runs floors a fractional value", matchProbability({ seedBase: "d", home, away, runs: 37.9 }).runs === 37);
ok("runs never drops below 1", matchProbability({ seedBase: "d", home, away, runs: 0 }).runs === 1 &&
  matchProbability({ seedBase: "d", home, away, runs: -50 }).runs === 1);
ok("runs never exceeds the 1000 ceiling", matchProbability({ seedBase: "d", home, away, runs: 99999 }).runs === 1000);

// --- runs=1 is a single observed scoreline ---------------------------------
const one = matchProbability({ seedBase: "single", home, away, runs: 1 });
const oneR = simulateMatch({ seed: "single:r0", home, away });
ok("a 1-run projection reports exactly that match's scoreline at 100%",
  one.mostLikely.length === 1 && one.mostLikely[0].score === `${oneR.homeGoals}-${oneR.awayGoals}` && one.mostLikely[0].pct === 1);
ok("a 1-run projection's outcome pct is 0 or 1", one.homeWinPct + one.drawPct + one.awayWinPct === 1);

// --- a lopsided matchup projects lopsided (model-driven, not a constant) ---
const strong = team({ name: "Strong", overall: 92, attack: 95, midfield: 92, defense: 92, possessionBias: 0.65, tempo: 0.7, press: 0.7 });
const weak = team({ name: "Weak", overall: 52, attack: 50, midfield: 52, defense: 50, possessionBias: 0.35, tempo: 0.3, press: 0.3 });
const skew = matchProbability({ seedBase: "skew-strong-weak", home: strong, away: weak, runs: 200 });
ok("a dominant side projects more wins than losses", skew.homeWinPct > skew.awayWinPct);
ok("a dominant side projects more goals than its opponent", skew.avgHomeGoals > skew.avgAwayGoals);
// Reversing venue keeps the same talent edge pointing at the same team.
const skewRev = matchProbability({ seedBase: "skew-strong-weak", home: weak, away: strong, runs: 200 });
ok("swapping home/away flips which side is projected to win", skewRev.awayWinPct > skewRev.homeWinPct);

// --- M343: the round3 seam --------------------------------------------------
// analytics.ts (the Data Room's Poisson forecast) and matchProbability.ts (this module, the
// Simulation Lab / Manager match outlook) each carried a byte-identical private
// `Math.round(v * 1000) / 1000`. Identical today, so nothing a reader sees changes — but two
// formulas that part company the moment one is re-rounded, desynchronising the forecast and the
// outlook on the same percentage. Both now import lib/utils's single round3, the same neutral home
// clamp uses: scouting reaches analytics through data/footballService, so a rounder shared by
// analytics must live in a dependency-free module or the import graph would close a cycle. The
// clauses bind the seam three ways — the one declaration, the two imports, and the absence of any
// private or inline copy anywhere in domain+lib — each armed by a planted witness so "no copies
// found" is a measurement, not a blind scan. career.ts carried no round3, so (unlike round1) there
// is no pinned residue: the whole-source scan must come back empty but for lib/utils's own body.
const R3_HOME = "lib/utils.ts";
const R3_CONSUMERS = ["domain/analytics.ts", "domain/matchProbability.ts"];
const r3src = Object.fromEntries([R3_HOME, ...R3_CONSUMERS].map((f) => [f, readFileSync(f, "utf8")]));
const LOCAL_DEF3 = /\n[ \t]*(?:export[ \t]+)?(?:const|function)[ \t]+(?:round3|r3)[ \t]*[(=]/g;
const IMPORTS_R3 = /import[^;]*\bround3\b[^;]*from ["']@\/lib\/utils["']/g;
// Balanced-paren inline round-to-3 counter: walk Math.round( to its matching close, require the
// argument to end in `* 1000` and the close to be followed by `/ 1000` — catches any nesting depth,
// which a fixed-nesting regex cannot (the same blind spot that made round1's one-level scan miss
// three of its carriers).
const inlineRound3 = (src) => {
  let n = 0, i = 0;
  const KEY = "Math.round(";
  while ((i = src.indexOf(KEY, i)) !== -1) {
    let depth = 1, j = i + KEY.length;
    while (j < src.length && depth > 0) { const c = src[j++]; if (c === "(") depth++; else if (c === ")") depth--; }
    if (/\*\s*1000$/.test(src.slice(i + KEY.length, j - 1).trimEnd()) && /^\s*\/\s*1000\b/.test(src.slice(j))) n++;
    i = j;
  }
  return n;
};
const nlocal3 = (s) => (s.match(LOCAL_DEF3) || []).length;
// Plants arm each scan: a private const-decl, a module-scope function alias, an inline two-level
// nested rounding, and the @/lib/utils import must each read 1, else a "0 found" verdict below is
// vacuous.
const plantDecl3 = nlocal3("\nconst r3 = (v: number) => Math.round(v * 1000) / 1000;");
const plantFn3 = nlocal3("\nfunction round3(v: number): number {\n  return Math.round(v * 1000) / 1000;\n}");
const plantInline3 = inlineRound3("  const a = Math.round((xs.reduce((s, x) => s + x, 0) / 1000) * 1000) / 1000;");
const plantImp3 = ('import { round3 } from "@/lib/utils";'.match(IMPORTS_R3) || []).length;
const privateDefs3 = R3_CONSUMERS.filter((f) => nlocal3(r3src[f]) > 0).map((f) => `${f}(${nlocal3(r3src[f])})`);
const importers3 = R3_CONSUMERS.filter((f) => (r3src[f].match(IMPORTS_R3) || []).length > 0);
const inlineInR3 = R3_CONSUMERS.filter((f) => inlineRound3(r3src[f]) > 0).map((f) => `${f}(${inlineRound3(r3src[f])})`);
const r3Carriers = [...readdirSync("domain").filter((f) => f.endsWith(".ts")).map((f) => `domain/${f}`),
  ...readdirSync("lib").filter((f) => f.endsWith(".ts")).map((f) => `lib/${f}`)]
  .map((f) => [f, inlineRound3(readFileSync(f, "utf8"))]).filter(([, n]) => n > 0);
const r3Residue = r3Carriers.map(([f]) => f).filter((f) => f !== R3_HOME);
const { round3: shippedRound3 } = await server.ssrLoadModule("/lib/utils.ts");

ok(`lib/utils exports the one round3 and neither consumer re-declares it (${privateDefs3.join(", ") || "none"}; plants armed: ${plantDecl3}${plantFn3})`,
  plantDecl3 === 1 && plantFn3 === 1 && nlocal3(r3src[R3_HOME]) === 1 && privateDefs3.length === 0);
ok(`the balanced inline scan is armed at depth two and neither consumer still inlines *1000)/1000 (${inlineInR3.join(", ") || "none"}; plant: ${plantInline3})`,
  plantInline3 === 1 && inlineInR3.length === 0 && inlineRound3(r3src[R3_HOME]) === 1);
ok(`both consumers import round3 from @/lib/utils (${importers3.join(", ") || "none"}; plant: ${plantImp3})`,
  plantImp3 === 1 && importers3.length === R3_CONSUMERS.length && R3_CONSUMERS.every((f) => importers3.includes(f)));
ok(`across all of domain and lib the only inline round-to-3 is lib/utils's own exported body — no residue (${r3Residue.join(", ") || "none"}; carriers: ${r3Carriers.map(([f, n]) => `${f}:${n}`).join(", ")})`,
  plantInline3 === 1 && r3Residue.length === 0 && inlineRound3(r3src[R3_HOME]) === 1);
ok("the shared round3 still rounds to three decimals for both the forecast and the outlook",
  shippedRound3(0.12345) === 0.123 && shippedRound3(1) === 1 && shippedRound3(2.9999) === 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
