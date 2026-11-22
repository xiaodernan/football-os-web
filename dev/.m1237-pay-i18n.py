import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 242;", "const APP_SRC_PIN = 244; // M1237 The Talent Map: 242 -> 244 — domain/nations.ts and features/nations/TalentMap.tsx join the reader."),
  ("const TSX_PIN = 124;", "const TSX_PIN = 125; // M1237 The Talent Map: +1 features/nations/TalentMap.tsx."),
  ("const SRC_PIN = 245;", "const SRC_PIN = 247; // M1237 The Talent Map: 245 -> 247 — domain/nations.ts and features/nations/TalentMap.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3895 && shapeCounts.template === 198 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3911 && shapeCounts.template === 198 && shapeCounts.expression === 77"),
  ("litVarSites === 608 && computedVarSites === 9", "litVarSites === 612 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
