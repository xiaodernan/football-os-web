import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 238;"
new = "const APP_FILES_PIN = 240; // M1237 The Talent Map: 238 -> 240 — domain/nations.ts and features/nations/TalentMap.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 246;", "const POP_PIN = 248; // M1237 The Talent Map: 246 -> 248 — domain/nations.ts and features/nations/TalentMap.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 99, features: 99, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 100, features: 100, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1237: domain 99 -> 100 (domain/nations.ts), features 99 -> 100 (features/nations/TalentMap.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1237: features/nations/TalentMap.tsx sits two levels down — %d -> 116." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 245;"
new = "const APP_MODULE_PIN = 247; // M1237 The Talent Map: 245 -> 247 — domain/nations.ts and features/nations/TalentMap.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 235;"
new = "const ROUTER_POP_PIN = 237; // M1237 The Talent Map: 235 -> 237 — domain/nations.ts and features/nations/TalentMap.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
