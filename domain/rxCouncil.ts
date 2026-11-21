// M1225 · The Prescription Council — the sixteenth imprisoned door.
// The model proposes ONE operator move from the SAME sealed replay envelope the Replay Room already
// sealed. Every numeral is re-proved by the shared replay door before the graph will even offer the
// proposal to the operator; adoption and rejection are both explicit traced edges, never a silent
// default. The recorded forecast is graded by the NEXT replay against that measured hour — a
// comparison of a prediction with an observation, never a claim that the prescription caused it.
import type { Locale } from "@/i18n/dictionaries";
import { step, fsmBuild, fsmCommit, fsmRefused, type FsmStage, type Verdict, type VerifierStage, type VerifierNote } from "@/domain/tracedFsm";
import { replayEnvelope, type ReplayAnomalyId, type ReplaySnapshot } from "@/domain/replay";
import { type Prescription, type RxSeverity } from "@/domain/prescription";
import type { BenchRoute } from "@/domain/witnessBench";

/** The one read-only slot this door owns; the pulse ring itself is never written. */
export const RX_FORECAST_KEY = "football-os.rxcouncil.forecast.v1";

export const RX_COUNCIL_DECISIONS = ["adopt", "reject"] as const;
export type RxCouncilDecision = (typeof RX_COUNCIL_DECISIONS)[number];

/** One fold prescription translated into the anomaly it can honestly answer. */
export interface RxOffering {
  readonly id: string;
  readonly severity: RxSeverity;
  readonly score: number;
  readonly vars: Record<string, string | number>;
  readonly anomaly: ReplayAnomalyId;
}

/** The fold's prescription ids are stable; only these are mapped, an unknown id is dropped rather
 *  than guessed into an anomaly it does not describe. */
const RX_ANOMALY: Readonly<Record<string, ReplayAnomalyId>> = {
  "rx.bounce": "entryBounce",
  "rx.bounceDoor": "entryBounce",
  "rx.depth": "deepExit",
  "rx.fatigue": "deepExit",
  "rx.loop": "loopDetour",
  "rx.deadEnd": "deadEnd",
  "rx.manualExit": "deadEnd",
  "rx.hold": "deadEnd",
};

export function offerPrescriptions(prescriptions: readonly Prescription[]): RxOffering[] {
  return prescriptions
    .filter((p) => p.id in RX_ANOMALY)
    .map((p) => ({
      id: p.id,
      severity: p.severity,
      score: p.score,
      vars: p.vars,
      anomaly: RX_ANOMALY[p.id],
    }));
}

/** Reuse the Replay Room's single provenance envelope, then append only the offered shelf. */
export function councilEnvelope(snapshot: ReplaySnapshot, offerings: readonly RxOffering[], law: string): object {
  return {
    ...(replayEnvelope(snapshot, law) as Record<string, unknown>),
    offerings: offerings.map((o) => ({
      id: o.id,
      severity: o.severity,
      anomaly: o.anomaly,
      score: { value: o.score, source: "derived" },
      vars: o.vars,
    })),
  };
}

export interface CouncilDirective {
  readonly id: string | null;
  readonly route: BenchRoute;
}

/** First line only: one of the OFFERED ids, or a bare ABSTAIN. A foreign id is not a route. */
export function parseCouncilDirective(text: string, offerings: readonly RxOffering[]): CouncilDirective | null {
  const first = String(text ?? "").split(/\r?\n/, 1)[0].trim();
  if (/^\[?ABSTAIN\]?\b/i.test(first)) return { id: null, route: "abstain" };
  const m = /^RX:([a-zA-Z0-9._-]+)\b/i.exec(first);
  if (!m) return null;
  const match = offerings.find((o) => o.id.toLowerCase() === m[1].toLowerCase());
  return match ? { id: match.id, route: "answer" } : null;
}

export const stripCouncilDirective = (text: string): string =>
  String(text ?? "")
    .replace(/^\s*(\[?ABSTAIN\]?|RX:[a-zA-Z0-9._-]+)\b[^\n]*\n?/i, "")
    .trim();

