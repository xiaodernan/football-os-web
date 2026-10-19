// Proof for the league-table standing door — `byTableStanding` in domain/attributes.ts. The three-tiebreak
// chain "points, then goal difference, then goals for" was spelled three times (career's live standings,
// analytics' team metrics, the season simulator's projected table) in two dialects (a precomputed `gd` field
// and the computed goals-for-minus-goals-against), same contract, so it is a door now (M385).
//
// The census charges the chain's opening — a sort comparator whose first tiebreak is `.points - X.points ||`
// — across the whole tree and asserts the only occurrences left are the door body and footballSeed's seed
// ranking, which keeps the first two tiebreaks but breaks a still-equal pair on the club's overall rating
// (a different contract, documented survivor, like worldEngine's round-then-nudge and footballService's
// localeCompare). The seam also welds the door to analytics' gd field: that field IS goals for minus goals
// against there, so the door's internal recomputation moves no number. Run: node scripts/proof-tablestanding.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-tablestanding-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { byTableStanding } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "domain/attributes.ts";
const READERS = ["domain/career.ts", "domain/analytics.ts", "features/sim/SimulationLab.tsx"];
const SURVIVOR = "data/footballSeed.ts";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui", "app"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The census charges the chain's opening tiebreak: a sort comparator that leads on points descending.
const TABLE_PREFIX = /\.points\s*-\s*[a-z]\.points\s*\|\|/g;
const tableCount = (text) => count(text, TABLE_PREFIX);

// --- Plants: arm the census so a "only two left" verdict is a measurement, and it refuses look-alikes. --
const plantOldGd = tableCount("return out.sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);");
const plantOldNew = tableCount("return Object.values(t).sort((a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf);");
const plantSeed = tableCount("(x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || (byId.get(y.clubId)?.overall ?? 0) - (byId.get(x.clubId)?.overall ?? 0),");
const plantConverted = tableCount("return Object.values(t).sort((a, b) => byTableStanding(a, b));");
const plantCountSort = tableCount(".sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind))");
const plantPctSort = tableCount(".sort((a, b) => b.pct - a.pct || a.target - b.target)");
ok(`the table census is armed on all three old spellings and the seed survivor, and refuses the converted call, a count-desc sort and a pct-desc sort (gd ${plantOldGd}, gf-ga ${plantOldNew}, seed ${plantSeed}, converted ${plantConverted}, count ${plantCountSort}, pct ${plantPctSort})`,
  plantOldGd === 1 && plantOldNew === 1 && plantSeed === 1 && plantConverted === 0 && plantCountSort === 0 && plantPctSort === 0);

// --- Door declaration: byTableStanding declared exactly once, in attributes.ts. -------------------------
const DECL = /\nexport const byTableStanding\s*=/g;
const plantDecl = count(`\nexport const byTableStanding = (a, b) => 0;`, DECL);
const declFiles = carriers.filter((f) => count(src[f], DECL) > 0);
ok(`byTableStanding is declared exactly once, in the door (planted ${plantDecl}, ${declFiles.join(",") || "none"})`,
  plantDecl === 1 && declFiles.length === 1 && declFiles[0] === HOME);

// --- The door body is the three-tiebreak chain, recomputing the difference from gf/ga. ------------------
const bodyLine = (src[HOME].match(/export const byTableStanding[\s\S]*?\n\s*\): number => [^\n]*/) || [""])[0];
ok(`the door's body is points, then goals-for-minus-goals-against, then goals for — no \`gd\` field is read ("${bodyLine.replace(/\s+/g, " ").trim()}")`,
  /b\.points\s*-\s*a\.points\s*\|\|\s*\(b\.gf\s*-\s*b\.ga\)\s*-\s*\(a\.gf\s*-\s*a\.ga\)\s*\|\|\s*b\.gf\s*-\s*a\.gf/.test(bodyLine));

// --- Population floor + every reader present. ----------------------------------------------------------
const present = READERS.concat([HOME, SURVIVOR]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every reader and the survivor are inside it (${carriers.length} .ts/.tsx files, ${READERS.length} readers + survivor present)`,
  carriers.length >= 80 && present);

// --- Convergence completeness: only the door body and footballSeed's overall-tiebreak survivor remain. --
const treeCount = carriers.reduce((s, f) => s + tableCount(src[f]), 0);
const homeCount = tableCount(src[HOME]);
const seedCount = tableCount(src[SURVIVOR]);
ok(`the only inline table-standing comparators left are the door body and footballSeed's documented overall-tiebreak survivor (tree ${treeCount} = home ${homeCount} + seed ${seedCount}; a planted inline would read ${plantOldNew})`,
  plantOldNew === 1 && treeCount === 2 && homeCount === 1 && seedCount === 1);

