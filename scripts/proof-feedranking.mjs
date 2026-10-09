// Proof for the club-personalised news feed (domain/newsImpact.ts rankNewsForClub).
//
// Onboarding step 2 tells the visitor their club choice "personalises your feed,
// dashboard and recommendations". That sentence is a promise about data flow, and
// for a long time only two of its three parts were true: the favorite club drove
// the Dashboard's upcoming fixtures and the Transfer Centre's fit board, while the
// news feed ignored it entirely (Dashboard, /football and /news all sliced raw
// `newsFeed`). This gate pins the repaired contract and the honesty rules it has to
// obey, because every one of them can silently regress with a one-line edit:
//
//   1. ranking is ORDER ONLY — same articles, same content, nothing invented,
//      filtered or rewritten;
//   2. relevance comes from the article's OWN entityIds (the club itself, or a
//      player registered to it in the world dataset) — never from a guess;
//   3. a club with no coverage leaves the feed untouched and reports matched 0,
//      so the label can stay silent rather than claim false personalisation;
//   4. the partition is stable on both sides, so "latest first" survives inside
//      each group;
//   5. every screen that displays a ranked slice labels it, and the label is
//      gated on `orderedFor` (non-zero matches) — in all three locales;
//   6. no labelled surface still reads the unranked feed.
//
// Run: node scripts/proof-feedranking.mjs
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const { createServer } = await import("vite");
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { rankNewsForClub } = await server.ssrLoadModule("/domain/newsImpact.ts");
const { newsFeed, playersByClub, getClub, footballProvider } = await server.ssrLoadModule("/data/footballService.ts");
const { DICTIONARIES: D, LOCALES: L } = await server.ssrLoadModule("/i18n/dictionaries.ts");

const ids = (r) => r.items.map((a) => a.id);
const art = (id, entityIds) => ({ id, entityIds, title: "t-" + id });

// --- 1. no club selected → the feed is handed back unchanged ------------------
const base = [art("A", ["c1", "p9"]), art("B", ["c2"]), art("C", ["c1"])];
const none = rankNewsForClub(base, null, []);
ok("undefined club keeps the original order", base.length > 0 && JSON.stringify(ids(none)) === JSON.stringify(["A", "B", "C"]));
ok("null club keeps the original order", JSON.stringify(ids(rankNewsForClub(base, null))) === JSON.stringify(["A", "B", "C"]));
ok("empty-string club is treated as no club", base.length > 0 && rankNewsForClub(base, "").matched === 0 && JSON.stringify(ids(rankNewsForClub(base, ""))) === JSON.stringify(["A", "B", "C"]));
ok("no club reports matched 0 rather than claiming relevance", none.items.length > 0 && none.matched === 0);
ok("no club still returns a fresh array (caller may sort it)", base.length > 0 && none.items.length === base.length && none.items !== base);
const before = JSON.stringify(base);
rankNewsForClub(base, "c1", ["p9"]);
ok("ranking never mutates the caller's article array", JSON.stringify(base) === before);

// --- 2. relevance is the article's own entityIds, order only -----------------
const one = rankNewsForClub(base, "c1", []);
ok("stories naming the club move to the front", JSON.stringify(ids(one)) === JSON.stringify(["A", "C", "B"]));
ok("matched counts the club's own stories", one.matched === 2);
ok("a player of the club also makes a story relevant", JSON.stringify(ids(rankNewsForClub(base, "cX", ["p9"]))) === JSON.stringify(["A", "B", "C"]) && rankNewsForClub(base, "cX", ["p9"]).matched === 1);
ok("player ids work alongside the club id", JSON.stringify(ids(rankNewsForClub(base, "c1", ["p9"]))) === JSON.stringify(["A", "C", "B"]));
ok("an unknown club with no coverage leaves the order intact", base.length > 0 && JSON.stringify(ids(rankNewsForClub(base, "nope", []))) === JSON.stringify(["A", "B", "C"]));
ok("an unknown club reports matched 0", rankNewsForClub(base, "nope", []).items.length > 0 && rankNewsForClub(base, "nope", []).matched === 0);
ok("player ids that appear in no story change nothing", base.length > 0 && JSON.stringify(ids(rankNewsForClub(base, "nope", ["zz1", "zz2"]))) === JSON.stringify(["A", "B", "C"]));

// --- 3. stability, counting and content integrity ----------------------------
// Deliberately built so each group's feed order is NOT id-sorted: a partition
// that re-sorts inside a group still produces the same SET, so only the exact
// order can reveal it.
const many = [art("D", ["c2", "c2"]), art("G", ["c1"]), art("F", ["c2"]), art("E", ["c1"])];
const m = rankNewsForClub(many, "c1", []);
ok("matching stories keep their relative feed order", JSON.stringify(ids(m)) === JSON.stringify(["G", "E", "D", "F"]));
ok("non-matching stories keep their relative order too", JSON.stringify(ids(m).slice(m.matched)) === JSON.stringify(["D", "F"]));
ok("a repeated entity id in one story counts as one match", m.matched === 2);
ok("ranking never drops or invents a story", m.items.length === many.length && new Set(ids(m)).size === many.length);
ok("ranked items are the very same objects, not copies (content untouched)", m.items.every((it) => it === many.find((a) => a.id === it.id)));
ok("ranking is deterministic across calls", JSON.stringify(rankNewsForClub(many, "c1", [])) === JSON.stringify(m));
ok("an empty feed ranks to empty", JSON.stringify(rankNewsForClub([], "c1", [])) === JSON.stringify({ items: [], matched: 0 }));