// ── the traced StateGraph ───────────────────────────────────────────────────────────────────
export type CouncilStage = FsmStage;
export type CouncilNote =
  | "offeringSealed" | "modelProposed" | "proposalInvalid" | "modelAbstained"
  | "proposalVerified" | "proposalRefused" | "adopted" | "rejected" | "foldOk";

export interface CouncilTraceEntry {
  readonly stage: CouncilStage;
  readonly verdict: Verdict;
  readonly note: CouncilNote;
}

export interface CouncilState {
  readonly locale: Locale;
  readonly status: CouncilStage;
  readonly proposalId: string | null;
  readonly decision: RxCouncilDecision | null;
  readonly forecastOk: boolean;
  readonly trace: readonly CouncilTraceEntry[];
  readonly answer: string;
}

export const createCouncil = (locale: Locale): CouncilState => ({
  locale, status: "preflight", proposalId: null, decision: null, forecastOk: false, trace: [], answer: "",
});

/** An empty shelf is a real preflight refusal, not an ask with nothing to choose from. */
export const councilPreflight = (s: CouncilState, offerings: readonly RxOffering[]): CouncilState =>
  offerings.length > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "offeringSealed" }, "build")
    : fsmRefused(s, "", { stage: "preflight", verdict: "refused", note: "foldOk" });

export const councilBuild = (s: CouncilState): CouncilState =>
  fsmBuild({ ...s, answer: "", decision: null, forecastOk: false, proposalId: null },
    { stage: "build", verdict: "pass", note: "offeringSealed" }, "model");

export const councilModelProposed = (s: CouncilState, id: string): CouncilState =>
  step({ ...s, proposalId: id }, { stage: "model", verdict: "pass", note: "modelProposed" }, "precommit");

export const councilProposalInvalid = (s: CouncilState, answer: string): CouncilState => {
  const refused = fsmRefused({ ...s, answer }, answer, { stage: "model", verdict: "refused", note: "proposalInvalid" });
  return refused;
};

export const councilAbstained = (s: CouncilState, answer: string): CouncilState => {
  const abstained = fsmRefused({ ...s, answer }, answer, { stage: "refused", verdict: "refused", note: "modelAbstained" });
  return abstained;
};

export const councilVerified = (s: CouncilState): CouncilState => {
  const proved = step({ ...s, forecastOk: true }, { stage: "precommit", verdict: "pass", note: "proposalVerified" }, "commit");
  return proved;
};

export const councilProposalRefused = (s: CouncilState, answer: string): CouncilState => {
  const refused = fsmRefused({ ...s, answer }, answer, { stage: "precommit", verdict: "refused", note: "proposalRefused" });
  return refused;
};

export const councilAdopt = (s: CouncilState, answer: string): CouncilState =>
  fsmCommit({ ...s, answer, decision: "adopt" }, answer, { stage: "commit", verdict: "pass", note: "adopted" });

export const councilReject = (s: CouncilState, answer: string): CouncilState =>
  fsmCommit({ ...s, answer, decision: "reject" }, answer, { stage: "commit", verdict: "pass", note: "rejected" });

export const councilFold = (s: CouncilState, answer: string): CouncilState => {
  const folded = fsmRefused({ ...s, answer }, answer, { stage: "refused", verdict: "refused", note: "foldOk" });
  return folded;
};

// ── the forecast the next replay must answer to ──────────────────────────────────────────────
export interface RxForecast {
  readonly anomaly: ReplayAnomalyId;
  readonly predicted: number;
  readonly rxId: string;
  readonly at: number;
  readonly locale: Locale;
}

export interface RxScore {
  readonly anomaly: ReplayAnomalyId;
  readonly forecast: number;
  readonly actual: number;
  readonly delta: number;
  readonly verdict: AuditGrade;
}


/** A forecast is only born after the graph has proved a proposal and the operator adopted it. */
export function forecastFrom(snapshot: ReplaySnapshot, offering: RxOffering, locale: Locale): RxForecast {
  const anomaly = snapshot.anomalies.find((a) => a.id === offering.anomaly);
  return { anomaly: offering.anomaly, predicted: anomaly?.simulated ?? 0, rxId: offering.id, at: snapshot.windowEnd, locale };
}

