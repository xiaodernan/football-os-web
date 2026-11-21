import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 230;", "const APP_SRC_PIN = 232; // M1231 The Keepers' Union: 230 -> 232 — domain/keepers.ts and features/keepers/KeepersUnion.tsx join the reader."),
  ("const TSX_PIN = 118;", "const TSX_PIN = 119; // M1231 The Keepers' Union: +1 features/keepers/KeepersUnion.tsx."),
  ("const SRC_PIN = 233;", "const SRC_PIN = 235; // M1231 The Keepers' Union: 233 -> 235 — domain/keepers.ts and features/keepers/KeepersUnion.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3776 && shapeCounts.template === 192 && shapeCounts.expression === 74",
   "shapeCounts.literal === 3792 && shapeCounts.template === 192 && shapeCounts.expression === 74"),
  ("litVarSites === 589 && computedVarSites === 9", "litVarSites === 593 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("i18n pins paid")
