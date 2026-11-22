// M1238 · The Transfer Broker — door 19, the one that prices a man. The Selection Chair names a
// XI and the Training Desk prescribes a week; this one rules on a DEAL: a fee is on the table
// for one of the world's players, and the model must rule ACCEPT, REJECT or COUNTER — with the
// money answered in the model's own figures, every one of them proved against the dossier. The
// fold's own ruling is real arithmetic (the fee against the player's value), so a refusal walks
// to a number, not a shrug. The model's freedom ends where the dossier's money begins.
import type { Locale } from "@/i18n/dictionaries";
import type { Verdict as TraceVerdict, FsmStage } from "@/domain/tracedFsm";
import { step, fsmBuild, fsmCommit, fsmRefused, fsmPrecommit } from "@/domain/tracedFsm";
import { DEEP_DIGEST_NUMBERS } from "@/data/deepDigest";

export type BrokerStage = FsmStage;
export type BrokerNote = "dealInHand" | "dealSealed" | "commitOk" | "foldOk" | "precommitRefused";

export interface BrokerTraceEntry {
  readonly stage: BrokerStage;
  readonly verdict: TraceVerdict;
  readonly note: BrokerNote;
}

/** One player as the broker sees them — the roster's own facts, nothing inferred. */
export interface BrokerDossier {
  readonly playerName: string;
  readonly clubName: string;
  readonly overall: number;
  readonly age: number;
  /** Market value in EUR, as the world carries it. */
  readonly value: number;
}

/** The deal on the table: the fee a buyer has put up, in EUR. */
export interface BrokerDeal {
  readonly dossier: BrokerDossier;
  readonly fee: number;
}

/** A lawful ruling: one of three codes, and a counter-fee when the code is counter. */
export interface BrokerRuling {
  readonly code: "accept" | "reject" | "counter";
  readonly fee: number | null;
}

export interface BrokerState {
  readonly deal: BrokerDeal;
  readonly locale: Locale;
  readonly status: BrokerStage;
  readonly trace: readonly BrokerTraceEntry[];
  readonly answer: string;
  readonly ruling: BrokerRuling | null;
}

export const BROKER_BUILD_ENTRY = { stage: "build", verdict: "pass", note: "dealSealed" } as const;
export const BROKER_COMMIT_ENTRY = { stage: "commit", verdict: "pass", note: "commitOk" } as const;
export const BROKER_FOLD_ENTRY = { stage: "refused", verdict: "refused", note: "foldOk" } as const;
export const BROKER_PRECOMMIT_PASS = { stage: "precommit", verdict: "pass", note: "commitOk" } as const;
export const BROKER_PRECOMMIT_REFUSED = { stage: "precommit", verdict: "refused", note: "precommitRefused" } as const;

/** The three ruling codes, spelled once. */
export const RULING_CODES = ["accept", "reject", "counter"] as const;

/** The fold's thresholds, as shares of the player's value. */
export const ACCEPT_AT = 1.5;
export const REJECT_AT = 0.8;
/** The fold's counter-fee: value x 1.2, rounded to the nearest million. */
const COUNTER_AT = 1.2;
const roundM = (eur: number): number => Math.round(eur / 1e6) * 1e6;

// The line's code is read as a WORD and checked against the list below, so an unknown ruling
// ("RULING:maybe") is charged badCode rather than falling through to noDirective — the two are
// different failures and a reader deserves to be told which one happened.
const RULING_LINE = /^RULING:(\w+)\s*$/mi;
const FEE_LINE = /^FEE:(\d+(?:\.\d+)?)\s*$/mi;

export const createBroker = (deal: BrokerDeal, locale: Locale): BrokerState => ({
  deal: { dossier: { ...deal.dossier }, fee: deal.fee },
  locale, status: "preflight", trace: [], answer: "", ruling: null,
});

export type BrokerViolation = "noDirective" | "badCode" | "missingFee" | "offDeal" | "prediction";

