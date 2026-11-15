// M1150 · The Journey — the guided tour of the endless world.
// Nine chapters; every stop is a real route. Completion is REAL, drawn from this device's own
// memory: the visit trail (M1149's pulse), the onboarding trail, and the saved Dream XI.
// Nothing here pretends — a "visited" stamp is a visit this device actually recorded.

import type { OsState } from "@/store/useFootballOS";
import { browserStore, readJson } from "./localData";
import { sum } from "./attributes";
import { PULSE_KEY } from "./pulse";

export type ChapterId = "first" | "watch" | "players" | "epics" | "career" | "life" | "archive" | "create" | "system";

export interface Chapter {
  id: ChapterId;
  titleKey: string;
  hintKey: string;
  stops: string[];
}

export const CHAPTERS: readonly Chapter[] = [
  { id: "first", titleKey: "journey.ch.first", hintKey: "journey.ch.firstHint", stops: ["/onboarding", "/football", "/tomorrow"] },
  { id: "watch", titleKey: "journey.ch.watch", hintKey: "journey.ch.watchHint", stops: ["/form", "/briefing", "/run-in", "/title-race", "/home-away", "/clock", "/chances", "/venue-split", "/live-wire", "/grand-tour", "/dispatch"] },
  { id: "players", titleKey: "journey.ch.players", hintKey: "journey.ch.playersHint", stops: ["/players", "/watchlist", "/compare", "/scouting", "/value", "/scout", "/dossier", "/academy"] },
  { id: "epics", titleKey: "journey.ch.epics", hintKey: "journey.ch.epicsHint", stops: ["/chronicle", "/legends", "/atlas", "/derby-codex", "/prophet", "/upsets", "/moonshots", "/transfers"] },
  { id: "career", titleKey: "journey.ch.career", hintKey: "journey.ch.careerHint", stops: ["/manager", "/coach", "/player", "/development", "/season-room", "/league-rules", "/net", "/goals"] },
  { id: "life", titleKey: "journey.ch.life", hintKey: "journey.ch.lifeHint", stops: ["/community", "/news", "/poll", "/pressroom", "/programme", "/letters", "/council"] },
  { id: "archive", titleKey: "journey.ch.archive", hintKey: "journey.ch.archiveHint", stops: ["/history", "/records", "/film", "/learn", "/review", "/data", "/streaks", "/squad"] },
  { id: "create", titleKey: "journey.ch.create", hintKey: "journey.ch.createHint", stops: ["/dream-team", "/chalkboard", "/pressroom", "/dossier", "/manual", "/tactical-studio"] },
  { id: "system", titleKey: "journey.ch.system", hintKey: "journey.ch.systemHint", stops: ["/cache", "/platform", "/ops", "/about", "/settings", "/knowledge"] },
] as const;

export const TOTAL_STOPS = sum(CHAPTERS, (c) => c.stops.length);

export interface ChapterState {
  id: ChapterId;
  titleKey: string;
  hintKey: string;
  stops: { path: string; visited: boolean }[];
  done: number;
  count: number;
  complete: boolean;
}
export interface JourneyFold {
  chapters: ChapterState[];
  doneStops: number;
  totalStops: number;
  percent: number;
  nextStop: string | null;
  complete: boolean;
}

const visitPaths = (store: ReturnType<typeof browserStore>): Set<string> => {
  const held = readJson<{ visits: { path: string }[] }>(store, PULSE_KEY, { visits: [] }).value.visits;
  return new Set(held.map((v) => v.path));
};

export function foldJourney(
  store: ReturnType<typeof browserStore> | null,
  os: Pick<OsState, "onboarded" | "progress" | "sessions" | "watchlist" | "plans">,
  savedDreamXI: boolean,
): JourneyFold {
  const seen = store ? visitPaths(store) : new Set<string>();
  const osVisited = new Set<string>();
  if (os.onboarded) osVisited.add("/onboarding");
  if (os.sessions.length > 0 || os.progress.length > 0) osVisited.add("/football");
  const stopsDone: Record<string, boolean> = { "/dream-team": savedDreamXI };
  const chapters: ChapterState[] = CHAPTERS.map((ch) => {
    const stops = ch.stops.map((p) => ({ path: p, visited: seen.has(p) || osVisited.has(p) || stopsDone[p] === true }));
    const done = stops.filter((s) => s.visited).length;
    return { id: ch.id, titleKey: ch.titleKey, hintKey: ch.hintKey, stops, done, count: stops.length, complete: done === stops.length };
  });
  const doneStops = sum(chapters, (c) => c.done);
  const nextStop = chapters.flatMap((c) => c.stops.filter((s) => !s.visited))[0]?.path ?? null;
  return {
    chapters,
    doneStops,
    totalStops: TOTAL_STOPS,
    percent: Math.round((doneStops / TOTAL_STOPS) * 1000) / 10,
    nextStop,
    complete: doneStops === TOTAL_STOPS,
  };
}
