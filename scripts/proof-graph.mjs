// M180. The knowledge graph panel's words. buildGraph publishes an edge label for every
// relation it draws, and until now those were strings typed into the module — so the
// canvas showed "plays for" to a reader whose whole interface was 简体中文, and the legend
// named four of the five kinds it could colour. This gate keeps both facts: every edge
// row resolves in all three locales, every relation kind the shipped dataset can produce
// is reachable (a key nobody can draw is dead copy), and the legend is derived from the
// colour table rather than restated.
// Run: node scripts/proof-graph.mjs
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { makeSay } from "./lib/rows.mjs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildGraph } = await server.ssrLoadModule("/data/intelligence.ts");
const { footballProvider, getClub } = await server.ssrLoadModule("/data/footballService.ts");
const { say, locales, DICTIONARIES } = await makeSay(server);

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? "  — " + String(detail).slice(0, 160) : "")); }
};

// Queries a reader can actually type, each chosen for the relation kind it draws.
const QUERIES = ["Manchester City", "Erling Haaland", "Premier League", "transfer"];
const GRAPHS = QUERIES.map((q) => [q, buildGraph(q)]);
const EDGES = GRAPHS.flatMap(([, g]) => g.edges);
const isRow = (r) => !!r && typeof r === "object" && "key" in r;
const relationKeys = [...new Set(EDGES.map((e) => (isRow(e.relation) ? e.relation.key : "⟨not a row⟩")))];

// 1. Shape.
ok("the four queries draw a real graph each (" + GRAPHS.map(([, g]) => g.edges.length).join("/") + " edges)",
  GRAPHS.every(([, g]) => g.nodes.length > 0 && g.edges.length > 0));
ok("every edge label the graph publishes is a row",
  EDGES.length > 10 && EDGES.every((e) => e.relation && typeof e.relation === "object" && "key" in e.relation));
