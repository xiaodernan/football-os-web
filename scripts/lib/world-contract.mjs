// M1037: the world contract — the one snapshot the Java league service serves.
//
// The SPA's seeded world is TypeScript; the league service is Java. Rather than copying fixture
// numbers into Java by hand (a second source of truth that rots quietly), scripts/export-service-
// contract.mjs writes a frozen snapshot of the provider's counts plus a digest over exactly those
// counts. The controller reads that resource; proof-services re-derives the snapshot from the
// dataset and refuses a stale file. The contract is a snapshot, not a live link — the SPA still
// does not call the service.

import { createHash } from "node:crypto";

export const CONTRACT_RESOURCE = "league-summary.json";
export const CONTRACT_PATH = "services/league-service/src/main/resources/league-summary.json";
export const CONTRACT_EXPORTER = "scripts/export-service-contract.mjs";
export const CONTRACT_DATASET = "football-os/world";
export const TABLES_RESOURCE = "league-tables.json";
export const TABLES_PATH = "services/league-service/src/main/resources/league-tables.json";
export const TABLES_DATASET = "football-os/world"

/** A pure function of the snapshot: same counts in, same digest out. */
export function contractDigest(snapshot) {
  const canonical = `${CONTRACT_DATASET}\n${JSON.stringify(snapshot)}`;
  return `sha256-${createHash("sha256").update(canonical).digest("hex")}`;
}

/** Read the provider once and freeze its shape. Deterministic: no clock, no randomness. */
export async function buildWorldContract(server) {
  const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");
  const clubs = footballProvider.clubs();
  const players = footballProvider.players();
  const competitions = footballProvider.competitions();
  const matches = footballProvider.matches();
  const finishedMatches = matches.filter(
    (m) => m.status === "FINISHED" && m.homeGoals != null && m.awayGoals != null,
  );
  const snapshot = {
    clubs: clubs.length,
    players: players.length,
    competitions: competitions.length,
    matches: matches.length,
    finishedMatches: finishedMatches.length,
  };
  return {
    generatedBy: CONTRACT_EXPORTER,
    dataset: CONTRACT_DATASET,
    snapshot,
    digest: contractDigest(snapshot),
  };
}

/** One serializer for the writer and the proof: byte-identical files, two-space JSON. */
export const serializeContract = (contract) => `${JSON.stringify(contract, null, 2)}\n`;

/** Freeze every competition's standard table from the TypeScript world — the same discipline
 *  as the summary contract: byte-identity, re-derivable from the seed, nothing hand-written.
 *  The league service serves one of these tables per call; the snapshot file stays frozen
 *  like its sibling (`league-summary.json`) and is refreshed the same way, by the exporter. */
export async function buildWorldTables(server) {
  const { footballProvider } = await server.ssrLoadModule("/data/footballService.ts");
  const { customPointsTable, STANDARD_RULES } = await server.ssrLoadModule("/domain/league.ts");
  const clubs = footballProvider.clubs();
  const competitions = footballProvider.competitions();
  const matches = footballProvider.matches();
  const tables = {};
  for (const competition of competitions) {
    const { rows, matches: played } = customPointsTable(competition.id, matches, clubs, STANDARD_RULES);
    tables[competition.id] = {
      competitionId: competition.id,
      name: competition.name,
      played,
      rows: rows.map((r, i) => ({
        position: i + 1,
        clubId: r.clubId,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        gf: r.gf,
        ga: r.ga,
        points: r.standardPoints,
      })),
    };
  }
  return {
    generatedBy: CONTRACT_EXPORTER,
    dataset: TABLES_DATASET,
    leagues: Object.keys(tables).length,
    tables,
  };
}

/** One serializer for the writer and the proof: byte-identical files. */
export const serializeTables = (doc) => `${JSON.stringify(doc, null, 2)}\n`;
