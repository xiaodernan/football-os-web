import io
p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 229;"
new = "const APP_MODULE_PIN = 231; // M1229 The Teaching Hints: 229 -> 231 — domain/teachHint.ts and ui/TeachHint.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("app-tree pin paid")
