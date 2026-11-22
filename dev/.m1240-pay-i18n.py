import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
old = "shapeCounts.literal === 3941 && shapeCounts.template === 201 && shapeCounts.expression === 77"
new = "shapeCounts.literal === 3954 && shapeCounts.template === 201 && shapeCounts.expression === 77"
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pin paid")
