// M1164 · The Ledger — the wire's own arithmetic, never a projection.
// Every number here is recomputed from the committed CC0 artifact and cross-checked against
// the table the file ships: per-league goal difference must equal goals for minus goals
// against over the played fixtures. If that ever drifts, the card says so out loud instead of
// rounding silently. Zero network, zero model, zero invention.
import type { LiveWireLeague, LiveWirePayload } from "@/data/liveWire";
import { sum, byValueDesc } from "./attributes";

export interface LedgerSide {
  team: string;
  value: number;
}

export interface LedgerCard {
  leagueId: string;
  league: string;
  season: string;
  playedFixtures: number;
  totalFixtures: number;
  /** the sharpest attack, by goals scored over the played fixtures */
  attack: LedgerSide;
  /** the leakiest back line, by goals conceded over the played fixtures */
  leakiest: LedgerSide;
  /** the in-form fever: most wins in the file's five-letter form window, table points breaking the tie */
  form: { team: string; letters: string; wins: number };
  goalsFor: number;
  goalsAgainst: number;
  /** table.gd sum minus (GF − GA over played fixtures) — 0 means the file checked its own homework */
  drift: number;
}

export interface LedgerFold {
  cards: LedgerCard[];
  totalPlayed: number;
  totalGoals: number;
  /** |drift| across all leagues — the honest one-number audit of the whole artifact */
  drift: number;
}

const winsOf = (form: string[]): number => sum(form, (f) => (f === "W" ? 1 : 0));

export function foldWireLedger(payload: LiveWirePayload): LedgerFold {
  const cards = payload.leagues.map((l: LiveWireLeague): LedgerCard => {
    const gf = new Map<string, number>();
    const ga = new Map<string, number>();
    for (const f of l.seasonFixtures) {
      if (!Array.isArray(f.ft)) continue;
      const hg = f.ft[0], ag = f.ft[1];
      gf.set(f.home, (gf.get(f.home) ?? 0) + hg);
      ga.set(f.home, (ga.get(f.home) ?? 0) + ag);
      gf.set(f.away, (gf.get(f.away) ?? 0) + ag);
      ga.set(f.away, (ga.get(f.away) ?? 0) + hg);
    }
    // A deterministic pick: most goals, then alphabetical as a flat tie-break — never randomness.
    const pick = (m: Map<string, number>): LedgerSide =>
      [...m.entries()]
        .map(([team, value]) => ({ team, value }))
        .sort((a, b) => byValueDesc(a, b) || a.team.localeCompare(b.team))[0]
        ?? { team: "", value: 0 };
    const attack = pick(gf);
    const leakiest = pick(ga);

    const formRow = [...l.table]
      .map((r) => ({ r, wins: winsOf(r.form) }))
      .sort((a, b) => b.wins - a.wins || b.r.pts - a.r.pts || a.r.team.localeCompare(b.r.team))[0];

    const gfAll = sum([...gf.values()], (n) => n);
    const gaAll = sum([...ga.values()], (n) => n);
    const gdTable = sum(l.table, (r) => r.gd);
    const drift = gdTable - (gfAll - gaAll);

    return {
      leagueId: l.id,
      league: l.league,
      season: l.season,
      playedFixtures: l.playedFixtures,
      totalFixtures: l.totalFixtures,
      attack,
      leakiest,
      form: formRow
        ? { team: formRow.r.team, letters: formRow.r.form.join(""), wins: formRow.wins }
        : { team: "", letters: "", wins: 0 },
      goalsFor: gfAll,
      goalsAgainst: gaAll,
      drift,
    };
  });

  return {
    cards,
    totalPlayed: sum(cards, (c) => c.playedFixtures),
    totalGoals: sum(cards, (c) => c.goalsFor),
    drift: Math.max(...cards.map((c) => Math.abs(c.drift))),
  };
}
