import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 246;", "const APP_SRC_PIN = 247; // M1241 The Ops Trend: 246 -> 247 — domain/opsTrend.ts joins the reader (the ops screen already counted)."),
  ("const SRC_PIN = 249;", "const SRC_PIN = 250; // M1241 The Ops Trend: 249 -> 250 — domain/opsTrend.ts joins the dictionary-table reader."),
  ("shapeCounts.literal === 3954 && shapeCounts.template === 201 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3958 && shapeCounts.template === 203 && shapeCounts.expression === 77"),
  ("litVarSites === 617 && computedVarSites === 9", "litVarSites === 619 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
