import io
p = "scripts/proof-matchreporter.mjs"
s = io.open(p, encoding="utf-8").read()

old2 = """// The fold's own report: the score, the scorers in minute order, the engine's tallies.
const report = foldReport(fx);
ok(`the fold's report reads the score, the goalscorers in minute order and the engine's tallies (${report})`,
  report === "Arsenal 2-1 Chelsea. Goals: Bukayo Saka 12', Declan Rice 55', Cole Palmer 78'. The engine recorded 0 shots and 1 saves." &&
  foldReport(fx) === report);"""
new2 = """// The fold's own report as DATA - the score, the scorers in minute order, the engine's tallies.
// The domain writes no prose; the screen words this structure through the dictionary.
const report = foldReport(fx);
ok(`the fold's report reads the score, the scorers in minute order and the engine's tallies (${JSON.stringify(report)})`,
  report.homeGoals === 2 && report.awayGoals === 1 &&
  JSON.stringify(report.goals) === JSON.stringify([
    { player: "Bukayo Saka", minute: 12 },
    { player: "Declan Rice", minute: 55 },
    { player: "Cole Palmer", minute: 78 },
  ]) &&
  report.shots === 0 && report.saves === 1 &&
  JSON.stringify(foldReport(fx)) === JSON.stringify(report));"""
assert old2 in s, "fold anchor"
s = s.replace(old2, new2, 1)

old3 = """// A goalless draw reads "no goals" rather than an empty list.
const blank = sealFixture({ ...match, homeGoals: 0, awayGoals: 0, events: [{ minute: 30, type: "SHOT", side: "home", player: "x" }] }, "Arsenal", "Chelsea");
ok(`a goalless fixture reads "no goals were recorded" rather than an empty list (${foldReport(blank).includes("No goals were recorded")})`,
  blank !== null && foldReport(blank).includes("No goals were recorded"));"""
new3 = """// A goalless fixture reads an empty goals list, not a broken one.
const blank = sealFixture({ ...match, homeGoals: 0, awayGoals: 0, events: [{ minute: 30, type: "SHOT", side: "home", player: "x" }] }, "Arsenal", "Chelsea");
ok(`a goalless fixture reads an empty goals list rather than a broken one (${foldReport(blank).goals.length} goals)`,
  blank !== null && foldReport(blank).goals.length === 0 && foldReport(blank).homeGoals === 0);"""
assert old3 in s, "blank anchor"
s = s.replace(old3, new3, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("proof updated")
