// M1233 · The Selection Chair — the manager's own desk, and the sixteenth imprisoned door.
// Every other door answers a QUESTION; this one makes a DECISION: the model names a starting XI
// from the club's own squad, and the door re-proves every choice against the squad before a human
// may see it. A player the squad does not carry, a side without a keeper, a twelfth man — each is
// a refused arm, and the fold's own deterministic XI speaks instead, openly. The model's freedom
// ends where the squad list begins.
import type { Locale } from "@/i18n/dictionaries";
import type { PositionGroup } from "./types";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { byOverall } from "./attributes";
import { POSITION_BUCKETS } from "./scouting";
import type { PlayerRef } from "./types";
import { indexById } from "@/lib/utils";
import { step, fsmBuild, fsmCommit, fsmRefusedWith, fsmPrecommit } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS } from "@/data/deepDigest";

export type ChairStage = FsmStage;
export type ChairNote = "squadInHand" | "squadSealed" | "commitOk" | "foldOk" | "precommitRefused";

export interface ChairTraceEntry {
  readonly stage: ChairStage;
  readonly verdict: TraceVerdict;
  readonly note: ChairNote;
}

/** The four lines a board has — the same four position buckets the scouting table names, so the
 *  set is written once in domain/scouting.ts and the chair derives its own word from it. */
export type ChairLine = (typeof POSITION_BUCKETS)[number];

/** The eleven the laws of the game put on the pitch. */
const XI_SIZE = 11;

/** One squad member as the chair sees them — the roster's own facts, nothing inferred. */
export interface ChairPlayer {
  readonly id: string;
  readonly name: string;
  readonly positionGroup: ChairLine;
  readonly overall: number;
  readonly age: number;
}

/** The world carries eight position groups; the chair's board has four lines. The mapping is the
 *  classic one — full-backs with the centre-backs, the holding and central mids together, the
 *  attacking mid and the wingers up top with the striker. One function, so the screen, the
 *  parser and the fold can never disagree about which line a player stands on. */
const LINE_OF: Record<PositionGroup, ChairLine> = {
  GK: "GK", CB: "DEF", FB: "DEF", DM: "MID", CM: "MID", AM: "MID", W: "ATT", ST: "ATT",
};
export const chairLine = (positionGroup: PositionGroup): ChairLine => LINE_OF[positionGroup];

export interface ChairSquad {
  readonly clubId: string;
  readonly players: readonly ChairPlayer[];
}

/** A parsed selection: eleven distinct ids from the squad, exactly one keeper. */
export interface ChairSelection {
  readonly ids: readonly string[];
  readonly byPosition: Readonly<Record<ChairLine, readonly string[]>>;
}

export interface ChairState {
  readonly squad: ChairSquad;
  readonly locale: Locale;
  readonly status: ChairStage;
  readonly trace: readonly ChairTraceEntry[];
  readonly answer: string;
  readonly selection: ChairSelection | null;
}

export const CHAIR_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "squadSealed" } as const;
export const CHAIR_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const CHAIR_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const CHAIR_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const CHAIR_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

/** The first line of a lawful answer: `XI:id,id,…` — eleven ids, in the order the model ranks them. */
const XI_LINE = /^XI:([A-Za-z0-9_,-]+)\s*$/m;

export const createChair = (squad: ChairSquad, locale: Locale): ChairState => ({
  // The FSM imprisons the model to this squad — clone the roster so a caller can never swap
  // the squad from under the proof mid-run.
  squad: { clubId: squad.clubId, players: [...squad.players] },
  locale, status: "preflight", trace: [], answer: "", selection: null,
});

export type ChairViolation =
  | "notEleven"
  | "unknownPlayer"
  | "noKeeper"
  | "duplicate"
  | "offSquad"
  | "prediction";

/** Parse the model's first line into a selection. Codes, not sentences — the domain writes no prose. */
export function parseChairXi(text: string, squad: ChairSquad): { selection: ChairSelection | null; violations: ChairViolation[] } {
  const m = XI_LINE.exec(text);
  if (!m) return { selection: null, violations: ["notEleven"] };
  const ids = m[1].split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  const out = new Set<ChairViolation>();
  if (ids.length !== XI_SIZE) out.add("notEleven");
  if (new Set(ids).size !== ids.length) out.add("duplicate");
  const byId = indexById(squad.players);
  if (ids.some((id) => !byId.has(id))) out.add("unknownPlayer");
  const known = ids.filter((id) => byId.has(id));
  if (known.filter((id) => byId.get(id)!.positionGroup === "GK").length !== 1) out.add("noKeeper");
  if (out.size > 0) return { selection: null, violations: [...out] };

  const group = (g: ChairLine) => known.filter((id) => byId.get(id)!.positionGroup === g);
  return {
    selection: { ids: known, byPosition: { GK: group("GK"), DEF: group("DEF"), MID: group("MID"), ATT: group("ATT") } },
    violations: [],
  };
}

