import io
p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 234;", "const POP_PIN = 236; // M1231 The Keepers' Union: 234 -> 236 — domain/keepers.ts and features/keepers/KeepersUnion.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 93, features: 93, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 94, features: 94, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1231: domain 93 -> 94 (domain/keepers.ts), features 93 -> 94 (features/keepers/KeepersUnion.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
import re
m = re.search(r"const DEEP_PIN = (\d+);", s)
assert m, "DEEP_PIN"
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1231: features/keepers/KeepersUnion.tsx sits two levels down — %d -> 110." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("coverage pins paid")

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 233;"
new = "const APP_MODULE_PIN = 235; // M1231 The Keepers' Union: 233 -> 235 — domain/keepers.ts and features/keepers/KeepersUnion.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 223;"
new = "const ROUTER_POP_PIN = 225; // M1231 The Keepers' Union: 223 -> 225 — domain/keepers.ts and features/keepers/KeepersUnion.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("app-tree + router pins paid")
