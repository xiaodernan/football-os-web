// M1177 · The Scout’s Studio — one player, one imprisoned model, one honest trace.
// The model may speak only what the seed itself knows about THIS prospect; anything it writes
// outside that envelope is refused verbatim and the fold’s own paragraph substitutes.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS, WORLD_CLUB_NAMES } from "@/data/deepDigest";

export type StudioStage = FsmStage;
export type StudioNote = "prospectsOnFile" | "tapeSealed" | "commitOk" | "foldOk" | "precommitRefused";

export interface StudioTraceEntry {
  readonly stage: StudioStage;
  readonly verdict: TraceVerdict;
  readonly note: StudioNote;
}

export interface StudioMinutes {
  readonly overall: number;
  readonly potential: number;
  readonly gap: number;
  readonly value: number;
  readonly apps: number;
  readonly goals: number;
}

export interface StudioIdentity {
  readonly name: string;
  readonly club: string | null;
  readonly age: number;
  readonly positionLabel: string;
  readonly foot: string;
}

export interface StudioState {
  readonly minutes: StudioMinutes;
  readonly identity: StudioIdentity;
  readonly locale: Locale;
  readonly status: StudioStage;
  readonly trace: readonly StudioTraceEntry[];
  readonly answer: string;
}

/** The studio's traced entry presets, declared once — the screens import, never re-spell. */
export const STUDIO_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "tapeSealed" } as const;
export const STUDIO_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const STUDIO_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const STUDIO_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const STUDIO_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

export const createStudio = (
  minutes: StudioMinutes,
  identity: StudioIdentity,
  locale: Locale,
): StudioState => ({ minutes, identity, locale, status: "preflight", trace: [], answer: "" });

export type StudioViolation = "wrongPlayer" | "otherClub" | "wrongNumbers" | "prediction";

/** Fenced facts the model is allowed to cite by value, without guessing. */
export function verifyStudioText(text: string, state: StudioState): StudioViolation[] {
  const out = new Set<StudioViolation>();
  const otherClub = /\b([A-Z][A-Za-z ]{2,} (?:FC|CF|SC|AC|AS|UD|CD|CS|AFC|BSC))\b/g;
  for (const m of text.matchAll(otherClub)) {
    if (state.identity.club && m[0].includes(state.identity.club)) continue;
    const tok = m[0];
    if ([...WORLD_CLUB_NAMES].some((c) => tok.includes(c) || c.includes(tok))) continue;
    if (!state.identity.club) out.add("otherClub");
    else out.add("otherClub");
  }
  const overall = String(state.minutes.overall);
  const potential = String(state.minutes.potential);
  const gap = String(Math.abs(state.minutes.gap));
  const apps = String(state.minutes.apps);
  const goals = String(state.minutes.goals);
  const citesSomethingReal =
    text.includes(overall) || text.includes(potential) || text.includes(apps) || text.includes(goals) || text.includes(gap);
  const digitsOf = text.match(/\d+(?:[\d,.]*\d)?/g) ?? [];
  const citesDigestNumber = digitsOf.some((raw) => {
    const n = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) return false;
    return DEEP_DIGEST_NUMBERS.has(raw) || DEEP_DIGEST_NUMBERS.has(String(Math.round(n)));
  });
  if (!citesSomethingReal && !citesDigestNumber) out.add("wrongNumbers");
  if (/\b(career|years from now|by the time|ten years|final chapter)\b/i.test(text)) out.add("prediction");
  return [...out];
}

export const studioPreflight = (s: StudioState): StudioState =>
  s.minutes.overall > 0 && s.minutes.apps >= 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "prospectsOnFile" }, "build")
    : step(s, { stage: "preflight", verdict: "refused", note: "prospectsOnFile" }, "refused");

// The FSM nodes are re-exported by the single definition in tracedFsm.ts.
// Consumers reach directly into the shared body — same rule, one name per engine.
