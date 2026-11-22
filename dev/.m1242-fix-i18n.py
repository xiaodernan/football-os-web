import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for anchor, val in [
    ('  "nav.broker": "Transfer Broker",', '  "nav.dressing": "Dressing Room",'),
    ('  "nav.broker": "转会经纪人",', '  "nav.dressing": "更衣室",'),
    ('  "nav.broker": "轉會經紀人",', '  "nav.dressing": "更衣室",'),
]:
    assert anchor in s, anchor[:40]
    s = s.replace(anchor, anchor + "\n" + val, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav.dressing added")

p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  { path: "features/ops/Ops.tsx", expr: "a.code", prefix: "ops.trend.advice.", suffix: ".note" },'''
new = old + '''
  // M1242 The Dressing Room: the refusal badges interpolate a DressingViolation code; the space
  // is the union in domain/dressingRoom.ts.
  { path: "features/dressing/DressingRoom.tsx", expr: "v", prefix: "dress.v.", suffix: "" },'''
assert old in s
s = s.replace(old, new, 1)
old = '''  ["ops.trend.advice.|a.code.note", { name: "trend advice codes", values: spaceOf("domain/opsTrend.ts", /export type TrendAdviceCode =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
new = old + '''
  // M1242 The Dressing Room: the refusal badges' value space is the domain's own union.
  ["dress.v.|v", { name: "dressing violation codes", values: spaceOf("domain/dressingRoom.ts", /export type DressingViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("site + space declared")
