import io
p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 231;"
new = "const APP_MODULE_PIN = 233; // M1230 The First-Run Guide: 231 -> 233 — domain/firstRunGuide.ts and ui/FirstRunGuide.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 222;"
new = "const ROUTER_POP_PIN = 223; // M1230 The First-Run Guide: 222 -> 223 — domain/firstRunGuide.ts rides the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("app-tree + router pins paid")