/** The numeral law over the prose: any figure the squad and the world book cannot both carry is
 *  refused, the same imprisonment every other door wears. */
export function verifyChairText(text: string, squad: ChairSquad): ChairViolation[] {
  const out = new Set<ChairViolation>();
  const universe = new Set<string>();
  for (const p of squad.players) {
    universe.add(String(p.overall));
    universe.add(String(p.age));
  }
  for (const base of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) universe.add(String(base));
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (universe.has(raw) || universe.has(String(Math.round(n)))) continue;
    if (DEEP_DIGEST_NUMBERS.has(raw) || DEEP_DIGEST_NUMBERS.has(String(Math.round(n)))) continue;
    out.add("offSquad");
  }
  if (/\b(will|won't|never will|by the time|years from now|mark my words)\b/i.test(text)) out.add("prediction");
  return [...out];
}

/** The fold's own XI: one keeper and a 4-3-3's worth of the best-rated outfielders, by overall
 *  desc then id; a squad too thin to fill a line takes the best remaining whoever they are. This
 *  is the honest answer a refusal speaks with — deterministic, and never a copy of the model's. */
export function foldXi(squad: ChairSquad): ChairSelection | null {
  const gk = squad.players.filter((p) => p.positionGroup === "GK");
  if (squad.players.length < 11 || gk.length === 0) return null;
  const rank = (a: ChairPlayer, b: ChairPlayer) => byOverall(a, b) || a.id.localeCompare(b.id);
  const keeper = [...gk].sort(rank)[0];
  const outfield = squad.players.filter((p) => p.positionGroup !== "GK").sort(rank);
  const shape: Record<Exclude<ChairLine, "GK">, number> = { DEF: 4, MID: 3, ATT: 3 };
  const picked: string[] = [keeper.id];
  for (const g of ["DEF", "MID", "ATT"] as const) {
    const line = outfield.filter((p) => p.positionGroup === g);
    picked.push(...line.slice(0, shape[g]).map((p) => p.id));
  }
  // A thin squad: every outfield player the shape did not pick fills the XI to eleven,
  // best-rated first. The unpicked set is read ONCE — the first cut added the line leftovers
  // and the unpicked set together, which double-counted a thin squad's bodies and put the
  // same player in the XI twice (caught by proof-selectionchair's thin-squad arm).
  const remaining = outfield.filter((p) => !picked.includes(p.id));
  while (picked.length < XI_SIZE && remaining.length > 0) picked.push(remaining.shift()!.id);
  if (picked.length !== XI_SIZE) return null;
  const byId = indexById(squad.players);
  const group = (g: ChairLine) => picked.filter((id) => byId.get(id)!.positionGroup === g);
  return { ids: picked, byPosition: { GK: group("GK"), DEF: group("DEF"), MID: group("MID"), ATT: group("ATT") } };
}

/** The chair's pool: the world's strongest players, the SAME rule the world book's own LEDGER is
 *  cut with — `byOverall` from the attributes module, so the door's pool and the digest's LEDGER
 *  can never drift apart. A club roster is too thin in this world to select from (one club in
 *  seventy-three can field eleven), so the chair picks a World XI from the strongest, honestly. */
export const WORLD_SQUAD_SIZE = 60;

export function worldSquad(players: readonly PlayerRef[], limit: number = WORLD_SQUAD_SIZE): ChairPlayer[] {
  return [...players]
    .sort(byOverall)
    .slice(0, Math.max(0, limit))
    .map((p) => ({ id: p.id, name: p.name, positionGroup: chairLine(p.positionGroup), overall: p.overall, age: p.age }));
}

// ---- the state machine --------------------------------------------------
export const chairPreflight = (s: ChairState): ChairState =>
  s.squad.players.length >= 11 && s.squad.players.some((p) => p.positionGroup === "GK")
    ? step(s, { stage: "preflight", verdict: "pass", note: "squadInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "squadInHand" }, "refused");

export const chairBuild = (s: ChairState): ChairState => fsmBuild(s, CHAIR_BUILD_ENTRY, "model");

export const chairPrecommit = (s: ChairState, verdict: TraceVerdict): ChairState =>
  fsmPrecommit(s, verdict, CHAIR_PRECOMMIT_PASS, CHAIR_PRECOMMIT_REFUSED);

export const chairCommit = (s: ChairState, answer: string, selection: ChairSelection): ChairState =>
  fsmCommit({ ...s, answer, selection }, answer, CHAIR_COMMIT_ENTRY);

export const chairRefused = (s: ChairState, answer: string): ChairState =>
  fsmRefusedWith(s, answer, "selection", foldXi(s.squad), CHAIR_FOLD_ENTRY);
