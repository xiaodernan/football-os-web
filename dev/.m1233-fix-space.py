import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  ["liveWire.askViolation.|code", { name: "ask-desk violation codes", values: spaceOf("domain/askDesk.ts", /export type AskViolationCode =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
new = old + '''
  // M1233 The Selection Chair: the refusal badges interpolate a ChairViolation code; the space is
  // the union in domain/selectionChair.ts, read out of the source rather than written down twice.
  ["chair.v.|v", { name: "chair violation codes", values: spaceOf("domain/selectionChair.ts", /export type ChairViolation =[\\s\\S]*?;/, /"([^"]+)"/g) }],'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("space declared")
