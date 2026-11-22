import io
p = "domain/dressingRoom.ts"
s = io.open(p, encoding="utf-8").read()
old = '''import { creditRecord, formLetter, recentResults, resultPoints, type ResultTally } from "./attributes";'''
new = '''import { creditRecord, formLetter, recentResults, resultPoints, type SeasonRowFields } from "./attributes";'''
assert old in s
s = s.replace(old, new, 1)
old = '''  const row: ResultTally = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };'''
new = '''  const row: SeasonRowFields = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("row type fixed")
