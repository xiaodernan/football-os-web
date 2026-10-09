import { createServer } from "vite";
import { makeSay } from "./lib/rows.mjs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { coachProvider } = await server.ssrLoadModule("/data/ai.ts");
const { ATTRIBUTE_KEYS } = await server.ssrLoadModule("/domain/attributes.ts");
const { say, locales, DICTIONARIES } = await makeSay(server);

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Resolve RowText (or RowText[]) through the app's own interpreter. This proof used to look the key
// up in DICTIONARIES.en and paste `row.vars` into the template by hand, which was a second,
// simpler idea of what a row says: since M230 the coach hands rows attribute CODES and
// `rowLine`'s `fillRowVars` turns them into the reader's words, so the hand copy could only ever
// read the code — one of its clauses demanded a capital-P "Passing" and went red on a provider and
// a screen that were both right.
const resolve = (row) => (Array.isArray(row) ? row.map((r) => say("en")(r)).join(" ") : row ? say("en")(row) : "");

// A deterministic profile + plan-input factory. We pass focusKeys explicitly so
// effFocus is controlled, letting us test the continue-vs-rotate branch cleanly.
const profile = {
  displayName: "Proof", mode: "PLAYER", positionGroup: "MF", position: "CM", ageGroup: "U18",
  goal: "Improve", favoriteClubId: null, favoritePlayerId: null, favoriteCompetitionId: null,
  attributes: { first_touch: 50, passing: 60, shooting: 55, dribbling: 45, scanning: 65 },
  xp: 100, level: 2, createdAt: new Date(0).toISOString(),
};
const input = (over = {}) => ({
  // The prompt is the row the reader will see; the provider derives its own English reading.
  prompt: { value: "help me pass better" },
  profile,
  history: [],
  availableMinutes: 30,
  ...over,
});

// 1. No memory yet → the coach makes no continuity claim (empty-state honesty).
let p = await coachProvider.generatePlan(input({ focusKeys: ["passing"] }));
ok("no lastFocus: no continuity sentence", resolve(p.diagnosis).length > 0 && !/last session/i.test(resolve(p.diagnosis)));
ok("no lastFocus: no coach-memory source", p.sources.length > 0 && !p.sources.some((s) => /Coach memory/.test(resolve(s))));

// 2. Overlap → continue progressive overload framing.
p = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["passing"] }));
ok("overlap: continue framing", /picked up where we left off/i.test(resolve(p.diagnosis)));
ok("overlap: cites the continued attribute label", /Passing/.test(resolve(p.diagnosis)) && !/\bpassing\b/.test(resolve(p.diagnosis)));
ok("overlap: coach-memory source present", p.sources.some((s) => /last session focused on/i.test(resolve(s))));

// 3. Disjoint → rotation framing, and it names BOTH the old and new focus.
p = await coachProvider.generatePlan(input({ focusKeys: ["shooting"], lastFocus: ["passing"] }));
ok("rotate: rotation framing", /rotate/i.test(resolve(p.diagnosis)));
ok("rotate: mentions previous + new focus", /Passing/.test(resolve(p.diagnosis)) && /Shooting/.test(resolve(p.diagnosis)) && !/\b(?:passing|shooting)\b/.test(resolve(p.diagnosis)));
ok("rotate: not the continue phrasing", !/picked up where we left off/i.test(resolve(p.diagnosis)));

// 4. Partial overlap → the overlap is described as continued.
p = await coachProvider.generatePlan(input({ focusKeys: ["shooting", "dribbling"], lastFocus: ["dribbling"] }));
ok("partial: uses continue branch (some overlap)", /picked up where we left off/i.test(resolve(p.diagnosis)));

// 5. Invalid lastFocus keys are filtered, not echoed.
p = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["not_a_real_attr"] }));
ok("invalid lastFocus ignored", !p.sources.some((s) => /Coach memory/.test(resolve(s))) && !/not_a_real_attr/i.test(resolve(p.diagnosis)));

// 6. Determinism: same input → same diagnosis + sources.
const a = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["passing"] }));
const b = await coachProvider.generatePlan(input({ focusKeys: ["passing"], lastFocus: ["passing"] }));
ok("deterministic diagnosis", JSON.stringify(a.diagnosis) === JSON.stringify(b.diagnosis));
ok("deterministic sources", JSON.stringify(a.sources) === JSON.stringify(b.sources));

