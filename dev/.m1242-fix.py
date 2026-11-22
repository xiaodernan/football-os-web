import io
p = "domain/dressingRoom.ts"
s = io.open(p, encoding="utf-8").read()
old = '''import { creditRecord, formLetter, recentResults, type ResultTally } from "./attributes";'''
new = '''import { creditRecord, formLetter, leaguePoints, recentResults, type ResultTally } from "./attributes";'''
assert old in s
s = s.replace(old, new, 1)
old = '''    creditRecord(row, ourGoals, oppGoals);
    letters.push(formLetter(ourGoals, oppGoals));
  }'''
new = '''    creditRecord(row, ourGoals, oppGoals);
    letters.push(formLetter(ourGoals, oppGoals));
  }
  // The table's own arithmetic: a win is three, a draw one — the same door the ladder reads.
  row.points = leaguePoints(row);'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("points wired")
