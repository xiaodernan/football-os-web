import io
p = "domain/depth.ts"
s = io.open(p, encoding="utf-8").read()
old = '''  const shallowest = rows.length ? [...rows].sort((a, b) => a.cliff - b.cliff || b.xiAvg - a.xiAvg || a.clubId.localeCompare(b.clubId))[0] : null;'''
new = '''  // The shallowest: the smallest cliff; a tie goes to the thinner bench (equal cliff, less
  // behind it is the shallower side), then the id — so the two headline tiles name different
  // clubs whenever the world allows it.
  const shallowest = rows.length ? [...rows].sort((a, b) => a.cliff - b.cliff || a.benchAvg - b.benchAvg || a.clubId.localeCompare(b.clubId))[0] : null;'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("comparator fixed")

p = "scripts/proof-depth.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''ok(`the hand-counted world reads A cliff 12 / XI avg 85 / bench avg 58.5, B cliff 10 / XI avg 75 / bench 0, and C takes no row (${fold.rows.map((r) => `${r.clubId}:${r.cliff}/${r.xiAvg}/${r.benchAvg}`).join(", ")})`,
  fold.rows.length === 2 &&
  fold.rows.find((r) => r.clubId === "a").cliff === 12 &&'''
new = '''ok(`the hand-counted world reads A cliff 10 / XI avg 85 / bench avg 58.5, B cliff 10 / XI avg 75 / bench 0, and C takes no row (${fold.rows.map((r) => `${r.clubId}:${r.cliff}/${r.xiAvg}/${r.benchAvg}`).join(", ")})`,
  fold.rows.length === 2 &&
  fold.rows.find((r) => r.clubId === "a").cliff === 10 &&'''
assert old in s
s = s.replace(old, new, 1)
old = '''ok(`a squad that IS the eleven reads a zero bench rather than NaN, and an empty world reads empty (bench ${exact.rows[0].benchAvg}, cliff ${exact.rows[0].cliff}; empty ${empty.rows.length}/${empty.steepest === null}/${empty.leagueAvg})`,
  exact.rows[0].benchAvg === 0 && exact.rows[0].cliff === 0 && exact.rows[0].best === 84 &&'''
new = '''ok(`a squad that IS the eleven reads a zero bench rather than NaN, and an empty world reads empty (bench ${exact.rows[0].benchAvg}, cliff ${exact.rows[0].cliff}; empty ${empty.rows.length}/${empty.steepest === null}/${empty.leagueAvg})`,
  exact.rows[0].benchAvg === 0 && exact.rows[0].cliff === 10 && exact.rows[0].best === 84 &&'''
assert old in s
s = s.replace(old, new, 1)
old = '''  fold.steepest?.clubId === "a" && fold.shallowest?.clubId === "b" && fold.leagueAvg === 11);'''
new = '''  fold.steepest?.clubId === "a" && fold.shallowest?.clubId === "b" && fold.leagueAvg === 10);'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("proof assertions fixed")
