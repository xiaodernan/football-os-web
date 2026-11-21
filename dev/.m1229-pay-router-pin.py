import io
p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 221;"
new = "const ROUTER_POP_PIN = 222; // M1229 The Teaching Hints: 221 -> 222 — domain/teachHint.ts and ui/TeachHint.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("router pin paid")
