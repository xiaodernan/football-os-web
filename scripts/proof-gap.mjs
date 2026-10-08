import { createServer } from "vite";

// Pins domain/gap.ts — the Role Gap Analysis behind /development, whose top
// priorities are auto-tracked as development goals. Its header makes two promises
// this proof guards: the analysis is PURE and reproducible, and the target is a
// DEMO heuristic model estimate that never claims anything about real players.
// Rather than hard-code archetype numbers (which would re-derive the heuristic and
// go stale the moment it is retuned), this replays gap.ts's own returned `items`
// through the documented formulas and checks every derived field, the sort/filter/
// cap rules, the readiness weighting, the confidence clamp, the honest empty/data
// branches, and two bound scenarios (a 99-rated player clears every role target; a
// 10-rated player has no strengths). A wrong aggregation breaks the build.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { analyzeGap } = await server.ssrLoadModule("/domain/gap.ts");
const { ATTRIBUTE_DEFS, attributeLabel, overallRating } = await server.ssrLoadModule("/domain/attributes.ts");
const { rowLine } = await server.ssrLoadModule("/domain/rowText.ts");
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");

// The model publishes rows now, so any assertion about the words it hands a screen
// has to read them the way a screen does. This is the reader's own `t`: look the key
// up, then fill the variables rowLine already resolved (a code variable such as
// `group` arrives here as the human word, not as the id).
const en = DICTIONARIES.en;
const t = (key, vars) => {
  let s = en[key] ?? key;
  for (const [k, v] of Object.entries(vars ?? {})) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
  return s;
};
// A row that is a plain string is the regression this proof exists to catch, so it is
// passed through rather than thrown on: `rowLine` would raise "Cannot use 'in'", which
// is red but says nothing, while this lets the "every row is a key" clause below name
// the failure and keeps the rest of the run readable.
const line = (row) => (typeof row === "string" ? row : (rowLine(row, t) ?? ""));

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const ROLE_FLOOR = 52;
const KEYS = ATTRIBUTE_DEFS.map((d) => d.key);
const all = (v) => Object.fromEntries(KEYS.map((k) => [k, v]));
const r1 = (v) => Math.round(v * 10) / 10;

// --- purity + determinism + never mutating the caller's object --------------
const fixture = all(70);
const snapshot = JSON.stringify(fixture);
const a = analyzeGap({ attributes: fixture, group: "ST" });
ok("analyzeGap is deterministic (same input → identical output)",
  JSON.stringify(a) === JSON.stringify(analyzeGap({ attributes: fixture, group: "ST" })));
ok("analyzeGap never mutates the attributes it is given", JSON.stringify(fixture) === snapshot);

// --- items mirror the attribute catalogue exactly ---------------------------
ok("items cover every ATTRIBUTE_DEF key, in order",
  a.items.length === KEYS.length && a.items.every((it, i) => it.key === KEYS[i]));
ok("each item row carries keys and numbers, never a display label",
  a.items.every((it) => Object.keys(it).sort().join(",") === "actual,criticality,delta,key,target"));
ok("every item key resolves in the attribute name table, so the dictionary can name it",
  a.items.every((it) => attributeLabel(it.key) !== it.key));
ok("delta = round(target - actual, 1) and criticality = max(0, target - floor)",
  a.items.length > 0 && a.items.every((it) => it.delta === r1(it.target - it.actual) && it.criticality === Math.max(0, it.target - ROLE_FLOOR)));
ok("criticality is never negative", a.items.length > 0 && a.items.every((it) => it.criticality >= 0));

// --- overall is the same weighting the rest of the app uses -----------------
ok("overall equals overallRating of the very attributes passed in", a.overall === overallRating(fixture));
ok("skill is a 0..1 tier", a.skill > 0 && a.skill <= 1);

// --- readiness re-derived from the weighted covered/required formula --------
function recomputeReadiness(items) {
  let covered = 0, required = 0;
  for (const it of items) { const w = it.criticality || 0.25; covered += Math.min(it.actual, it.target) * w; required += it.target * w; }
  return required > 0 ? Math.round((covered / required) * 100) : 0;
}
ok("readiness reproduces the weighted coverage formula", a.readiness === recomputeReadiness(a.items));
ok("readiness is an integer 0..100", Number.isInteger(a.readiness) && a.readiness >= 0 && a.readiness <= 100);

// --- priorities: only role-relevant deficits, ranked and capped -------------
const prioExpected = a.items
  .filter((it) => it.criticality > 0 && it.delta > 0)
  .sort((x, y) => y.delta * y.criticality - x.delta * x.criticality)
  .slice(0, 6)
  .map((it) => it.key);
