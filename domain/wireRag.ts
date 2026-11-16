// M1166 · The Retrieval Art — ask the wire, fetch only what the question can use.
// The Ask desk stopped handing the model the same digest for every preset. Each preset round-trips
// the committed CC0 artifact and takes back exactly the rows an honest answer can be built from;
// nothing outside it crosses the wire, and the same fold drives both the budget and the prose.
import type { LiveWirePayload } from "@/data/liveWire";
import { sum } from "./attributes";

/** The three desks' preset ids — the one spelling of the ask space. */
export type WireAskId = "nextRound" | "titleChase" | "wonderTable";

const formCount = (form: string[], letter: string): number => sum(form, (f) => (f === letter ? 1 : 0));

// Every row handed over is a JSON-friendly tuple or primitive — never prose; the gates strip domain copy.
const tableRow = (r: { pos: number; team: string; pts: number; gd: number; gf: number; ga: number; form: string[] }) =>
  [r.pos, r.team, r.pts, r.gd, r.gf, r.ga, r.form.join("")];

/** The retrieval: pick and compact exactly the artifact rows an honest answer needs. */
export function retrieveAsk(payload: LiveWirePayload, id: WireAskId): object {
  if (id === "nextRound") {
    return {
      ask: "nextRound",
      leagues: payload.leagues.map((l) => ({
        league: l.league,
        season: l.season,
        next: l.upcoming.slice(0, 4).map((f) => [f.round, f.date, `${f.home} v ${f.away}`]),
        summit: l.table.slice(0, 3).map(tableRow),
      })),
    };
  }
  if (id === "titleChase") {
    return {
      ask: "titleChase",
      leagues: payload.leagues.map((l) => ({
        league: l.league,
        season: l.season,
        summit: l.table.slice(0, 4).map(tableRow),
        formWeights: l.table.slice(0, 4).map((r) => [r.team, formCount(r.form, "W")]),
      })),
    };
  }
  // wonderTable: three computed oddities per league — signal, never punditry.
  const out = payload.leagues.map((l) => {
    const byPts = [...l.table].sort((a, b) => b.pts - a.pts);
    const top6 = byPts.slice(0, 6);
    const highGAInTop6 = [...top6].sort((a, b) => b.ga - a.ga)[0];
    const byGA = [...l.table].sort((a, b) => b.ga - a.ga).slice(0, 4);
    const outlierDefense = byGA.map((r) => [r.pos, r.team, r.pts, r.ga, r.gd]);
    const byAttack = [...l.table].sort((a, b) => b.gf - a.gf).slice(0, 4).map(tableRow);
    const negativeGdLeaders = top6.filter((r) => r.gd < 0).map(tableRow);
    return {
      league: l.league,
      season: l.season,
      summit: l.table.slice(0, 5).map(tableRow),
      highGAInTop6: [highGAInTop6.pos, highGAInTop6.team, highGAInTop6.pts, highGAInTop6.ga],
      attack: byAttack,
      defense: outlierDefense,
      negativeGdLeaders,
    };
  });
  return { ask: "wonderTable", leagues: out };
}
