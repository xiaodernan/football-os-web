// M425. The app's THRESHOLDS: a number that decides something is written in one place.
//
// The defect, measured before it was fixed. Six proofs walk the tree and read it, and a family of
// decisions had been spelled twice, twice more, and four times over:
//
//   · the LEAGUE POSITION BAND — the top quarter and the upper middle of a league table, over the
//     club's share of the field — was written twice in domain/career.ts, three hundred lines
//     apart: the outlook's zone and the season summary's honour each spelled the same two
//     bounds (0.25 and 0.6) over the same share. A change to where the middle band ends would
//     have moved one screen and left the other telling the reader a different thing about the
//     same table.
//   · the EXHAUSTED LINE — the fatigue above which a squad counts as spent — was written twice:
//     the match prep's "play slow" and the Manager OS's fatigue tile, in a domain module and a
//     screen. A change to the line would have moved the app's BEHAVIOUR without moving the tile
//     that reports it, so a reader could have been shown a "good" fatigue beside a team playing
//     slow.
//   · the LEVEL BANDS — the three bands of a 0..1 level, 0.35 and 0.7 — were written four times:
//     the Manager OS's tempo and press words and the Simulation Lab's two slider captions. The
//     Manager OS's own comment said the bands were "the lab's bands", and the code next to it
//     spelled them again.
//   · the DATA ROOM re-derived the fixture forecast the data layer already owns — its own
//     metrics map, its own "too little form data" guard, its own odds and percentages — so the
//     screen and the fixture page computed the same numbers from two copies of one rule.
//
// What this gate reads. A THRESHOLD is a comparison of a value against a NUMERIC LITERAL above
// one: zero and one are presence ("is there anything", "is there exactly one") rather than
// magnitude, and the app asks those two questions two hundred times. A loop's bound is a count of
// repetitions rather than a decision a reader can see, so a `for`/`while` header is not read.
// Every other comparison is a threshold, and the census groups them by the number they compare
// against. A number compared in two places is EITHER one decision written twice — which is a
// defect until it is a door — or two different decisions that happen to share a number, which is
// fine and has to be said out loud. The declaration below says which is which, and the gate
// refuses a number that grows a new site without being declared.
//
// Run: node scripts/proof-thresholds.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// ---------------------------------------------------------------------------
// 1 · the reader
// ---------------------------------------------------------------------------
// A comparison of a value against a numeric literal. The left side may be a call (`Math.abs(adv)`),
// and a compound left side (`a + b`) is read at its last operand — the census groups by the
// NUMBER, and the operand it is attributed to is a name for the site, not a claim about it.
const CMP = /([A-Za-z_$][\w$.]*(?:\([^()]*\))?)\s*(>=|<=|>|<|===|!==|==|!=)\s*(\d+(?:\.\d+)?)\b/g;
// A loop's header is a count of repetitions, not a decision — but the body of a one-line loop is
// code, so only the header itself is skipped.
const LOOP_HEADER = /^\s*(?:for|while)\s*\(/;
// The app's random source. A comparison against a DRAW is a probability, not a threshold: the
// draw is not a value the app put a bound on, and `rng() < 0.35` says nothing about 0.35.
const RANDOM_DRAW = /^(?:rng|prng)\(\)$/;
// Comments are prose about the code, not code: a threshold quoted in a docstring is not a site.
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");

/** Every threshold in a file: the operator, the number, and where it sits. */
const readThresholds = (text) => {
  const out = [];
  stripComments(text).split(/\r?\n/).forEach((line, i) => {
    let body = line;
    const head = LOOP_HEADER.exec(line);
    if (head) {
      let depth = 0, j = head[0].length - 1;
      for (; j < line.length; j++) {
        if (line[j] === "(") depth++;
        else if (line[j] === ")") { depth--; if (depth === 0) break; }
      }
      body = line.slice(j + 1);
    }
    for (const m of body.matchAll(CMP)) {
      const num = m[3];
      if (num === "0" || num === "1") continue; // presence, not magnitude
      if (RANDOM_DRAW.test(m[1])) continue;     // a probability, not a threshold
      out.push({ op: m[2], num, lhs: m[1], line: i + 1 });
    }
  });
  return out;
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

// The groups: every threshold, keyed by the number it compares against.
const groups = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  for (const t of readThresholds(readFileSync(f, "utf8"))) {
    const key = `${t.op} ${t.num}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...t, file: rel });
  }
}
const multi = [...groups.entries()].filter(([, rows]) => rows.length > 1);

// ---------------------------------------------------------------------------
// 2 · the declaration
// ---------------------------------------------------------------------------
// `one`  — a decision that lives in ONE place. The site is the door's own body, so a second
//          spelling of it is a defect the gate can see.
// `split` — different decisions that happen to share a number. Each entry says how many sites
//          and how many files, so the split cannot quietly grow, and why they differ.
const DECLARED = {
  "<= 0.25": { kind: "one", home: "domain/attributes.ts", door: "positionBand", why: "the league table's top band — the quarter bound is written once, in the door that owns the three bands" },
  "<= 0.6": { kind: "one", home: "domain/attributes.ts", door: "positionBand", why: "the league table's upper-middle band — the three-fifths bound is written once, beside the quarter bound" },
  "> 0.6": { kind: "one", home: "domain/career.ts", door: "fatigueIsHigh", why: "the exhausted-squad line — the match prep and the fatigue tile ask the same question, so the door answers it" },
  "< 0.35": { kind: "one", home: "domain/rowText.ts", door: "levelWord", why: "the low band of a 0..1 level — the Manager OS's two words and the Simulation Lab's two captions share one bound" },
  "< 0.7": { kind: "one", home: "domain/rowText.ts", door: "levelWord", why: "the middle band's ceiling — the same level, the same two bounds, one place" },
  "< 2": { kind: "split", sites: 7, files: 6, why: "the smallest sample a rate needs, asked of five different things — a league table of one club is no table, one analysed clip is no rate, one session is no monotony, one drill is no pool, and a side with one match played has no form — plus the onboarding step's own index, which is a step number and not a sample at all" },
  ">= 2": { kind: "split", sites: 5, files: 5, why: "the same sample rule, written the other way round: a team with two games has a metrics row, a training log with two sessions has a focus, two analysed clips have a rate, two metrics make a clash, and the compare tray holds two" },
  ">= 3": { kind: "split", sites: 5, files: 5, why: "five unrelated floors that happen to be three: a midfield edge of three is a press, a career of three results is a record, three goals is an over, a streak of three is a streak, and a three-letter word is worth keeping" },
  "=== 2": { kind: "split", sites: 4, files: 3, why: "the compare pair and the onboarding step: two players are a comparison and two clubs are a clash, and the onboarding step's own index is a step number" },
  "<= 23": { kind: "split", sites: 3, files: 2, why: "the age a player is still developing at: the world engine's growth ladder and its potential unlock, and the career arc's confidence in a young player's ceiling — three floors of two ladders" },
  ">= 70": { kind: "split", sites: 3, files: 3, why: "three different seventies: a news item's confidence is high at seventy, a transfer target's fit is seventy, and an attribute of seventy is a good badge" },
  "< 4": { kind: "split", sites: 3, files: 3, why: "three different fours: a community title needs four characters, the world table highlights its first four rows, and a scout row with fewer than four counts is a thin bar" },
  "< 23": { kind: "split", sites: 2, files: 2, why: "the age a market value or a seeded potential treats as young: the value curve's top band and the seed's potential boost are two different curves that start at the same age" },
  ">= 4": { kind: "split", sites: 2, files: 2, why: "two different fours: an attack edge of four is a good edge in the match prep, and a review of four stars or better is a positive review" },
  "> 4": { kind: "split", sites: 2, files: 2, why: "two different fives above four: a defence edge past four is a bad edge, and a seeded competition with more than four clubs is a league" },
  "< 60": { kind: "split", sites: 2, files: 2, why: "an hour's minutes: the community says minutes ago below sixty, and the dynamic world counts a minute below sixty" },
  "< 1024": { kind: "split", sites: 2, files: 1, why: "one formatter's own ladder — the settings page's byte formatter draws its two lines from the same kilobyte bound" },
  "< 0.01": { kind: "split", sites: 2, files: 1, why: "one decision asked of two quantities in one expression: the tolerance that says a tactic already matches the recommendation, asked of the press and of the tempo" },
};

// ---------------------------------------------------------------------------
// 3 · the clauses
// ---------------------------------------------------------------------------
// The reader is armed: a planted threshold is found, a planted presence test is not, a planted
// loop bound is not, a planted random draw is not, and a planted comparison against a variable is
// not a threshold.
const pFound = readThresholds("const x = a >= 70;").length;
const pZero = readThresholds("const x = a >= 0;").length;
const pOne = readThresholds("const x = a === 1;").length;
const pLoop = readThresholds("for (let i = 0; i < 2; i++) {}").length;
const pRand = readThresholds("const x = rng() < 0.35;").length;
const pVar = readThresholds("const x = a >= b;").length;
const pLoopBody = readThresholds("for (const w of words) if (w.length >= 3) out.push(w);").length;
ok(`the reader is armed (a planted threshold reads ${pFound}, a planted presence test against zero reads ${pZero}, against one reads ${pOne}, a planted loop bound reads ${pLoop}, a planted random draw reads ${pRand}, a comparison against a variable reads ${pVar}, and a one-line loop's BODY reads ${pLoopBody})`,
  pFound === 1 && pZero === 0 && pOne === 0 && pLoop === 0 && pRand === 0 && pVar === 0 && pLoopBody === 1);

// The population is the real app.
const total = [...groups.values()].reduce((s, rows) => s + rows.length, 0);
ok(`the census walks the real app (${appFiles.length} .ts/.tsx, ${total} thresholds against ${groups.size} numbers, ${multi.length} of them compared in more than one place)`,
  appFiles.length >= 90 && total >= 40 && groups.size >= 30 && multi.length >= 5);

// Every group compared in more than one place is declared, and every declaration is still there.
const declaredKeys = Object.keys(DECLARED);
const undeclared = multi.map(([k]) => k).filter((k) => !declaredKeys.includes(k));
const stale = declaredKeys.filter((k) => !groups.has(k));
ok(`every threshold compared in more than one place is declared, and every declaration is still a group the census finds (${multi.length} multi-site group(s), ${undeclared.length} undeclared [${undeclared.join(", ")}], ${stale.length} stale [${stale.join(", ")}])`,
  undeclared.length === 0 && stale.length === 0);

// A `one` entry is a decision that lives in one place: exactly one site, in the door's home.
const oneEntries = declaredKeys.filter((k) => DECLARED[k].kind === "one");
const oneBad = oneEntries.filter((k) => {
  const rows = groups.get(k) ?? [];
  return rows.length !== 1 || rows[0].file !== DECLARED[k].home;
});
ok(`every decision that lives in a door is written once, in that door's home (${oneEntries.length} door bound(s): ${oneEntries.map((k) => `${k} → ${DECLARED[k].door}`).join(", ")}; ${oneBad.length} out of place [${oneBad.join(", ")}])`,
  oneEntries.length === 5 && oneBad.length === 0,
  `out of place: ${oneBad.join(", ")}`);

// A `split` entry is two different decisions sharing a number: the site count and the file count
// are pinned, so the split cannot grow quietly, and the reason says why they differ.
const splitEntries = declaredKeys.filter((k) => DECLARED[k].kind === "split");
const splitBad = splitEntries.filter((k) => {
  const rows = groups.get(k) ?? [];
  const files = new Set(rows.map((r) => r.file)).size;
  return rows.length !== DECLARED[k].sites || files !== DECLARED[k].files;
});
ok(`every split keeps its shape: the sites and the files are pinned, and the reason says why the decisions differ (${splitEntries.length} split(s), ${splitBad.length} changed [${splitBad.join(", ")}])`,
  splitEntries.length === 13 && splitBad.length === 0,
  `changed: ${splitBad.join(", ")}`);

// Every declaration says WHY, in a sentence a reader can weigh.
const thin = declaredKeys.filter((k) => typeof DECLARED[k].why !== "string" || DECLARED[k].why.length < 40);
ok(`every declaration says why, in a sentence a reader can weigh (${declaredKeys.length} declarations, ${thin.length} too short [${thin.join(", ")}])`,
  thin.length === 0 && declaredKeys.length === 18,
  `too short: ${thin.join(", ")}`);

// The doors behave like the inline forms they replaced, on every sample a reader could meet.
const server = await createServer({ root, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { positionBand } = await server.ssrLoadModule("/domain/attributes.ts");
const { fatigueIsHigh } = await server.ssrLoadModule("/domain/career.ts");
const { tempoLevel, pressLevel } = await server.ssrLoadModule("/domain/rowText.ts");
const bandOld = (position, clubCount) => {
  const share = clubCount ? (position - 1) / clubCount : 1;
  return share <= 0.25 ? "top" : share <= 0.6 ? "upperMid" : "drop";
};
let bandSame = true;
for (let clubCount = 1; clubCount <= 20; clubCount++) {
  for (let position = 1; position <= clubCount; position++) {
    if (positionBand(position, clubCount) !== bandOld(position, clubCount)) bandSame = false;
  }
}
const fatigueOld = (f) => f > 0.6;
const fatigueSame = [-0.5, 0, 0.1, 0.59, 0.6, 0.61, 1].every((f) => fatigueIsHigh(f) === fatigueOld(f));
const levelOld = (v, low, medium, high) => (v < 0.35 ? low : v < 0.7 ? medium : high);
const levelSame = [0, 0.34, 0.35, 0.5, 0.69, 0.7, 1].every(
  (v) => tempoLevel(v, (k) => k) === levelOld(v, "sim.low", "sim.medium", "sim.high")
    && pressLevel(v, (k) => k) === levelOld(v, "sim.pressDeep", "sim.medium", "sim.highPress"));
ok(`the doors answer exactly what the inline forms answered (the band over every place in every league up to twenty: ${bandSame}; the fatigue line over seven samples: ${fatigueSame}; the level bands over seven samples: ${levelSame})`,
  bandSame && fatigueSame && levelSame);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