ok("and none of them is a sentence typed into the module",
  !/relation:\s*["'`]/.test(readFileSync("data/intelligence.ts", "utf8")));
ok("the scan is reading every relation kind the model can draw (" + relationKeys.length + ")",
  relationKeys.length === 5 && relationKeys.every((k) => k.startsWith("ai.rel.") || k === "ai.kg.pts"));

// 2. Reachability by behaviour: check 18 proves the literal is quoted somewhere; only a
//    walk over the shipped dataset proves an edge can actually carry this word.
const reachable = relationKeys.filter((k) => EDGES.some((e) => e.relation.key === k));
ok("each relation word is drawn by some query a reader can type (" + reachable.length + "/" + relationKeys.length + ")",
  reachable.length === relationKeys.length && !relationKeys.includes("⟨not a row⟩"));
ok("the club query draws the membership and competition edges",
  GRAPHS[0][1].edges.some((e) => e.relation.key === "ai.rel.competes") &&
  GRAPHS[0][1].edges.some((e) => e.relation.key === "ai.rel.hasPlayer"));
ok("the player query draws the affiliation edge", GRAPHS[1][1].edges.some((e) => e.relation.key === "ai.rel.playsFor"));
ok("the competition query draws the points edge", GRAPHS[2][1].edges.some((e) => e.relation.key === "ai.kg.pts"));
ok("the news query draws the mention edge", GRAPHS[3][1].edges.some((e) => e.relation.key === "ai.rel.mentions"));

// 3. What a reader sees.
const CJK = /[一-鿿]/;
const bad = [];
for (const e of EDGES) for (const loc of locales) {
  // A module that went back to typing English publishes a bare string here. Report it as
  // a failed check rather than letting the interpreter throw and take the whole run down
  // with it — a crashed gate proves nothing about which rule the mutation broke.
  if (!isRow(e.relation)) { bad.push(`${loc}: ${JSON.stringify(e.relation)} is not a row`); continue; }
  const s = say(loc)(e.relation);
  if (!s.trim() || /\{\w+\}/.test(s) || s === e.relation.key) bad.push(`${loc}: ${JSON.stringify(e.relation)} → ${s}`);
  if (loc !== "en" && !CJK.test(s)) bad.push(`${loc} left in Latin script: ${s}`);
}
ok("no edge label leaks a key, an unfilled placeholder or English-only words (" + bad.length + " bad)",
  bad.length === 0);
for (const b of bad.slice(0, 5)) console.log("       " + b);
ok("the English relation words read as relations, not as labels for a thing",
  ["ai.rel.competes", "ai.rel.hasPlayer", "ai.rel.playsFor", "ai.rel.mentions"]
    .every((k) => (DICTIONARIES.en[k] ?? "").length > 3 && !/[.]$/.test(DICTIONARIES.en[k])));
// 3b. Identical bytes across the two Chinese locales is legitimate for some words —
//     提及 and "{n} 分" are written the same in both scripts — so this is not a
//     per-key rule. It IS a rule that the zh-TW block is its own writing: if every one of
//     these five were copied, the two locales would be byte-for-byte equal on the whole
//     surface, which is the M143 inheritance failure this check exists to catch.
ok("the zh-TW relation words are 繁體's own writing, not a copy of zh-CN (3 of 5 differ)",
  ["ai.rel.competes", "ai.rel.hasPlayer", "ai.rel.playsFor", "ai.rel.mentions", "ai.kg.pts"]
    .filter((k) => DICTIONARIES["zh-CN"][k] !== DICTIONARIES["zh-TW"][k]).length === 3);

// 4. The figure inside the points edge is the standing table's own number.
const compGraph = GRAPHS[2][1];
const compId = (compGraph.root ?? "").split(":")[1];
const pts = compGraph.edges.filter((e) => e.relation.key === "ai.kg.pts");
const table = footballProvider.standings(compId).slice(0, 8).filter((s) => getClub(s.clubId));
ok("the competition query really roots on a competition (" + compGraph.root + ")",
  (compGraph.root ?? "").startsWith("competition:") && table.length > 0);
ok("the points edge carries a real figure from the table",
  pts.length > 0 && pts.every((e) => Number.isFinite(e.relation.vars?.n) && e.relation.vars.n > 0));
ok("and the figure equals the standing the edge was built from, in table order",
  pts.length > 0 && pts.length === table.length && pts.every((e, i) => e.relation.vars?.n === table[i].points));
ok("say() fills it, so the canvas shows the number and not the token",
  pts.length > 0 && /^\d+ pts$/.test(say("en")(pts[0].relation)));

// 5. The legend is derived from the one table that names the kinds.
const STUDIO = readFileSync("features/ai/AiStudio.tsx", "utf8");
const kinds = [...STUDIO.matchAll(/const TYPE_COLOR[^=]*=\s*\{([\s\S]*?)\};/g)].flatMap((m) => [...m[1].matchAll(/(\w+)\s*:\s*"var\(/g)].map((k) => k[1]));
ok("the colour table names every kind the canvas can draw (" + kinds.join(", ") + ")",
  kinds.length === 5 && kinds.includes("match"));
ok("every kind has a word in every locale",
  kinds.every((k) => locales.every((l) => (DICTIONARIES[l][`ai.legend.${k}`] ?? "").trim().length > 0)));
ok("the legend maps that list instead of handwriting chips",
  /KG_KINDS\.map\(\(kind\)/.test(STUDIO) && /\{\s*KG_KINDS\.map/.test(STUDIO));
ok("and there is exactly one Legend call site, so a hand-added chip cannot sneak back in",
  (STUDIO.match(/<Legend\b/g) ?? []).length === 1);
ok("the canvas resolves the relation row rather than printing it raw",
  /rowLine\(e\.relation,\s*t\)/.test(STUDIO) && !/>\s*\{e\.relation\}\s*</.test(STUDIO));

// 6. A match node really does appear, which is what made the missing fifth word a defect
//    rather than a tidy-up.
ok("a club query puts a fixture node on the canvas (" + [...new Set(GRAPHS[0][1].nodes.map((n) => n.type))].join(",") + ")",
  GRAPHS[0][1].nodes.some((n) => n.type === "match"));

console.log(`\n${EDGES.length} edges read · ${relationKeys.length} relation keys · ${kinds.length} legend kinds · ${locales.length} locales`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
