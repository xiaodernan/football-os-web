import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 236;", "const APP_SRC_PIN = 238; // M1234 The Cliff: 236 -> 238 — domain/depth.ts and features/depth/SquadDepth.tsx join the reader."),
  ("const TSX_PIN = 121;", "const TSX_PIN = 122; // M1234 The Cliff: +1 features/depth/SquadDepth.tsx."),
  ("const SRC_PIN = 239;", "const SRC_PIN = 241; // M1234 The Cliff: 239 -> 241 — domain/depth.ts and features/depth/SquadDepth.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3827 && shapeCounts.template === 193 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3842 && shapeCounts.template === 193 && shapeCounts.expression === 77"),
  ("litVarSites === 596 && computedVarSites === 9", "litVarSites === 599 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
