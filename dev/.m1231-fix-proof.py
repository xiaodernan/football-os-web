import io
p = "scripts/proof-keepers.mjs"
s = io.open(p, encoding="utf-8").read()
old = 'const noSheets = keeperUnion(players, clubs, [fin("a", "b", 1, 0), fin("a", "c", 2, 1)]);'
new = 'const noSheets = keeperUnion(players, clubs, [fin("a", "b", 1, 1), fin("a", "c", 2, 2)]);'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("fixture fixed")
