// M1154 · The Live Wire — seven top European leagues, wired in honestly.
// CI re-cuts public/live-wire.json weekly (Sun 05:00 UTC) from OpenFootball's CC0 fixture files.
// The frozen seeded world is a different universe on purpose; this wire walks the real one.

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { Panel, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, SEPARATOR, signed } from "@/lib/utils";
import { fetchLiveWire, type LiveWireLeague, type LiveWirePayload, type LiveWireZone, type WireStatus } from "@/data/liveWire";
import { callLlmStream, LLM_CONFIG, type BriefStatus } from "@/data/llm";
import { wireBriefFacts } from "@/domain/wireBrief";
import { retrieveAsk, type WireAskId } from "@/domain/wireRag";
import { ZapIcon } from "lucide-react";
import type { Locale } from "@/i18n/dictionaries";

// Module-local chip classes — the league rail and the ask desk share one chip pair,
// written once here so neither panel can drift away from the other.
const CHIP_ACTIVE = "border-primary/60 bg-primary/10 text-primary";
const CHIP_IDLE = "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground";

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

const LANG_NAME: Record<Locale, string> = {
  en: "English",
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
};

// The system prompt is grounded only in the selected league's committed artifact; the model is forbidden inventions.
const buildWireSystem = (l: LiveWireLeague, generatedAt: string, locale: Locale) => [
  `You narrate the real ${l.league} ${l.season} from ONE JSON artifact.`,
  `It carries the season as committed on ${generatedAt.slice(0, 10)} by OpenFootball (CC0).`,
  "Answer ONLY from the fold below. Never invent a club, result, date or player; never estimate a number.",
  "If the wire does not carry the answer, say exactly that.",
  `Answer in ${LANG_NAME[locale]}. Plain prose, at most 180 words. No lists.`,
  "FOLD:",
  JSON.stringify({
    league: l.league,
    season: l.season,
    played: l.playedFixtures,
    total: l.totalFixtures,
    table: l.table.map((r) => [r.pos, r.team, r.pts, r.gd, r.form.join("")]),
    recent: l.recent.map((m) => [m.round, m.date, `${m.home} ${m.ft.join("-")} ${m.away}`]),
  }),
].join("\n");

// M1163 · Ask the Wire — three one-tap questions the armed model answers from the committed fold.
// Each preset is designed so every number the reader needs is inside the artifact; nothing outside
// it crosses the wire. Without a key or with a network blip, the fold-wire briefing lands as usual —
// never a silent swap, never invented words.
interface WireAsk {
  id: WireAskId;
  /** the user message sent to the model — written for the fold, not the imagination */
  ask: string;
}

const WIRE_ASKS: readonly WireAsk[] = [
  { id: "nextRound", ask: "Tell the reader what every league plays next — one league per paragraph — and why that fixture matters in the standings you see." },
  { id: "titleChase", ask: "For every league in the file, name the first and second-place clubs, their points, and the one thing the file is NOT willing to say yet — the open question in that race." },
  { id: "wonderTable", ask: "Tell the reader which of these clubs — across all seven leagues — has the strangest profile as the season stands. Use the numbers you see; do not invent a narrative the file cannot carry." },
];

// The system the model is imprisoned to: the committed fold beneath the reader's eyes,
// plus the no-invention clause. The ask string carries the reader's question.
const wireAskSystem = (p: LiveWirePayload, ask: WireAsk, locale: Locale): string => {
  // M1166 · each preset retrieves only the artifact rows it can honestly answer from — never the same digest twice.
  const fold = JSON.stringify(retrieveAsk(p, ask.id));
  return [
    "You answer ONLY from the fold below. Never invent a match, club or result not in it; never estimate anything.",
    `Answer in ${LANG_NAME[locale]}. Plain prose, no lists, at most 180 words.`,
    "If the file cannot prove what the reader asks, say exactly that and stop.",
    "FOLD:",
    fold,
    `ASK: ${ask.ask}`,
  ].join("\n");
};

