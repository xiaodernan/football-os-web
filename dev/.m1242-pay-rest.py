import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 243;"
new = "const APP_FILES_PIN = 245; // M1242 The Dressing Room: 243 -> 245 — domain/dressingRoom.ts and features/dressing/DressingRoom.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 251;", "const POP_PIN = 253; // M1242 The Dressing Room: 251 -> 253 — domain/dressingRoom.ts and features/dressing/DressingRoom.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 102, features: 101, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 103, features: 102, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1242: domain 102 -> 103 (domain/dressingRoom.ts), features 101 -> 102 (features/dressing/DressingRoom.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1242: features/dressing/DressingRoom.tsx sits two levels down — %d -> 118." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 250;"
new = "const APP_MODULE_PIN = 252; // M1242 The Dressing Room: 250 -> 252 — domain/dressingRoom.ts and features/dressing/DressingRoom.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 240;"
new = "const ROUTER_POP_PIN = 242; // M1242 The Dressing Room: 240 -> 242 — domain/dressingRoom.ts and features/dressing/DressingRoom.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
