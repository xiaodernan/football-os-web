// M1180 · The Deep Digest — the whole frozen world, every turn, byte-identical.
// The LLM endpoint is a prefix cache; the prefix carries. Rebuild this digest once per
// deploy and the model wakes up knowing the world it is asked about. Never time-dependent,
// never locale-dependent in content (locale only affects rendering at the edges), never
// truncated by the courtesy of a caller — every door feeds the same constant block.
import { footballProvider } from "@/data/footballService";
import leagueTables from "../services/league-service/src/main/resources/league-tables.json";
import { byOverall, tally } from "@/domain/attributes";
import { byKickoff } from "@/domain/analytics";
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

  // THE LEDGER, CONTINUED — every remaining rank by the same fold; the model gets hard vectors, not adjectives.
  const byOLedger2 = [...players].sort(byOverall).slice(60);
  let ledgerRank2 = 60;
  out.push(`THE LEDGER, CONTINUED (ranks 61–${byOLedger2.length + ledgerRank2 - 0} — every seeded player, same fourteen keys, nothing rounded):`);
  for (const p of byOLedger2) {
    ledgerRank2 += 1;
    const v = p.attributes ?? {};
    const nums = KEYS.map((k) => v[k] ?? 0).join("/");
    out.push(String(ledgerRank2).padStart(3) + ". " + p.name + " (" + p.position + ", " + p.nation + ") — " + nums);
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

  // THE WIDE MARGINS — every finished fixture in the seed whose margin is two or more, newest-first.
  const wideMargins = played.filter((m) => margin(m) >= 2);
  out.push(`THE WIDE MARGINS (every finished fixture with a margin of two or more — ${wideMargins.length} lines):`);
  for (const m of wideMargins) {
    out.push(
      `${competitions.find((c) => c.id === m.competitionId)?.name ?? m.competitionId} MD${m.round} — ${clubName(m.homeClubId)} ${m.homeGoals}-${m.awayGoals} ${clubName(m.awayClubId)} (${m.kickoff.slice(0, 10)})`,
    );
  }

  // THE FULL ROSTER — every one of the seeded players, by overall; the model must know the whole world, not gestured at it.
  out.push("THE FULL ROSTER (every seeded player, by overall; name, pos, nation, age, overall/potential, value, club):");
  for (const p of byO) {
    out.push(p.name + " (" + p.position + ", " + p.nation + ") " + p.age + "y " + p.overall + "/" + p.potential + " " + eur(p.value) + " @ " + clubName(p.clubId));
  }

  // THE GOLDEN BOOT — the seed's own goal events, counted through the shared door; never a parable, never an estimate.
  const goalEvents = played.flatMap((m) => (m.events ?? []).filter((e) => e.type === "GOAL").map((e) => ({ player: e.player, club: e.side === "home" ? m.homeClubId : m.awayClubId })));
  const goalsByPlayer = tally(goalEvents, ({ player, club }) => `${player}|${club}`);
  const boot = [...goalsByPlayer.entries()]
    .map(([k, goals]) => {
      const [player, club] = k.split("|");
      return { player, club: clubName(club), goals };
    })
    .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player))
    .slice(0, 20);
  out.push("THE GOLDEN BOOT (the seed's own goal events, counted once; top twenty):");
  boot.forEach((r, i) => out.push(String(i + 1).padStart(2) + ". " + r.player + " — " + r.goals + " goals (" + r.club + ")"));

  // THE SPRING PLANE — one line per element the stack runs; the model must be able to name the plumbing under its answer.
  out.push("THE SPRING PLANE (the platform the fold runs on; every service real, health-checked, measured):");
  for (const line of [
    "  gateway        Spring Cloud Gateway · Resilience4j · routes every service call through one door",
    "  registry       Eureka · every boot registers, every health probe reflects the registration",
    "  config         Spring Cloud Config · structured YAML, zero secrets in the browser, ever",
    "  league         league service · read-through · TTL jitter (FNV-1a + mulberry32) · single-flight",
    "  discipline     discipline service · cards, bookings, arbitration — verified on the live ledger",
    "  cache          cache-service · Redis read-through, measured 16/16 under contention",
    "  messaging      RabbitMQ · 8 shards · DLQ monitored · broker flags measured, never mocked",
    "  redis          hot path proven end-to-end; the live witness drained 32/32 across two consumers",
  ]) out.push(line);

  // THE MANUAL — the seven doors of the embedded manual; the librarian door asks from these and only these.
  out.push("THE MANUAL (the seven doors the browser prints; English imprint, do not paraphrase):");
  for (const line of [
    "  welcome  Where to start — the world in one sentence, quick start, the three modes in one line each",
    "  modes    Fan · Player · Manager — three ways to walk the seed; each mode keeps its verbs and its promise",
    "  explore  Walk the world — 68 screens plus the palette goto; the anything-else door is on the rail",
    "  epics    The three witness tours and the Journey — nine chapters, 62 stops, completion folded from your own trail",
    "  spring   The platform beneath — Spring Cloud Gateway/Eureka/Config/Resilience4j, RabbitMQ, Redis read-through",
    "  honesty  What is honest here — every number measured, frozen seed, never a demo dressed as live",
    "  print    Print this page — plain A4, seven chapters, zero JavaScript in the output",
  ]) out.push(line);

  // M1218 · THE COMPLETE TAPE — every fixture the seed carries, played or scheduled, in
  // kickoff order. This is the long-context spine: a model asked about ANY match can read the
  // exact line here instead of guessing from a table or a narrowed retrieval envelope. It is
  // derived only from the frozen seed, byte-stable on every load, and never paraphrased.
  const fullTape = matches.slice().sort(byKickoff);
  out.push(`THE COMPLETE TAPE (all ${fullTape.length} seeded fixtures, kickoff ascending; UTC kickoff · league · matchday · clubs · score or scheduled · id):`);
  out.push("GROUNDING LAW FOR THE TAPE: quote only a line printed here. If a club, date or score is not printed here, say 'the seed has no such fixture' — never answer from real-world football memory.");
  for (const m of fullTape) {
    const score = m.status === "FINISHED" && m.homeGoals !== null && m.awayGoals !== null
      ? `${m.homeGoals}-${m.awayGoals}`
      : "scheduled";
    out.push(`${m.kickoff.slice(0, 10)} ${m.competitionId} MD${m.round} — ${clubName(m.homeClubId)} ${score} ${clubName(m.awayClubId)} · ${m.status} · ${m.id}`);
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

