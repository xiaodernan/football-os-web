// M1180 · The Deep Digest — the whole frozen world, every turn, byte-identical.
// The LLM endpoint is a prefix cache; the prefix carries. Rebuild this digest once per
// deploy and the model wakes up knowing the world it is asked about. Never time-dependent,
// never locale-dependent in content (locale only affects rendering at the edges), never
// truncated by the courtesy of a caller — every door feeds the same constant block.
import { footballProvider } from "@/data/footballService";
import leagueTables from "../services/league-service/src/main/resources/league-tables.json";
import { byOverall } from "@/domain/attributes";
import { fmt1 } from "@/lib/utils";

type FrozenRow = { position: number; clubId: string; points: number; played: number; won: number; drawn: number; lost: number; gf: number; ga: number };
const getTable = (id: string) =>
  (leagueTables as unknown as { tables: Record<string, { competitionId: string; name: string; rows: FrozenRow[] }> })
    .tables[id];

const eur = (v: number): string => `€${fmt1(v / 1_000_000)}m`;

/** The complete frozen world, written once and never rephrased. */
export const DEEP_DIGEST: string = (() => {
  const provider = footballProvider;
  const clubs = provider.clubs();
  const players = provider.players();
  const competitions = provider.competitions();
  const clubById = new Map(clubs.map((c) => [c.id, c] as const));
  const clubShort = (id: string): string => clubById.get(id)?.short ?? id;
  const clubName = (id: string): string => clubById.get(id)?.name ?? id;

  const out: string[] = [];
  out.push("THE DEEP DIGEST — the frozen world, every line re-derived on every deploy, nothing here is news from the live world.");
  out.push(`WORLD: ${competitions.length} competitions, ${clubs.length} clubs, ${players.length} players, one seed, one fold of history. If it is not in this digest it does not exist here.`);

  // The 15 tables, in full, exactly as the services ship them — no ellipses, no selection.
  out.push("THE 15 TABLES (full, frozen at the snapshot the services ship; positions, points, W-D-L, goals):");
  const tableOrder = ["pl", "liga", "seriea", "bundes", "ligue1", "eredivisie", "liga1", "spl", "mls", "brasileirao", "jleague", "superlig"];
  for (const id of tableOrder) {
    const t = getTable(id);
    if (!t) continue;
    out.push(`  ${t.name} (${t.competitionId}) — ${t.rows.length} clubs:`);
    for (const r of t.rows) {
      const pos = String(r.position);
      out.push("  " + pos + ". " + clubName(r.clubId) + " — " + r.points + "pts, " + r.played + "pl, W" + r.won + " D" + r.drawn + " L" + r.lost + ", " + r.gf + "gf/" + r.ga + "ga");
    }
  }
  for (const id of ["ucl", "uel", "libertadores"]) {
    const t = getTable(id);
    if (!t) continue;
    out.push(`  ${t.name} (${t.competitionId}) — ${t.rows.length} clubs:`);
    for (const r of t.rows) {
      const pos = String(r.position);
      out.push("  " + pos + ". " + clubName(r.clubId) + " — " + r.points + "pts, " + r.played + "pl, W" + r.won + " D" + r.drawn + " L" + r.lost + ", " + r.gf + "gf/" + r.ga + "ga");
    }
  }

  // Top of the world — the names the fold salutes most fiercely.
  const byO = [...players].sort(byOverall);
  out.push("THE STARBOARD (every player at overall 75 or above, in the seed's own order):");
  let rank = 0;
  for (const p of byO) {
    if (p.overall < 75) break;
    rank += 1;
    out.push(String(rank).padStart(3) + ". " + p.name + " — " + String(p.position) + " (" + p.nation + "), " + p.age + "y, " + p.overall + "/" + p.potential + ", " + eur(p.value) + ", at " + clubName(p.clubId) + ".");
  }
  out.push(`${rank} players at 75+. star availability closes the universe of people anyone would care to name.`);

  // Every club and its squad (the names, nothing else — the names are all the future holds).
  out.push("THE ROSTER, club by club (short codes, overalls):");
  const byClub = new Map<string, typeof players>();
  for (const p of players) {
    const list = byClub.get(p.clubId);
    if (list) list.push(p);
    else byClub.set(p.clubId, [p]);
  }
  for (const c of [...clubs].sort(byOverall)) {
    const squad = (byClub.get(c.id) ?? []).slice().sort(byOverall).slice(0, 9);
    out.push(`${c.name} [${c.overall} · ${clubShort(c.id)}]: ${squad.map((p) => `${p.name} ${p.overall}`).join(", ")}.`);
  }

  // THE LEDGER — the attribute vector of the sixty strongest players, as the seed walks them.
  const byOLedger = [...players].sort(byOverall).slice(0, 60);
  const KEYS = [
    "passing", "finishing", "dribbling", "ball_control", "first_touch", "scanning",
    "composure", "game_intelligence", "positioning", "defensive_awareness",
    "sprint", "stamina", "strength",
  ];
  out.push("THE LEDGER (attribute vector — top 60 by overall; the model may read these as hard numbers):");
  let ledgerRank = 0;
  for (const p of byOLedger) {
    ledgerRank += 1;
    const v = p.attributes ?? {};
    const nums = KEYS.map((k) => v[k] ?? 0).join("/");
    out.push(
      String(ledgerRank).padStart(3) + ". " + p.name + " (" + p.position + ", " + p.nation + ") — " + nums,
    );
  }

  // THE BIGGEST TAPE — the fifteen widest margins the fold carries, quoted verbatim.
  const matches = provider.matches();
  const played = matches.filter((m) => m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null);
  const margin = (m: typeof matches[number]) => Math.abs((m.homeGoals ?? 0) - (m.awayGoals ?? 0));
  const big = [...played].sort((a, b) => margin(b) - margin(a)).slice(0, 15);
  out.push("THE BIGGEST TAPE (top fifteen margins the fold carries, verbatim):");
  for (const m of big) {
    out.push(
      `${competitions.find((c) => c.id === m.competitionId)?.name ?? m.competitionId} MD${m.round} — ${clubName(m.homeClubId)} ${m.homeGoals}-${m.awayGoals} ${clubName(m.awayClubId)} (${m.kickoff.slice(0, 10)})`,
    );
  }

  return out.join("\n");
})();

/** Every numeral the digest carries — the imprisonment doors accept their own numerics too. */
const NUM_RE = /\d+(?:[\d,.]*\d)?/g;
export const DEEP_DIGEST_NUMBERS: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (const m of DEEP_DIGEST.matchAll(NUM_RE)) {
    const raw = m[0].replace(/,/g, "");
    out.add(raw);
    out.add(String(Math.round(Number(raw))));
  }
  return out;
})();

/** Every club in the world by name and short code — the "which clubs may speak here" set. */
export const WORLD_CLUB_NAMES: ReadonlySet<string> = (() => {
  const out = new Set<string>();
  for (const c of footballProvider.clubs()) {
    out.add(c.name);
    out.add(c.short);
  }
  return out;
})();

