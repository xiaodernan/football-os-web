import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = "exprWithObj.length === 0 && shapeCounts.expression === 70 && exprObjPlant.args[1].trim().startsWith(\"{\"));"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, "exprWithObj.length === 0 && shapeCounts.expression === 71 && exprObjPlant.args[1].trim().startsWith(\"{\"));", 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("paid")
