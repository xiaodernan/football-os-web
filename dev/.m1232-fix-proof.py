import io
p = "scripts/proof-congestion.mjs"
s = io.open(p, encoding="utf-8").read()

old = '''// The hand-counted world: A turns around in 2 and 6 days, B in 4 and 1, C has a single fixture.
const clubs = [club("a"), club("b"), club("c")];
const matches = [
  game("m1", "a", "c", at(1, 15)),
  game("m2", "a", "c", at(3, 20)),
  game("m3", "a", "c", at(10)),
  game("m4", "b", "c", at(2)),
  game("m5", "b", "c", at(6)),
  game("m6", "b", "c", at(7)),
  game("m7", "c", "a", at(5)),
];'''
new = '''// The hand-counted world: A turns around in 2 and 6 days, B in 4 and 1, C has a single fixture.
// Each filler club appears in exactly one match, so only A and B have a spacing to read.
const clubs = [club("a"), club("b"), club("c")];
for (let i = 1; i <= 11; i++) clubs.push(club("d" + i));
const matches = [
  game("m1", "a", "d1", at(1, 15)),
  game("m2", "a", "d2", at(3, 20)),
  game("m3", "a", "d3", at(10)),
  game("m4", "b", "d4", at(2)),
  game("m5", "b", "d5", at(6)),
  game("m6", "b", "d6", at(7)),
  game("m7", "c", "d7", at(5)),
];'''
assert old in s
s = s.replace(old, new, 1)

old = '''const hours = fixtureCongestion([game("h1", "a", "c", at(1, 15)), game("h2", "a", "c", at(2, 20))], clubs);'''
new = '''const hours = fixtureCongestion([game("h1", "a", "d8", at(1, 15)), game("h2", "a", "d9", at(2, 20))], clubs);'''
assert old in s
s = s.replace(old, new, 1)

old = '''const edge = fixtureCongestion([
  game("e1", "a", "c", at(1)), game("e2", "a", "c", at(4)), game("e3", "a", "c", at(8)),
  game("e4", "b", "c", at(1)), game("e5", "b", "c", at(5)),
], clubs);'''
new = '''const edge = fixtureCongestion([
  game("e1", "a", "d8", at(1)), game("e2", "a", "d9", at(4)), game("e3", "a", "d10", at(8)),
  game("e4", "b", "d11", at(1)), game("e5", "b", "d1", at(5)),
], clubs);'''
assert old in s
s = s.replace(old, new, 1)

old = '''const badKick = fixtureCongestion([game("x1", "a", "c", ""), game("x2", "b", "c", at(2)), game("x3", "b", "c", at(6))], clubs);'''
new = '''const badKick = fixtureCongestion([game("x1", "a", "d2", ""), game("x2", "b", "d3", at(2)), game("x3", "b", "d4", at(6))], clubs);'''
assert old in s
s = s.replace(old, new, 1)

old = '''const tie = fixtureCongestion([
  game("t1", "a", "c", at(1)), game("t2", "a", "c", at(4)),
  game("t3", "b", "c", at(1)), game("t4", "b", "c", at(4)),
], clubs);'''
new = '''const tie = fixtureCongestion([
  game("t1", "a", "d5", at(1)), game("t2", "a", "d6", at(4)),
  game("t3", "b", "d7", at(1)), game("t4", "b", "d8", at(4)),
], clubs);'''
assert old in s
s = s.replace(old, new, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("fixtures fixed")
