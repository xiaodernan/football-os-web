import { createServer } from "vite";
import { makeSay } from "./lib/rows.mjs";

// Pins domain/newsImpact.ts — the "what does this story mean" panel on a news article.
// Its header promises it never invents facts, and the panel's three lists (context, watch,
// evidence) are the only place that promise reaches a reader. M233 moved all sixteen of
// those lines onto rows, which created a new way to be wrong: a row whose key is missing,
// whose variable is a code the interpreter does not resolve, or which a screen prints
// without resolving at all — all of them type-check, build and read fine in English.
//
// So this proof does not pattern-match the sentences. It asks the APP what each row says
// (scripts/lib/rows.mjs's `makeSay`, the same seam every row-reading proof uses, so the
// gate and the page cannot diverge into two ideas of what a row says) and then asserts
// three properties of the words that come back: they are words, they change with the
// reader's language, and a rank is a number in every one of them.

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildImpact } = await server.ssrLoadModule("/domain/newsImpact.ts");
const { say, locales } = await makeSay(server);

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const ARTICLE = { kind: "Rumor", credibility: 0.62, topics: ["transfers", "premier-league"] };
const ENTITIES = [
  { id: "p1", label: "Luka Mendy", role: "player", to: "/players/p1", clubName: "Arsenal", competitionName: "Premier League" },
  { id: "p2", label: "Tomas Reyes", role: "player", to: "/players/p2", clubName: "Arsenal" },
  { id: "c1", label: "Arsenal", role: "club", to: "/clubs/ars" },
];
// Three standings, one per zone arm: 3 is top-four, 19 is inside the bottom three of 20, and
// 11 is neither. All three arms are exercised rather than only the first.
const STANDINGS = [
  { clubLabel: "Arsenal", competitionName: "Premier League", position: 3, total: 20, points: 41 },
  { clubLabel: "Everton", competitionName: "Premier League", position: 19, total: 20, points: 18 },
  { clubLabel: "Fulham", competitionName: "Premier League", position: 11, total: 20, points: 28 },
];

const impact = buildImpact({ article: ARTICLE, entities: ENTITIES, standings: STANDINGS });
const ALL = [...impact.context, ...impact.watch, ...impact.evidence];

// --- the rows are rows, not sentences typed in the module -------------------
ok("every line the panel shows is a row, never a sentence the module wrote",
  ALL.length > 0 && ALL.every((r) => r && typeof r === "object" && typeof r.key === "string"));
