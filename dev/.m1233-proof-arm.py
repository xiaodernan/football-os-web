import io
p = "scripts/proof-selectionchair.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''const { createChair, parseChairXi, verifyChairText, foldXi, chairPreflight, chairBuild, chairPrecommit, chairCommit, chairRefused } = m;'''
new = '''const { createChair, parseChairXi, verifyChairText, foldXi, chairLine, chairPreflight, chairBuild, chairPrecommit, chairCommit, chairRefused } = m;'''
assert old in s
s = s.replace(old, new, 1)
old = '''console.log(`\\n${pass}/${pass + fail} checks passed`);'''
new = '''// The world's eight position groups map onto the board's four lines, once and classically.
const groups = { GK: "GK", CB: "DEF", FB: "DEF", DM: "MID", CM: "MID", AM: "MID", W: "ATT", ST: "ATT" };
ok(`the world's eight position groups map onto the four lines once and classically — keepers stay keepers, full-backs join the centre-backs, the attacking mid and wingers go up top (${Object.entries(groups).map(([g, l]) => `${g}>${chairLine(g)===l ? l : "WRONG"}`).join(" ")})`,
  Object.entries(groups).every(([g, l]) => chairLine(g) === l) && chairLine("GK") === "GK" && chairLine("CB") === "DEF");

console.log(`\\n${pass}/${pass + fail} checks passed`);'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("mapping arm added")