// --- 4. the real dataset: the rule holds on shipped data --------------------
const clubs = footballProvider.clubs();
ok("the real feed and club list are both non-empty (gate is not vacuous)", newsFeed.length > 0 && clubs.length > 0);
let rankedSomewhere = 0;
for (const c of clubs) {
  const squad = playersByClub(c.id).map((p) => p.id);
  const r = rankNewsForClub(newsFeed, c.id, squad);
  const expected = newsFeed.filter((n) => n.entityIds.some((id) => id === c.id || squad.includes(id)));
  const label = c.id + " (" + expected.length + ")";
  ok("real club leads with exactly its own stories, in feed order · " + label,
    r.matched === expected.length && JSON.stringify(ids(r).slice(0, r.matched)) === JSON.stringify(expected.map((a) => a.id)));
  ok("real club's tail is the untouched remainder in feed order · " + label,
    JSON.stringify(ids(r).slice(r.matched)) === JSON.stringify(newsFeed.filter((n) => !expected.includes(n)).map((a) => a.id)));
  if (r.matched > 0) rankedSomewhere++;
}
ok("at least one club genuinely has coverage, so the label is reachable", rankedSomewhere > 0);
ok("no real club's ranking reports more matches than stories exist", clubs.every((c) => rankNewsForClub(newsFeed, c.id, playersByClub(c.id).map((p) => p.id)).matched <= newsFeed.length));
const biggest = clubs
  .map((c) => ({ c, r: rankNewsForClub(newsFeed, c.id, playersByClub(c.id).map((p) => p.id)) }))
  .sort((a, b) => b.r.matched - a.r.matched)[0];
ok("the best-covered club actually reorders the feed (matched > 0)", biggest.r.matched > 0);
ok("its top story really references that club or its squad",
  biggest.r.items[0].entityIds.some((id) => id === biggest.c.id || playersByClub(biggest.c.id).some((p) => p.id === id)));
ok("club names resolve for every ranked club (label can be spoken)", clubs.every((c) => !!getClub(c.id)?.name));

// --- 5. every labelled surface routes through the ranked feed, in t() --------
const read = (p) => readFileSync(join(root, p), "utf8");
const { readdirSync, existsSync } = await import("node:fs");
const walk = (dir, acc = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", ".workbuddy-ai"].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
};
// Every shipped source file, so a fourth unlabelled call site cannot hide.
const appSource = ["features", "store", "lib", "components", "ui", "src"]
  .map((d) => join(root, d))
  .filter(existsSync)
  .flatMap((d) => walk(d))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
ok("the unguarded-label scan really covers the shipped app", appSource.includes("export function Dashboard"));
const hook = read("lib/hooks.ts");
const dash = read("features/dashboard/Dashboard.tsx");
const world = read("features/football/FootballWorld.tsx");

ok("the store hook is the single place that resolves club ids to a squad",
  /rankNewsForClub\(\s*newsFeed,\s*clubId,\s*clubId \? playersByClub\(clubId\)\.map\(\(p\) => p\.id\) : \[\]\s*\)/.test(hook));
ok("orderedFor is only truthy when stories actually matched", /orderedFor:\s*ranked\.matched\s*&&\s*name\s*\?\s*name\s*:\s*undefined/.test(hook));
const spoken = (dash + world).split('t("news.forClub"').length - 1;
ok("the label is spoken on exactly the three ranked surfaces (dashboard, hub, news list)", spoken === 3);
const gates = [];
for (let i = (dash + world).indexOf('t("news.forClub"'); i >= 0; i = (dash + world).indexOf('t("news.forClub"', i + 1)) {
  gates.push((dash + world).slice(Math.max(0, i - 160), i));
}
ok("every label site is gated on orderedFor — never shown at matched 0", gates.length === spoken && gates.every((g) => /orderedFor\s*(&&|\?)/.test(g)));
ok("no club label is rendered unguarded anywhere in the shipped app",
  appSource.split('t("news.forClub"').length - 1 === spoken);
ok("no labelled surface still slices the unranked feed", !/newsFeed\.slice\(/.test(dash + world));
ok("the news panels read ranked items", (dash + world).match(/personalNews\.items/g).length === 3);

for (const { id } of L) {
  const v = D[id]["news.forClub"];
  ok(`news.forClub (${id}) exists`, typeof v === "string" && v.length > 0);
  // A label that names no club or no count would be an unsourced claim.
  ok(`news.forClub (${id}) names the club and the count it is claiming`, /\{club\}/.test(v) && /\{n\}/.test(v));
  ok(`news.forClub (${id}) says "ordered/first", not "exclusive"`, !/\ball\b|only|全部|只/.test(v));
}

console.log(`\n${newsFeed.length} articles · ${clubs.length} clubs · ${spoken} label sites`);
console.log(`${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