ok("the module composes no sentence of its own any more",
  !/context\.push\(`|watch\.push\(`|evidence\s*=\s*\[\s*`/.test(String(buildImpact)));

// --- and every row says words, in every locale ------------------------------
// A raw key means the dictionary has no such row; a snake_case token means a code reached the
// page unresolved. Both read as gibberish and neither fails a type-check.
const CODEISH = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/;
const leaks = [];
for (const locale of locales) {
  const reader = say(locale);
  for (const row of ALL) {
    const line = reader(row);
    if (!line || !line.trim()) leaks.push(`${locale}: ${row.key} rendered empty`);
    else if (line.includes(row.key)) leaks.push(`${locale}: ${row.key} printed its own key`);
    else if (/\bni\.[a-z]/i.test(line)) leaks.push(`${locale}: ${row.key} leaked a ni.* key`);
    else if (CODEISH.test(line)) leaks.push(`${locale}: ${row.key} printed a code (${line.match(CODEISH)[0]})`);
  }
}
ok(`no row reaches a reader as a key, an empty string or a snake_case code (${ALL.length} rows × ${locales.length} locales, ${leaks.slice(0, 4).join(" | ") || "clean"})`,
  ALL.length > 0 && locales.length > 0 && leaks.length === 0);

// --- the reader's language actually changes the words ----------------------
const en = say("en"), zh = say("zh-CN");
const standing = impact.context.find((r) => r.key.startsWith("ni.ctx.standing"));
ok("a standing line is written differently in English and in 简体中文",
  standing !== undefined && en(standing) !== zh(standing) && /第/.test(zh(standing)) && /sit/.test(en(standing)));

// --- a rank is a number, not an English ordinal ----------------------------
// `1st`/`3rd` is a suffix only English has; the row's own language has to be free to write
// 第 3 名. The module used to compose the suffix itself, so this is the clause that would
// catch it coming back — including in the one locale where the suffix would look right.
const ORDINAL = /\b\d+(?:st|nd|rd|th)\b/;
const ordinals = [];
for (const locale of locales) {
  for (const row of impact.context.filter((r) => r.key.startsWith("ni.ctx.standing"))) {
    const line = say(locale)(row);
    if (ORDINAL.test(line)) ordinals.push(`${locale}: ${line}`);
  }
}
ok(`no standing line carries an English ordinal suffix in any locale (${ordinals.slice(0, 3).join(" | ") || "clean"})`,
  ALL.length > 0 && ordinals.length === 0);
ok("the rank the module hands the row is the raw number",
  impact.context.filter((r) => r.key.startsWith("ni.ctx.standing")).every((r) => typeof r.vars.rank === "number"));

// --- the zone arm follows the position, not a first-match ------------------
ok("a top-four club gets the top-four line, a bottom-three club the bottom line, and neither in between",
  impact.context[0].key === "ni.ctx.standingTop" && impact.context[1].key === "ni.ctx.standingBottom" && impact.context[2].key === "ni.ctx.standingMid");

// --- the player line picks the arm that matches what the record holds ------
const atClub = impact.context.filter((r) => r.key.startsWith("ni.ctx.atClub"));
ok("a player with a competition named gets the arm that names it, and one without gets the short arm",
  atClub.length === 2 && atClub[0].key === "ni.ctx.atClubComp" && atClub[1].key === "ni.ctx.atClub");
ok("the player's own name and club reach the row as values, not as codes",
  atClub[0].vars.player === "Luka Mendy" && atClub[0].vars.club === "Arsenal");

// --- the stance paragraph follows the article's own type -------------------
const KINDS = ["Confirmed", "Reported", "Rumor", "Opinion", "Analysis"];
const stances = KINDS.map((kind) => buildImpact({ article: { ...ARTICLE, kind }, entities: ENTITIES, standings: STANDINGS }).watch[0]);
ok("all five article types get a stance paragraph, and no two are the same",
  new Set(stances.map((r) => en(r))).size === 5);
ok("the stance is a key the reader resolves, not the dataset's own word",
  stances.every((r) => r.key.startsWith("ni.stance.")) && stances.every((r) => !KINDS.includes(en(r))));

// --- the evidence names the article type through the interpreter ------------
const kindRow = impact.evidence.find((r) => r.key === "ni.ev.kind");
ok("the evidence line's story type is resolved as a code, so it is not the raw dataset value",
  kindRow !== undefined && kindRow.vars.stance === "Rumor" && en(kindRow) !== "Rumor" && /Rumour/.test(en(kindRow)));

// --- the two conditional lines appear only when their condition holds ------
const noTopics = buildImpact({ article: { ...ARTICLE, topics: [] }, entities: ENTITIES, standings: STANDINGS });
ok("no topics in the article means no topics line",
  !noTopics.watch.some((r) => r.key === "ni.watch.topics") && impact.watch.some((r) => r.key === "ni.watch.topics"));
const unresolved = buildImpact({ article: ARTICLE, entities: [], standings: STANDINGS });
ok("nothing resolved means the caution line, and something resolved means it is absent",
  unresolved.watch.some((r) => r.key === "ni.watch.unresolved") && !impact.watch.some((r) => r.key === "ni.watch.unresolved"));

// --- the confidence the panel prints is still derived, not asserted --------
ok("confidence stays inside the clamp the header documents",
  impact.confidence >= 5 && impact.confidence <= 96 && impact.certainty === "moderate");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
