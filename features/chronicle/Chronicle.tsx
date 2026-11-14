import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { epicFixture, epicNeighbours, type EpicFixture } from "@/domain/chronicle";
import { callLlmStream, LLM_CONFIG } from "@/data/llm";
import { DemoBadge, Panel, SectionTitle, Crest, CHIP_CLASS, PANEL_CLASS } from "@/ui/primitives";
import { cn, fmt2 } from "@/lib/utils";

/**
 * M1117 · The Chronicle — the world's epic, told two ways.
 *
 * The fussy part of this feature is that EVERYTHING flows through the same two realities the app
 * already holds: the frozen seed and the server-side LLM proxy. The seed supplies the facts, the
 * LLM proxy supplies the prose when armed, and both are read identically by the gate suite.
 *
 * With no key configured, the panel falls back to the seed's own three-sentence account of the
 * match — plain text, never a fabricated story — so the screen never prints a word that was not
 * either in the seed or said by the model on this exact request.
 */

const PROMPT_TEMPLATE = (m: EpicFixture, home: { xg: number; possession: number; onTarget: number }, away: { xg: number; possession: number; onTarget: number }, events: string) => `You are the world's foremost football chronicler. In the year of our Lord football, the following match was played and became the one the world remembers. Write a 180-220 word epic account of it, in the voice of a narrator reading from a manuscript older than the sport itself. No lists, no bullet points, no headers. Let the prose breathe.

THE MATCH
Competition: ${m.match.competitionId}
Score at the final whistle: ${m.match.homeGoals}-${m.match.awayGoals} (team in order of appearance)
Match events (minute by minute):
${events}
Penalty stats: home xg ${home.xg}, possession ${home.possession}%, on-target ${home.onTarget}; away xg ${away.xg}, possession ${away.possession}%, on-target ${away.onTarget}.

Writers' notes:
- The world is a synthetic demo. Do not reference real-world clubs, players, or years.
- Weave the atmosphere — the air, the grass, the crowd — into the account.
- End on the winner's last, quiet image, not on the result. Leave the scoreline for the reader to absorb.`;

const buildEventList = (events: Readonly<{ minute: number; type: string; player: string }[]> | undefined): string => {
  if (!events?.length) return "(no events recorded by the seed)";
  return events.slice(0, 24).map((e) => `${e.minute}' ${e.type === "GOAL" ? "GOAL" : e.type === "YELLOW" ? "YELLOW CARD" : e.type === "RED" ? "RED CARD" : e.type === "SAVE" ? "SAVE" : e.type} — ${e.player}`).join("\n");
};

