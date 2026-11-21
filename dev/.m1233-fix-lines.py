import io
p = "domain/selectionChair.ts"
s = io.open(p, encoding="utf-8").read()
old = '''import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";'''
new = '''import type { Locale } from "@/i18n/dictionaries";
import type { PositionGroup } from "./types";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";'''
assert old in s
s = s.replace(old, new, 1)

old = '''/** One squad member as the chair sees them — the roster's own facts, nothing inferred. */
export interface ChairPlayer {
  readonly id: string;
  readonly name: string;
  readonly positionGroup: "GK" | "DEF" | "MID" | "ATT";
  readonly overall: number;
  readonly age: number;
}'''
new = '''/** The four lines a board has. */
export type ChairLine = "GK" | "DEF" | "MID" | "ATT";

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
export const chairLine = (positionGroup: PositionGroup): ChairLine => LINE_OF[positionGroup];'''
assert old in s
s = s.replace(old, new, 1)

# use ChairLine in the rest of the module instead of the inline union
s = s.replace('''  readonly byPosition: Readonly<Record<"GK" | "DEF" | "MID" | "ATT", readonly string[]>>;''',
              '''  readonly byPosition: Readonly<Record<ChairLine, readonly string[]>>;''')
s = s.replace('''  const group = (g: "GK" | "DEF" | "MID" | "ATT") => known.filter((id) => byId.get(id)!.positionGroup === g);
  return {
    selection: { ids: known, byPosition: { GK: group("GK"), DEF: group("DEF"), MID: group("MID"), ATT: group("ATT") } },
    violations: [],
  };''',
              '''  const group = (g: ChairLine) => known.filter((id) => byId.get(id)!.positionGroup === g);
  return {
    selection: { ids: known, byPosition: { GK: group("GK"), DEF: group("DEF"), MID: group("MID"), ATT: group("ATT") } },
    violations: [],
  };''')
s = s.replace('''  const shape: Record<"DEF" | "MID" | "ATT", number> = { DEF: 4, MID: 3, ATT: 3 };''',
              '''  const shape: Record<Exclude<ChairLine, "GK">, number> = { DEF: 4, MID: 3, ATT: 3 };''')
s = s.replace('''  const byId = new Map(squad.players.map((p) => [p.id, p]));
  const group = (g: "GK" | "DEF" | "MID" | "ATT") => picked.filter((id) => byId.get(id)!.positionGroup === g);
  return { ids: picked, byPosition: { GK: group("GK"), DEF: group("DEF"), MID: group("MID"), ATT: group("ATT") } };''',
              '''  const byId = new Map(squad.players.map((p) => [p.id, p]));
  const group = (g: ChairLine) => picked.filter((id) => byId.get(id)!.positionGroup === g);
  return { ids: picked, byPosition: { GK: group("GK"), DEF: group("DEF"), MID: group("MID"), ATT: group("ATT") } };''')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("domain mapped")