/** Parse the ruling's directive lines. Codes, not sentences. */
export function parseBrokerRuling(text: string, deal: BrokerDeal): { ruling: BrokerRuling | null; violations: BrokerViolation[] } {
  const m = RULING_LINE.exec(text);
  if (!m) return { ruling: null, violations: ["noDirective"] };
  const code = m[1].toLowerCase();
  if (!RULING_CODES.includes(code as (typeof RULING_CODES)[number])) return { ruling: null, violations: ["badCode"] };
  const feeLine = FEE_LINE.exec(text);
  if (code === "counter") {
    if (!feeLine) return { ruling: null, violations: ["missingFee"] };
    const fee = Number(feeLine[1]);
    if (!Number.isFinite(fee) || fee <= 0) return { ruling: null, violations: ["missingFee"] };
    return { ruling: { code: "counter", fee }, violations: [] };
  }
  return { ruling: { code: code as "accept" | "reject", fee: null }, violations: [] };
}

/** The numeral law over the prose: any figure must be the dossier's own (value, overall, age),
 *  the fee on the table, or one the world book carries. */
export function verifyBrokerText(text: string, deal: BrokerDeal): BrokerViolation[] {
  const out = new Set<BrokerViolation>();
  const universe = new Set<string>();
  const add = (n: number) => { universe.add(String(n)); };
  add(deal.dossier.value);
  add(deal.dossier.overall);
  add(deal.dossier.age);
  add(deal.fee);
  for (const base of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) add(base);
  for (const m of text.matchAll(/\d+(?:[\d,.]*\d)?/g)) {
    const raw = m[0].replace(/,/g, "");
    const n = Number(raw);
    if (!Number.isFinite(n)) continue;
    if (universe.has(raw) || universe.has(String(Math.round(n)))) continue;
    if (DEEP_DIGEST_NUMBERS.has(raw) || DEEP_DIGEST_NUMBERS.has(String(Math.round(n)))) continue;
    out.add("offDeal");
  }
  if (/\b(will|won't|never will|by the time|years from now|mark my words)\b/i.test(text)) out.add("prediction");
  return [...out];
}

/** The fold's own ruling: the fee against the player's value — accept at 1.5x, reject at 0.8x,
 *  and between them a counter at value x 1.2 rounded to the million. Deterministic; the same
 *  deal always rules the same. */
export function foldRuling(deal: BrokerDeal): BrokerRuling {
  const ratio = deal.fee / deal.dossier.value;
  if (ratio >= ACCEPT_AT) return { code: "accept", fee: null };
  if (ratio <= REJECT_AT) return { code: "reject", fee: null };
  return { code: "counter", fee: roundM(deal.dossier.value * COUNTER_AT) };
}

// ---- the state machine --------------------------------------------------
export const brokerPreflight = (s: BrokerState): BrokerState =>
  s.deal.dossier.value > 0 && s.deal.fee > 0 && s.deal.dossier.playerName.trim().length > 0
    ? step(s, { stage: "preflight", verdict: "pass", note: "dealInHand" }, "build")
    : step({ ...s }, { stage: "preflight", verdict: "refused", note: "dealInHand" }, "refused");

export const brokerBuild = (s: BrokerState): BrokerState => fsmBuild(s, BROKER_BUILD_ENTRY, "model");

export const brokerPrecommit = (s: BrokerState, verdict: TraceVerdict): BrokerState =>
  fsmPrecommit(s, verdict, BROKER_PRECOMMIT_PASS, BROKER_PRECOMMIT_REFUSED);

export const brokerCommit = (s: BrokerState, answer: string, ruling: BrokerRuling): BrokerState =>
  fsmCommit({ ...s, answer, ruling }, answer, BROKER_COMMIT_ENTRY);

export const brokerRefused = (s: BrokerState, answer: string): BrokerState =>
  fsmRefused({ ...s, answer, ruling: foldRuling(s.deal) }, answer, BROKER_FOLD_ENTRY);
