import { makeRng, rngInt, rngFloat, weightedPick, hashString } from "@/lib/rng";
import { clamp, fmt2 } from "@/lib/utils";
import type { MatchEvent, MatchEventType, ShotType } from "./types";
import type { RowText } from "./rowText";

// Ascending by minute. Two readers hand-wrote the identical `(a, b) => a.minute - b.minute` —
// this simulator's timeline and the seed generator's event list — and the same drift risk as the
// comparators M376 retired: one reader flips to descending and the two timelines disagree. This is
// the definition now.
export function byMinute(a: { minute: number }, b: { minute: number }): number {
  return a.minute - b.minute;
}

// Deterministic match simulation: identical inputs + identical seed => identical
// result (spec §21). It models team strength, tactics, home edge, fatigue, form,
// morale and match state rather than a flat random().

export interface TeamInput {
  name: string;
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
  possessionBias: number; // 0..1
  press: number; // 0..1
  tempo: number; // 0..1
  fatigue: number; // 0..1
  morale: number; // -1..1
  form: number; // -1..1
}

export interface SimInput {
  seed: string;
  home: TeamInput;
  away: TeamInput;
  minutes?: number;
}

export interface SimTeamStats {
  possession: number;
  shots: number;
  onTarget: number;
  xg: number;
  passes: number;
  passAcc: number;
  tackles: number;
  duels: number;
  corners: number;
  fouls: number;
  yellows: number;
  reds: number;
  ratings: { player: string; rating: number }[];
}

export interface SimResult {
  seed: string;
  homeGoals: number;
  awayGoals: number;
  timeline: MatchEvent[];
  stats: { home: SimTeamStats; away: SimTeamStats };
  // M225. Rows, not sentences: this array was the last place a domain module handed the
  // interface English prose it had composed itself, and a screen cannot translate a string.
  summary: RowText[];
}

// The timeline glyph contract. The match page's event rows, the Simulation Lab's key moments and
// Manager OS's last-match line-up each put the same six marks on the same six event types, but
// only the first spelled all six: the Lab retyped three of them as a ternary chain and Manager OS
// two, and each was kept honest solely by a `filter` that happened to drop the kinds its own table
// was missing. Nothing tied the shared entries, so changing a goal's mark on one screen would leave
// the other two printing the old one for the same engine event. `MatchEventType` is the key, so a
// seventh kind is a compile error here rather than a row that silently falls through.
export const EVENT_GLYPH: Record<MatchEventType, string> = {
  GOAL: "⚽",
  YELLOW: "🟨",
  RED: "🟥",
  SHOT: "🎯",
  SAVE: "🧤",
  VAR: "📺",
};

