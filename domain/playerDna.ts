import type { Attributes } from "./types";

// Football DNA: archetypes computed dynamically from the attribute profile,
// not assigned labels. Each archetype scores against the attribute vector.
export interface Archetype {
  key: string;
  label: string;
  blurb: string;
  // The attribute most expressive of this role in a game-realistic block; the
  // coach steers the session's GAME drill to this so "shaped to your role" is
  // literal, not decorative. Always one of the game-phase drill focuses.
  gameFocus: string;
  score: (a: Attributes) => number;
}

const g = (a: Attributes, k: string) => a[k] ?? 0;
const avg = (a: Attributes, ks: string[]) =>
  ks.reduce((s, k) => s + g(a, k), 0) / (ks.length || 1);

export const ARCHETYPES: Archetype[] = [
  {
    key: "creator", label: "Creator", blurb: "Turns possession into chances in the final third.", gameFocus: "crossing",
    score: (a) => avg(a, ["passing", "long_passing", "crossing", "dribbling", "set_pieces"]) * 0.7 + g(a, "game_intelligence") * 0.3,
  },
  {
    key: "progressor", label: "Progressor", blurb: "Moves the ball up the pitch through carries and line-breaking passes.", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["passing", "press_resistance", "first_touch", "space_awareness"]) * 0.6 + g(a, "scanning") * 0.4,
  },
  {
    key: "ball_winner", label: "Ball Winner", blurb: "Wins duels and breaks play up in midfield.", gameFocus: "transition_awareness",
    score: (a) => avg(a, ["defensive_awareness", "positioning", "strength", "concentration"]) * 0.7 + g(a, "transition_awareness") * 0.3,
  },
  {
    key: "deep_playmaker", label: "Deep Playmaker", blurb: "Dictates tempo from deep with composure and range.", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["long_passing", "composure", "decision_making", "scanning"]) * 0.8 + g(a, "positioning") * 0.2,
  },
  {
    key: "press_resistant", label: "Press Resistant", blurb: "Escapes pressure and keeps possession under duress.", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["press_resistance", "ball_control", "first_touch", "agility", "composure"]) * 0.85 + g(a, "balance") * 0.15,
  },
  {
    key: "box_crasher", label: "Box Crasher", blurb: "Arrives late into the box to finish.", gameFocus: "transition_awareness",
    score: (a) => avg(a, ["off_ball_movement", "finishing", "positioning", "acceleration"]) * 0.75 + g(a, "game_intelligence") * 0.25,
  },
  {
    key: "inverted_fullback", label: "Inverted Fullback", blurb: "Drinks inside to control midfield as a fullback.", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["passing", "positioning", "decision_making", "stamina"]) * 0.6 + g(a, "scanning") * 0.4,
  },
  {
    key: "transition_runner", label: "Transition Runner", blurb: "Explodes in behind on the break.", gameFocus: "sprint",
    score: (a) => avg(a, ["acceleration", "sprint", "off_ball_movement", "explosiveness"]) * 0.8 + g(a, "space_awareness") * 0.2,
  },
  {
    key: "target_man", label: "Target Man", blurb: "Hold-up focal point, wins the aerial battle.", gameFocus: "crossing",
    score: (a) => avg(a, ["strength", "first_touch", "set_pieces", "positioning"]) * 0.6 + g(a, "composure") * 0.4,
  },
  {
    key: "false_9", label: "False 9", blurb: "Drops deep to create, blurs the centre-forward role.", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["ball_control", "passing", "dribbling", "space_awareness", "game_intelligence"]) * 0.8 + g(a, "first_touch") * 0.2,
  },
];

export interface Dna {
  primary: Archetype;
  secondary: Archetype;
  evolutionPath: string;
}

export function computeDna(a: Attributes): Dna {
  const scored = ARCHETYPES.map((arch) => ({ arch, value: arch.score(a) })).sort(
    (x, y) => y.value - x.value,
  );
  const primary = scored[0].arch;
  const secondary = scored[1].arch;
  return {
    primary,
    secondary,
    evolutionPath: `${secondary.label} → ${primary.label}`,
  };
}

export function archetypeByKey(key: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.key === key);
}

/** Players store only the archetype key, so every display site resolves it
 *  here rather than printing a slug like `ball_winner` to the user. */
export function archetypeLabel(key: string): string {
  return archetypeByKey(key)?.label ?? key;
}
