import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 238;", "const APP_SRC_PIN = 240; // M1235 The Training Desk: 238 -> 240 — domain/trainingDesk.ts and features/desk/TrainingDesk.tsx join the reader."),
  ("const TSX_PIN = 122;", "const TSX_PIN = 123; // M1235 The Training Desk: +1 features/desk/TrainingDesk.tsx."),
  ("const SRC_PIN = 241;", "const SRC_PIN = 243; // M1235 The Training Desk: 241 -> 243 — domain/trainingDesk.ts and features/desk/TrainingDesk.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3842 && shapeCounts.template === 193 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3870 && shapeCounts.template === 197 && shapeCounts.expression === 77"),
  ("litVarSites === 599 && computedVarSites === 9", "litVarSites === 603 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
