// M1169 · The Grand Dispatch — seven leagues, one honest Thursday.
// A button, not a cron: the ask is dispatched on demand, the model is imprisoned to the committed
// CC0 artifact, and the fallback is a deterministic fold that writes exactly one paragraph per
// league. Zero invented clubs, players, scores or dates — drawn or omitted, never estimated.
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import { PANEL_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fetchLiveWire, type LiveWirePayload, type WireStatus, type LiveWireLeague } from "@/data/liveWire";
import { callLlmStream, LLM_CONFIG, type BriefStatus } from "@/data/llm";
import { sum } from "@/domain/attributes";
import { Newspaper, PrinterIcon } from "lucide-react";

const LANG_NAME: Record<string, string> = { en: "English", "zh-CN": "Simplified Chinese", "zh-TW": "Traditional Chinese" };

const buildSystem = (payload: LiveWirePayload, locale: string): string => {
  const lang = LANG_NAME[locale] ?? "English";
  const fold = JSON.stringify({
    leagues: payload.leagues.map((l: LiveWireLeague) => ({
      league: l.league,
      season: l.season,
      played: l.playedFixtures,
      total: l.totalFixtures,
      top: l.table.slice(0, 3).map((r) => [r.pos, r.team, r.pts, r.gd, r.form.join("")]),
      formLeaders: [...l.table]
        .sort((a, b) => sum(b.form, (f) => (f === "W" ? 1 : 0)) - sum(a.form, (f) => (f === "W" ? 1 : 0)))
        .slice(0, 2)
        .map((r) => [r.team, r.form.join("")]),
    })),
    totalFixtures: sum(payload.leagues, (l) => l.totalFixtures),
  });
  return [
    "You write a football dispatch for a season of the seven real European leagues, from ONLY the fold below.",
    "Never invent a club, player, score or date that the fold does not carry; never estimate anything that is not in the numbers.",
    `Write in ${lang}. One paragraph per league, three sentences each. Plain prose, no lists, no headings inside the body.`,
    "For each league name the leader, the chase, and the strangest fold-fact you find in these rows. If the fold cannot support a sentence, omit the sentence.",
    "FOLD:",
    fold,
  ].join("\n");
};

const buildFallback = (payload: LiveWirePayload, t: (k: string, v?: Record<string, string | number>) => string): string =>
  payload.leagues.map((l) => {
    const leader = l.table[0];
    const second = l.table[1];
    return t("grandDispatch.par", { league: l.league, leader: leader?.team ?? "-", pts: leader?.pts ?? 0, second: second?.team ?? "-", secondPts: second?.pts ?? 0, played: l.playedFixtures, total: l.totalFixtures });
  }).join("\n\n");

export function GrandDispatch() {
  const { t, locale } = useI18n();
  const [payload, setPayload] = useState<LiveWirePayload | null>(null);
  const [status, setStatus] = useState<WireStatus>("loading");
  const [attempt, setAttempt] = useState(0);
  const [brief, setBrief] = useState<{ status: BriefStatus; text: string; error?: string }>({ status: "idle", text: "" });

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchLiveWire()
      .then((p) => { if (!cancelled) { setPayload(p); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [attempt]);

  const ask = () => {
    if (!payload || brief.status === "streaming") return;
    if (!LLM_CONFIG.hasKey) {
      setBrief({ status: "fold", text: buildFallback(payload, t) });
      return;
    }
    setBrief({ status: "streaming", text: "" });
    callLlmStream(
      "Write the season dispatch.",
      [],
      (delta) => setBrief((s) => (s.status === "streaming" ? { ...s, text: s.text + delta } : s)),
      { system: buildSystem(payload, locale) },
    ).then((r) => {
      if (r.ok) setBrief({ status: "ready", text: r.text });
      else setBrief({ status: "fold", text: buildFallback(payload, t), error: r.error });
    });
  };

  return (
    <div className="space-y-5">
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6 print:block", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-amber -right-16 -top-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-orb fo-orb-lime -left-16 -bottom-14 h-52 w-52 opacity-70 print:hidden" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40 print:hidden" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-primary">{t("grandDispatch.kicker")}</div>
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent print:text-black sm:text-5xl">{t("grandDispatch.title")}</h1>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground print:text-black">{t("grandDispatch.subtitle")}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
            <Button size="sm" variant="outline" onClick={() => window.print()} aria-label={t("grandDispatch.printHint")}>
              <PrinterIcon className="h-3.5 w-3.5" aria-hidden /> {t("grandDispatch.print")}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={ask} disabled={brief.status === "streaming"} aria-label={t("grandDispatch.askHint")}>
              <Newspaper className="h-3.5 w-3.5" aria-hidden /> {t("grandDispatch.ask")}
            </Button>
          </div>
        </div>
      </header>

      {status === "loading" ? (
        <div className="grid gap-3" aria-label={t("grandDispatch.title")}>{[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}</div>
      ) : null}

      {status === "error" ? (
        <div className="p-6 text-center">
          <div className="text-sm font-semibold text-warning">{t("liveWire.errorTitle")}</div>
          <p className="mx-auto mt-2 max-w-md text-xs text-muted-foreground">{t("liveWire.errorBody")}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
            {t("liveWire.retry")}
          </Button>
        </div>
      ) : null}

      {status === "ready" && brief.status === "idle" ? (
        <div className="rounded-xl border border-border/60 p-5 print:block">
          <div className="font-mono text-[10px] uppercase tracking-widest text-primary">{t("grandDispatch.awaiting")}</div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">{t("grandDispatch.awaitingBody")}</p>
        </div>
      ) : null}

      {brief.status !== "idle" ? (
        <article className={cn("rounded-2xl p-6 print:break-inside-avoid", PANEL_CLASS.panelGhost)}>
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3 print:border-black">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{t("grandDispatch.tag")}</div>
            {brief.status === "streaming" ? <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden /> : null}
          </div>
          {brief.status === "fold" ? <div className="mt-3 font-mono text-[9px] uppercase tracking-widest text-warning">{t("grandDispatch.foldBadge")}</div> : null}
          {brief.error ? <div className="mt-1 font-mono text-[9px] text-muted-foreground">{t("liveWire.brief.error")} <span>{brief.error}</span></div> : null}
          <div className="prose-xl mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground print:text-black">{brief.text}{brief.status === "streaming" ? <span aria-hidden className="animate-pulse">▌</span> : null}</div>
          {brief.status === "ready" ? <div className="mt-4 border-t border-border pt-2 font-mono text-[9px] uppercase tracking-widest text-foreground/60 print:border-black/30">{t("grandDispatch.method")}</div> : null}
        </article>
      ) : null}

      {brief.status === "fold" ? <div className="h-0" /> : null}
    </div>
  );
}
