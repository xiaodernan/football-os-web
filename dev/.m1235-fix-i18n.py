import io
# 1. dictionaries: desk.adopted key + desk.v.prediction differentiated
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "desk.adoptedDone": "Adopted",', '  "desk.adopted": "Prescription adopted — {n} focuses, {min} minutes; the plan is being built.",'),
    ('  "desk.adoptedDone": "已采纳",', '  "desk.adopted": "处方已采纳——{n} 个焦点、{min} 分钟；计划正在生成。",'),
    ('  "desk.adoptedDone": "已採納",', '  "desk.adopted": "處方已採納——{n} 個焦點、{min} 分鐘；計畫正在生成。",'),
    ('  "desk.v.prediction": "futurology",', '  "desk.v.prediction": "a prediction about the future",'),
    ('  "desk.v.prediction": "预言",', '  "desk.v.prediction": "对未来的预言",'),
    ('  "desk.v.prediction": "預言",', '  "desk.v.prediction": "對未來的預言",'),
]:
    assert anchor in s, anchor[:50]
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("dictionaries fixed")

# 2. DYN_SITES + SPACES
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  { path: "features/chair/SelectionChair.tsx", expr: "v", prefix: "chair.v.", suffix: "" },'''
new = old + '''
  // M1235 The Training Desk: the refusal badges interpolate a DeskViolation code, and the two
  // attribute lists interpolate keys out of the dossier (the attr.name. space is claimed by
  // prefix below, so only the sites are declared here).
  { path: "features/desk/TrainingDesk.tsx", expr: "v", prefix: "desk.v.", suffix: "" },
  { path: "features/desk/TrainingDesk.tsx", expr: "a.key", prefix: "attr.name.", suffix: "" },
  { path: "features/desk/TrainingDesk.tsx", expr: "k", prefix: "attr.name.", suffix: "" },'''
assert old in s
s = s.replace(old, new, 1)
old = '''  ["chair.v.|v", { name: "chair violation codes", values: spaceOf("domain/selectionChair.ts", /export type ChairViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
new = old + '''
  // M1235 The Training Desk: the refusal badges' value space is the union in domain/trainingDesk.ts.
  ["desk.v.|v", { name: "desk violation codes", values: spaceOf("domain/trainingDesk.ts", /export type DeskViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("sites + space declared")
