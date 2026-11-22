import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("shapeCounts.literal === 3938 && shapeCounts.template === 201 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3941 && shapeCounts.template === 201 && shapeCounts.expression === 77"),
  ("litVarSites === 616 && computedVarSites === 9", "litVarSites === 617 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
