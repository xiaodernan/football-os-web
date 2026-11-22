import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  { path: "features/broker/TransferBroker.tsx", expr: "v", prefix: "brk.v.", suffix: "" },'''
new = old + '''
  // M1241 The Ops Trend: the advice badges and their notes interpolate a TrendAdviceCode; the
  // space is the union in domain/opsTrend.ts, read out of the source rather than written twice.
  { path: "features/ops/Ops.tsx", expr: "a.code", prefix: "ops.trend.advice.", suffix: "" },
  { path: "features/ops/Ops.tsx", expr: "a.code", prefix: "ops.trend.advice.", suffix: ".note" },'''
assert old in s
s = s.replace(old, new, 1)
old = '''  ["brk.v.|v", { name: "broker violation codes", values: spaceOf("domain/broker.ts", /export type BrokerViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
new = old + '''
  // M1241 The Ops Trend: the advice codes, from the domain's own union.
  ["ops.trend.advice.|a.code", { name: "trend advice codes", values: spaceOf("domain/opsTrend.ts", /export type TrendAdviceCode =[\\s\\S]*?;/, /"([^"]+)"/g) }],
  ["ops.trend.advice.|a.code.note", { name: "trend advice codes", values: spaceOf("domain/opsTrend.ts", /export type TrendAdviceCode =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("sites + spaces declared")
