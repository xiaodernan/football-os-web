import io
p = "domain/matchReporter.ts"
s = io.open(p, encoding="utf-8").read()
old = '''/** The fold's own report: the score, the goalscorers in minute order, and the stats line — built
 *  from the very same envelope, deterministic, never a copy of the model's prose. */
export function foldReport(fixture: ReporterFixture): string {
  const goals = fixture.events.filter((e) => e.type === "GOAL");
  const parts = [
    `${fixture.homeName} ${fixture.homeGoals}-${fixture.awayGoals} ${fixture.awayName}.`,
    goals.length
      ? `Goals: ${goals.map((g) => `${g.player} ${g.minute}'`).join(", ")}.`
      : "No goals were recorded.",
  ];
  const shots = fixture.events.filter((e) => e.type === "SHOT").length;
  const saves = fixture.events.filter((e) => e.type === "SAVE").length;
  if (shots || saves) parts.push(`The engine recorded ${shots} shots and ${saves} saves.`);
  return parts.join(" ");
}'''
new = '''/** The fold's own report as DATA — the score, the goalscorers in minute order, the engine's
 *  tallies. The domain writes no prose (the domain-prose ceiling is zero): the screen words
 *  this structure through the dictionary, so a refusal's report is translated like everything
 *  else the reader sees. */
export interface FoldReport {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly goals: readonly { player: string; minute: number }[];
  readonly shots: number;
  readonly saves: number;
}

export function foldReport(fixture: ReporterFixture): FoldReport {
  const goals = fixture.events
    .filter((e) => e.type === "GOAL")
    .map((e) => ({ player: e.player, minute: e.minute }));
  return {
    homeGoals: fixture.homeGoals,
    awayGoals: fixture.awayGoals,
    goals,
    shots: fixture.events.filter((e) => e.type === "SHOT").length,
    saves: fixture.events.filter((e) => e.type === "SAVE").length,
  };
}'''
assert old in s
s = s.replace(old, new, 1)
old = '''export const reporterRefused = (s: ReporterState, answer: string): ReporterState =>
  fsmRefused({ ...s, answer: foldReport(s.fixture) }, foldReport(s.fixture), REPORTER_FOLD_ENTRY);'''
new = '''export const reporterRefused = (s: ReporterState, answer: string): ReporterState =>
  fsmRefused({ ...s, answer }, answer, REPORTER_FOLD_ENTRY);'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("foldReport is data now")
