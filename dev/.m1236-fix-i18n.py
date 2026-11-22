import io
# 1. differentiate rep.v.prediction
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "rep.v.prediction": "futurology",', '  "rep.v.prediction": "a prediction about the future",'),
    ('  "rep.v.prediction": "预言",', '  "rep.v.prediction": "对未来的预言",'),
    ('  "rep.v.prediction": "預言",', '  "rep.v.prediction": "對未來的預言",'),
]:
    assert old in s, old
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("prediction differentiated")

# 2. DYN_SITE + SPACE for rep.v.
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  { path: "features/desk/TrainingDesk.tsx", expr: "v", prefix: "desk.v.", suffix: "" },'''
new = old + '''
  // M1236 The Match Reporter: the refusal badges interpolate a ReporterViolation code.
  { path: "features/reporter/MatchReporter.tsx", expr: "v", prefix: "rep.v.", suffix: "" },'''
assert old in s
s = s.replace(old, new, 1)
old = '''  ["desk.v.|v", { name: "desk violation codes", values: spaceOf("domain/trainingDesk.ts", /export type DeskViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
new = old + '''
  // M1236 The Match Reporter: the refusal badges' value space is the union in domain/matchReporter.ts.
  ["rep.v.|v", { name: "reporter violation codes", values: spaceOf("domain/matchReporter.ts", /export type ReporterViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("site + space declared")
