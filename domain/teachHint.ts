// M1229 — the teaching hints. The main interface is wide: twenty-two modules, a ranked action
// strip, a command palette. A first-time reader should not have to guess what any of them do,
// so every module tile can carry a one-line lesson behind a "?" — read once, remembered on the
// device, never in the way again. This module is the pure half: the catalogue, the seen-ledger
// and its arithmetic. The screen half lives in ui/TeachHint.tsx; the proof in
// scripts/proof-teachhint.mjs replays every claim here without a browser.

/** The one device key the seen-ledger lives under. A preference, not activity: what you have
 *  already read survives an activity reset the way the theme does. */
export const TEACH_SEEN_KEY = "football-os.teachSeen.v1";

export interface TeachHint {
  /** Stable id — the ledger stores these, so a renamed dictionary key cannot lose a record. */
  id: string;
  /** Dictionary key carrying the lesson itself (three locales, as everything visible). */
  key: string;
}

// The catalogue is the dashboard's module grid, in the grid's own order, plus the four actions
// the command palette puts within one tap of every screen. An id names a lesson, not a route:
// the ledger must survive a route rename, which is why it never stores a path.
export const TEACH_HINTS: readonly TeachHint[] = [
  { id: "player", key: "teach.player" },
  { id: "manager", key: "teach.manager" },
  { id: "profile", key: "teach.profile" },
  { id: "review", key: "teach.review" },
  { id: "load", key: "teach.load" },
  { id: "achievements", key: "teach.achievements" },
  { id: "settings", key: "teach.settings" },
  { id: "history", key: "teach.history" },
  { id: "scouting", key: "teach.scouting" },
  { id: "world", key: "teach.world" },
  { id: "film", key: "teach.film" },
  { id: "data", key: "teach.data" },
  { id: "transfers", key: "teach.transfers" },
  { id: "compare", key: "teach.compare" },
  { id: "watchlist", key: "teach.watchlist" },
  { id: "tactical", key: "teach.tactical" },
  { id: "simulation", key: "teach.simulation" },
  { id: "ai", key: "teach.ai" },
  { id: "knowledge", key: "teach.knowledge" },
  { id: "learn", key: "teach.learn" },
  { id: "community", key: "teach.community" },
  { id: "football", key: "teach.football" },
  { id: "palette", key: "teach.palette" },
  { id: "ops", key: "teach.ops" },
  { id: "manual", key: "teach.manual" },
];

export const TEACH_HINT_IDS: readonly string[] = TEACH_HINTS.map((h) => h.id);

const KNOWN = new Set(TEACH_HINT_IDS);

/** The dictionary key for a hint id, or null when the id is not in the catalogue — a screen
 *  asking about an unknown id gets an honest null rather than a half-rendered lesson. */
export const teachHintKey = (id: string): string | null => {
  const hit = TEACH_HINTS.find((h) => h.id === id);
  return hit ? hit.key : null;
};

/** Mark one hint read. The ledger is stored sorted and de-duplicated, and an id outside the
 *  catalogue is refused — a stale record from an older build cannot accumulate junk that no
 *  screen will ever ask about again. Idempotent: reading twice changes nothing. */
export function markSeen(seen: readonly string[], id: string): string[] {
  if (!KNOWN.has(id) || seen.includes(id)) return [...seen].sort();
  return [...seen, id].sort();
}

export const isSeen = (seen: readonly string[], id: string): boolean => seen.includes(id);

/** The catalogue's ids the reader has not opened yet, in catalogue order — the "still waiting"
 *  count a badge can print without the screen recomputing anything. */
export const unseenIds = (seen: readonly string[]): string[] => TEACH_HINT_IDS.filter((id) => !seen.includes(id));

/** Read a stored value back into a ledger: unknown ids dropped, duplicates collapsed, sorted.
 *  A corrupt or hand-edited store degrades to the empty ledger, never to a crash. */
export function parseSeen(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((v): v is string => typeof v === "string" && KNOWN.has(v)))].sort();
}

/** The ledger a "reset my tutorials" control writes. */
export const resetSeen = (): string[] => [];
