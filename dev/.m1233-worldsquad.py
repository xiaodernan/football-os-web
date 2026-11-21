import io
p = "domain/selectionChair.ts"
s = io.open(p, encoding="utf-8").read()
old = '''import type { PositionGroup } from "./types";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";'''
new = '''import type { PositionGroup } from "./types";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { byOverall } from "./attributes";
import type { PlayerRef } from "./types";'''
assert old in s
s = s.replace(old, new, 1)

old = '''// ---- the state machine --------------------------------------------------'''
new = '''/** The chair's pool: the world's strongest players, the SAME rule the world book's own LEDGER is
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

// ---- the state machine --------------------------------------------------'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("worldSquad added")
