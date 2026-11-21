import io
p = "features/chair/SelectionChair.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''import {
  chairBuild, chairCommit, chairPrecommit, chairPreflight, chairRefused, createChair,
  parseChairXi, verifyChairText, foldXi,
  type ChairPlayer, type ChairSelection, type ChairTraceEntry, type ChairViolation, type ChairSquad,
} from "@/domain/selectionChair";'''
new = '''import {
  chairBuild, chairCommit, chairLine, chairPrecommit, chairPreflight, chairRefused, createChair,
  parseChairXi, verifyChairText, foldXi,
  type ChairPlayer, type ChairSelection, type ChairTraceEntry, type ChairViolation, type ChairSquad,
} from "@/domain/selectionChair";'''
assert old in s
s = s.replace(old, new, 1)
old = '''      .map((p) => ({ id: p.id, name: p.name, positionGroup: p.positionGroup, overall: p.overall, age: p.age }));'''
new = '''      .map((p) => ({ id: p.id, name: p.name, positionGroup: chairLine(p.positionGroup), overall: p.overall, age: p.age }));'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen mapped")
