import io
p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
old1 = "const POP_PIN = 232;"
new1 = "const POP_PIN = 234; // M1230 The First-Run Guide: 232 -> 234 — domain/firstRunGuide.ts and ui/FirstRunGuide.tsx join the population."
assert old1 in s
s = s.replace(old1, new1, 1)
old2 = "const BY_DIR_PIN = { components: 15, data: 11, domain: 92, features: 93, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 4 };"
new2 = "const BY_DIR_PIN = { components: 15, data: 11, domain: 93, features: 93, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1230: domain 92 -> 93 (domain/firstRunGuide.ts), ui 4 -> 5 (ui/FirstRunGuide.tsx)."
assert old2 in s
s = s.replace(old2, new2, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("coverage pins paid")