ok("priorities are exactly the top-6 crit>0 delta>0 items in delta×criticality order",
  JSON.stringify(a.priorities.map((p) => p.key)) === JSON.stringify(prioExpected));
ok("every priority has room to grow on a role-relevant trait",
  a.priorities.every((p) => p.criticality > 0 && p.delta > 0));
ok("priorities never exceed 6 entries", a.priorities.length <= 6);

// --- strengths: at/above role target, largest surplus first, capped ---------
ok("every strength is genuinely at/above its role target", a.strengths.every((s) => s.actual >= s.target));
ok("strengths are sorted by surplus (actual-target) descending",
  a.strengths.every((s, i) => i === 0 || a.strengths[i - 1].actual - a.strengths[i - 1].target >= s.actual - s.target));
ok("strengths never exceed 4 entries", a.strengths.length <= 4);

// --- confidence clamp + honesty sources -------------------------------------
const present = KEYS.filter((k) => typeof fixture[k] === "number").length;
ok("confidence is the clamped present-length figure",
  a.confidence === Math.max(55, Math.min(80, 60 + Math.round(present / 8))) && a.confidence >= 55 && a.confidence <= 80);
ok("sources label this a demo heuristic model, not real players",
  a.sources.length >= 2 && a.sources.some((s) => /demo|heuristic/i.test(line(s))) && a.sources.some((s) => /your saved attribute/i.test(line(s))));
ok("evidence states the readiness figure it actually computed", a.evidence.some((e) => line(e).includes(`${a.readiness}%`)));
// --- bound scenario: an near-perfect player clears every role target --------
const star = analyzeGap({ attributes: all(99), group: "CM" });
ok("a 99-rated player reaches full readiness", star.readiness === 100);
ok("a 99-rated player has no role deficits to prioritise", star.priorities.length === 0);
ok("a 99-rated player is reported with strengths", star.strengths.length > 0 && star.strengths.every((s) => s.actual >= s.target));

// --- bound scenario: a uniform weak player has no strengths -----------------
const weak = analyzeGap({ attributes: all(10), group: "CB" });
ok("a 10-rated player is far from role readiness", weak.readiness > 0 && weak.readiness < 30);
ok("a 10-rated player reports no relative strengths", weak.strengths.length === 0);
ok("a 10-rated player surfaces development priorities", weak.priorities.length > 0);

// --- empty-data branch stays honest -----------------------------------------
const none = analyzeGap({ attributes: {}, group: "W" });
ok("no saved attributes → hasData false, confidence 0", none.hasData === false && none.confidence === 0);
ok("no saved attributes → an explicit 'No saved attributes' evidence line, not a fabricated read",
  none.evidence.length === 1 && /no saved attributes/i.test(line(none.evidence[0])));
ok("partial data flips hasData true", KEYS.length > 0 && analyzeGap({ attributes: { [KEYS[0]]: 60 }, group: "W" }).hasData === true);

// --- every row the model publishes is a key ----------------------------------
// Checked across all four scenarios, not only the populated one: the empty-data
// branch carries the single line a mutation is most likely to put back as prose,
// and a clause that only read `a` reported clean while it did.
const ALL_ROWS = [a, star, weak, none].flatMap((x) => [...x.evidence, ...x.sources]);
ok("every evidence and source row is a key, never a sentence typed in the module",
  ALL_ROWS.every((r) => r && typeof r === "object" && typeof r.key === "string"));
ok("no row resolves to its own key — each one has words in the dictionary",
  ALL_ROWS.length > 0 && ALL_ROWS.every((r) => line(r) && !line(r).startsWith("gap.")));

// --- the group word now comes from the dictionary, not a helper in this module ---
// `groupLabel` was deleted when the evidence line stopped composing the label itself:
// the row carries the PositionGroup id and rowText resolves it. The guarantee it
// provided — a known group reads as a human word, an unknown one is never invented —
// is the same, so it is asserted on the path that now supplies it.
ok("a known group id resolves to a human label in every locale",
  ["en", "zh-CN", "zh-TW"].every((l) => DICTIONARIES[l]["group.ST"] && DICTIONARIES[l]["group.GK"]) && en["group.ST"] === "Striker" && en["group.GK"] === "Goalkeeper");
ok("an unknown group id still prints as the id, not as a missing-key string",
  (en["group.XX"] ?? "group.XX") === "group.XX");
ok("the traits-compared row carries the group id for the reader to resolve",
  a.evidence.some((e) => e && e.key === "gap.ev.traitsCompared" && e.vars && e.vars.group === "ST"));
ok("the analysis hands the UI the group id, not a resolved label",
  a.group === "ST" && !("groupLabel" in a));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
