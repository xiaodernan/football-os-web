// Football OS keeps everything on the device, but the data is spread across one
// store plus a per-feature key. This module is the registry of those keys so the
// settings screen can honestly say what is stored, export all of it, import a
// bundle back, and clear activity without wiping preferences.
// Pure and storage-agnostic: callers pass something localStorage-shaped, which
// keeps every function testable without a browser.

import { LEARN_STORE_KEY } from "./learn";

export const OS_STATE_KEY = "football-os.state.v2";
export const CAREER_KEY = "football-os.career.v1";
export const FILM_KEY = "football-os.film.v1";
export const COMMUNITY_KEY = "football-os.community.v1";
export const WORLD_KEY = "football-os.world.v1";
export const AI_CHAT_KEY = "football-os.ai.chat.v1";
export const TACTICS_KEY = "football-os.tactics.v1";
export const FIXTURES_KEY = "football-os.matches";
export const LOCALE_KEY = "football-os.locale";
export const THEME_KEY = "football-os.theme";

export interface KeySpec {
  key: string;
  /** i18n dictionary key for the human label. */
  labelKey: string;
  kind: "activity" | "preference";
}

/** Every key the app writes. Anything missing here would be invisible in the
 *  inventory and lost on export, so this list is the contract. */
export const LOCAL_KEYS: KeySpec[] = [
  { key: OS_STATE_KEY, labelKey: "set.key.state", kind: "activity" },
  { key: LEARN_STORE_KEY, labelKey: "set.key.learn", kind: "activity" },
  { key: CAREER_KEY, labelKey: "set.key.career", kind: "activity" },
  { key: FILM_KEY, labelKey: "set.key.film", kind: "activity" },
  { key: COMMUNITY_KEY, labelKey: "set.key.community", kind: "activity" },
  { key: WORLD_KEY, labelKey: "set.key.world", kind: "activity" },
  { key: AI_CHAT_KEY, labelKey: "set.key.ai", kind: "activity" },
  { key: TACTICS_KEY, labelKey: "set.key.tactics", kind: "activity" },
  { key: FIXTURES_KEY, labelKey: "set.key.fixtures", kind: "activity" },
  { key: LOCALE_KEY, labelKey: "set.key.locale", kind: "preference" },
  { key: THEME_KEY, labelKey: "set.key.theme", kind: "preference" },
];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The document's own store, or null when this document is not allowed one.
 *
 *  `typeof localStorage !== "undefined"` is not this test. `localStorage` is a declared accessor
 *  on every browser window, and reading the accessor throws `SecurityError` when site data is
 *  blocked — which an embedded frame hits during the first render, before anything is on screen.
 *  `typeof` only suppresses an error for an *undeclared* name, so it lets that throw through. */
export function browserStore(): StorageLike | null {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
  } catch {
    return null;
  }
}

export interface KeyInventory extends KeySpec {
  present: boolean;
  records: number;
  bytes: number;
}

/**
 * Count user records, not fields: top-level arrays count their items, and
 * arrays nested one level inside an object (e.g. community replies keyed by
 * thread) count too. Plain object fields are never counted, so a profile does
 * not inflate the number.
 */
export function countRecords(parsed: unknown): number {
  if (parsed == null) return 0;
  if (Array.isArray(parsed)) return parsed.length;
  if (typeof parsed === "object") {
    let total = 0;
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) total += value.length;
      else if (value && typeof value === "object") {
        for (const inner of Object.values(value as Record<string, unknown>)) if (Array.isArray(inner)) total += inner.length;
      }
    }
    return total;
  }
  return 1; // a bare stored preference still counts as one thing kept
}

export function inventory(storage: StorageLike): { entries: KeyInventory[]; bytes: number; records: number; present: number } {
  let bytes = 0;
  let records = 0;
  let present = 0;
  const entries = LOCAL_KEYS.map((spec) => {
    let raw: string | null = null;
    try {
      raw = storage.getItem(spec.key);
    } catch {
      raw = null;
    }
    const size = raw ? new Blob([raw]).size : 0;
    let count = 0;
    if (raw) {
      try {
        count = countRecords(JSON.parse(raw));
      } catch {
        count = 1; // unreadable but present — never report it as empty
      }
    }
    bytes += size;
    records += count;
    if (raw) present++;
    return { ...spec, present: !!raw, records: count, bytes: size };
  });
  return { entries, bytes, records, present };
}

export const EXPORT_APP = "football-os";
export const EXPORT_VERSION = 1;

/** Some stores keep a bare string rather than JSON (language, theme). Wrapping
 *  those keeps an export lossless instead of silently dropping them. */
export type SectionValue = unknown | { __raw: string };

export interface ExportBundle {
  app: typeof EXPORT_APP;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  sections: Record<string, SectionValue>;
}

function encodeSection(raw: string): SectionValue {
  try {
    return JSON.parse(raw);
  } catch {
    return { __raw: raw };
  }
}

function decodeSection(value: SectionValue): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "__raw" in value) {
    const inner = (value as { __raw: unknown }).__raw;
    return typeof inner === "string" ? inner : null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/** One JSON document covering every registered key, so an export is a complete
 *  backup rather than just the main store. */
export function buildExport(storage: StorageLike): ExportBundle {
  const sections: Record<string, SectionValue> = {};
  for (const spec of LOCAL_KEYS) {
    try {
      const raw = storage.getItem(spec.key);
      if (raw != null) sections[spec.key] = encodeSection(raw);
    } catch {
      /* skip an unreadable key rather than fail the whole export */
    }
  }
  return { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: new Date().toISOString(), sections };
}

export interface ImportResult {
  ok: boolean;
  keys: number;
  error?: string;
}

/**
 * Validate before writing: a bundle must be a Football OS export whose keys are
 * all registered here, otherwise an arbitrary file could plant unknown data.
 */
export function readImport(text: string): { bundle: ExportBundle } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "not-json" };
  }
  const b = parsed as Partial<ExportBundle>;
  if (!b || b.app !== EXPORT_APP || typeof b.sections !== "object" || b.sections === null) {
    return { error: "not-a-football-os-bundle" };
  }
  return { bundle: b as ExportBundle };
}

export function applyImport(storage: StorageLike, bundle: ExportBundle): ImportResult {
  const allowed = new Set(LOCAL_KEYS.map((k) => k.key));
  let keys = 0;
  for (const [key, value] of Object.entries(bundle.sections ?? {})) {
    if (!allowed.has(key)) continue; // never write a key the app does not own
    const text = decodeSection(value);
    if (text == null) continue;
    try {
      storage.setItem(key, text);
      keys++;
    } catch {
      return { ok: false, keys, error: "storage-write-failed" };
    }
  }
  if (!keys) return { ok: false, keys, error: "no-known-keys" };
  return { ok: true, keys };
}

/** Clear every activity key. Preferences (language, theme) survive a reset —
 *  wiping how the app looks alongside what the user did is not the same request. */
export function clearActivity(storage: StorageLike): number {
  let removed = 0;
  for (const spec of LOCAL_KEYS) {
    if (spec.kind !== "activity") continue;
    try {
      if (storage.getItem(spec.key) != null) {
        storage.removeItem(spec.key);
        removed++;
      }
    } catch {
      /* ignore an inaccessible key */
    }
  }
  return removed;
}
