import type { Attributes } from "./types";
import { englishWord } from "@/i18n/format";
import { safeDiv } from "@/lib/utils";
import { sum } from "./attributes";
import type { RowText } from "./rowText";

// Football DNA: archetypes computed dynamically from the attribute profile, not
// assigned labels. Each archetype scores against the attribute vector.
//
// The table holds the CODE and the score. The words that name it — the display title and
// the one-line description — live in the dictionary (`dna.arch.*`, `dna.blurb.*`), because
// a name shown on four screens is translation surface, not model data. ARCHETYPE_KEYS is
// the list both the row interpreter and the i18n gate read, so an archetype cannot be added
// without its words arriving in all three locales.
export interface Archetype {
  id: string;
  // The attribute most expressive of this role in a game-realistic block; the
  // coach steers the session's GAME drill to this so "shaped to your role" is
  // literal, not decorative. Always one of the game-phase drill focuses.
  gameFocus: string;
  score: (a: Attributes) => number;
}

const g = (a: Attributes, k: string) => a[k] ?? 0;
const avg = (a: Attributes, ks: string[]) => safeDiv(sum(ks, (k) => g(a, k)), ks.length);

export const ARCHETYPES: Archetype[] = [
  {
    id: "creator", gameFocus: "crossing",
    score: (a) => avg(a, ["passing", "long_passing", "crossing", "dribbling", "set_pieces"]) * 0.7 + g(a, "game_intelligence") * 0.3,
  },
  {
    id: "progressor", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["passing", "press_resistance", "first_touch", "space_awareness"]) * 0.6 + g(a, "scanning") * 0.4,
  },
  {
    id: "ball_winner", gameFocus: "transition_awareness",
    score: (a) => avg(a, ["defensive_awareness", "positioning", "strength", "concentration"]) * 0.7 + g(a, "transition_awareness") * 0.3,
  },
  {
    id: "deep_playmaker", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["long_passing", "composure", "decision_making", "scanning"]) * 0.8 + g(a, "positioning") * 0.2,
  },
  {
    id: "press_resistant", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["press_resistance", "ball_control", "first_touch", "agility", "composure"]) * 0.85 + g(a, "balance") * 0.15,
  },
  {
    id: "box_crasher", gameFocus: "transition_awareness",
    score: (a) => avg(a, ["off_ball_movement", "finishing", "positioning", "acceleration"]) * 0.75 + g(a, "game_intelligence") * 0.25,
  },
  {
    id: "inverted_fullback", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["passing", "positioning", "decision_making", "stamina"]) * 0.6 + g(a, "scanning") * 0.4,
  },
  {
    id: "transition_runner", gameFocus: "sprint",
    score: (a) => avg(a, ["acceleration", "sprint", "off_ball_movement", "explosiveness"]) * 0.8 + g(a, "space_awareness") * 0.2,
  },
  {
    id: "target_man", gameFocus: "crossing",
    score: (a) => avg(a, ["strength", "first_touch", "set_pieces", "positioning"]) * 0.6 + g(a, "composure") * 0.4,
  },
  {
    id: "false_9", gameFocus: "game_intelligence",
    score: (a) => avg(a, ["ball_control", "passing", "dribbling", "space_awareness", "game_intelligence"]) * 0.8 + g(a, "first_touch") * 0.2,
  },
];

/** Every archetype the model can name, in table order. */
export const ARCHETYPE_KEYS: string[] = ARCHETYPES.map((a) => a.id);

export interface Dna {
  primary: Archetype;
  secondary: Archetype;
  /** "Ball Winner → Box Crasher", as a row: the two ends are archetype CODES, so the
   *  arrow, the words and any language's own phrasing of "develops into" belong to the
   *  reader's dictionary, not to this module. */
  evolution: RowText;
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
    evolution: { key: "dna.evolution", vars: { arch: secondary.id, arch2: primary.id } },
  };
}

export function archetypeByKey(key: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === key);
}

/** The minimum vector length we treat as "the dataset ships this player's own
 *  attributes" rather than a ratings-only record. One threshold, one place, so
 *  every consumer agrees on what "has a vector" means. */
export const VECTOR_MIN_KEYS = 8;

/** The player's own attribute vector, or null when the provider shipped only a
 *  rating. Callers use this to decide measured vs modelled rather than each
 *  re-testing the threshold. */
export function playerVector(attributes?: Attributes): Attributes | null {
  return attributes && Object.keys(attributes).length >= VECTOR_MIN_KEYS ? attributes : null;
}

/** Football DNA for a player whose vector may be absent. Returns null when
 *  there is no vector — an archetype read off a ratings-only record would be
 *  invented, so callers must say so instead. */
export function playerDna(attributes?: Attributes): Dna | null {
  const vector = playerVector(attributes);
  return vector ? computeDna(vector) : null;
}

/** The English display name, through the door that owns model-input vocabulary
 *  (`englishWord`, i18n/format.ts). UI sites must NOT use this — they interpolate
 *  `dna.arch.${key}` through `t` so the reader gets their own language. Its only caller is the
 *  demo AI provider, which composes in English; when those sentences are keyed this function
 *  goes away with them. */
export function archetypeLabelEn(key: string): string {
  return archetypeByKey(key) ? englishWord(`dna.arch.${key}`) : key;
}