export function simulateMatch(input: SimInput): SimResult {
  const rng = makeRng(`${input.seed}|${hashString(input.seed)}`);
  const mins = input.minutes ?? 90;
  const { home, away } = input;
  const mid = home.midfield - away.midfield;

  // Possession from midfield + press + bias.
  let possH = 50 + mid * 2 + (home.possessionBias - away.possessionBias) * 12;
  possH = clamp(possH + rngFloat(rng, -3, 3), 32, 68);

  const events: MatchEvent[] = [];
  let hg = 0;
  let ag = 0;
  let hxg = 0;
  let axg = 0;

  const chanceRateH = (home.attack - away.defense) / 22 + 1.2 + home.tempo * 0.5;
  const chanceRateA = (away.attack - home.defense) / 22 + 1.0 + away.tempo * 0.5;

  const homeNames = squad(input.seed + "H");
  const awayNames = squad(input.seed + "A");

  const timeline: { minute: number; kind: "H" | "A" }[] = [];
  let t = rngInt(rng, 2, 8);
  while (t < mins) {
    const side = weightedPick<"H" | "A">(rng, [
      ["H", Math.max(0.2, chanceRateH) * (possH / 50)],
      ["A", Math.max(0.2, chanceRateA) * ((100 - possH) / 50)],
    ]);
    timeline.push({ minute: t, kind: side });
    t += rngInt(rng, 4, 11);
  }

  let hShots = 0;
  let aShots = 0;
  let hOn = 0;
  let aOn = 0;
  for (const c of timeline) {
    const isHome = c.kind === "H";
    const xg = rngFloat(rng, 0.02, 0.32) * (isHome ? 1 : 0.95);
    if (isHome) {
      hShots++;
      hxg += xg;
    } else {
      aShots++;
      axg += xg;
    }
    const scores = rng() < xg;
    if (rng() < 0.3 + xg) {
      if (isHome) hOn++;
      else aOn++;
    }
    const names = isHome ? homeNames : awayNames;
    if (scores) {
      const scorer = names[rngInt(rng, 0, Math.min(3, names.length - 1))];
      if (isHome) hg++;
      else ag++;
      events.push({
        minute: c.minute,
        type: "GOAL",
        side: isHome ? "home" : "away",
        player: scorer,
        detail: { key: "sim.ev.goal", vars: { xg: fmt2(xg), shot: shotType(rng, xg) } },
      });
    } else if (rng() < 0.4) {
      events.push({ minute: c.minute, type: rng() < 0.5 ? "SAVE" : "SHOT", side: isHome ? "home" : "away", player: names[rngInt(rng, 0, names.length - 1)] });
    }
  }

  // Discipline + set pieces colour.
  const hFouls = rngInt(rng, 6, 14);
  const aFouls = rngInt(rng, 6, 14);
  addCards(events, rng, "home", hFouls, homeNames);
  addCards(events, rng, "away", aFouls, awayNames);
  events.push({ minute: 45, type: "VAR", side: rng() < 0.5 ? "home" : "away", player: "—" });
  events.sort(byMinute);

  const passesH = Math.round((possH / 100) * rngInt(rng, 380, 520));
  const passesA = rngInt(rng, 380, 520) - passesH + rngInt(rng, 0, 40);

  const statsHome: SimTeamStats = {
    possession: Math.round(possH),
    shots: hShots,
    onTarget: hOn,
    xg: +fmt2(hxg),
    passes: passesH,
    passAcc: Math.round(78 + mid + rngInt(rng, -4, 6)),
    tackles: rngInt(rng, 10, 22),
    duels: rngInt(rng, 40, 60),
    corners: rngInt(rng, 2, 9),
    fouls: hFouls,
    yellows: events.filter((e) => e.type === "YELLOW" && e.side === "home").length,
    reds: events.filter((e) => e.type === "RED" && e.side === "home").length,
    ratings: buildRatings(homeNames, hg, hxg, rng, true),
  };
  const statsAway: SimTeamStats = {
    possession: 100 - Math.round(possH),
    shots: aShots,
    onTarget: aOn,
    xg: +fmt2(axg),
    passes: Math.max(120, passesA),
    passAcc: Math.round(78 - mid + rngInt(rng, -5, 5)),
    tackles: rngInt(rng, 10, 22),
    duels: rngInt(rng, 40, 60),
    corners: rngInt(rng, 2, 9),
    fouls: aFouls,
    yellows: events.filter((e) => e.type === "YELLOW" && e.side === "away").length,
    reds: events.filter((e) => e.type === "RED" && e.side === "away").length,
    ratings: buildRatings(awayNames, ag, axg, rng, false),
  };

  // The reader's three lines. The scoreline is a key rather than a `value` row because a locale
  // may write a score differently — the clubs ride as variables, so nothing here freezes a
  // language; `sim.sum.xg` carries "possession", which is the word this screen had in English;
  // and the midfield line is one of three keys rather than a ternary of three sentences.
  const summary: RowText[] = [
    { key: "sim.sum.score", vars: { home: home.name, hg, ag, away: away.name } },
    { key: "sim.sum.xg", vars: { hxg: fmt2(hxg), axg: fmt2(axg), hp: Math.round(possH), ap: 100 - Math.round(possH) } },
    mid > 1
      ? { key: "sim.sum.midHome", vars: { team: home.name } }
      : mid < -1
        ? { key: "sim.sum.midAway", vars: { team: away.name } }
        : { key: "sim.sum.midEven" },
  ];

  return { seed: input.seed, homeGoals: hg, awayGoals: ag, timeline: events, stats: { home: statsHome, away: statsAway }, summary };
}

// The two tables the engine draws a shot from. The weights are the model; the codes are copy,
// and the words live in `sim.shot.…` in all three locales, so a shot with no word fails the i18n
// gate instead of printing a code to a reader. The `ShotType` annotation is what makes a typo
// here a compile error rather than a fallback to the raw code.
const SHOT_HIGH_XG: readonly [ShotType, number][] = [["tap_in", 3], ["close_range", 4], ["header", 2]];
const SHOT_LOW_XG: readonly [ShotType, number][] = [["left_foot", 4], ["right_foot", 4], ["volley", 2], ["penalty", 1]];

function shotType(rng: () => number, xg: number): ShotType {
  return weightedPick(rng, xg > 0.24 ? SHOT_HIGH_XG : SHOT_LOW_XG);
}

function addCards(events: MatchEvent[], rng: () => number, side: "home" | "away", fouls: number, names: string[]) {
  const yellows = fouls > 11 ? rngInt(rng, 1, 3) : rngInt(rng, 0, 2);
  for (let i = 0; i < yellows; i++) {
    events.push({ minute: rngInt(rng, 8, 88), type: "YELLOW", side, player: names[rngInt(rng, 0, names.length - 1)] });
  }
  if (rng() < 0.12) {
    events.push({ minute: rngInt(rng, 55, 89), type: "RED", side, player: names[rngInt(rng, 0, names.length - 1)] });
  }
}

function squad(seed: string): string[] {
  const rng = makeRng(seed);
  const first = ["M.", "L.", "R.", "K.", "T.", "J.", "A.", "D.", "S.", "N.", "P."];
  const last = ["Silva", "Kane", "Rossi", "Müller", "Dubois", "Novaes", "Costa", "Berg", "Yilmaz", "Petrov", "Adams", "Lopez", "Ferrari", "Traoré", "Kaya", "Santos", "Nagy", "Blom", "Vidal", "Ito", "Park", "Rooney", "Flores", "Adeyemi"];
  return Array.from({ length: 11 }, () => `${first[rngInt(rng, 0, first.length - 1)]} ${last[rngInt(rng, 0, last.length - 1)]}`);
}

function buildRatings(names: string[], goals: number, xg: number, rng: () => number, isHome: boolean): { player: string; rating: number }[] {
  return names.slice(0, 11).map((player, i) => {
    let rating = 6.3 + rngFloat(rng, -0.6, 0.9) + (isHome ? 0.15 : 0) + (xg / 3) * 0.3;
    // goalscorers stand out
    if (i < goals) rating += 0.9;
    return { player, rating: +fmt2(clamp(rating, 5.2, 9.6)) };
  });
}