export function LiveWire() {
  const { t, locale } = useI18n();
  const [payload, setPayload] = useState<LiveWirePayload | null>(null);
  const [status, setStatus] = useState<WireStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [leagueId, setLeagueId] = useState("de.1");
  const [brief, setBrief] = useState<{ status: BriefStatus; text: string; error?: string }>({ status: "idle", text: "" });
  const [askId, setAskId] = useState<WireAskId | null>(null);

  const league: LiveWireLeague | null =
    payload?.leagues.find((l) => l.id === leagueId) ?? payload?.leagues[0] ?? null;

  const askBrief = () => {
    if (!payload || !league || brief.status === "streaming") return;
    const facts = wireBriefFacts(league);
    if (!LLM_CONFIG.hasKey) {
      setBrief({ status: "fold", text: foldLines(facts, t, league) });
      return;
    }
    setBrief({ status: "streaming", text: "" });
    callLlmStream(
      "Give me the wireside brief.",
      [],
      (delta) => setBrief((s) => (s.status === "streaming" ? { ...s, text: s.text + delta } : s)),
      { system: buildWireSystem(league, payload.generated_at, locale) },
    ).then((r) => {
      if (r.ok) setBrief({ status: "ready", text: r.text });
      else setBrief({ status: "fold", text: foldLines(facts, t, league), error: r.error });
    });
  };

  const askWire = (id: WireAskId) => {
    if (!payload || !league || brief.status === "streaming") return;
    const ws = WIRE_ASKS.find((w) => w.id === id);
    if (!ws) return;
    if (!LLM_CONFIG.hasKey) {
      setBrief({ status: "fold", text: foldLines(wireBriefFacts(league), t, league) });
      setAskId(id);
      return;
    }
    setBrief({ status: "streaming", text: "" });
    setAskId(id);
    callLlmStream(
      ws.ask,
      [],
      (delta) => setBrief((s) => (s.status === "streaming" ? { ...s, text: s.text + delta } : s)),
      { system: wireAskSystem(payload, ws, locale) },
    ).then((r) => {
      if (r.ok) setBrief({ status: "ready", text: r.text });
      else setBrief({ status: "fold", text: foldLines(wireBriefFacts(league), t, league), error: r.error });
    });
  };

  const foldLines = (facts: ReturnType<typeof wireBriefFacts>, tr: typeof t, l: LiveWireLeague): string => {
    if (!facts) return "";
    return [
      tr("liveWire.fold.s1", { played: facts.played, total: facts.total, league: l.league }),
      tr("liveWire.fold.s2", { leader: facts.leader, pts: facts.leaderPts, gd: facts.leaderGd, second: facts.second, gap: facts.secondGap }),
      tr("liveWire.fold.s3", { home: facts.recentHome, ft: facts.recentFt, away: facts.recentAway, md: facts.md }),
      tr("liveWire.fold.s4"),
    ].join("\n");
  };

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchLiveWire()
      .then((p) => { if (!cancelled) { setPayload(p); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt]);

  const generatedAt = payload?.generated_at ?? "";
  const hasPlayoff = league?.table.some((r) => r.zone === "playoff") ?? false;

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
            {league ? (
              <span className={cn("rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest", CHIP_CLASS.badgePrimary)}>{league.season}</span>
            ) : null}
          </div>
        </div>

        {payload && league ? (
          <div role="tablist" aria-label={t("liveWire.leagues")} className="relative mt-4 flex flex-wrap gap-1.5">
            {payload.leagues.map((l) => (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={l.id === league.id}
                onClick={() => { setLeagueId(l.id); setBrief({ status: "idle", text: "" }); }}
                className={cn(
                  "rounded-md border px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  l.id === league.id ? CHIP_ACTIVE : CHIP_IDLE,
                )}
              >
                {l.league}
              </button>
            ))}
          </div>
        ) : null}
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

      {status === "ready" && payload && league ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <div className="font-mono tabular-nums">
              {league.playedFixtures}/{league.totalFixtures} {t("liveWire.playedCaption")}
              {" · "}
              {t("liveWire.asOf", { at: generatedAt.slice(0, 10) })}
            </div>
            <div>
              {league.league} · {payload.source.license}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel className="overflow-x-auto p-3 lg:col-span-2">
              <table className="w-full min-w-[18rem] border-collapse text-xs sm:min-w-[34rem]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">{t("common.club")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.p")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.w")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.d")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.l")}</th>
                    <th className="hidden px-2 py-2 text-right sm:table-cell">{t("fw.table.gf")}</th>
                    <th className="hidden px-2 py-2 text-right sm:table-cell">{t("fw.table.ga")}</th>
                    <th className="px-2 py-2 text-right">{t("fw.table.gd")}</th>
                    <th className="px-2 py-2 text-right">{t("data.th.pts")}</th>
                    <th className="px-2 py-2 text-left">{t("data.form")}</th>
                  </tr>
                </thead>
                <tbody>
                  {league.table.map((row) => (
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
                      <td className="hidden px-2 py-2 text-right font-mono tabular-nums sm:table-cell">{row.gf}</td>
                      <td className="hidden px-2 py-2 text-right font-mono tabular-nums sm:table-cell">{row.ga}</td>
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
                {hasPlayoff ? <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-warning" />{t("liveWire.zone.playoff")}</span> : null}
                <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full bg-destructive" />{t("liveWire.zone.relegation")}</span>
                <span className="ml-auto">{t("liveWire.formCaption")}</span>
              </div>
            </Panel>

            <div className="grid gap-4">
              <Panel className="p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("liveWire.recent")}</div>
                <ul className="mt-2 divide-y divide-border/60">
                  {league.recent.length === 0 ? (
                    <li className="py-3 text-xs text-muted-foreground">{t("liveWire.recentEmpty")}</li>
                  ) : league.recent.map((m, i) => {
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
                  {league.upcoming.length === 0 ? (
                    <li className="py-3 text-xs text-muted-foreground">{t("liveWire.upcomingEmpty")}</li>
                  ) : league.upcoming.map((m, i) => (
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

          <Panel className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("liveWire.brief.title")}</div>
                <p className="mt-0.5 max-w-xl text-[11px] text-muted-foreground">{t("liveWire.brief.disclose")}</p>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={askBrief} disabled={brief.status === "streaming"}>
                <ZapIcon className="h-3.5 w-3.5" aria-hidden /> {t("liveWire.brief.ask")}
              </Button>
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("liveWire.askDesk.kicker")}</span>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t("liveWire.askDesk.title")}</span>
              </div>
              <p className="mt-0.5 max-w-xl text-[9.5px] leading-relaxed text-muted-foreground">{t("liveWire.askDesk.subtitle")}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {WIRE_ASKS.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    disabled={brief.status === "streaming"}
                    onClick={() => askWire(w.id)}
                    aria-pressed={askId === w.id}
                    className={cn(
                      "rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-widest transition-colors",
                      askId === w.id ? CHIP_ACTIVE : CHIP_IDLE,
                    )}
                  >
                    {t(`liveWire.askDesk.${w.id}.kicker`)}
                  </button>
                ))}
              </div>
            </div>
            {brief.status !== "idle" ? (
              <div className="mt-3 border-t border-border pt-3 text-xs leading-relaxed">
                {brief.status === "streaming" ? (
                  <>
                    <span className="sr-only">{t("liveWire.brief.streaming")}</span>
                    {askId ? <span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-primary">{t(`liveWire.askDesk.${askId}.kicker`)}</span> : null}
                    <span className="whitespace-pre-wrap text-foreground">{brief.text}</span>
                    <span aria-hidden className="animate-pulse">▌</span>
                  </>
                ) : null}
                {brief.status === "ready" || brief.status === "fold" ? (
                  <>
                    {askId ? <span className="mb-1 block font-mono text-[9px] uppercase tracking-widest text-primary">{t(`liveWire.askDesk.${askId}.kicker`)}</span> : null}
                    {brief.status === "fold" ? (
                      <>
                        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-warning">{t("liveWire.fold.source")}</div>
                        {brief.error ? <div className="mb-2 font-mono text-[10px] text-muted-foreground">{t("liveWire.brief.error")} <span>{brief.error}</span></div> : null}
                      </>
                    ) : null}
                    <span className="whitespace-pre-wrap text-foreground">{brief.text}</span>
                    <div className="mt-2 text-right">
                      <Button size="sm" variant="ghost" onClick={askBrief}>{t("liveWire.brief.again")}</Button>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </Panel>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            {t("liveWire.method")}{" "}
            <a className="text-primary underline-offset-2 hover:underline" href={league.url} target="_blank" rel="noreferrer">{t("liveWire.sourceLink")}</a>
            <span className="ml-1 font-mono text-[9px] text-muted-foreground">{payload.source.name} · {league.file}</span>
          </p>
        </>
      ) : null}
    </div>
  );
}
