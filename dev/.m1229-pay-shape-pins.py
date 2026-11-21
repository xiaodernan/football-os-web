import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("shapeCounts.literal === 3760 && shapeCounts.template === 192 && shapeCounts.expression === 70",
   "shapeCounts.literal === 3766 && shapeCounts.template === 192 && shapeCounts.expression === 71", 1),
  ("litVarSites === 587 && computedVarSites === 9", "litVarSites === 588 && computedVarSites === 9", 1),
  ("ariaKeyed === 45 && ariaFwd === 1", "ariaKeyed === 46 && ariaFwd === 1", 1),
  ("&& shapeCounts.computed === 26 && shapeCounts.unknown === 0 && plantUnknown);",
   "&& shapeCounts.computed === 27 && shapeCounts.unknown === 0 && plantUnknown);", 1),
]
for old, new, n in subs:
    assert s.count(old) == n, (old, s.count(old))
    s = s.replace(old, new)
anchor = "// M415 folded DialogFooter, a dead part whose one `t(\"ui.close\")` was a literal site; the"
note = "// M1229 The Teaching Hints: the settings row's six labels add 6 literals (3760 -> 3766), the\n// component's conditional label adds 1 expression (70 -> 71) and its variable-key call 1 computed\n// (26 -> 27); litVarSites 587 -> 588 (teach.unreadCount), ariaKeyed 45 -> 46 (the \"?\" aria-label).\n"
assert anchor in s
s = s.replace(anchor, note + anchor, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("shape pins paid")
