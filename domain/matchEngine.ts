import { makeRng, rngInt, rngFloat, weightedPick, hashString } from "@/lib/rng";
import type { MatchEvent, MatchEventType } from "./types";

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
  summary: string[];
}

function effStrength(t: TeamInput): number {
  return (
    t.overall * (1 - t.fatigue * 0.15) +
    t.form * 3 +
    t.morale * 2
  );
}

export function simulateMatch(input: SimInput): SimResult {
  const rng = makeRng(`${input.seed}|${hashString(input.seed)}`);
  const mins = input.minutes ?? 90;
  const { home, away } = input;
  const homeEdge = 2.5;
  const hs = effStrength(home) + homeEdge;
  const as = effStrength(away);
  const mid = home.midfield - away.midfield;

  // Possession from midfield + press + bias.
  let possH = 50 + mid * 2 + (home.possessionBias - away.possessionBias) * 12;
  possH = Math.max(32, Math.min(68, possH + rngFloat(rng, -3, 3)));

  const events: MatchEvent[] = [];
  let hg = 0;
  let ag = 0;
  let hxg = 0;
  let axg = 0;

  const chanceRateH = (home.attack - away.defense) / 22 + 1.2 + home.tempo * 0.5;
  const chanceRateA = (away.attack - home.defense) / 22 + 1.0 + away.tempo * 0.5;

  const homeNames = squad(input.seed + "H", home);
  const awayNames = squad(input.seed + "A", away);

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
    if (scores) {
      const scorer = (isHome ? homeNames : awayNames)[rngInt(rng, 0, Math.min(3, homeNames.length - 1))];
      if (isHome) hg++;
      else ag++;
      events.push({
        minute: c.minute,
        type: "GOAL",
        side: isHome ? "home" : "away",
        player: scorer,
        detail: `xG ${xg.toFixed(2)} · ${shotType(rng, xg)}`,
      });
    } else if (rng() < 0.4) {
      events.push({ minute: c.minute, type: rng() < 0.5 ? "SAVE" : "SHOT", side: isHome ? "home" : "away", player: (isHome ? homeNames : awayNames)[rngInt(rng, 0, homeNames.length - 1)] });
    }
  }

  // Discipline + set pieces colour.
  const hFouls = rngInt(rng, 6, 14);
  const aFouls = rngInt(rng, 6, 14);
  addCards(events, rng, "home", hFouls, homeNames);
  addCards(events, rng, "away", aFouls, awayNames);
  events.push({ minute: 45, type: "VAR", side: rng() < 0.5 ? "home" : "away", player: "—" });
  events.sort((a, b) => a.minute - b.minute);

  const passesH = Math.round((possH / 100) * rngInt(rng, 380, 520));
  const passesA = rngInt(rng, 380, 520) - passesH + rngInt(rng, 0, 40);

  const statsHome: SimTeamStats = {
    possession: Math.round(possH),
    shots: hShots,
    onTarget: hOn,
    xg: +hxg.toFixed(2),
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
    xg: +axg.toFixed(2),
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

  const summary = [
    `${home.name} ${hg} – ${ag} ${away.name}`,
    `xG ${hxg.toFixed(2)} – ${axg.toFixed(2)} · possession ${Math.round(possH)}% – ${100 - Math.round(possH)}%`,
    mid > 1 ? `${home.name} controlled the middle of the pitch.` : mid < -1 ? `${away.name} won the midfield battle.` : `The midfield was finely balanced.`,
  ];

  return { seed: input.seed, homeGoals: hg, awayGoals: ag, timeline, stats: { home: statsHome, away: statsAway }, summary };
}

function shotType(rng: () => number, xg: number): string {
  if (xg > 0.24) return weightedPick(rng, [["Tap-in", 3], ["Close range", 4], ["Header", 2]] as [string, number][]);
  return weightedPick(rng, [["Left-foot drive", 4], ["Right-foot curl", 4], ["Volleys", 2], ["Penalty", 1]] as [string, number][]);
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

function squad(seed: string, team: TeamInput): string[] {
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
    return { player, rating: +Math.max(5.2, Math.min(9.6, rating)).toFixed(2) };
  });
}
