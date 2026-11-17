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
import { fmt1, fmt2, pctOf } from "@/lib/utils";
import { foldPrescription, type Prescription } from "@/domain/prescription";
import { browserStore, readJson } from "@/domain/localData";
import { callLlmStream, LLM_CONFIG } from "@/data/llm";
import {
  createConsult, consultBuild, consultCommit, consultPrecommit,
  consultPreflight, consultRefused, verifyConsultText,
  type ConsultTraceEntry, type ConsultViolation,
} from "@/domain/consult";
import { DEEP_DIGEST } from "@/data/deepDigest";
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
    DEEP_DIGEST + "\n\n" + JSON.stringify({
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
    commandment: "Answer ONLY from THE DEEP DIGEST above and this fold JSON. Never invent a number, a route, a date or a cause that is not in here or the digest. If a claim has no anchor in the fold, omit the sentence. Answer in the visitor's language. Three tight sentences; no futurology.",
  });

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
            <button type="button" onClick={() => setCohort("device")} className={cn("rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-widest", cohort === "device" ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{t("ops.cohort.device")}</button>
            <button type="button" onClick={() => setCohort("seeded")} className={cn("rounded-md border px-2.5 py-1 text-[10px] uppercase tracking-widest", cohort === "seeded" ? CHIP_CLASS.optionOn : CHIP_CLASS.optionOff)}>{t("ops.cohort.synthetic")}</button>
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