// --- Every reader calls the door and inlines no table prefix. ------------------------------------------
const CALL = /\bbyTableStanding\(/g;
const perCall = READERS.map((f) => [f, count(src[f], CALL)]);
const totalCalls = perCall.reduce((s, [, n]) => s + n, 0);
ok(`all ${READERS.length} readers call byTableStanding and inline no table prefix (per-file ${perCall.map(([f, n]) => `${f.split("/").pop()}=${n}`).join(",")}, total ${totalCalls})`,
  perCall.every(([, n]) => n >= 1) && totalCalls >= 3 && READERS.every((f) => tableCount(src[f]) === 0));

// --- The survivor is the documented different-contract one: it breaks a still-equal pair on overall. ----
const seedLine = (src[SURVIVOR].match(/[^\n]*byId\.get\(y\.clubId\)\?\.overall[^\n]*/) || [""])[0];
ok(`footballSeed's survivor is the overall-tiebreak variant — same first two tiebreaks, different third, a genuine different contract ("${seedLine.trim()}")`,
  seedLine.includes(".points - x.points ||") && seedLine.includes("byId.get(y.clubId)?.overall"));

// --- Seam weld: analytics' gd field IS goals for minus goals against, so the door's recomputation ------
// --- moves no number for analytics rows. If someone redefines that field, this reddens. ------------------
const analyticsGd = /gd:\s*gf\s*-\s*ga\b/.test(src["domain/analytics.ts"]);
ok(`analytics' gd field is goals for minus goals against, so the door recomputing the difference from gf/ga moves no number for analytics rows (planted seed spelling ${plantOldGd})`,
  analyticsGd && plantOldGd === 1);

// --- Behavioural: the door equals BOTH old dialects (gd-field and computed) on every sample pair. ------
const row = (points, gf, ga) => ({ points, gf, ga });
const withGd = (r) => ({ ...r, gd: r.gf - r.ga });
const oldComputed = (a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
const oldGdField = (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf;
const SAMPLES = [
  [row(60, 40, 20), row(60, 38, 22)],  // equal points, difference 20 vs 16
  [row(60, 40, 20), row(60, 40, 20)],  // fully equal
  [row(50, 99, 0), row(60, 1, 9)],     // points decide, difference irrelevant
  [row(60, 30, 30), row(60, 40, 40)],  // equal points AND difference, goals for 30 vs 40
  [row(55, 12, 7), row(58, 30, 40)],   // points 55 vs 58
];
const computedOk = SAMPLES.every(([a, b]) =>
  byTableStanding(a, b) === oldComputed(a, b) && byTableStanding(b, a) === oldComputed(b, a));
const gdOk = SAMPLES.every(([a, b]) =>
  byTableStanding(withGd(a), withGd(b)) === oldGdField(withGd(a), withGd(b)) &&
  byTableStanding(withGd(b), withGd(a)) === oldGdField(withGd(b), withGd(a)));
ok(`the door equals both old dialects — the computed difference spelling and analytics' gd-field spelling — on every sample pair, so the conversions move no number`, computedOk && gdOk && SAMPLES.length >= 5);

// --- Integration: sorting a mixed table orders points desc, then difference desc, then goals for. ------
const TABLE = [row(60, 1, 9), row(50, 99, 0), row(60, 40, 20), row(60, 40, 40), row(60, 30, 30)];
const ordered = [...TABLE].sort((a, b) => byTableStanding(a, b));
const expected = [row(60, 40, 20), row(60, 40, 40), row(60, 30, 30), row(60, 1, 9), row(50, 99, 0)];
ok(`sorting a mixed table by the door yields points desc, then goal difference desc, then goals for (got ${ordered.map((r) => `${r.points}/${r.gf - r.ga}/${r.gf}`).join(" ")})`,
  ordered.every((r, i) => r.points === expected[i].points && r.gf === expected[i].gf && r.ga === expected[i].ga));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
