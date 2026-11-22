import io
p = "domain/matchReporter.ts"
s = io.open(p, encoding="utf-8").read()
old = '''import type { Club, Match } from "./types";
import { getClub } from "@/data/footballService";'''
new = '''import type { Match } from "./types";'''
assert old in s
s = s.replace(old, new, 1)
old = '''/** A finished fixture with events, sealed as the reporter's envelope. */
export function sealFixture(match: Match, clubs: readonly Club[]): ReporterFixture | null {
  if (match.status !== "FINISHED" || match.homeGoals === null || match.awayGoals === null) return null;
  if (!match.events?.length) return null;
  const home = clubs.find((c) => c.id === match.homeClubId);
  const away = clubs.find((c) => c.id === match.awayClubId);
  if (!home || !away) return null;
  const stats = match.stats
    ? [match.stats.home, match.stats.away].flatMap((s) => [s.possession, s.shots, s.onTarget, s.xg, s.passes, s.passAcc, s.tackles, s.duels, s.corners, s.fouls, s.yellows, s.reds])
    : [];
  return {
    id: match.id,
    homeName: home.name,
    awayName: away.name,'''
new = '''/** A finished fixture with events, sealed as the reporter's envelope. The club NAMES are passed
 *  in rather than looked up here: the domain stays pure and the screen owns the world read. */
export function sealFixture(match: Match, homeName: string, awayName: string): ReporterFixture | null {
  if (match.status !== "FINISHED" || match.homeGoals === null || match.awayGoals === null) return null;
  if (!match.events?.length) return null;
  const stats = match.stats
    ? [match.stats.home, match.stats.away].flatMap((s) => [s.possession, s.shots, s.onTarget, s.xg, s.passes, s.passAcc, s.tackles, s.duels, s.corners, s.fouls, s.yellows, s.reds])
    : [];
  return {
    id: match.id,
    homeName,
    awayName,'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("domain is pure again")