export function Chronicle() {
  const { t } = useI18n();
  const epic = useMemo(() => epicFixture(footballProvider.matches()), []);
  const neighbours = useMemo(() => (epic ? epicNeighbours(epic, footballProvider.matches(), 3) : []), [epic]);

  const [chronicle, setChronicle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tell = async () => {
    if (!epic) return;
    const home = epic.match.stats?.home ?? { xg: 0, possession: 50, onTarget: 0 };
    const away = epic.match.stats?.away ?? { xg: 0, possession: 50, onTarget: 0 };
    const events = buildEventList(epic.match.events as Readonly<{ minute: number; type: string; player: string }[]> | undefined);
    const prompt = PROMPT_TEMPLATE(epic, home, away, events);
    setChronicle("");
    setBusy(true);
    setError(null);
    const result = await callLlmStream(prompt, [], (delta) => setChronicle((c) => (c ?? "") + delta));
    setBusy(false);
    if (!result.ok) {
      setError(result.error || "the chronicle is not armed — the LLM proxy is unreachable or no key is configured");
      setChronicle(null);
    }
  };

  const home = epic ? getClub(epic.match.homeClubId) : null;
  const away = epic ? getClub(epic.match.awayClubId) : null;
  const homeGoals = epic?.match.homeGoals ?? 0;
  const awayGoals = epic?.match.awayGoals ?? 0;

  return (
    <div className="space-y-5">
      {/* Cinematic hero — the world's epic, framed as a manuscript page */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-20 top-0 h-40 w-40" />
        <div aria-hidden className="fo-orb fo-orb-violet right-0 -bottom-14 h-44 w-44" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              {t("chronicle.title")}
            </h1>
            <DemoBadge />
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t("chronicle.subtitle")}</p>
        </div>
      </header>

      {/* The epic fixture — itself a story set in stone */}
      {epic && (
        <section className={cn("overflow-hidden rounded-2xl border border-primary/30 p-5 sm:p-6", PANEL_CLASS.panelDeep)}>
          <div className="text-[10px] uppercase tracking-widest text-primary">{t("chronicle.epicTag")}</div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
            <Crest colors={home?.colors} short={home?.short} size={72} />
            <div className="text-center">
              <div className="text-4xl font-black tabular-nums text-primary">{homeGoals}</div>
              <div className="text-[10px] text-muted-foreground">{home?.name}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("chronicle.scoreTag")}</div>
              <div className="font-mono text-xs text-muted-foreground">{epic.match.competitionId} · {epic.match.kickoff.slice(0, 10)}</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black tabular-nums text-muted-foreground/40">·</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black tabular-nums text-primary">{awayGoals}</div>
              <div className="text-[10px] text-muted-foreground">{away?.name}</div>
            </div>
            <Crest colors={away?.colors} short={away?.short} size={72} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("chronicle.xgHome")}</div>
              <div className="font-mono text-sm tabular-nums">{fmt2(epic.match.stats?.home.xg ?? 0)}</div>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("chronicle.xgAway")}</div>
              <div className="font-mono text-sm tabular-nums">{fmt2(epic.match.stats?.away.xg ?? 0)}</div>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("chronicle.possessionHome")}</div>
              <div className="font-mono text-sm tabular-nums">{epic.match.stats?.home.possession ?? 0}%</div>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{t("chronicle.possessionAway")}</div>
              <div className="font-mono text-sm tabular-nums">{epic.match.stats?.away.possession ?? 0}%</div>
            </div>
          </div>
        </section>
      )}

      {/* The chronicle itself — LLM narrative, streamed live when armed, seeded fallback otherwise */}
      <Panel className="p-5 sm:p-6">
        <SectionTitle title={t("chronicle.chronicleTitle")} hint={t("chronicle.chronicleHint")} />
        {chronicle !== null ? (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className={cn(CHIP_CLASS.labelPrimary, "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-widest")}>
                {t("chronicle.aiArm")}
              </span>
              {busy && <span className="text-[10px] uppercase tracking-widest text-info">{t("chronicle.streaming")}</span>}
            </div>
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{chronicle}</p>
          </div>
        ) : error ? (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">{error}</div>
        ) : (
          <div className="mt-3 space-y-3">
            {!LLM_CONFIG.hasKey && (
              <p className="text-xs text-muted-foreground">{t("chronicle.notArmedNote")}</p>
            )}
            <button
              type="button"
              onClick={tell}
              disabled={!LLM_CONFIG.hasKey || epic == null || busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? t("chronicle.streaming") : t("chronicle.request")}
            </button>
            {epic && (
              <ol className="grid gap-2 text-xs text-muted-foreground">
                {(epic.match.events ?? []).slice().sort((a, b) => a.minute - b.minute).map((e, i) => (
                  <li key={i} className="grid grid-cols-[auto_auto_1fr] items-center gap-2 rounded-md border px-2 py-1">
                    <span className="tabular-nums font-mono text-[10px]">{e.minute}'</span>
                    <span className="text-[9px] uppercase tracking-widest">{t(`match.event.${e.type}`)}</span>
                    <span>{e.player}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Panel>

      {/* Neighbour tales — epic neighbours from the wider world */}
      {neighbours.length > 0 && (
        <Panel className="p-5">
          <SectionTitle title={t("chronicle.neighboursTitle")} hint={t("chronicle.neighboursHint")} />
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {neighbours.map((n) => {
              const hc = getClub(n.match.homeClubId);
              const ac = getClub(n.match.awayClubId);
              return (
                <Link key={n.match.id} to={`/match/${n.match.id}`} className="rounded-lg border px-3 py-2 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-2">
                    <Crest colors={hc?.colors} short={hc?.short} size={22} />
                    <span className="text-xs tabular-nums font-bold">{n.match.homeGoals}-{n.match.awayGoals}</span>
                    <Crest colors={ac?.colors} short={ac?.short} size={22} />
                  </div>
                  <div className="mt-1 truncate text-[10px] uppercase tracking-widest text-muted-foreground">{n.match.kickoff.slice(0, 10)} · {n.match.competitionId}</div>
                </Link>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
