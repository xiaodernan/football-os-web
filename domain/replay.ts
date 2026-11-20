// M1222 · The Replay Room — a model-driven StateGraph for the operator console.
// The device's last hour of recorded visits is folded by the ONE pulse fold. A deterministic
// continuation model, seeded from those recorded starts and the shared LCG, predicts which
// doors a comparable visitor would open next. Every figure in the envelope carries its own
// provenance: `measured` comes from the device trail, `simulated` from the seeded projection.
// The model only chooses WHICH anomaly to investigate; it never supplies a numeral of its own.
import type { Locale } from "@/i18n/dictionaries";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit, type FsmStage, type Verdict } from "@/domain/tracedFsm";
import type { BenchRoute } from "@/domain/witnessBench";
import { last } from "@/domain/attributes";
import { foldPulse, lcg, CONTINUATIONS, type PulseFold, type VisitRecord } from "@/domain/pulse";
import { collectEvidenceNumbers } from "@/domain/worldLibrarian";

export const REPLAY_WINDOW_MS = 60 * 60 * 1000;
const SESSION_GAP_MS = 30 * 60 * 1000;

export const REPLAY_ANOMALIES = ["entryBounce", "deepExit", "loopDetour", "deadEnd"] as const;
export type ReplayAnomalyId = (typeof REPLAY_ANOMALIES)[number];
/** The four operator badges, spelled once and consumed by both the graph notes and the panel. */
export type ReplayBadge = "verified" | "folded" | "invalid" | "abstained";

export interface ReplayAnomaly {
  readonly id: ReplayAnomalyId;
  readonly measured: number;
  readonly simulated: number;
}

export interface ReplaySnapshot {
  readonly recorded: PulseFold;
  readonly predicted: PulseFold;
  readonly anomalies: readonly ReplayAnomaly[];
  readonly windowStart: number;
  readonly windowEnd: number;
}

