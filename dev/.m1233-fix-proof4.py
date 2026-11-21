import io
p = "scripts/proof-selectionchair.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''const thin = { clubId: "ars", players: [p("g1", "GK", 84), p("d1", "DEF", 83), p("m1", "MID", 80), p("a1", "ATT", 88), p("x1", "DEF", 60), p("x2", "MID", 61), p("x3", "ATT", 62), p("x4", "DEF", 63), p("x5", "MID", 64), p("x6", "ATT", 65), p("x7", "DEF", 66)] };'''
new = '''// A genuinely thin squad: one player per line, seven more bodies of any position. The shape
// takes what each line has; the leftovers fill the XI to eleven, best-rated first.
const thin = { clubId: "ars", players: [
  p("g1", "GK", 84), p("d1", "DEF", 83), p("m1", "MID", 80), p("a1", "ATT", 88),
  p("x1", "ATT", 66), p("x2", "DEF", 65), p("x3", "MID", 64), p("x4", "DEF", 63),
  p("x5", "MID", 62), p("x6", "ATT", 61), p("x7", "DEF", 60),
] };'''
assert old in s
s = s.replace(old, new, 1)
old = '''ok(`a thin squad still fills eleven — the keeper leads, the shape's picks follow, the best-rated leftovers fill the rest — and a squad with no keeper or fewer than eleven reads null rather than a broken XI (thin ${thinFold?.ids.length}: ${thinFold?.ids.join(",")}; noGk ${noGk}; short ${short})`,
  thinFold !== null && thinFold.ids.length === 11 && thinFold.ids[0] === "g1" &&
  thinFold.ids[1] === "d1" && thinFold.ids[2] === "m1" && thinFold.ids[3] === "a1" &&
  thinFold.ids[4] === "x7" && thinFold.ids[10] === "x1" && noGk === null && short === null);'''
new = '''ok(`a thin squad still fills eleven — the keeper leads, the shape takes what each line has, the best-rated leftovers fill the rest — and a squad with no keeper or fewer than eleven reads null rather than a broken XI (thin ${thinFold?.ids.length}: ${thinFold?.ids.join(",")}; noGk ${noGk}; short ${short})`,
  thinFold !== null && thinFold.ids.length === 11 &&
  JSON.stringify(thinFold.ids) === JSON.stringify(["g1", "d1", "m1", "a1", "x1", "x2", "x3", "x4", "x5", "x6", "x7"]) &&
  noGk === null && short === null);'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("thin fixture redesigned")
