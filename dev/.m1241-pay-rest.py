import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 242;"
new = "const APP_FILES_PIN = 243; // M1241 The Ops Trend: 242 -> 243 — domain/opsTrend.ts joins the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 250;", "const POP_PIN = 251; // M1241 The Ops Trend: 250 -> 251 — domain/opsTrend.ts joins the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 101, features: 101, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 102, features: 101, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1241: domain 101 -> 102 (domain/opsTrend.ts)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
print("DEEP_PIN currently:", m.group(1))
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 249;"
new = "const APP_MODULE_PIN = 250; // M1241 The Ops Trend: 249 -> 250 — domain/opsTrend.ts rides the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 239;"
new = "const ROUTER_POP_PIN = 240; // M1241 The Ops Trend: 239 -> 240 — domain/opsTrend.ts rides the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
