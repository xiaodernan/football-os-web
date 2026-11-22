import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 240;", "const APP_SRC_PIN = 242; // M1236 The Match Reporter: 240 -> 242 — domain/matchReporter.ts and features/reporter/MatchReporter.tsx join the reader."),
  ("const TSX_PIN = 123;", "const TSX_PIN = 124; // M1236 The Match Reporter: +1 features/reporter/MatchReporter.tsx."),
  ("const SRC_PIN = 243;", "const SRC_PIN = 245; // M1236 The Match Reporter: 243 -> 245 — domain/matchReporter.ts and features/reporter/MatchReporter.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3870 && shapeCounts.template === 197 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3895 && shapeCounts.template === 198 && shapeCounts.expression === 77"),
  ("litVarSites === 603 && computedVarSites === 9", "litVarSites === 608 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
