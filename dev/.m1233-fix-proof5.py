import io
p = "scripts/proof-selectionchair.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''const thin = { clubId: "ars", players: [
  p("g1", "GK", 84), p("d1", "DEF", 83), p("m1", "MID", 80), p("a1", "ATT", 88),
  p("x1", "ATT", 66), p("x2", "DEF", 65), p("x3", "MID", 64), p("x4", "DEF", 63),
  p("x5", "MID", 62), p("x6", "ATT", 61), p("x7", "DEF", 60),
] };'''
new = '''const thin = { clubId: "ars", players: [
  p("g1", "GK", 84), p("d1", "DEF", 83), p("m1", "MID", 80), p("a1", "ATT", 88),
  p("x1", "ATT", 77), p("x2", "ATT", 76), p("x3", "ATT", 75), p("x4", "ATT", 74),
  p("x5", "ATT", 73), p("x6", "ATT", 72), p("x7", "ATT", 71), p("x8", "ATT", 70), p("x9", "ATT", 69),
] };'''
assert old in s
s = s.replace(old, new, 1)
old = '''  JSON.stringify(thinFold.ids) === JSON.stringify(["g1", "d1", "m1", "a1", "x1", "x2", "x3", "x4", "x5", "x6", "x7"]) &&'''
new = '''  JSON.stringify(thinFold.ids) === JSON.stringify(["g1", "d1", "m1", "a1", "x1", "x2", "x3", "x4", "x5", "x6", "x7"]) &&'''
assert old in s
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("thin fixture v3")
