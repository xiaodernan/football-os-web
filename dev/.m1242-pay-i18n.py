import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 247;", "const APP_SRC_PIN = 249; // M1242 The Dressing Room: 247 -> 249 — domain/dressingRoom.ts and features/dressing/DressingRoom.tsx join the reader."),
  ("const TSX_PIN = 126;", "const TSX_PIN = 127; // M1242 The Dressing Room: +1 features/dressing/DressingRoom.tsx."),
  ("const SRC_PIN = 250;", "const SRC_PIN = 252; // M1242 The Dressing Room: 250 -> 252 — domain/dressingRoom.ts and features/dressing/DressingRoom.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3958 && shapeCounts.template === 203 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3991 && shapeCounts.template === 204 && shapeCounts.expression === 77"),
  ("litVarSites === 619 && computedVarSites === 9", "litVarSites === 625 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
