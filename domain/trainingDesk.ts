// M1235 · The Training Desk — the seventeenth imprisoned door, and the second that DECIDES.
// The Selection Chair names a XI; this one prescribes a week of work. The model reads ONE
// player's dossier — their attribute vector, their load, their career week — and answers with
// the focus attributes and the minutes. Every choice is re-proved against the dossier before a
// human may adopt it, and adopting it feeds the SAME plan pipeline the coach screen uses, so the
// model's analysis lands as a real training plan, not a paragraph. A refusal speaks with the
// fold's own deterministic prescription, openly.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS } from "@/data/deepDigest";
import { SUPPORTED_MINUTES } from "./training";
import type { PositionGroup } from "./types";

export type DeskStage = FsmStage;
export type DeskNote = "dossierInHand" | "dossierSealed" | "commitOk" | "foldOk" | "precommitRefused";

export interface DeskTraceEntry {
  readonly stage: DeskStage;
  readonly verdict: TraceVerdict;
  readonly note: DeskNote;
}

/** One attribute as the desk sees it — the dossier's own key and value, nothing inferred. */
export interface DeskAttribute {
  readonly key: string;
  readonly value: number;
}

export interface DeskDossier {
  readonly playerName: string;
  readonly group: PositionGroup;
  readonly age: number;
  /** The player's own attribute vector; the desk may only prescribe from these keys. */
  readonly attributes: readonly DeskAttribute[];
  /** The load zone the fold reads — the desk's minutes answer to it. */
  readonly loadZone: "low" | "optimal" | "high" | "spike";
}

/** A lawful prescription: at most three focus attributes from the dossier, one supported
 *  minutes value. */
export interface DeskPrescription {
  readonly focusKeys: readonly string[];
  readonly minutes: number;
}

export interface DeskState {
  readonly dossier: DeskDossier;
  readonly locale: Locale;
  readonly status: DeskStage;
  readonly trace: readonly DeskTraceEntry[];
  readonly answer: string;
  readonly prescription: DeskPrescription | null;
}

export const DESK_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "dossierSealed" } as const;
export const DESK_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const DESK_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const DESK_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const DESK_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

/** How many focus attributes one prescription may name. */
export const DESK_FOCUS_LIMIT = 3;

const RX_LINE = /^RX:([A-Za-z0-9_,\s-]+)$/m;
const MIN_LINE = /^MIN:(\d+)$/m;

export const createDesk = (dossier: DeskDossier, locale: Locale): DeskState => ({
  // The FSM imprisons the model to this dossier — clone the vector so a caller can never swap
  // the player's numbers from under the proof mid-run.
  dossier: { ...dossier, attributes: dossier.attributes.map((a) => ({ ...a })) },
  locale, status: "preflight", trace: [], answer: "", prescription: null,
});

export type DeskViolation =
  | "noDirective"
  | "tooManyFocus"
  | "unknownAttribute"
  | "duplicateFocus"
  | "badMinutes"
  | "offDossier"
  | "prediction";

/** Parse the model's two directive lines. Codes, not sentences. */
export function parseDeskRx(text: string, dossier: DeskDossier): { prescription: DeskPrescription | null; violations: DeskViolation[] } {
  const rx = RX_LINE.exec(text);
  const min = MIN_LINE.exec(text);
  if (!rx || !min) return { prescription: null, violations: ["noDirective"] };
  const keys = rx[1].split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  const minutes = Number(min[1]);
  const out = new Set<DeskViolation>();
  if (keys.length > DESK_FOCUS_LIMIT) out.add("tooManyFocus");
  if (new Set(keys).size !== keys.length) out.add("duplicateFocus");
  const known = new Set(dossier.attributes.map((a) => a.key));
  if (keys.some((k) => !known.has(k))) out.add("unknownAttribute");
  if (!SUPPORTED_MINUTES.includes(minutes)) out.add("badMinutes");
  if (out.size > 0) return { prescription: null, violations: [...out] };
  return { prescription: { focusKeys: keys, minutes }, violations: [] };
}

/** The numeral law over the prose: any figure the dossier and the world book cannot both carry
 *  is refused — the same imprisonment every door wears. */
export function verifyDeskText(text: string, dossier: DeskDossier): DeskViolation[] {
  const out = new Set<DeskViolation>();
  const universe = new Set<string>();
  for (const a of dossier.attributes) universe.add(String(a.value));
  universe.add(String(dossier.age));
  for (const base of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) universe.add(String(base));
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (universe.has(raw) || universe.has(String(Math.round(n)))) continue;
    if (DEEP_DIGEST_NUMBERS.has(raw) || DEEP_DIGEST_NUMBERS.has(String(Math.round(n)))) continue;
    out.add("offDossier");
  }
  if (/\b(will|won't|never will|by the time|years from now|mark my words)\b/i.test(text)) out.add("prediction");
  return [...out];
}

/** The fold's own prescription: the dossier's three weakest attributes, and the minutes the load
 *  zone can honestly carry — a spike week gets a short sharp session, a low week gets the long
 *  one. Deterministic; the same dossier always answers the same. */
export function foldRx(dossier: DeskDossier): DeskPrescription | null {
  if (dossier.attributes.length === 0) return null;
  const weakest = [...dossier.attributes]
    .sort((a, b) => a.value - b.value || a.key.localeCompare(b.key))
    .slice(0, DESK_FOCUS_LIMIT)
    .map((a) => a.key);
  const minutes = dossier.loadZone === "spike" ? 30 : dossier.loadZone === "high" ? 45 : dossier.loadZone === "low" ? 60 : 45;
  return { focusKeys: weakest, minutes };
}

// ---- the state machine --------------------------------------------------
export const deskPreflight = (s: DeskState): DeskState =>
  s.dossier.attributes.length > 0 && s.dossier.playerName.trim().length > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "dossierInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "dossierInHand" }, "refused");

export const deskBuild = (s: DeskState): DeskState => fsmBuild(s, DESK_BUILD_ENTRY, "model");

export const deskPrecommit = (s: DeskState, verdict: TraceVerdict): DeskState =>
  fsmPrecommit(s, verdict, DESK_PRECOMMIT_PASS, DESK_PRECOMMIT_REFUSED);

export const deskCommit = (s: DeskState, answer: string, prescription: DeskPrescription): DeskState =>
  fsmCommit({ ...s, answer, prescription }, answer, DESK_COMMIT_ENTRY);

export const deskRefused = (s: DeskState, answer: string): DeskState =>
  fsmRefused({ ...s, answer, prescription: foldRx(s.dossier) }, answer, DESK_FOLD_ENTRY);
