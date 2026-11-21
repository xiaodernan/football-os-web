import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 228;"
new = "const APP_FILES_PIN = 230; // M1232 The Congested Calendar: 228 -> 230 — domain/congestion.ts and features/congestion/CongestedCalendar.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 236;", "const POP_PIN = 238; // M1232 The Congested Calendar: 236 -> 238 — domain/congestion.ts and features/congestion/CongestedCalendar.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 94, features: 94, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 95, features: 95, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1232: domain 94 -> 95 (domain/congestion.ts), features 94 -> 95 (features/congestion/CongestedCalendar.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1232: features/congestion/CongestedCalendar.tsx sits two levels down — %d -> 111." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 235;"
new = "const APP_MODULE_PIN = 237; // M1232 The Congested Calendar: 235 -> 237 — domain/congestion.ts and features/congestion/CongestedCalendar.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 225;"
new = "const ROUTER_POP_PIN = 227; // M1232 The Congested Calendar: 225 -> 227 — domain/congestion.ts and features/congestion/CongestedCalendar.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
