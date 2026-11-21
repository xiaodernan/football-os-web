import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 234;"
new = "const APP_FILES_PIN = 236; // M1235 The Training Desk: 234 -> 236 — domain/trainingDesk.ts and features/desk/TrainingDesk.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 242;", "const POP_PIN = 244; // M1235 The Training Desk: 242 -> 244 — domain/trainingDesk.ts and features/desk/TrainingDesk.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 97, features: 97, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 98, features: 98, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1235: domain 97 -> 98 (domain/trainingDesk.ts), features 97 -> 98 (features/desk/TrainingDesk.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1235: features/desk/TrainingDesk.tsx sits two levels down — %d -> 114." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 241;"
new = "const APP_MODULE_PIN = 243; // M1235 The Training Desk: 241 -> 243 — domain/trainingDesk.ts and features/desk/TrainingDesk.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 231;"
new = "const ROUTER_POP_PIN = 233; // M1235 The Training Desk: 231 -> 233 — domain/trainingDesk.ts and features/desk/TrainingDesk.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
