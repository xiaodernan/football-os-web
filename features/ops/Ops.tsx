// M1149 · The Pulse — the operator console at /ops.
// What it shows: how this world behaves when nobody is watching. The route carries a
// shared passcode ("123", chosen deliberately and labelled as a demo boundary, not security).
// Everything shown comes from one of two places, both honest:
//   1. this device's own visit trail (localStorage, never the network), or
//   2. a seeded demonstration cohort rendered by the same fold (labelled "seeded"), used only
//      when the device holds too little to say anything.
// No analytics backend, no cookies, no session uploaded anywhere.

import { useMemo, useState } from "react";
import { useI18n, formatDate } from "@/i18n";
import { PULSE_KEY, HIGH_BOUNCE_SHARE, syntheticCohort, foldPulse, type Cohort, type VisitRecord, type PulseFold } from "@/domain/pulse";
import { fmt1, fmt2, pctOf, round2, safeDiv, signed1 } from "@/lib/utils";
import { foldPrescription, type Prescription } from "@/domain/prescription";
import { browserStore, readJson } from "@/domain/localData";
import { callLlmStream, LLM_CONFIG, withWorldBook } from "@/data/llm";
import {
  createConsult, consultBuild, consultCommit, consultPrecommit,
  consultPreflight, consultRefused, verifyConsultText,
  type ConsultTraceEntry, type ConsultViolation,
} from "@/domain/consult";
import {
  analystBuild, analystCommit, analystPrecommit,
  analystPreflight, analystRefused, verifyAnalystText, analystEnvelope,
  ANALYST_FOLD_ANSWER_KEY,
  type AnalystTraceEntry, type AnalystViolation,
} from "@/domain/analyst";
import {
  dispatchBuild, dispatchCommit, dispatchPrecommit,
  dispatchPreflight, dispatchRefused, dispatchEnvelope, verifyDispatchText,
  dispatchOrderIds,
  DISPATCH_FOLD_ANSWER_KEY,
  type DispatchTraceEntry, type DispatchViolation,
} from "@/domain/dispatch";
import {
  latchBuild, latchCommit, latchPrecommit,
  latchPreflight, latchRefused, latchEnvelope, verifyLatchText,
  LATCH_FOLD_ANSWER_KEY,
  type LatchTraceEntry, type LatchViolation,
} from "@/domain/latch";
import {
  debriefBuild, debriefCommit, debriefPrecommit,
  debriefPreflight, debriefRefused, debriefEnvelope, verifyDebriefText,
  DEBRIEF_FOLD_ANSWER_KEY,
  type DebriefTraceEntry, type DebriefViolation,
} from "@/domain/debrief";
import { foldTide, type TideReading } from "@/domain/tide";
import { Panel, PANEL_CLASS, CHIP_CLASS, BAR_FILL } from "@/ui/primitives";
import { cn } from "@/lib/utils";

const PASSCODE = "123"; // the shared demo passcode, deliberately public per the owner's instruction
const MIN_DEVICE_VISITS = 3;

