import io
# 1. dictionaries: differentiate the two dups
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('  "brk.v.prediction": "futurology",', '  "brk.v.prediction": "a claim about a deal not yet done",'),
    ('  "brk.v.prediction": "预言",', '  "brk.v.prediction": "对尚未完成的交易的断言",'),
    ('  "brk.v.prediction": "預言",', '  "brk.v.prediction": "對尚未完成的交易的斷言",'),
    ('  "brk.tileValue": "Market value",', '  "brk.tileValue": "The world\'s valuation",'),
    ('  "brk.tileValue": "市场身价",', '  "brk.tileValue": "身价估值",'),
    ('  "brk.tileValue": "市場身價",', '  "brk.tileValue": "身價估值",'),
]:
    assert old in s, old[:40]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("dups differentiated")

# 2. DYN_SITES: three entries + SPACES for both prefixes
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  { path: "features/reporter/MatchReporter.tsx", expr: "v", prefix: "rep.v.", suffix: "" },'''
new = old + '''
  // M1238 The Transfer Broker: the ruling badge interpolates a ruling code, the refusal badges a
  // BrokerViolation code; both spaces are read out of domain/broker.ts below.
  { path: "features/broker/TransferBroker.tsx", expr: "ruling.code", prefix: "brk.code.", suffix: "" },
  { path: "features/broker/TransferBroker.tsx", expr: "fold.code", prefix: "brk.code.", suffix: "" },
  { path: "features/broker/TransferBroker.tsx", expr: "v", prefix: "brk.v.", suffix: "" },'''
assert old in s
s = s.replace(old, new, 1)
old = '''  ["rep.v.|v", { name: "reporter violation codes", values: spaceOf("domain/matchReporter.ts", /export type ReporterViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
new = old + '''
  // M1238 The Transfer Broker: the ruling badge and the refusal badges read their spaces from the
  // broker's own lists.
  ["brk.code.|ruling.code", { name: "ruling codes", values: spaceOf("domain/broker.ts", /export const RULING_CODES = \\[[^\\]]*\\]/, quoted) }],
  ["brk.code.|fold.code", { name: "ruling codes", values: spaceOf("domain/broker.ts", /export const RULING_CODES = \\[[^\\]]*\\]/, quoted) }],
  ["brk.v.|v", { name: "broker violation codes", values: spaceOf("domain/broker.ts", /export type BrokerViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("sites + spaces declared")
