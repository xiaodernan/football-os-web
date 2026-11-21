import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''  { path: "features/desk/TrainingDesk.tsx", expr: "k", prefix: "attr.name.", suffix: "" },'''
new = '''  { path: "features/desk/TrainingDesk.tsx", expr: "k", prefix: "attr.name.", suffix: "" },
  { path: "features/desk/TrainingDesk.tsx", expr: "k", prefix: "attr.name.", suffix: "" },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("second k site declared")