/** Compare a stored forecast with a LATER window's measured figure. No causal claim is made. */
export function gradeForecast(forecast: RxForecast, later: ReplaySnapshot): RxScore {
  const actual = later.anomalies.find((a) => a.id === forecast.anomaly)?.measured ?? 0;
  const delta = actual - forecast.predicted;
  return {
    anomaly: forecast.anomaly,
    forecast: forecast.predicted,
    actual,
    delta,
    verdict: delta === 0 ? "hit" : Math.abs(delta) === 1 ? "near" : "miss",
  };
}

/** The fold answer on a device with no model: the same offering, in the visitor's language. */
export function councilFoldText(offering: RxOffering, t: (key: string, vars?: Record<string, string | number>) => string): string {
  return t("ops.rxCouncil.fold", {
    id: offering.id,
    severity: offering.severity,
    anomaly: offering.anomaly,
    value: offering.score,
  });
}

// ── M1226 · The Forecast Ombudsman ─────────────────────────────────────────────────────────────
// The council's forecast is a prediction; a LATER measured hour is an observation. This door makes
// the model audit its own earlier prediction: it must name the deterministic grade, write a short
// three-part minute, and pass the SHARED replay numeral door. The human then publishes or contests
// the minute. Causation is never claimed — the minute compares a forecast with an observation.
export const OM_KEY = "football-os.ombudsman.note.v1";
export const AUDIT_GRADES = ["hit", "near", "miss"] as const;
export type AuditGrade = (typeof AUDIT_GRADES)[number];
export type AuditDecision = "publish" | "contest";

export interface OmbudsmanNote {
  readonly grade: AuditGrade;
  readonly forecast: number;
  readonly actual: number;
  readonly delta: number;
  readonly rxId: string;
  readonly anomaly: ReplayAnomalyId;
  readonly at: number;
  readonly locale: Locale;
  readonly decision: AuditDecision;
}

export interface AuditDirective {
  readonly grade: AuditGrade | null;
  readonly route: BenchRoute;
}

/** First line only: the deterministic grade, or a bare ABSTAIN. A buried word is not a route. */
export function parseAuditDirective(text: string): AuditDirective | null {
  const first = String(text ?? "").split(/\r?\n/, 1)[0].trim();
  if (/^\[?ABSTAIN\]?\b/i.test(first)) return { grade: null, route: "abstain" };
  const m = /^GRADE:(hit|near|miss)\b/i.exec(first);
  if (!m) return null;
  return { grade: m[1].toLowerCase() as AuditGrade, route: "answer" };
}

export function stripAuditDirective(text: string): string {
  const source = String(text ?? "");
  const first = source.split(/\r?\n/, 1)[0];
  if (/^\[?ABSTAIN\]?\b/i.test(first) || /^GRADE:(?:hit|near|miss)\b/i.test(first)) {
    return source.replace(/^\s*(\[?ABSTAIN\]?|GRADE:(?:hit|near|miss))\b[^\n]*\n?/i, "").trim();
  }
  return source.trim();
}

/** Reuse the sealed replay envelope, then append the prediction and the later observation. */
export function auditEnvelope(forecast: RxForecast, later: ReplaySnapshot, law: string): object {
  return {
    ...(replayEnvelope(later, law) as Record<string, unknown>),
    forecast: {
      predicted: forecast.predicted,
      rxId: forecast.rxId,
      anomaly: forecast.anomaly,
      at: forecast.at,
      source: "prediction",
    },
    observation: {
      measured: later.anomalies.find((a) => a.id === forecast.anomaly)?.measured ?? 0,
      at: later.windowEnd,
      source: "measured",
    },
  };
}

/** The three ordered sections keep the minute readable and its provenance separate. */
export function verifyAuditStructure(text: string): boolean {
  const prose = String(text ?? "").trim();
  const markers = ["FORECAST:", "OBSERVATION:", "BOUNDARY:"];
  let cursor = -1;
  for (const marker of markers) {
    const at = prose.indexOf(marker);
    if (at <= cursor) return false;
    cursor = at;
  }
  const parts = prose.split(/FORECAST:|OBSERVATION:|BOUNDARY:/).map((s) => s.trim());
  if (parts.length !== 4 || parts.slice(1).some((s) => s.length === 0)) return false;
  return prose.split(/\s+/).filter(Boolean).length <= 80;
}

