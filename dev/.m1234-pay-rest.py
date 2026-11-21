import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 232;"
new = "const APP_FILES_PIN = 234; // M1234 The Cliff: 232 -> 234 — domain/depth.ts and features/depth/SquadDepth.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 240;", "const POP_PIN = 242; // M1234 The Cliff: 240 -> 242 — domain/depth.ts and features/depth/SquadDepth.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 96, features: 96, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 97, features: 97, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1234: domain 96 -> 97 (domain/depth.ts), features 96 -> 97 (features/depth/SquadDepth.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1234: features/depth/SquadDepth.tsx sits two levels down — %d -> 113." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 239;"
new = "const APP_MODULE_PIN = 241; // M1234 The Cliff: 239 -> 241 — domain/depth.ts and features/depth/SquadDepth.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 229;"
new = "const ROUTER_POP_PIN = 231; // M1234 The Cliff: 229 -> 231 — domain/depth.ts and features/depth/SquadDepth.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
