// M1022: the balance sheet, at world scale — every club the rest of the world works over,
// folded into one honest walk. This module replaces the abandoned lane draft that imagined a
// hand-keyed calculator; everything here is refolded from the seeded world on every read, so no
// reader can disagree with another about what a club's money looks like.
//
// The model, deliberately simple and documented in the method sentence on the screen:
//   squad      = sum of player.value across the players this provider ships for the club
//   wages      = WAGE_SHARE of the squad
//   amortize   = AMORTIZATION_SHARE of the squad (not a window — the model amortizes the book)
//   matchday   = club.overall² × MATCHDAY_RATE
//   broadcast  = BROADCAST_EQUAL flat — the default domestic-right pool split everyone equally
//   commercial = club.overall² × COMMERCIAL_RATE
//   revenue    = matchday + broadcast + commercial
//   net        = revenue − wages − amortize
// No constants hide a cloud service or an external API: nothing here fetched, nothing here keyed.

import { sum } from "./attributes";
import { round2, indexById } from "@/lib/utils";
import type { Club, PlayerRef } from "./types";

/** A club the seed does not ship a squad for answers zero squad money, but its gate and broadcast
 *  still count: matchday and broadcast depend on the club (overall exists), not its players. */
export interface ClubFinanceRow {
  clubId: string;
  /** Σ player.value — the market book the club carries. */
  squadValue: number;
  wages: number;
  amortize: number;
  /** club.overall² × MATCHDAY_RATE — the gate reads the club's stature, not its players. */
  matchday: number;
  /** Flat equal share — the domestic rights are sold once and cut equally in this world. */
  broadcast: number;
  /** club.overall² × COMMERCIAL_RATE — sponsorship tracks stature too. */
  commercial: number;
  /** matchday + broadcast + commercial. */
  revenue: number;
  /** revenue − wages − amortize — negative is a loss, not a defect. */
  net: number;
  /** wages / revenue, 2dp — where the bill eats the top line. */
  wageRatio: number;
}

export interface ClubFinanceWorld {
  /** Sorted by net descending, ties by clubId — most profitable first. */
  rows: ClubFinanceRow[];
  /** Clubs read (clubs the caller passed; players summed onto them by club id). */
  clubs: number;
  squadValue: number;
  wages: number;
  amortize: number;
  revenue: number;
  net: number;
  /** World wage ratio, 2dp — Σ wages / Σ revenue of the world that was read. */
  wageRatio: number;
}

const WAGE_SHARE = 0.25;
const AMORTIZATION_SHARE = 0.05;
const MATCHDAY_RATE = 30000;
const COMMERCIAL_RATE = 12000;
const BROADCAST_EQUAL = 40_000_000;

export function clubFinance(clubs: Club[], players: PlayerRef[]): ClubFinanceWorld {
  const ranked = indexById(clubs);
  const squadValue = new Map<string, number>();
  for (const p of players) {
    if (!ranked.has(p.clubId)) continue;
    squadValue.set(p.clubId, (squadValue.get(p.clubId) ?? 0) + p.value);
  }
  const rows: ClubFinanceRow[] = [];
  for (const [clubId, club] of ranked) {
    const book = squadValue.get(clubId) ?? 0;
    const wages = Math.round(book * WAGE_SHARE);
    const amortize = Math.round(book * AMORTIZATION_SHARE);
    const matchday = Math.round(club.overall * club.overall * MATCHDAY_RATE);
    const broadcast = BROADCAST_EQUAL;
    const commercial = Math.round(club.overall * club.overall * COMMERCIAL_RATE);
    const revenue = matchday + broadcast + commercial;
    const net = revenue - wages - amortize;
    rows.push({ clubId, squadValue: book, wages, amortize, matchday, broadcast, commercial, revenue, net, wageRatio: revenue ? round2(wages / revenue) : 0 });
  }
  rows.sort((a, b) => b.net - a.net || a.clubId.localeCompare(b.clubId));
  const wagesAll = sum(rows, (r) => r.wages);
  const revenueAll = sum(rows, (r) => r.revenue);
  const squadAll = sum(rows, (r) => r.squadValue);
  const amortizeAll = sum(rows, (r) => r.amortize);
  const netAll = sum(rows, (r) => r.net);
  return {
    rows,
    clubs: rows.length,
    squadValue: squadAll,
    wages: wagesAll,
    amortize: amortizeAll,
    revenue: revenueAll,
    net: netAll,
    wageRatio: revenueAll ? round2(wagesAll / revenueAll) : 0,
  };
}
