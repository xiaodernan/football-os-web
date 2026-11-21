import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 232;", "const APP_SRC_PIN = 234; // M1232 The Congested Calendar: 232 -> 234 — domain/congestion.ts and features/congestion/CongestedCalendar.tsx join the reader."),
  ("const TSX_PIN = 119;", "const TSX_PIN = 120; // M1232 The Congested Calendar: +1 features/congestion/CongestedCalendar.tsx."),
  ("const SRC_PIN = 235;", "const SRC_PIN = 237; // M1232 The Congested Calendar: 235 -> 237 — domain/congestion.ts and features/congestion/CongestedCalendar.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3792 && shapeCounts.template === 192 && shapeCounts.expression === 74",
   "shapeCounts.literal === 3806 && shapeCounts.template === 192 && shapeCounts.expression === 74"),
  ("litVarSites === 593 && computedVarSites === 9", "litVarSites === 595 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("i18n pins paid")
