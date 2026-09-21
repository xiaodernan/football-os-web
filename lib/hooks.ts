import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LEARN_STORE_KEY, parseLearnRecords, type LearnRecord } from "@/domain/learn";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncState<T> {
  data: T | null;
  error: Error | null;
  status: AsyncStatus;
  reload: () => void;
}

/**
 * Runs an async producer with loading/error/retry. This is the single seam where
 * synchronous Demo reads can be swapped for real `/functions/v1/app` fetches
 * without touching feature components.
 */
export function useAsync<T>(fn: () => Promise<T> | T, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    let alive = true;
    setStatus("loading");
    setError(null);
    (async () => {
      try {
        const result = await fn();
        if (alive && id === latest.current) {
          setData(result);
          setStatus("success");
        }
      } catch (e) {
        if (alive && id === latest.current) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setStatus("error");
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, error, status, reload };
}

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
 *  that needs lesson progress (achievements, history, dashboard). */
export function useLearnRecords(): LearnRecord[] {
  return useMemo(() => {
    try {
      return parseLearnRecords(JSON.parse(localStorage.getItem(LEARN_STORE_KEY) ?? "null"));
    } catch {
      return [];
    }
  }, []);
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
