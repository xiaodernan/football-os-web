import io, re
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  # population pins
  ("const APP_SRC_PIN = 228;", "const APP_SRC_PIN = 230; // M1230 The First-Run Guide: 228 -> 230 — domain/firstRunGuide.ts and ui/FirstRunGuide.tsx join the reader."),
  ("const TSX_PIN = 117;", "const TSX_PIN = 118; // M1230 The First-Run Guide: +1 ui/FirstRunGuide.tsx."),
  ("const SRC_PIN = 231;", "const SRC_PIN = 233; // M1230 The First-Run Guide: 231 -> 233 — domain/firstRunGuide.ts and ui/FirstRunGuide.tsx join the dictionary-table reader."),
  # shapes
  ("shapeCounts.literal === 3766 && shapeCounts.template === 192 && shapeCounts.expression === 71",
   "shapeCounts.literal === 3776 && shapeCounts.template === 192 && shapeCounts.expression === 74"),
  ("exprWithObj.length === 0 && shapeCounts.expression === 71 &&",
   "exprWithObj.length === 0 && shapeCounts.expression === 74 &&"),
  ("litVarSites === 588 && computedVarSites === 9", "litVarSites === 589 && computedVarSites === 9"),
  ("ariaKeyed === 46 && ariaFwd === 1", "ariaKeyed === 47 && ariaFwd === 1"),
  ("&& shapeCounts.computed === 27 && shapeCounts.unknown === 0 && plantUnknown);",
   "&& shapeCounts.computed === 27 && shapeCounts.unknown === 0 && plantUnknown);"),
  # excess keys
  ("const DUP_EXCESS_KEYS_PIN = 271;", "const DUP_EXCESS_KEYS_PIN = 272;"),
]
for old, new in subs:
    assert old in s, old
    s = s.replace(old, new, 1)
# the fill/walker/skip-list/browser-locale checks pin appSrc.size === APP_SRC_PIN (already a symbol) — verify none pin a literal 228/231
for lit in ["=== 228", "=== 231", "=== 226", "=== 229"]:
    hits = [l.strip()[:120] for l in s.split("\n") if lit in l]
    if hits:
        print("LITERAL", lit, "->", hits)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
