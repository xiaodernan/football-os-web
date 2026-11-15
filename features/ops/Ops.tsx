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
import { browserStore, readJson } from "@/domain/localData";
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

  const advBounce = fold.bounceRate >= 55;
  const advDepth = fold.avgDepth < 2.5 && fold.sessions > 0;
  const advDeadEnd = fold.sessions > 0 && fold.deadEndSessions / fold.sessions >= 0.2;
  const advManualExit = (fold.exits.find((e) => e.path === "/manual")?.exits ?? 0) >= 3;

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {[
          { label: t("ops.tiles.sessions"), value: String(fold.sessions) },
          { label: t("ops.tiles.visits"), value: String(fold.visits) },
          { label: t("ops.tiles.bounce"), value: `${fmt1(fold.bounceRate)}%` },
          { label: t("ops.tiles.depth"), value: fmt2(fold.avgDepth) },
          { label: t("ops.tiles.dwell"), value: `${dwellSec(fold.avgDwellMs)}s` },
          { label: t("ops.tiles.loop"), value: `${fmt1(fold.loopRate)}%` },
        ].map((cell) => (
          <div key={cell.label} className={cn("rounded-xl border p-3 text-center", PANEL_CLASS.panelQuiet)}>
            <div className="fo-spectrum font-mono text-2xl font-black tabular-nums">{cell.value}</div>
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

      {/* What the numbers say */}
      <Panel className="p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("ops.panel.advice")}</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          {advBounce ? <li className="text-xs leading-relaxed text-foreground/90">{t("ops.adv.bounce", { p: fmt1(fold.bounceRate) })}</li> : null}
          {advDepth ? <li className="text-xs leading-relaxed text-foreground/90">{t("ops.adv.depth", { d: fmt2(fold.avgDepth) })}</li> : null}
          {advDeadEnd ? <li className="text-xs leading-relaxed text-foreground/90">{t("ops.adv.deadEnd", { n: fold.deadEndSessions, s: fold.sessions })}</li> : null}
          {advManualExit ? <li className="text-xs leading-relaxed text-foreground/90">{t("ops.adv.manual", { n: fold.exits.find((e) => e.path === "/manual")?.exits ?? 0 })}</li> : null}
          {!advBounce && !advDepth && !advDeadEnd && !advManualExit ? <li className="text-xs text-muted-foreground">{t("ops.adv.quiet")}</li> : null}
        </ul>
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
