import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LEARN_STORE_KEY, parseLearnRecords, type LearnRecord } from "@/domain/learn";
import { loadFilmClips, toClipInputs, type FilmClip } from "@/domain/filmLibrary";
import { type FilmClipInput } from "@/domain/filmInsights";
import { rankNewsForClub } from "@/domain/newsImpact";
import { browserStore, readJson, writeJson, type WriteVerdict } from "@/domain/localData";
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

/** A store the device keeps, plus the answer the caller needs before it says anything worked.
 *
 *  The setter persists synchronously and returns `writeJson`'s verdict instead of swallowing the
 *  failure the way an effect-writing hook did: on this site a dropped write is real data loss, and
 *  a success toast issued one render later could not have known either way. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setRaw] = useState<T>(() => readJson(browserStore(), key, initial).value);
  const latest = useRef<T>(value);
  const setValue = useCallback(
    (next: T | ((prev: T) => T)): WriteVerdict => {
      const computed = typeof next === "function" ? (next as (prev: T) => T)(latest.current) : next;
      latest.current = computed;
      const verdict = writeJson(browserStore(), key, computed);
      setRaw(computed);
      return verdict;
    },
    [key],
  );
  return [value, setValue] as const;
}

/** Read-only view of the locally-stored academy records, shared by every pillar
 *  that needs lesson progress (achievements, history, dashboard). Pass a changing
 *  `rev` to force a genuine re-read of the store (e.g. a "recompile" action). */
export function useLearnRecords(rev = 0): LearnRecord[] {
  return useMemo(() => parseLearnRecords(readJson(browserStore(), LEARN_STORE_KEY, null).value), [rev]);
}

/** Read-only view of the locally-stored film library as analysis input, so every
 *  pillar that reasons about clips (film room, weekly review) parses it the same way.
 *  Pass a changing `rev` to re-read the store. */
export function useFilmClips(rev = 0): FilmClipInput[] {
  return useMemo(() => toClipInputs(loadFilmClips()), [rev]);
}

/** The same library with the provider report attached, for surfaces that need the
 *  file name or per-clip counts rather than the analysis input. */
export function useFilmRecords(): FilmClip[] {
  return useMemo(() => loadFilmClips(), []);
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
