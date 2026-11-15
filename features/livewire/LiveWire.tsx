// M1152 · The Live Wire — the real Bundesliga, wired in honestly.
// CI re-cuts public/live-wire.json weekly from OpenFootball's CC0 fixture file; this screen renders
// exactly what the file carries. The frozen seeded world is a different universe on purpose — the two never mix.

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, SEPARATOR, signed } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type LiveWireZone } from "@/data/liveWire";

const ZONE_DOT: Record<NonNullable<LiveWireZone>, string> = {
  ucl: "bg-success",
  europa: "bg-info",
  playoff: "bg-warning",
  relegation: "bg-destructive",
};

const FORM_CLASS: Record<string, string> = {
  W: CHIP_CLASS.success,
  D: CHIP_CLASS.mutedSoft,
  L: CHIP_CLASS.destructive,
};

export function LiveWire() {
  const { t } = useI18n();
  const [payload, setPayload] = useState<LiveWirePayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchLiveWire()
      .then((p) => { if (!cancelled) { setPayload(p); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt]);

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-cyan -right-16 -top-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -bottom-14 h-52 w-52 opacity-70" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
              <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("liveWire.kicker")}</div>
            </div>
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("liveWire.title")}</h1>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("liveWire.subtitle")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={cn("rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest", CHIP_CLASS.badgeSuccess)}>{t("liveWire.live")}</span>
            {payload ? (
              <span className={cn("rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest", CHIP_CLASS.badgePrimary)}>{payload.season}</span>
            ) : null}
          </div>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3" aria-label={t("liveWire.loading")}>
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : null}

      {status === "error" ? (
        <Panel className="p-6 text-center">
          <div className="text-sm font-semibold text-warning">{t("liveWire.errorTitle")}</div>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{t("liveWire.errorBody")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
            {t("liveWire.retry")}
          </Button>
        </Panel>
      ) : null}

      {status === "ready" && payload ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <div className="font-mono tabular-nums">
              {payload.playedFixtures}/{payload.totalFixtures} {t("liveWire.playedCaption")}
              {" · "}
              {t("liveWire.asOf", { at: payload.generated_at.slice(0, 10) })}
            </div>
            <div>
              {payload.league} · {payload.source.license}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="overflow-x-auto p-3 lg:col-span-2">
              <table className="w-full min-w-[34rem] border-collapse text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">{t("common.club")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.p")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.w")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.d")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.l")}</th>
                    <th className="px-2 py-2 text-right">{t("fw.table.gf")}</th>
                    <th className="px-2 py-2 text-right">{t("fw.table.ga")}</th>
                    <th className="px-2 py-2 text-right">{t("fw.table.gd")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.pts")}</th>
                    <th className="px-2 py-2 text-left">{t("data.form")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.table.map((row) => (
                    <tr key={row.team} className="border-t border-border/60">
                      <td className="px-2 py-2 font-mono tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          {row.zone ? <span aria-hidden className={cn("h-2 w-2 rounded-full", ZONE_DOT[row.zone])} /> : <span aria-hidden className="h-2 w-2 rounded-full bg-transparent" />}
                          {row.pos}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-medium">{row.team}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{row.played}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{row.won}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{row.drawn}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{row.lost}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{row.gf}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{row.ga}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{signed(row.gd)}</td>
                      <td className="px-2 py-2 text-right font-mono font-bold tabular-nums text-foreground">{row.pts}</td>
                      <td className="px-2 py-2">
                        <span className="inline-flex gap-1">
                          {row.form.map((letter, i) => (
                            <span key={i} className={cn("inline-flex h-5 w-5 items-center justify-center rounded border text-[9px] font-bold", FORM_CLASS[letter] ?? FORM_CLASS.D)}>{letter}</span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={cn(CHIP_CLASS.muted, "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-[10px]")}>
                <span className="uppercase tracking-widest">{t("liveWire.zoneGuide")}</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-success" />{t("liveWire.zone.ucl")}</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-info" />{t("liveWire.zone.europa")}</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-warning" />{t("liveWire.zone.playoff")}</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-destructive" />{t("liveWire.zone.relegation")}</span>
                <span className="ml-auto">{t("liveWire.formCaption")}</span>
              </div>
            </Panel>

            <div className="grid gap-4">
              <Panel className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("liveWire.recent")}</div>
                <ul className="mt-2 divide-y divide-border/60">
                  {payload.recent.length === 0 ? (
                    <li className="py-3 text-xs text-muted-foreground">{t("liveWire.recentEmpty")}</li>
                  ) : payload.recent.map((m, i) => {
                    const homeWins = m.ft[0] > m.ft[1];
                    const awayWins = m.ft[1] > m.ft[0];
                    return (
                      <li key={`${m.date}-${i}`} className="py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <time dateTime={m.date} className="w-12 shrink-0 font-mono text-[10px] text-muted-foreground">{m.date.slice(5)}</time>
                          <span className={cn("min-w-0 flex-1 truncate text-right", homeWins ? "font-semibold text-foreground" : "text-muted-foreground")}>{m.home}</span>
                          <span className="shrink-0 font-mono font-bold tabular-nums text-foreground">{m.ft[0]}{SEPARATOR}{m.ft[1]}</span>
                          <span className={cn("min-w-0 flex-1 truncate", awayWins ? "font-semibold text-foreground" : "text-muted-foreground")}>{m.away}</span>
                        </div>
                        {m.ht ? (
                          <div className="mt-0.5 text-right font-mono text-[9px] text-muted-foreground">{`ht ${m.ht[0]}${SEPARATOR}${m.ht[1]}`}</div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </Panel>

              <Panel className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("liveWire.upcoming")}</div>
                <ul className="mt-2 divide-y divide-border/60">
                  {payload.upcoming.length === 0 ? (
                    <li className="py-3 text-xs text-muted-foreground">{t("liveWire.upcomingEmpty")}</li>
                  ) : payload.upcoming.map((m, i) => (
                    <li key={`${m.date}-${i}`} className="py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <time dateTime={m.date} className="font-mono text-[10px] text-muted-foreground">{m.date.slice(5)}{m.time ? ` · ${m.time}` : ""}</time>
                        <span className="font-mono text-[10px] uppercase text-primary">{m.round}</span>
                      </div>
                      <div className="mt-0.5 truncate text-muted-foreground"><span className="text-foreground">{m.home}</span> {t("common.vs")} <span className="text-foreground">{m.away}</span></div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            {t("liveWire.method")}{" "}
            <a className="text-primary underline-offset-2 hover:underline" href={payload.source.url} target="_blank" rel="noreferrer">{t("liveWire.sourceLink")}</a>
            <span className="ml-1 font-mono text-[9px] text-muted-foreground">{payload.source.name} · {payload.source.file}</span>
          </p>
        </>
      ) : null}
    </div>
  );
}
