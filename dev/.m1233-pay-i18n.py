import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 234;", "const APP_SRC_PIN = 236; // M1233 The Selection Chair: 234 -> 236 — domain/selectionChair.ts and features/chair/SelectionChair.tsx join the reader."),
  ("const TSX_PIN = 120;", "const TSX_PIN = 121; // M1233 The Selection Chair: +1 features/chair/SelectionChair.tsx."),
  ("const SRC_PIN = 237;", "const SRC_PIN = 239; // M1233 The Selection Chair: 237 -> 239 — domain/selectionChair.ts and features/chair/SelectionChair.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3806 && shapeCounts.template === 192 && shapeCounts.expression === 74",
   "shapeCounts.literal === 3827 && shapeCounts.template === 193 && shapeCounts.expression === 77"),
  ("exprWithObj.length === 0 && shapeCounts.expression === 74 &&",
   "exprWithObj.length === 0 && shapeCounts.expression === 77 &&"),
  ("litVarSites === 595 && computedVarSites === 9", "litVarSites === 596 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