/** Deterministic 32-bit hash of a recorded start — the projection is reproducible, never random. */
function seedOf(path: string, at: number): number {
  let h = 2166136261 >>> 0;
  for (const ch of `${path}:${at}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function pickContinuation(rnd: () => number): string {
  let r = rnd();
  for (const [path, weight] of CONTINUATIONS) {
    if (r < weight) return path;
    r -= weight;
  }
  return last(CONTINUATIONS)?.[0] ?? "";
}

/** The last hour of the device ring, plus a seeded projection from the same recorded starts. */
export function replayFold(rawVisits: readonly VisitRecord[], now = Date.now()): ReplaySnapshot {
  const windowStart = now - REPLAY_WINDOW_MS;
  const recordedVisits = rawVisits
    .filter((v) => v.at > 0 && v.at >= windowStart && v.at <= now)
    .sort((a, b) => a.at - b.at);
  const recorded = foldPulse(recordedVisits, "device");

  // One projected next door per recorded session start, on the same 30-minute session rule.
  const starts: { path: string; at: number }[] = [];
  let lastStartAt = Number.NEGATIVE_INFINITY;
  for (const v of recordedVisits) {
    if (v.at - lastStartAt > SESSION_GAP_MS) starts.push({ path: v.path, at: v.at });
    lastStartAt = v.at;
  }
  const predictedVisits: VisitRecord[] = starts.map((s, i) => {
    const next = pickContinuation(lcg(seedOf(s.path, s.at) ^ (i * 2654435761)));
    return { path: next, at: s.at + 60_000, dwellMs: 45_000 };
  });
  const predicted = foldPulse(predictedVisits, "seeded");

  return {
    recorded,
    predicted,
    windowStart,
    windowEnd: now,
    anomalies: [
      { id: "entryBounce", measured: recorded.bounceSessions, simulated: predicted.bounceSessions },
      { id: "deepExit", measured: recorded.depthBuckets[3], simulated: predicted.depthBuckets[3] },
      { id: "loopDetour", measured: recorded.loopSessions, simulated: predicted.loopSessions },
      { id: "deadEnd", measured: recorded.deadEndSessions, simulated: predicted.deadEndSessions },
    ],
  };
}

/** The exact ground truth offered to the model: no free text, no unlabelled figure. */
export function replayEnvelope(snapshot: ReplaySnapshot, law: string): object {
  const measured = (n: number) => ({ value: n, source: "measured" as const });
  const simulated = (n: number) => ({ value: n, source: "simulated" as const });
  return {
    law,
    window: { start: snapshot.windowStart, end: snapshot.windowEnd },
    recorded: {
      visits: measured(snapshot.recorded.visits),
      sessions: measured(snapshot.recorded.sessions),
      bounceRate: measured(snapshot.recorded.bounceRate),
      avgDepth: measured(snapshot.recorded.avgDepth),
    },
    predicted: {
      visits: simulated(snapshot.predicted.visits),
      sessions: simulated(snapshot.predicted.sessions),
      bounceRate: simulated(snapshot.predicted.bounceRate),
      avgDepth: simulated(snapshot.predicted.avgDepth),
    },
    anomalies: snapshot.anomalies.map((a) => ({
      id: a.id,
      measured: measured(a.measured),
      simulated: simulated(a.simulated),
    })),
  };
}

/** The same numeral law the other LLM doors ride (`verifyNumbersAgainst`), reported per
 *  numeral so the operator can see which figure was refused. Single digits carry no meaning;
 *  a compound must match an envelope number or its rounded twin — never a substring of one. */
export function verifyReplayText(text: string, envelope: object): string[] {
  const allowed = collectEvidenceNumbers(JSON.stringify(envelope));
  const found = new Set<string>();
  for (const m of String(text ?? "").matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    if (raw.length === 1) continue;
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (!allowed.has(raw) && !allowed.has(String(Math.round(n)))) found.add(raw);
  }
  if (/\b(will|won't|never will|by the time|years from now|listen to me)\b/i.test(text)) found.add("prediction");
  return [...found].sort();
}

// ── the first-line directive grammar, first line only ───────────────────────────────────────
export interface ReplayDirective {
  readonly anomaly: ReplayAnomalyId | null;
  readonly route: BenchRoute;
}

export function parseReplayDirective(text: string): ReplayDirective | null {
  const first = String(text ?? "").split(/\r?\n/, 1)[0].trim();
  if (/^\[?ABSTAIN\]?\b/i.test(first)) return { anomaly: null, route: "abstain" };
  const m = /^ANOMALY:(entryBounce|deepExit|loopDetour|deadEnd)\b/i.exec(first);
  if (!m) return null;
  const anomaly = REPLAY_ANOMALIES.find((id) => id.toLowerCase() === m[1].toLowerCase());
  return anomaly ? { anomaly, route: "answer" } : null;
}

export const stripReplayDirective = (text: string): string =>
  String(text ?? "")
    .replace(/^\s*(\[?ABSTAIN\]?|ANOMALY:(?:entryBounce|deepExit|loopDetour|deadEnd))\b[^\n]*\n?/i, "")
    .trim();

// ── the traced StateGraph ───────────────────────────────────────────────────────────────────
export type ReplayStage = FsmStage;
export type ReplayNote =
  | "windowSealed" | "modelChoseAnomaly" | "anomalyInvalid" | "modelAbstained"
  | "commitOk" | "precommitRefused" | "foldOk";

export interface ReplayTraceEntry {
  readonly stage: ReplayStage;
  readonly verdict: Verdict;
  readonly note: ReplayNote;
}

export interface ReplayState {
  readonly locale: Locale;
  readonly status: ReplayStage;
  readonly anomaly: ReplayAnomalyId | null;
  readonly chosenBy?: "model";
  readonly trace: readonly ReplayTraceEntry[];
  readonly answer: string;
}

export const createReplay = (locale: Locale): ReplayState => ({
  locale, status: "preflight", anomaly: null, trace: [], answer: "",
});

/** The hour is only "sealed" when all four provenance-tagged anomaly figures are present;
 *  otherwise there is nothing for a model to investigate and the fold answers instead. */
export const replayPreflight = (s: ReplayState, snapshot: ReplaySnapshot): ReplayState =>
  snapshot.anomalies.length === REPLAY_ANOMALIES.length
    ? step(s, { stage: "preflight", verdict: "pass", note: "windowSealed" }, "build")
    : step({ ...s, answer: "" }, { stage: "preflight", verdict: "refused", note: "foldOk" }, "refused");

/** A new ask clears any prior answer and branch choice before the model is consulted. */
export const replayBuild = (s: ReplayState): ReplayState =>
  fsmBuild({ ...s, answer: "", chosenBy: undefined },
    { stage: "build", verdict: "pass", note: "windowSealed" }, "model");

export const replayModelChose = (s: ReplayState, anomaly: ReplayAnomalyId): ReplayState =>
  step({ ...s, anomaly, chosenBy: "model" },
    { stage: "model", verdict: "pass", note: "modelChoseAnomaly" }, "precommit");

export const replayModelRouteInvalid = (s: ReplayState, answer: string): ReplayState =>
  fsmRefused({ ...s, anomaly: null, chosenBy: "model", answer }, answer,
    { stage: "model", verdict: "refused", note: "anomalyInvalid" });

/** Abstention names no branch: clear any carried anomaly on the refused arm. */
export const replayAbstained = (s: ReplayState, answer: string): ReplayState =>
  fsmRefused({ ...s, anomaly: null, answer }, answer,
    { stage: "refused", verdict: "refused", note: "modelAbstained" });

export const replayPrecommit = (s: ReplayState, verdict: Verdict): ReplayState =>
  fsmPrecommit(s, verdict,
    { stage: "precommit", verdict: "pass", note: "commitOk" },
    { stage: "precommit", verdict: "refused", note: "precommitRefused" });

export const replayCommit = (s: ReplayState, answer: string): ReplayState =>
  fsmCommit({ ...s, answer }, answer, { stage: "commit", verdict: "pass", note: "commitOk" });

export const replayRefused = (s: ReplayState, answer: string): ReplayState =>
  fsmRefused({ ...s, answer }, answer, { stage: "refused", verdict: "refused", note: "foldOk" });