// 7. The memory source is grounded in the real last focus (label, not raw key).
const labels = resolve(a.sources.find((s) => /Coach memory/.test(resolve(s))) || "");
ok("memory source cites a human label not a raw key", /Passing/.test(labels) && !/passing\b/.test(labels.replace("Passing", "")));

// 8. The "saved attributes (overall N)" source prints the REAL attribute rating,
//    not an XP-derived figure (M76 honesty fix).
const { overallRating } = await server.ssrLoadModule("/domain/attributes.ts");
const xpFigure = Math.round(profile.xp / 100 + 40);
const realOverall = overallRating(profile.attributes);
const srcLine = a.sources.find((s) => /saved attributes \(overall/.test(resolve(s))) || "";
ok("overall source uses overallRating(attributes)", resolve(srcLine) === `Your saved attributes (overall ${realOverall})`);
ok("overall source is NOT the xp-derived figure", realOverall !== xpFigure && !resolve(srcLine).includes(`overall ${xpFigure})`));

// 9. The code a row carries never reaches a reader — over EVERY row both framings compose, in all
//    three locales. The clauses above name one row each; this one is the census, and it is what a
//    provider rewrite trips on: a row whose variable is an attribute key is only honest once
//    somebody turns that key into the reader's word.
const disjoint = await coachProvider.generatePlan(input({ focusKeys: ["shooting"], lastFocus: ["passing"] }));
const censusLeads = [];
let censusRows = 0;
for (const [where, plan] of [["overlap", a], ["rotate", disjoint]]) {
  for (const [field, rows] of [["diagnosis", plan.diagnosis], ["rationale", plan.rationale], ["sources", plan.sources]]) {
    for (const row of rows) {
      censusRows++;
      // The codes this row carries are its own variables — a lowercase English word inside a
      // template that happens to spell an attribute key ("a decision-making block trains
      // scanning") is the dictionary's prose, not a leak, so it is not claimed here.
      const carried = Object.values(row.vars ?? {}).flatMap((v) => String(v).split(",").map((p) => p.trim()));
      const rawCodes = carried.filter((c) => ATTRIBUTE_KEYS.includes(c));
      for (const loc of locales) {
        const s = say(loc)(row);
        const leaks = rawCodes.filter((c) => new RegExp(`(^|[\\s,.;:])${c}($|[\\s,.;:])`).test(s));
        const snake = s.match(/[a-z]+_[a-z]+/g) ?? [];
        // A dictionary key that never resolved would print as `coach.diag.strengths`; no reader's
        // sentence contains one, so the shape itself is the leak.
        const bareKeys = s.match(/\b(?:coach|ai|attr|dna|group|sim|det|onb|prof|rv|common|goal)\.[a-zA-Z][\w.]*\b/g) ?? [];
        if (leaks.length || snake.length || bareKeys.length) {
          censusLeads.push(`${where}.${field} · ${loc} · ${row.key} vars ${JSON.stringify(row.vars)} → “${s}” (codes ${leaks.join(",") || "none"} · snake ${snake.join(",") || "none"} · keys ${bareKeys.join(",") || "none"})`);
        }
      }
    }
  }
}
ok(`no coach row reaches any locale's reader as a raw code, a snake_case id or a bare dictionary key (${censusRows} rows × ${locales.length} locales, ${censusLeads.length} leaks${censusLeads.length ? ": " + censusLeads.join(" || ") : ""})`,
  censusRows > 0 && locales.length > 0 && censusLeads.length === 0);

// 10. And it is the READER's word, not the English one: the same row in 简体中文 carries the
//     dictionary's own label. `translate` falls back to English for an unknown locale id, so the
//     locale is taken from the shipped LOCALES list rather than typed here.
const memoryRow = a.sources.find((s) => s.key === "coach.src.coachMemory");
const zhLocale = locales.find((l) => l !== "en" && /CN/.test(l));
const zhLine = say(zhLocale)(memoryRow);
ok(`the memory row speaks the reader's locale (${zhLocale}: “${zhLine}” against the dictionary's “${DICTIONARIES[zhLocale]["attr.name.passing"]}”)`,
  zhLine.includes(DICTIONARIES[zhLocale]["attr.name.passing"]) && !zhLine.includes("Passing") && !zhLine.includes("{"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
