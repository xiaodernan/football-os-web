import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 230;"
new = "const APP_FILES_PIN = 232; // M1233 The Selection Chair: 230 -> 232 — domain/selectionChair.ts and features/chair/SelectionChair.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 238;", "const POP_PIN = 240; // M1233 The Selection Chair: 238 -> 240 — domain/selectionChair.ts and features/chair/SelectionChair.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 95, features: 95, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 96, features: 96, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1233: domain 95 -> 96 (domain/selectionChair.ts), features 95 -> 96 (features/chair/SelectionChair.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1233: features/chair/SelectionChair.tsx sits two levels down — %d -> 112." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 237;"
new = "const APP_MODULE_PIN = 239; // M1233 The Selection Chair: 237 -> 239 — domain/selectionChair.ts and features/chair/SelectionChair.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 227;"
new = "const ROUTER_POP_PIN = 229; // M1233 The Selection Chair: 227 -> 229 — domain/selectionChair.ts and features/chair/SelectionChair.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
