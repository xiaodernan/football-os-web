import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 236;"
new = "const APP_FILES_PIN = 238; // M1236 The Match Reporter: 236 -> 238 — domain/matchReporter.ts and features/reporter/MatchReporter.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 244;", "const POP_PIN = 246; // M1236 The Match Reporter: 244 -> 246 — domain/matchReporter.ts and features/reporter/MatchReporter.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 98, features: 98, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 99, features: 99, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1236: domain 98 -> 99 (domain/matchReporter.ts), features 98 -> 99 (features/reporter/MatchReporter.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1236: features/reporter/MatchReporter.tsx sits two levels down — %d -> 115." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 243;"
new = "const APP_MODULE_PIN = 245; // M1236 The Match Reporter: 243 -> 245 — domain/matchReporter.ts and features/reporter/MatchReporter.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 233;"
new = "const ROUTER_POP_PIN = 235; // M1236 The Match Reporter: 233 -> 235 — domain/matchReporter.ts and features/reporter/MatchReporter.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
