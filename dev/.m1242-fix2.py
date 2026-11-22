import io
p = "domain/dressingRoom.ts"
s = io.open(p, encoding="utf-8").read()
old = '''import { creditRecord, formLetter, leaguePoints, recentResults, type ResultTally } from "./attributes";'''
new = '''import { creditRecord, formLetter, recentResults, resultPoints, type ResultTally } from "./attributes";'''
assert old in s
s = s.replace(old, new, 1)
old = '''    creditRecord(row, ourGoals, oppGoals);
    letters.push(formLetter(ourGoals, oppGoals));
  }
  // The table's own arithmetic: a win is three, a draw one — the same door the ladder reads.
  row.points = leaguePoints(row);'''
new = '''    creditRecord(row, ourGoals, oppGoals);
    // The table's own arithmetic, read through the same door the ladder uses: a win is three,
    // a draw one — never a hand-spelled `points += 3` (the M420 dialect the gate charges).
    row.points += resultPoints(ourGoals, oppGoals);
    letters.push(formLetter(ourGoals, oppGoals));
  }'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("points wired through the door")