export type AuditStage = FsmStage | VerifierStage;
export type AuditNote =
  | "windowSealed" | "modelGraded" | "gradeInvalid" | "modelAbstained" | "gradeMismatch"
  | VerifierNote
  | "published" | "contested" | "foldOk";

export interface AuditTraceEntry {
  readonly stage: AuditStage;
  readonly verdict: Verdict;
  readonly note: AuditNote;
}

export interface OmbudsmanState {
  readonly locale: Locale;
  readonly status: AuditStage;
  readonly grade: AuditGrade | null;
  readonly decision: OmbudsmanNote["decision"] | null;
  readonly trace: readonly AuditTraceEntry[];
  readonly answer: string;
}

export const createOmbudsman = (locale: Locale): OmbudsmanState => ({
  locale, status: "preflight", grade: null, decision: null, trace: [], answer: "",
});

/** A forecast without a later window has nothing honest to compare; refuse before any ask. */
export const auditPreflight = (s: OmbudsmanState, forecast: RxForecast | null, later: ReplaySnapshot): OmbudsmanState =>
  forecast && forecast.at < later.windowEnd
    ? step(s, { stage: "preflight", verdict: "pass", note: "windowSealed" }, "build")
    : fsmRefused(s, "", { stage: "preflight", verdict: "refused", note: "foldOk" });

export const auditBuild = (s: OmbudsmanState): OmbudsmanState =>
  fsmBuild({ ...s, answer: "", grade: null, decision: null },
    { stage: "build", verdict: "pass", note: "windowSealed" }, "model");

export const auditModelGraded = (s: OmbudsmanState, grade: AuditGrade): OmbudsmanState =>
  step({ ...s, grade, decision: s.decision }, { stage: "model", verdict: "pass", note: "modelGraded" }, "precommit");

export const auditInvalid = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmRefused({ ...s, answer, grade: s.grade }, answer, { stage: "model", verdict: "refused", note: "gradeInvalid" });

export const auditAbstained = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmRefused({ ...s, answer, grade: s.grade }, answer, { stage: "refused", verdict: "refused", note: "modelAbstained" });

export const auditGradeMismatch = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmRefused({ ...s, answer, decision: s.decision }, answer, { stage: "precommit", verdict: "refused", note: "gradeMismatch" });

export const auditStructurePassed = (s: OmbudsmanState): OmbudsmanState =>
  step({ ...s }, { stage: "structure", verdict: "pass", note: "structurePassed" }, "numerals");

export const auditStructureRefused = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmRefused({ ...s, answer, grade: s.grade }, answer, { stage: "structure", verdict: "refused", note: "structureRefused" });

export const auditNumeralsPassed = (s: OmbudsmanState): OmbudsmanState =>
  step({ ...s }, { stage: "numerals", verdict: "pass", note: "numeralsPassed" }, "commit");

export const auditNumeralsRefused = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmRefused({ ...s, answer, decision: s.decision }, answer, { stage: "precommit", verdict: "refused", note: "numeralsRefused" });

export const auditPublish = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmCommit({ ...s, answer, decision: "publish" }, answer, { stage: "commit", verdict: "pass", note: "published" });

export const auditContest = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmCommit({ ...s, answer, decision: "contest" }, answer, { stage: "commit", verdict: "pass", note: "contested" });

export const auditFold = (s: OmbudsmanState, answer: string): OmbudsmanState =>
  fsmRefused({ ...s, answer, grade: s.grade }, answer, { stage: "refused", verdict: "refused", note: "foldOk" });

export function auditFoldText(
  t: (key: string, vars?: Record<string, string | number>) => string,
  score: RxScore,
): string {
  return t("ops.ombudsman.fold", {
    grade: score.verdict,
    predicted: score.forecast,
    actual: score.actual,
  });
}
