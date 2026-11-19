// Build public/frozen-fold.json — the seeded world's own fold, plain bytes, verifiable.
// Runs on the seed itself; the JSON artifact is what update-frozen-diary.mjs hands the model
// and what frozen-diary-claims.mjs re-proves every model sentence against. Commit the artifact;
// never edit by hand; regenerate with this script after any seed change.
import { createServer } from "vite";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(root, "public/frozen-fold.json");
mkdirSync(dirname(outFile), { recursive: true });

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const svc = await server.ssrLoadModule("/data/footballService.ts");
const lg = await server.ssrLoadModule("/domain/league.ts");

const provider = svc.footballProvider;
const clubs = provider.clubs();
const matches = provider.matches();
const byClubId = new Map(clubs.map((c) => [c.id, c]));
const STANDARD_RULES = lg.STANDARD_RULES;

const folds = [];
for (const comp of provider.competitions()) {
  const table = lg.customPointsTable(comp.id, matches, clubs, STANDARD_RULES);
  const rows = [...table.rows].sort((a, b) => a.standardPosition - b.standardPosition);
  if (rows.length === 0) continue;
  const finished = matches.filter((m) => m.competitionId === comp.id && m.status === "FINISHED");
  const goals = finished.reduce((s, m) => s + (m.homeGoals ?? 0) + (m.awayGoals ?? 0), 0);
  const rowsForFold = rows.map((r) => {
    const club = byClubId.get(r.clubId);
    return {
      pos: r.standardPosition,
      club: club?.name ?? r.clubId,
      clubId: r.clubId,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      gf: r.gf,
      ga: r.ga,
      gd: r.gf - r.ga,
      pts: r.standardPoints,
    };
  });
  const champions = rowsForFold[0];
  const runnerUp = rowsForFold[1];
  const tail = rowsForFold[rowsForFold.length - 1];
  folds.push({
    id: comp.id,
    name: comp.name,
    nation: comp.nation,
    tier: comp.tier,
    clubs: rowsForFold.length,
    played: champions.played,
    totalMatches: matches.filter((m) => m.competitionId === comp.id).length,
    finishedMatches: finished.length,
    goals,
    champions,
    runnerUp,
    tail,
    table: rowsForFold.map((r) => [r.pos, r.club, r.played, r.won, r.drawn, r.lost, r.gf, r.ga, r.gd, r.pts]),
  });
}

const payload = { version: "frozen-fold/v1", folds };
writeFileSync(outFile, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`frozen fold written: ${outFile} (${folds.length} competitions, ${payload.folds.reduce((s, f) => s + f.goals, 0)} goals across ${matches.length} matches)`);

await server.close();
process.exit(0);
