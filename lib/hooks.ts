import { useEffect, useMemo, useState } from "react";
import { LEARN_STORE_KEY, parseLearnRecords, type LearnRecord } from "@/domain/learn";
import { loadFilmClips, toClipInputs, type FilmClip } from "@/domain/filmLibrary";
import { type FilmClipInput } from "@/domain/filmInsights";
import { rankNewsForClub } from "@/domain/newsImpact";
import { getClub, newsFeed, playersByClub } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

/** Read-only view of the locally-stored academy records, shared by every pillar
 *  that needs lesson progress (achievements, history, dashboard). Pass a changing
 *  `rev` to force a genuine re-read of localStorage (e.g. a "recompile" action). */
export function useLearnRecords(rev = 0): LearnRecord[] {
  return useMemo(() => {
    try {
      return parseLearnRecords(JSON.parse(localStorage.getItem(LEARN_STORE_KEY) ?? "null"));
    } catch {
      return [];
    }
  }, [rev]);
}

/** Read-only view of the locally-stored film library as analysis input, so every
 *  pillar that reasons about clips (film room, weekly review) parses it the same way.
 *  Pass a changing `rev` to re-read the store. */
export function useFilmClips(rev = 0): FilmClipInput[] {
  return useMemo(() => toClipInputs(loadFilmClips()), [rev]);
}

/** The same library with the provider report attached, for surfaces that need the
 *  file name or per-clip counts rather than the analysis input. */
export function useFilmRecords(rev = 0): FilmClip[] {
  return useMemo(() => loadFilmClips(), [rev]);
}

/** True when the visitor can reach the network (drives offline/degraded states). */
export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** The news feed ordered so stories about the visitor's favorite club lead.
 *  `matched` counts articles that really reference that club (or one of its
 *  registered players); `orderedFor` is the club's name only when the count is
 *  non-zero, so a screen can label the ordering without overclaiming it. */
export function usePersonalNews() {
  const { state } = useOs();
  const clubId = state.profile?.favoriteClubId ?? null;
  return useMemo(() => {
    const ranked = rankNewsForClub(newsFeed, clubId, clubId ? playersByClub(clubId).map((p) => p.id) : []);
    const name = clubId ? getClub(clubId)?.name : undefined;
    return { ...ranked, orderedFor: ranked.matched && name ? name : undefined };
  }, [clubId]);
}
