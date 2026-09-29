// M205 — a proof for domain/footprint.ts: the one record that claims to meet the three
// modes on the profile. Its header promises "real counts, real last-activity timestamps,
// and an honest 'not started' for the pillars a visitor has never used rather than quietly
// hiding them", plus "Pure: every input is passed in, no IO". Until now nothing checked any
// of that — the module was not loaded by any proof at all (measured: 7 of 94 app modules,
// this the largest of them).
//
// Every expectation below is recomputed here from the input object rather than read back
// out of the output, and the plural/threshold words are probed at the boundary (1 vs 2) the
// way this project's other model proofs are.
//
// M234 — the rows are rows. `lines`, `evidence` and `sources` are `RowText`, so nothing in
// here reads them as strings: every reading goes through scripts/lib/rows.mjs's `makeSay`,
// which is the same `rowLine` + `translate` ProfilePage renders with. A proof that resolved
// the row itself would be the second interpreter M232 removed.
import { createServer } from "vite";
import { makeSay } from "./lib/rows.mjs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { buildFootprint } = await server.ssrLoadModule("/domain/footprint.ts");
const { attributeLabel } = await server.ssrLoadModule("/domain/attributes.ts");
const { formatDate } = await server.ssrLoadModule("/i18n/format.ts");
const { LOCALES: L } = await server.ssrLoadModule("/i18n/dictionaries.ts");
const { say, keysOf, translate } = await makeSay(server);
const sayEn = say("en");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log(`ok   ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};

const LOCALE = "en";
const EMPTY = {
  locale: LOCALE,
  player: { sessionsCompleted: 0, minutes: 0, xp: 0, level: 1, plans: 0, goalsDone: 0, lessonsCompleted: 0, lessonsMastered: 0 },
  manager: { active: false, matches: 0 },
  film: { clips: 0, minutes: 0 },
  fan: { watchlist: 0, posts: 0, replies: 0 },
};
const withIn = (over = {}) => {
  const deep = { ...EMPTY, ...over };
  for (const k of ["player", "manager", "film", "fan"]) deep[k] = { ...EMPTY[k], ...(over[k] ?? {}) };
  return deep;
};
const row = (fp, id) => fp.rows.find((r) => r.id === id);
// A row is never read as a string here: `sayEn` is the app's own rowLine, so what this
// proof matches is what ProfilePage prints.
const line = (r, i) => sayEn(r.lines[i]);
const text = (r) => r.lines.map(sayEn).join(" | ");
const lines = (list) => list.map(sayEn).join(" / ");

// ---------------------------------------------------------------------------
// 1 · the shape the profile renders, including the pillars with nothing in them
// ---------------------------------------------------------------------------
const F0 = buildFootprint(EMPTY);
ok(`all four pillars are always returned, in the declared order (${F0.rows.map((r) => r.id).join(" → ")})`,
  F0.rows.map((r) => r.id).join(",") === "player,manager,film,fan");
ok("…each with a title the profile reads off `prof.mode.*`, a route and at least one line, so the panel never renders an empty card",
  F0.rows.every((r) => !!translate("en", `prof.mode.${r.id}`) && r.to?.startsWith("/") && r.lines.length >= 1));
ok(`…and the routes are the real screens (${F0.rows.map((r) => `${r.id}→${r.to}`).join(" ")})`,
  F0.rows.map((r) => r.to).join(",") === "/player,/manager,/film,/watchlist");
const notStarted = F0.rows.filter((r) => !r.active);
ok(`a visitor who has used nothing is told so by every pillar rather than having them hidden (${notStarted.length} inactive, ${F0.rows.filter((r) => /yet|No /.test(text(r))).length} carry a not-started line)`,
  F0.rows.length === 4 && notStarted.length === 4 && F0.rows.every((r) => /yet|No /.test(text(r))));
ok(`pillarsTouched counts the active rows and nothing else (${F0.pillarsTouched} of ${F0.rows.length})`,
  F0.pillarsTouched === 0);
const HALF = buildFootprint(withIn({ player: { sessionsCompleted: 3, minutes: 40, xp: 120, level: 2, plans: 1, goalsDone: 1, lessonsCompleted: 2, lessonsMastered: 1 }, film: { clips: 2, minutes: 15 } }));
ok(`and it tracks them: two populated pillars report two touched (${HALF.pillarsTouched}, active = ${HALF.rows.filter((r) => r.active).map((r) => r.id).join("/")})`,
  HALF.pillarsTouched === 2 && HALF.rows.filter((r) => r.active).map((r) => r.id).join(",") === "player,film");

// ---------------------------------------------------------------------------
// 2 · purity — the header's own claim
// ---------------------------------------------------------------------------
const A = withIn({ player: { sessionsCompleted: 4, minutes: 90, xp: 800, level: 5, plans: 2, goalsDone: 3, lessonsCompleted: 1, lessonsMastered: 1, lastSessionAt: "2026-03-01T10:00:00.000Z" } });
const before = JSON.stringify(A);
const R1 = buildFootprint(A), R2 = buildFootprint(A);
ok("the same input gives byte-identical output on a repeat call", JSON.stringify(R1) === JSON.stringify(R2));
ok("…and the input object is never written to", JSON.stringify(A) === before);
ok("…and a row's lastAt is one of the stamps the caller handed for that pillar, never a synthesized date",
  R1.rows.every((r) => r.lastAt === undefined || [A.player.lastSessionAt, A.player.lastLessonAt, A.manager.lastMatchAt, A.film.lastClipAt, A.fan.lastPostAt].includes(r.lastAt)));

// ---------------------------------------------------------------------------
// 3 · counts are quoted, rounded the same way everywhere
// ---------------------------------------------------------------------------
const p = row(R1, "player");
ok(`the player card quotes sessions and minutes as given (${line(p, 0)})`,
  line(p, 0) === "4 sessions · 90 min trained");
ok(`…level, XP and goals together (${line(p, 1)})`, line(p, 1) === "Level 5 · 800 XP · 3 goals met");
ok(`…and academy lessons with their passed checks (${line(p, 2)})`, line(p, 2) === "1 academy lesson · 1 passed check");
const MINUTED = buildFootprint(withIn({ player: { sessionsCompleted: 1, minutes: 12.34 }, film: { clips: 1, minutes: 0.05 } }));
ok(`minutes are shown to one decimal on the card (${line(MINUTED.rows[0], 0)}) and the total is that rounding of the sum (${MINUTED.totalMinutes} for 12.34 + 0.05)`,
  line(MINUTED.rows[0], 0).includes("12.3 min trained") && MINUTED.totalMinutes === 12.4 &&
  sayEn(MINUTED.evidence[1]) === "12.4 minutes of your own training and film");
ok(`…which is player minutes plus film minutes and nothing else (${buildFootprint(withIn({ player: { minutes: 7 }, film: { minutes: 3 }, manager: { active: true, matches: 2 } })).totalMinutes} for 7+3 with a career in play)`,
  buildFootprint(withIn({ player: { minutes: 7 }, film: { minutes: 3 }, manager: { active: true, matches: 2 } })).totalMinutes === 10);

// The plural forms, at the boundary rather than in the abstract.
const PLURALS = [
  ["player", { player: { sessionsCompleted: 1, minutes: 10 } }, "1 session", "2 sessions"],
  ["player", { player: { sessionsCompleted: 1, minutes: 1, xp: 1, level: 1, goalsDone: 1 } }, "1 goal met", "2 goals met"],
  ["player", { player: { lessonsCompleted: 1, minutes: 1, sessionsCompleted: 1 } }, "1 academy lesson", "2 academy lessons"],
  ["manager", { manager: { active: true, matches: 1, clubName: "FC Demo" } }, "1 fixture managed", "2 fixtures managed"],
  ["film", { film: { clips: 1, minutes: 12 } }, "1 clip analysed", "2 clips analysed"],
  ["fan", { fan: { watchlist: 1 } }, "1 player watched", "2 players watched"],
  ["fan", { fan: { posts: 1, replies: 1 } }, "1 post · 1 reply", "2 posts · 2 replies"],
];
const wrongPlural = [];
for (const [id, over, one, two] of PLURALS) {
  for (const [n, want] of [[1, one], [2, two]]) {
    const inp = withIn(JSON.parse(JSON.stringify(over).replace(/\b1\b/g, String(n))));
    const got = text(row(buildFootprint(inp), id));
    if (!got.includes(want)) wrongPlural.push(`${id} ${n}: "${want}" not in "${got}"`);
  }
}
ok(`every count word agrees with its number at 1 and 2 (${PLURALS.length * 2} forms checked${wrongPlural.length ? `; ${wrongPlural.join(" | ")}` : ", all correct"})`,
  wrongPlural.length === 0);

// ---------------------------------------------------------------------------
// 4 · each pillar's own absence rules
// ---------------------------------------------------------------------------
const mgrStarted = row(buildFootprint(withIn({ manager: { active: true, matches: 0 } })), "manager");
ok(`a career with no fixture played yet says exactly that (${line(mgrStarted, 0)})`,
  line(mgrStarted, 0) === "Career started but no fixture played yet." && mgrStarted.active === false);
const mgrPartial = buildFootprint(withIn({ manager: { active: true, matches: 4, pointsPerGame: 1.5, position: 3 } }));
ok(`the table row needs BOTH position and club count, and says so when one is missing (${text(row(mgrPartial, "manager"))})`,
  !text(row(mgrPartial, "manager")).includes("#3") &&
  text(row(buildFootprint(withIn({ manager: { active: true, matches: 4, pointsPerGame: 1.5, position: 3, clubCount: 18 } })), "manager")).includes("#3 of 18"));
const mgrNoClub = text(row(buildFootprint(withIn({ manager: { active: true, matches: 4, pointsPerGame: 2 } })), "manager"));
const mgrWithClub = text(row(buildFootprint(withIn({ manager: { active: true, matches: 4, pointsPerGame: 2, clubName: "Riverside" } })), "manager"));
// M234: the old code wrote `m.clubName ?? "Your club"` into the row, so a career with no
// name printed an English placeholder no locale could translate. The absent case is its own
// pair of keys now, so nothing invents a name.
ok(`points per game are printed with two decimals, and a career with no club name invents none (${mgrNoClub})`,
  mgrNoClub.includes("2.00 pts/game") && !/Your club/i.test(mgrNoClub) &&
  mgrWithClub.includes("Riverside · 4 fixtures managed"));
const filmMid = (over) => text(row(buildFootprint(withIn({ film: { clips: 3, minutes: 20, ...over } })), "film"));
ok(`the detection line needs both detections and scans-per-minute (${filmMid({ detections: 40, scanPerMinute: 2.5 })})`,
  filmMid({ detections: 40, scanPerMinute: 2.5 }).includes("40 detections · 2.50 scans/min") &&
  !filmMid({ detections: 40 }).includes("detections") && !filmMid({ scanPerMinute: 2.5 }).includes("detections"));
ok(`mean confidence is appended as a percentage only when there is one (${filmMid({ detections: 40, scanPerMinute: 2.5, avgConfidence: 71 })})`,
  filmMid({ detections: 40, scanPerMinute: 2.5, avgConfidence: 71 }).includes("71% mean confidence") &&
  !filmMid({ detections: 40, scanPerMinute: 2.5 }).includes("confidence"));
const focusLine = filmMid({ recurringFocus: [{ key: "passing", clips: 3 }, { key: "dribbling", clips: 1 }] });
ok(`the repeated coaching focus names each attribute through attributeLabel, never a raw key (${focusLine})`,
  focusLine.includes(`Repeated coaching focus: ${attributeLabel("passing")} ×3, ${attributeLabel("dribbling")} ×1`) && !/passing/.test(focusLine.replace(attributeLabel("passing"), "")));
ok("…and the line is absent for an empty focus list rather than printed as nothing",
  !/Repeated/.test(filmMid({ recurringFocus: [] })));
const fanQuiet = row(buildFootprint(withIn({ fan: { watchlist: 2, posts: 0, replies: 0 } })), "fan");
ok(`a watcher who has never posted is told "Nothing posted yet" rather than "0 posts" (${text(fanQuiet)})`,
  line(fanQuiet, 1) === "Nothing posted yet");
ok(`…and a favourite club only appears when one is set (${text(row(buildFootprint(withIn({ fan: { watchlist: 1, favouriteClubName: "Riverside" } })), "fan"))})`,
  text(row(buildFootprint(withIn({ fan: { watchlist: 1 } })), "fan")).indexOf("Supports") === -1 &&
  text(row(buildFootprint(withIn({ fan: { watchlist: 1, favouriteClubName: "Riverside" } })), "fan")).includes("Supports Riverside"));

// ---------------------------------------------------------------------------
// 5 · the timestamps: newest wins, junk is dropped, the locale is the reader's
// ---------------------------------------------------------------------------
const st = buildFootprint(withIn({ player: { lastSessionAt: "2026-02-02T00:00:00.000Z", lastLessonAt: "2026-05-05T00:00:00.000Z" }, manager: { lastMatchAt: "2026-03-03T00:00:00.000Z" }, film: { lastClipAt: "2026-04-04T00:00:00.000Z" }, fan: { lastPostAt: "2026-01-01T00:00:00.000Z" } }));
ok(`the player row's own stamp is the later of its two (${st.rows[0].lastAt})`, st.rows[0].lastAt === "2026-05-05T00:00:00.000Z");
ok(`and the record's most recent activity is the newest across all four (${st.lastActiveAt})`, st.lastActiveAt === "2026-05-05T00:00:00.000Z");
ok("…which holds whatever order the pillars are listed in",
  buildFootprint(withIn({ film: { lastClipAt: "2027-01-01T00:00:00.000Z" }, player: { lastSessionAt: "2026-05-05T00:00:00.000Z" } })).lastActiveAt === "2027-01-01T00:00:00.000Z");
const junkIn = { locale: "en", player: { sessionsCompleted: 0, minutes: 0, xp: 0, level: 1, plans: 0, goalsDone: 0, lessonsCompleted: 0, lessonsMastered: 0, lastSessionAt: "not-a-date" }, manager: { active: false, matches: 0, lastMatchAt: "" }, film: { clips: 0, minutes: 0, lastClipAt: "2026-06-06T00:00:00.000Z" }, fan: { watchlist: 0, posts: 0, replies: 0 } };
const junk = buildFootprint(junkIn);
ok(`an unparseable or empty stamp is dropped rather than becoming the most recent activity (${junk.lastActiveAt}, player row lastAt ${junk.rows[0].lastAt ?? "none"})`,
  junk.lastActiveAt === "2026-06-06T00:00:00.000Z" && junk.rows[0].lastAt === undefined);
ok("a record with no dates at all says so instead of printing an empty date",
  buildFootprint(EMPTY).lastActiveAt === null && /No dated activity/.test(sayEn(buildFootprint(EMPTY).evidence[2])));
const EN = buildFootprint(withIn({ locale: "en", player: { lastSessionAt: "2026-09-12T08:30:00Z" } }));
const ZH = buildFootprint(withIn({ locale: "zh-CN", player: { lastSessionAt: "2026-09-12T08:30:00Z" } }));
const enStamp = say("en")(EN.evidence[2]);
const zhStamp = say("zh-CN")(ZH.evidence[2]);
ok(`the last-activity line is written in the reader's language, not the machine's (${enStamp} vs ${zhStamp})`,
  enStamp === `Most recent activity ${formatDate("en", "2026-09-12T08:30:00Z")}` &&
  zhStamp.includes(formatDate("zh-CN", "2026-09-12T08:30:00Z")) &&
  enStamp !== zhStamp);
ok(`every app locale reaches the door (${L.map((l) => l.id).join("/")})`,
  L.every((l) => say(l)(buildFootprint(withIn({ locale: l.id, player: { lastSessionAt: "2026-09-12T08:30:00Z" } })).evidence[2]).includes(formatDate(l.id, "2026-09-12T08:30:00Z"))));

// M234's own claim: every row the four cards and the evidence block publish reads in the
// reader's language, checked per locale rather than only for the English arm the rest of
// this file probes.
const cardRows = (loc) => {
  const fp = buildFootprint(withIn({ locale: loc }));
  return [...fp.rows.flatMap((r) => r.lines), ...fp.evidence, ...fp.sources];
};
const differing = L.filter((l) => l.id !== "en").map((l) => {
  const mine = cardRows(l.id).map(say(l.id)).join(" ");
  const en = cardRows("en").map(sayEn).join(" ");
  return [l.id, mine !== en && /[\u4e00-\u9fff]/.test(mine)];
});
ok(`the four cards' rows and the evidence block read in ${differing.map(([l, ok]) => `${l}=${ok}`).join(" ")}, never as English`,
  differing.every(([, ok]) => ok));
ok(`every row key they publish exists in the dictionary (${cardRows("en").length} rows per locale)`,
  cardRows("en").every((r) => typeof r.key === "string" && keysOf("en").includes(r.key) && L.every((l) => keysOf(l.id).includes(r.key))));

// ---------------------------------------------------------------------------
// 6 · evidence and provenance
// ---------------------------------------------------------------------------
const EV = buildFootprint(withIn({ player: { sessionsCompleted: 2, minutes: 30 }, film: { clips: 1, minutes: 5 } }));
ok(`evidence is exactly three lines, all derived: touched count, own minutes, newest date (${EV.evidence.length}: ${lines(EV.evidence)})`,
  EV.evidence.length === 3 && sayEn(EV.evidence[0]) === "2 of 4 pillars have real records on this device" && sayEn(EV.evidence[1]) === "35 minutes of your own training and film");
ok("…and the touched figure agrees with the rows above it",
  sayEn(EV.evidence[0]).startsWith(`${EV.pillarsTouched} of ${EV.rows.length}`));
ok(`sources name only the two stores this module actually reads (${lines(EV.sources)})`,
  EV.sources.length === 2 && EV.sources.every((s) => sayEn(s).length > 8) &&
    EV.sources.map(sayEn).join(" ").match(/network|server|sync|cloud/i) === null);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
