// M1152 · The Live Wire — the same-origin reader for the real-world wire.
// The payload is produced ONLY by CI (scripts/update-live-wire.mjs, weekly cron) from
// OpenFootball's public-domain fixture file. The app never fetches the source directly,
// never invents a number, and never folds it into the frozen seed world.

export type LiveWireZone = "ucl" | "europa" | "playoff" | "relegation" | null;

export interface LiveWireRow {
  pos: number;
  zone: LiveWireZone;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: string[];
}

export interface LiveWireRecent {
  round: string;
  date: string;
  time: string | null;
  home: string;
  away: string;
  ft: [number, number];
  ht: [number, number] | null;
}

export interface LiveWireUpcoming {
  round: string;
  date: string;
  time: string | null;
  home: string;
  away: string;
}

export interface LiveWirePayload {
  generated_at: string;
  season: string;
  league: string;
  source: { name: string; file: string; url: string; license: string };
  totalFixtures: number;
  playedFixtures: number;
  table: LiveWireRow[];
  recent: LiveWireRecent[];
  upcoming: LiveWireUpcoming[];
}

const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length >= 2 && Number.isFinite(Number(v[0])) && Number.isFinite(Number(v[1]));

const isRow = (r: unknown): r is LiveWireRow => {
  if (typeof r !== "object" || r === null) return false;
  const v = r as Record<string, unknown>;
  return (
    Number.isInteger(v.pos) &&
    typeof v.team === "string" &&
    Number.isFinite(v.played) &&
    Number.isFinite(v.pts) &&
    Array.isArray(v.form)
  );
};

/** Runtime guard — the wire arrives over the network; never trust its shape blindly. */
export function isLiveWirePayload(v: unknown): v is LiveWirePayload {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    p.schema === "live-wire/v1" &&
    typeof p.generated_at === "string" &&
    typeof p.league === "string" &&
    typeof p.season === "string" &&
    typeof p.totalFixtures === "number" &&
    typeof p.playedFixtures === "number" &&
    Array.isArray(p.table) &&
    p.table.length >= 2 &&
    p.table.every(isRow) &&
    Array.isArray(p.recent) &&
    p.recent.every((m: unknown) => {
      const r = m as Record<string, unknown>;
      return typeof r?.home === "string" && typeof r?.away === "string" && isPair(r?.ft);
    }) &&
    Array.isArray(p.upcoming)
  );
}

/** Same-origin fetch of the committed wire; rejects (honestly) on any shape drift. */
export async function fetchLiveWire(): Promise<LiveWirePayload> {
  const res = await fetch(`${import.meta.env.BASE_URL}live-wire.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`live-wire fetch failed: HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  if (!isLiveWirePayload(json)) throw new Error("live-wire payload failed its shape guard");
  return json;
}