export function Ops() {
  const { t, locale } = useI18n();
  const [pass, setPass] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [cohort, setCohort] = useState<Cohort>("device");
  const [consultBusy, setConsultBusy] = useState(false);
  const [consultTrace, setConsultTrace] = useState<readonly ConsultTraceEntry[] | null>(null);
  const [consultViolations, setConsultViolations] = useState<readonly ConsultViolation[] | null>(null);
  const [consultAnswer, setConsultAnswer] = useState("");
  const [analystBusy, setAnalystBusy] = useState(false);
  const [analystTrace, setAnalystTrace] = useState<readonly AnalystTraceEntry[] | null>(null);
  const [analystViolations, setAnalystViolations] = useState<readonly AnalystViolation[] | null>(null);
  const [analystAnswer, setAnalystAnswer] = useState("");
  const [debriefBusy, setDebriefBusy] = useState(false);
  const [debriefTrace, setDebriefTrace] = useState<readonly DebriefTraceEntry[] | null>(null);
  const [debriefViolations, setDebriefViolations] = useState<readonly DebriefViolation[] | null>(null);
  const [debriefAnswer, setDebriefAnswer] = useState("");
  const [latchBusy, setLatchBusy] = useState(false);
  const [latchTrace, setLatchTrace] = useState<readonly LatchTraceEntry[] | null>(null);
  const [latchViolations, setLatchViolations] = useState<readonly LatchViolation[] | null>(null);
  const [latchAnswer, setLatchAnswer] = useState("");
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchTrace, setDispatchTrace] = useState<readonly DispatchTraceEntry[] | null>(null);
  const [dispatchViolations, setDispatchViolations] = useState<readonly DispatchViolation[] | null>(null);
  const [dispatchAnswer, setDispatchAnswer] = useState("");
  const [orderedRx, setOrderedRx] = useState<string | null>(null);

  const deviceFold = useMemo(() => {
    const held = readJson<{ visits: VisitRecord[] }>(browserStore(), PULSE_KEY, { visits: [] }).value.visits;
    return foldPulse(held, "device");
  }, []);
  const seededFold = useMemo(() => foldPulse(syntheticCohort(), "seeded"), []);
  const useSeeded = cohort === "seeded" || deviceFold.visits < MIN_DEVICE_VISITS;
  const fold: PulseFold = useSeeded ? seededFold : deviceFold;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pass === PASSCODE) { setUnlocked(true); setError(false); return; }
    setError(true);
  };

  if (!unlocked) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
        <form onSubmit={submit} className={cn("w-full rounded-2xl border p-8 text-center", PANEL_CLASS.panelMuted)}>
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("ops.kicker")}</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{t("ops.title")}</h1>
          <p className="mt-2 text-xs text-muted-foreground">{t("ops.lock.hint")}</p>
          <label className="mt-6 block text-left text-[10px] uppercase tracking-widest text-muted-foreground" htmlFor="ops-pass">{t("ops.passcodeLabel")}</label>
          <input
            id="ops-pass"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pass}
            onChange={(e) => { setPass(e.target.value); setError(false); }}
            className={cn("mt-1 w-full rounded-lg border bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.4em] tabular-nums outline-none focus:border-primary", error && "border-warning")}
            aria-invalid={error}
          />
          {error ? <p className="mt-2 text-[11px] text-warning">{t("ops.lock.error")}</p> : null}
          <button type="submit" className={cn("fo-lift mt-5 w-full rounded-lg px-4 py-2 text-sm font-semibold", CHIP_CLASS.solidPrimary)}>{t("ops.lock.cta")}</button>
          <p className="mt-4 text-[10px] text-muted-foreground">{t("ops.footnote")}</p>
        </form>
      </div>
    );
  }

  const dwellSec = (ms: number) => Math.round(ms / 1000);

  // The forecast, the fold and the projection are the same pulse — one pass, no new data invented.
  const tide: TideReading = foldTide(fold);
  const tideMax = Math.max(1, ...fold.trend.map((d) => d.visits));
  const TIDE_W = 280, TIDE_H = 48, TIDE_PAD = 4;
  const tidePoints = fold.trend.slice(-14).map((d, i) =>
    `${(round2(safeDiv(i, fold.trend.slice(-14).length - 1) * (TIDE_W - TIDE_PAD * 2) + TIDE_PAD))},${(round2(TIDE_H - TIDE_PAD - safeDiv(d.visits, tideMax) * (TIDE_H - TIDE_PAD * 2)))}`
  ).join(" ");

  // The consultation: the fold's own prescription, narrated — by the model only when every
  // number it speaks traces back to this exact fold; refused otherwise, never a silent swap.
  // (State lives above the lock-screen early return so hooks order never shifts across renders.)

  // The prescription is fold-cheap: one pass, ordered, honest.
  const rx = foldPrescription(fold);
  const foldConsultText = (): string =>
    [
      t("ops.consult.foldAnswer.intro", { sessions: fold.sessions, bounceRate: fmt1(fold.bounceRate), avgDepth: fmt2(fold.avgDepth), loopRate: fmt1(fold.loopRate) }),
      t("ops.consult.foldAnswer.promise"),
    ].join(" ");

  const consultSystem = (): string =>
    withWorldBook(JSON.stringify({
    fold: {
      cohort: fold.cohort,
      visits: fold.visits,
      sessions: fold.sessions,
      bounceRate: fold.bounceRate,
      avgDepth: fold.avgDepth,
      avgDwellMs: fold.avgDwellMs,
      loopRate: fold.loopRate,
      deadEndSessions: fold.deadEndSessions,
      depthBuckets: fold.depthBuckets,
      perRoute: fold.perRoute.slice(0, 5).map((r) => ({ path: r.path, visits: r.visits, bounceShare: r.bounceShare, avgDwellMs: r.avgDwellMs, exits: r.exits })),
      exits: fold.exits.slice(0, 5),
    },
    prescriptions: rx.map((r) => ({ id: r.id, severity: r.severity, vars: r.vars })),
    commandment: "Answer ONLY from THE WORLD BOOK above and this fold JSON. Never invent a number, a route, a date or a cause that is not in here or the book. If a claim has no anchor in the fold, omit the sentence. Answer in the visitor's language. Three tight sentences; no futurology.",
  }));

  const askConsult = async () => {
    if (consultBusy) return;
    let desk = consultBuild(consultPreflight(createConsult(fold, locale)));
    setConsultTrace(desk.trace);
    setConsultViolations(null);
    setConsultAnswer("");
    if (!LLM_CONFIG.hasKey) { setConsultAnswer(t("ops.consult.via.local")); return; }
    setConsultBusy(true);
    const question = "Read the prescription aloud, three sentences. One: what this fold shows most clearly about how visitors move through this world. Two: the single worst door or abscess the fold names, with its own number. Three: the one concrete next move.";
    const result = await callLlmStream(question, [], (d) => setConsultAnswer((p) => p + d), { system: consultSystem() });
    if (result.ok) {
      const refusals = verifyConsultText(result.text, desk.fold);
      if (refusals.length === 0) {
        const committed = consultCommit(consultPrecommit(desk, "pass"), result.text);
        setConsultTrace(committed.trace);
        setConsultViolations(null);
        setConsultAnswer(result.text);
        setConsultBusy(false);
        return;
      }
      setConsultViolations(refusals);
      const refused = consultRefused(consultPrecommit(desk, "refused"), foldConsultText());
      setConsultTrace(refused.trace);
      setConsultAnswer(foldConsultText());
      setConsultBusy(false);
      return;
    }
    setConsultViolations(null);
    const offline = consultRefused(desk, foldConsultText());
    setConsultTrace(offline.trace);
    setConsultAnswer(foldConsultText());
    setConsultBusy(false);
  };

  // The analyst: three structured answers, imprisoned to the fold's exact numbers, ranked by the tide's own verdict.
  const analystSystem = (): string =>
    withWorldBook(
      `${analystEnvelope(fold, rx)}\n\nCOMMANDMENT: you will read the fold above and answer exactly three numbered actions, in the visitor's language. One: the single clearest signal in this fold (name the metric and its value). Two: the single worst door or abscess (name it and its number). Three: the next concrete move (one sentence). Never invent a number absent from the envelope above; never predict; if you claim a number, it must already exist in the envelope above.`,
    );

  const askAnalyst = async () => {
    if (analystBusy) return;
    let desk = analystBuild(analystPreflight({ fold, locale, status: "preflight", trace: [], answer: "" }));
    setAnalystTrace(desk.trace);
    setAnalystViolations(null);
    setAnalystAnswer("");
    if (!LLM_CONFIG.hasKey) { setAnalystAnswer(t("ops.analyst.via.local")); return; }
    setAnalystBusy(true);
    const result = await callLlmStream(
      "Read the fold aloud: three numbered actions. One: the clearest signal. Two: the worst door. Three: the next move.",
      [],
      (d) => setAnalystAnswer((p) => p + d),
      { system: analystSystem() },
    );
    if (result.ok) {
      const refusals = verifyAnalystText(result.text, desk.fold);
      if (refusals.length === 0) {
        const committed = analystCommit(analystPrecommit(desk, "pass"), result.text);
        setAnalystTrace(committed.trace);
        setAnalystViolations(null);
        setAnalystAnswer(result.text);
        setAnalystBusy(false);
        return;
      }
      setAnalystViolations(refusals);
      const refused = analystRefused(analystPrecommit(desk, "refused"), t(ANALYST_FOLD_ANSWER_KEY));
      setAnalystTrace(refused.trace);
      setAnalystAnswer(t(ANALYST_FOLD_ANSWER_KEY));
      setAnalystBusy(false);
      return;
    }
    setAnalystViolations(null);
    const offline = analystRefused(desk, t(ANALYST_FOLD_ANSWER_KEY));
    setAnalystTrace(offline.trace);
    setAnalystAnswer(t(ANALYST_FOLD_ANSWER_KEY));
    setAnalystBusy(false);
  };

  // The debrief: the operator's own monthly letter — the fold speaks as a writer, not a dashboard.
  const debriefSystem = (): string =>
    withWorldBook(
      `${debriefEnvelope(fold, rx)}\n\nCOMMANDMENT: you will write the reader's own monthly statement from ONLY THE WORLD BOOK above and THIS fold JSON. Four tight numbered lines. One: what moved most clearly, with its own metric and value. Two: the single worst door named WITH ITS OWN NUMBER. Three: the habit to protect. Four: the one concrete next move. Keep it in the visitor's language. Never invent a number absent from the envelope; never predict; never claim a cause not in the fold.`,
    );

  const askDebrief = async () => {
    if (debriefBusy) return;
    let desk = debriefBuild(debriefPreflight({ fold, locale, status: "preflight", trace: [], answer: "" }));
    setDebriefTrace(desk.trace);
    setDebriefViolations(null);
    setDebriefAnswer("");
    if (!LLM_CONFIG.hasKey) { setDebriefAnswer(t("ops.debrief.via.local")); return; }
    setDebriefBusy(true);
    const result = await callLlmStream(
      "Read the month aloud, four numbered lines. One: what moved most clearly. Two: the worst door. Three: the habit to protect. Four: the next move.",
      [],
      (d) => setDebriefAnswer((p) => p + d),
      { system: debriefSystem() },
    );
    if (result.ok) {
      const refusals = verifyDebriefText(result.text, desk.fold);
      if (refusals.length === 0) {
        const committed = debriefCommit(debriefPrecommit(desk, "pass"), result.text);
        setDebriefTrace(committed.trace);
        setDebriefViolations(null);
        setDebriefAnswer(result.text);
        setDebriefBusy(false);
        return;
      }
      setDebriefViolations(refusals);
      const refused = debriefRefused(debriefPrecommit(desk, "refused"), t(DEBRIEF_FOLD_ANSWER_KEY));
      setDebriefTrace(refused.trace);
      setDebriefAnswer(t(DEBRIEF_FOLD_ANSWER_KEY));
      setDebriefBusy(false);
      return;
    }
    setDebriefViolations(null);
    const offline = debriefRefused(desk, t(DEBRIEF_FOLD_ANSWER_KEY));
    setDebriefTrace(offline.trace);
    setDebriefAnswer(t(DEBRIEF_FOLD_ANSWER_KEY));
    setDebriefBusy(false);
  };

  // The latch: one sentence — the single instruction this fold supports. Tighter than the letter on purpose.
  const latchSystem = (): string =>
    withWorldBook(
      `${latchEnvelope(fold, rx)}\n\nCOMMANDMENT: you will read the fold above and answer with EXACTLY ONE sentence — the single highest-leverage instruction the evidence supports, named with its metric and value from the envelope. No preamble, no list, no second sentence. Keep it in the visitor's language. Never invent a number absent from the envelope above; never predict; if you claim a number, it must already exist in the envelope above.`,
    );

  const askLatch = async () => {
    if (latchBusy) return;
    let desk = latchBuild(latchPreflight({ fold, locale, status: "preflight", trace: [], answer: "" }));
    setLatchTrace(desk.trace);
    setLatchViolations(null);
    setLatchAnswer("");
    if (!LLM_CONFIG.hasKey) { setLatchAnswer(t("ops.latch.via.local")); return; }
    setLatchBusy(true);
    const result = await callLlmStream(
      "The latch: one sentence. What does the fold say the operator should do next, named with its metric and value.",
      [],
      (d) => setLatchAnswer((p) => p + d),
      { system: latchSystem() },
    );
    if (result.ok) {
      const refusals = verifyLatchText(result.text, desk.fold);
      if (refusals.length === 0) {
        const committed = latchCommit(latchPrecommit(desk, "pass"), result.text);
        setLatchTrace(committed.trace);
        setLatchViolations(null);
        setLatchAnswer(result.text);
        setLatchBusy(false);
        return;
      }
      setLatchViolations(refusals);
      const refused = latchRefused(latchPrecommit(desk, "refused"), t(LATCH_FOLD_ANSWER_KEY));
      setLatchTrace(refused.trace);
      setLatchAnswer(t(LATCH_FOLD_ANSWER_KEY));
      setLatchBusy(false);
      return;
    }
    setLatchViolations(null);
    const offline = latchRefused(desk, t(LATCH_FOLD_ANSWER_KEY));
    setLatchTrace(offline.trace);
    setLatchAnswer(t(LATCH_FOLD_ANSWER_KEY));
    setLatchBusy(false);
  };

  // The dispatch: the model names ONE order id from the listed orders and says why in ONE sentence.
  const dispatchSystem = (): string =>
    withWorldBook(
      `${dispatchEnvelope(fold, rx)}\n\nCOMMANDMENT: you will read the orders above and pick EXACTLY ONE of them — name its id verbatim (rx.bounce, rx.depth, rx.deadEnd, rx.manualExit, rx.loop, rx.bounceDoor, rx.fatigue or rx.hold) and the single metric with its value from THAT order's own vars. ONE sentence. Keep it in the visitor's language. Never invent a number absent from the envelope above; never predict; if you claim a number, it must already exist in the envelope above.`,
    );

  const askDispatch = async () => {
    if (dispatchBusy) return;
    let desk = dispatchBuild(dispatchPreflight({ fold, locale, status: "preflight", trace: [], answer: "" }, rx));
    setDispatchTrace(desk.trace);
    setDispatchViolations(null);
    setDispatchAnswer("");
    setOrderedRx(null);
    if (!LLM_CONFIG.hasKey) { setDispatchAnswer(t("ops.dispatch.via.local")); return; }
    setDispatchBusy(true);
    const result = await callLlmStream(
      "The dispatch: which ONE order should ship first, and why — name the order id and its own metric value.",
      [],
      (d) => setDispatchAnswer((p) => p + d),
      { system: dispatchSystem() },
    );
    if (result.ok) {
      const refusals = verifyDispatchText(result.text, desk.fold, rx);
      if (refusals.length === 0) {
        const committed = dispatchCommit(dispatchPrecommit(desk, "pass"), result.text);
        setDispatchTrace(committed.trace);
        setDispatchViolations(null);
        setDispatchAnswer(result.text);
        const picked = result.text.match(/rx\.[a-zA-Z]+/);
        const known = picked && dispatchOrderIds(rx).includes(picked[0]) ? picked[0] : null;
        if (known !== null) setOrderedRx(known);
        setDispatchBusy(false);
        return;
      }
      setDispatchViolations(refusals);
      const refused = dispatchRefused(dispatchPrecommit(desk, "refused"), t(DISPATCH_FOLD_ANSWER_KEY));
      setDispatchTrace(refused.trace);
      setDispatchAnswer(t(DISPATCH_FOLD_ANSWER_KEY));
      setDispatchBusy(false);
      return;
    }
    setDispatchViolations(null);
    const offline = dispatchRefused(desk, t(DISPATCH_FOLD_ANSWER_KEY));
    setDispatchTrace(offline.trace);
    setDispatchAnswer(t(DISPATCH_FOLD_ANSWER_KEY));
    setDispatchBusy(false);
  };

  const rxBody = (r: Prescription): string => {
    switch (r.id) {
      case "rx.bounce": return t("ops.rx.bounce", { p: r.vars.p });
      case "rx.depth": return t("ops.rx.depth", { d: r.vars.d });
      case "rx.deadEnd": return t("ops.rx.deadEnd", { path: r.vars.path, n: r.vars.n, s: r.vars.s });
      case "rx.manualExit": return t("ops.rx.manualExit", { n: r.vars.n });
      case "rx.loop": return t("ops.rx.loop", { l: r.vars.l });
      case "rx.bounceDoor": return t("ops.rx.bounceDoor", { path: r.vars.path, p: r.vars.p });
      case "rx.fatigue": return t("ops.rx.fatigue", { s: r.vars.s });
      case "rx.hold": return t("ops.rx.hold");
      default: return t("ops.rx.hold");
    }
  };

  return (
    <div className="space-y-5 print:hidden">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-violet -right-14 -top-16 h-48 w-48 opacity-60" />
        <div aria-hidden className="fo-orb fo-orb-lime -left-14 bottom-0 h-40 w-40 opacity-60" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("ops.kicker")}</div>
          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("ops.title")}</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("ops.subtitle")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => { setCohort("device"); setOrderedRx(null); }} className={cn("rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-widest", cohort === "device" ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{t("ops.cohort.device")}</button>
            <button type="button" onClick={() => { setCohort("seeded"); setOrderedRx(null); }} className={cn("rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-widest", cohort === "seeded" ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{t("ops.cohort.synthetic")}</button>
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.cohort.noteFull")}</span>
          </div>
        </div>
      </header>

      {/* The six big numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-7">
        {[
          { label: t("ops.tiles.sessions"), value: String(fold.sessions) },
          { label: t("ops.tiles.visits"), value: String(fold.visits) },
          { label: t("ops.tiles.bounce"), value: `${fmt1(fold.bounceRate)}%` },
          { label: t("ops.tiles.depth"), value: fmt2(fold.avgDepth) },
          { label: t("ops.tiles.dwell"), value: `${dwellSec(fold.avgDwellMs)}s` },
          { label: t("ops.tiles.loop"), value: `${fmt1(fold.loopRate)}%` },
          { label: t("ops.tiles.deadEnds"), value: String(fold.deadEndSessions) },
        ].map((cell) => (
          <div key={cell.label} className={cn("rounded-xl border p-3 text-center", PANEL_CLASS.panelQuiet)}>
            <div className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text font-mono text-2xl font-black tabular-nums text-transparent">{cell.value}</div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">{cell.label}</div>
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] text-muted-foreground">{t("ops.sourceLine", { cohort: fold.cohort === "device" ? t("ops.cohort.device") : t("ops.cohort.synthetic"), bounce: fold.bounceSessions, sessions: fold.sessions, loops: fold.loopSessions })}</p>

      {/* The tide — a fourteen-day ascending/quiet/falling verdict on real visits, projected forward honestly */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.tide.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("ops.tide.title")}</p>
          </div>
          <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest", tide.cls === "rising" ? CHIP_CLASS.badgeInfoStrong : tide.cls === "falling" ? CHIP_CLASS.badgeWarning : CHIP_CLASS.muted)}>
            {t(`ops.tide.direction.${tide.cls}`)} · {signed1(tide.deltaPct)}%
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <svg role="img" aria-label={t("ops.tide.aria")} viewBox={`0 0 ${TIDE_W} ${TIDE_H}`} className="h-12 w-full max-w-md">
            <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" className="text-primary/70" points={tidePoints} />
          </svg>
          <dl className="grid grid-cols-3 gap-3 font-mono text-[10px] leading-snug">
            <div>
              <dt className="uppercase tracking-widest text-muted-foreground">{t("ops.tide.firstHalf")}</dt>
              <dd className="tabular-nums text-foreground">{fmt2(tide.firstHalfAvg)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-widest text-muted-foreground">{t("ops.tide.secondHalf")}</dt>
              <dd className="tabular-nums text-foreground">{fmt2(tide.secondHalfAvg)}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-widest text-muted-foreground">{t("ops.tide.dayCount")}</dt>
              <dd className="tabular-nums text-foreground">{tide.dayCount}d</dd>
            </div>
          </dl>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-foreground/90">{t(`ops.tide.recommendation.${tide.cls}`)}</p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.tide.forecast", { d: tide.dayCount, d1: tide.forecast[0], d2: tide.forecast[1], d3: tide.forecast[2] })}</p>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top routes by visits */}
        <Panel className="p-4">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.panel.routes")}</h2>
          <ul className="mt-2 space-y-1.5">
            {fold.perRoute.slice(0, 12).map((r) => {
              const max = fold.perRoute[0]?.visits || 1;
              return (
                <li key={r.path} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate font-mono text-[10px] text-muted-foreground">{r.path}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                    <div className={cn("h-full rounded", r.bounceShare >= HIGH_BOUNCE_SHARE ? BAR_FILL.low : BAR_FILL.good)} style={{ width: pctOf(r.visits, max) }} />
                  </div>
                  <span className="w-14 text-right font-mono tabular-nums">{r.visits} · {dwellSec(r.avgDwellMs)}s</span>
                </li>
              );
            })}
            {fold.perRoute.length === 0 ? <li className="text-xs text-muted-foreground">{t("ops.empty")}</li> : null}
          </ul>
        </Panel>

        {/* Where visitors leave */}
        <Panel className="p-4">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.panel.exits")}</h2>
          <ol className="mt-2 space-y-1.5">
            {fold.exits.map((e, i) => (
              <li key={e.path} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-center font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate font-mono text-[11px]">{e.path}</span>
                <span className="font-mono tabular-nums">{e.exits}×</span>
              </li>
            ))}
            {fold.exits.length === 0 ? <li className="text-xs text-muted-foreground">{t("ops.empty")}</li> : null}
          </ol>
          <h3 className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.panel.depth")}</h3>
          <div className="mt-1 grid grid-cols-4 gap-1.5">
            {fold.depthBuckets.map((n, i) => (
              <div key={i} className="rounded-md border p-2 text-center">
                <div className="font-mono text-lg font-black tabular-nums">{n}</div>
                <div className="text-[8px] uppercase tracking-widest text-muted-foreground">{t(`ops.depth.bucket${i}`)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* The prescription — deep optimization prescribed from the fold's own numbers */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.rx.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("ops.rx.title")}</p>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.rx.tag")}</div>
        </div>
        <ol className="mt-3 grid gap-2">
          {rx.map((r) => {
            const tone = r.severity === "now" ? CHIP_CLASS.badgeWarning : r.severity === "next" ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.muted;
            return (
              <li key={r.id} className={cn("flex flex-wrap items-start gap-3 rounded-lg p-3 text-xs", PANEL_CLASS.panelGhost)}>
                <span className={cn("mt-0.5 w-12 shrink-0 rounded-md border px-1.5 py-1 text-center font-mono text-[9px] font-bold uppercase tracking-widest", tone)}>{t(`ops.rx.severity.${r.severity}`)}</span>
                <span className="min-w-0 flex-1 leading-relaxed text-foreground/90">{rxBody(r)}</span>
                {orderedRx === r.id && (
                  <span className={cn("shrink-0 self-center rounded-md border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest", CHIP_CLASS.badgeSuccess)}>{t("ops.dispatch.orderedLabel")}</span>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* The consultation — the fold's own prescription, read aloud (model, fold-bound; refused otherwise) */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.consult.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("ops.consult.title")}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <button
              type="button"
              onClick={askConsult}
              disabled={consultBusy}
              className="fo-lift mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {consultBusy ? t("pressroom.answering") : t("ops.consult.ask")}
            </button>
            {consultAnswer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{consultAnswer}</p>}
            {consultViolations && consultViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">
                {consultViolations.map((v) => t(`ops.consult.violation.${v}`)).join(" · ")}
              </p>
            )}
            {consultTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.consult.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{consultTrace.some((e) => e.verdict === "refused") ? t("ops.consult.trace.refused") : t("ops.consult.trace.verified")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {consultTrace.map((entry) => (
                    <span
                      key={entry.stage}
                      title={t(`ops.consult.note.${entry.note}`)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                        entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                      )}
                    >
                      {t(`ops.consult.stage.${entry.stage}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("ops.consult.via.local")}</p>
        )}
      </Panel>

      {/* The analyst — the model reasons over this same fold (imprisoned to the envelope; refused otherwise) */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.analyst.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("ops.analyst.title")}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <button
              type="button"
              onClick={askAnalyst}
              disabled={analystBusy}
              className="fo-lift mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {analystBusy ? t("pressroom.answering") : t("ops.analyst.ask")}
            </button>
            {analystAnswer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{analystAnswer}</p>}
            {analystViolations && analystViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">
                {analystViolations.map((v) => t(`ops.analyst.violation.${v}`)).join(" · ")}
              </p>
            )}
            {analystTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.analyst.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{analystTrace.some((e) => e.verdict === "refused") ? t("ops.analyst.trace.refused") : t("ops.analyst.trace.verified")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analystTrace.map((entry) => (
                    <span
                      key={entry.stage}
                      title={t(`ops.analyst.note.${entry.note}`)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                        entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                      )}
                    >
                      {t(`ops.analyst.stage.${entry.stage}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("ops.analyst.via.local")}</p>
        )}
      </Panel>

      {/* The debrief — the operator's own month-end letter (imprisoned to the same fold) */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.debrief.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("ops.debrief.title")}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <button
              type="button"
              onClick={askDebrief}
              disabled={debriefBusy}
              className="fo-lift mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {debriefBusy ? t("pressroom.answering") : t("ops.debrief.ask")}
            </button>
            {debriefAnswer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{debriefAnswer}</p>}
            {debriefViolations && debriefViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">
                {debriefViolations.map((v) => t(`ops.debrief.violation.${v}`)).join(" · ")}
              </p>
            )}
            {debriefTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.debrief.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{debriefTrace.some((e) => e.verdict === "refused") ? t("ops.debrief.trace.refused") : t("ops.debrief.trace.verified")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {debriefTrace.map((entry) => (
                    <span
                      key={entry.stage}
                      title={t(`ops.debrief.note.${entry.note}`)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                        entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                      )}
                    >
                      {t(`ops.debrief.stage.${entry.stage}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("ops.debrief.via.local")}</p>
        )}
      </Panel>

      {/* The latch — one sentence, the single instruction this fold supports (imprisoned to the same envelope) */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.latch.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("ops.latch.title")}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <button
              type="button"
              onClick={askLatch}
              disabled={latchBusy}
              className="fo-lift mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {latchBusy ? t("pressroom.answering") : t("ops.latch.ask")}
            </button>
            {latchAnswer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{latchAnswer}</p>}
            {latchViolations && latchViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">
                {latchViolations.map((v) => t(`ops.latch.violation.${v}`)).join(" · ")}
              </p>
            )}
            {latchTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.latch.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{latchTrace.some((e) => e.verdict === "refused") ? t("ops.latch.trace.refused") : t("ops.latch.trace.verified")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {latchTrace.map((entry) => (
                    <span
                      key={entry.stage}
                      title={t(`ops.latch.note.${entry.note}`)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                        entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                      )}
                    >
                      {t(`ops.latch.stage.${entry.stage}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("ops.latch.via.local")}</p>
        )}
      </Panel>

      {/* The dispatch — the model names ONE order from the fold's own prescription, the fold inks it */}
      <Panel className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.dispatch.kicker")}</h2>
            <p className="mt-0.5 max-w-2xl text-[11px] leading-snug text-foreground/90">{t("ops.dispatch.title")}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest", LLM_CONFIG.hasKey ? CHIP_CLASS.badgeInfoStrong : CHIP_CLASS.warning)}>
            {LLM_CONFIG.hasKey && <span aria-hidden className="fo-live-dot inline-flex h-1.5 w-1.5 rounded-full bg-info" />}
            {LLM_CONFIG.hasKey ? t("ai.via.live", { model: LLM_CONFIG.model }) : t("ai.via.local")}
          </span>
        </div>
        {LLM_CONFIG.hasKey ? (
          <>
            <button
              type="button"
              onClick={askDispatch}
              disabled={dispatchBusy}
              className="fo-lift mt-3 inline-flex items-center rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
            >
              {dispatchBusy ? t("pressroom.answering") : t("ops.dispatch.ask")}
            </button>
            {dispatchAnswer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{dispatchAnswer}</p>}
            {dispatchViolations && dispatchViolations.length > 0 && (
              <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-warning">
                {dispatchViolations.map((v) => t(`ops.dispatch.violation.${v}`)).join(" · ")}
              </p>
            )}
            {dispatchTrace && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.dispatch.trace.label")}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{dispatchTrace.some((e) => e.verdict === "refused") ? t("ops.dispatch.trace.refused") : t("ops.dispatch.trace.verified")}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {dispatchTrace.map((entry) => (
                    <span
                      key={entry.stage}
                      title={t(`ops.dispatch.note.${entry.note}`)}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest",
                        entry.verdict === "pass" ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.badgeWarning,
                      )}
                    >
                      {t(`ops.dispatch.stage.${entry.stage}`)}
                    </span>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("ops.dispatch.ledgerNote")}</p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("ops.dispatch.via.local")}</p>
        )}
      </Panel>

      {/* 14-day rhythm */}
      <Panel className="p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.panel.trend")}</h2>
        <div className="mt-2 flex h-28 items-end gap-1">
          {fold.trend.map((d) => {
            const max = Math.max(1, ...fold.trend.map((x) => x.visits));
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t bg-info/80" style={{ height: `${(d.visits / max) * 88}%` }} title={formatDate(locale, d.day)} />
                <span className="text-[8px] text-muted-foreground">{d.day.slice(5)}</span>
              </div>
            );
          })}
          {fold.trend.length === 0 ? <span className="text-xs text-muted-foreground">{t("ops.empty")}</span> : null}
        </div>
      </Panel>

      {/* The model's ledger */}
      <Panel className="p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.econ.title")}</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {[
            { label: t("ops.econ.cold"), value: t("ops.econ.coldValue") },
            { label: t("ops.econ.warm"), value: t("ops.econ.warmValue") },
            { label: t("ops.econ.cached"), value: t("ops.econ.cachedValue") },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border p-3 text-center">
              <div className="font-mono text-xl font-black tabular-nums">{c.value}</div>
              <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">{t("ops.econ.body")}</p>
      </Panel>

      <p className="text-center text-[10px] text-muted-foreground">{t("ops.footnoteDevice")}</p>
    </div>
  );
}
