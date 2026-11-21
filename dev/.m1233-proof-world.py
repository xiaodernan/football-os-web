import io
p = "tests/e2e/chair.spec.ts"
s = io.open(p, encoding="utf-8").read()
s = s.replace('await expect(page.getByText("The model names your starting XI — from this squad, and from nothing else.")).toBeVisible();',
              'await expect(page.getByText("The model names a World XI — from the world\'s strongest sixty, and from nothing else.")).toBeVisible();')
s = s.replace('await expect(page.getByText(/the squad in the chair\'s hands/)).toBeVisible();',
              'await expect(page.getByText("The pool in the chair\'s hands")).toBeVisible();')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("e2e updated")

p = "scripts/proof-selectionchair.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''const { createChair, parseChairXi, verifyChairText, foldXi, chairLine, chairPreflight, chairBuild, chairPrecommit, chairCommit, chairRefused } = m;'''
new = '''const { createChair, parseChairXi, verifyChairText, foldXi, chairLine, worldSquad, chairPreflight, chairBuild, chairPrecommit, chairCommit, chairRefused } = m;'''
assert old in s
s = s.replace(old, new, 1)
old = '''// The world's eight position groups map onto the board's four lines, once and classically.'''
new = '''// The chair's pool is the world's strongest, cut with the digest's own comparator.
const worldPlayers = [
  { id: "w1", name: "One", position: "ST", positionGroup: "ST", age: 24, nation: "n", clubId: "c", overall: 91, potential: 95, archetype: "a", value: 1, foot: "R" },
  { id: "w2", name: "Two", position: "GK", positionGroup: "GK", age: 28, nation: "n", clubId: "c", overall: 89, potential: 91, archetype: "a", value: 1, foot: "R" },
  { id: "w3", name: "Three", position: "CB", positionGroup: "CB", age: 26, nation: "n", clubId: "c", overall: 87, potential: 90, archetype: "a", value: 1, foot: "R" },
  { id: "w4", name: "Four", position: "CM", positionGroup: "CM", age: 22, nation: "n", clubId: "c", overall: 86, potential: 93, archetype: "a", value: 1, foot: "R" },
];
const pool = worldSquad(worldPlayers, 3);
ok(`the chair's pool is the world's strongest by the digest's own comparator, mapped to the four lines (limit 3 of 4 -> ${pool.map((p) => `${p.id}@${p.overall}/${p.positionGroup}`).join(",")})`,
  pool.length === 3 && pool[0].id === "w1" && pool[0].positionGroup === "ATT" &&
  pool[1].id === "w2" && pool[1].positionGroup === "GK" &&
  pool[2].id === "w3" && pool[2].positionGroup === "DEF" &&
  worldSquad(worldPlayers, 0).length === 0 && worldSquad(worldPlayers).length === 4);

// The world's eight position groups map onto the board's four lines, once and classically.'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("proof arm added")
