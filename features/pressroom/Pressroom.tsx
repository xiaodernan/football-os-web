import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useI18n, fmtDateTime } from "@/i18n";
import { footballProvider, getClub, fixtureForecast } from "@/data/footballService";
import { tomorrowChapter } from "@/domain/tomorrow";
import { pressRoom } from "@/domain/pressroom";
import { callLlmStream, LLM_CONFIG } from "@/data/llm";
import { DemoBadge, Panel, Crest, PANEL_CLASS } from "@/ui/primitives";
import { cn, fmt2, pct, SEPARATOR } from "@/lib/utils";

// The three questions the room will hear — module scope so the raw-UI scan sees no stray text,
// and so the tuple is the single home of the door union.
const PRESSROOM_DOORS = ["form", "profile", "nerve"] as const;
export type PressDoor = (typeof PRESSROOM_DOORS)[number];

/**
 * M1140 · The Press Room — tonight's fixture, three questions, two answers.
 * The house answers everything first: folds off the seed, honest numbers, no microphone.
 * The desk answers only when the viewer asks: a same-origin stream (the same /api/llm/chat
 * every live answer uses), armed only in the Railway deploy, empty honest room otherwise.
 */
export function Pressroom() {
  const { t, locale } = useI18n();
  const matches = useMemo(() => footballProvider.matches(), []);
  const clubs = useMemo(() => footballProvider.clubs(), []);
  const competitions = useMemo(() => footballProvider.competitions(), []);
  const chapter = useMemo(() => tomorrowChapter(matches, clubs), [matches, clubs]);
  const forecast = chapter ? fixtureForecast(chapter.match.id) : null;
  const room = useMemo(
    () => (chapter ? pressRoom(matches, clubs, chapter.match) : null),
    [matches, clubs, chapter],
  );
  const compName = (id: string) => competitions.find((c) => c.id === id)?.name ?? id;

  const [answers, setAnswers] = useState<Record<string, string>>({ form: "", profile: "", nerve: "" });
  const [streaming, setStreaming] = useState<string | null>(null);

  const askDesk = async (id: PressDoor) => {
    if (!chapter || streaming) return;
    const m = chapter.match;
    const comp = compName(room?.competitionId ?? m.competitionId);
    const home = getClub(m.homeClubId)?.name ?? m.homeClubId;
    const away = getClub(m.awayClubId)?.name ?? m.awayClubId;
    const fc = forecast;
    const questions = {
      form: `In the press room before ${home} v ${away} in ${comp}, a journalist asks for the story the tape tells about this pairing. Answer in two tight sentences, use only this data: home goals ${room?.form ? `${room.form.winsA}` : "?"} home wins, draws ${room?.form?.draws ?? "?"}, away wins ${room?.form?.winsB ?? "?"}; most likely ${fc?.mostLikelyScore ?? "?"}; total historic meetings ${room?.form?.meetings ?? "?"}.`,
      profile: `In the press room before ${home} v ${away}, a journalist asks who holds the edge where. Answer in two tight sentences, use only this data: ${home} attack ${fmt2(room?.profile.homeAttack ?? 1)}x league rate vs ${away} defence ${fmt2(room?.profile.awayDefence ?? 1)}x; home points per game ${room?.profile.homePpg ?? 0} vs away points per game ${room?.profile.awayPpg ?? 0}.`,
      nerve: `In the press room before ${home} v ${away}, a journalist asks what the bench fears most. Answer in two tight sentences, use only this data: expected total goals ${fc ? fmt2(fc.expectedTotalGoals) : "?"}, home win ${fc?.homePct ?? "?"}%, draw ${fc?.drawPct ?? "?"}%, away win ${fc?.awayPct ?? "?"}%, most likely score ${fc?.mostLikelyScore ?? "?"}.`,
    };
    if (!LLM_CONFIG.hasKey) {
      setAnswers((p) => ({ ...p, [id]: t("pressroom.via.local") }));
      return;
    }
    setStreaming(id);
    setAnswers((p) => ({ ...p, [id]: "" }));
    const result = await callLlmStream(questions[id], [], (delta) =>
      setAnswers((p) => ({ ...p, [id]: p[id] + delta })),
    );
    if (!result.ok) setAnswers((p) => ({ ...p, [id]: `[${result.error}]` }));
    setStreaming(null);
  };

  if (!chapter || !room) {
    return (
      <div className="space-y-5">
        <header className={cn("relative overflow-hidden rounded-2xl px-5 py-6", PANEL_CLASS.panelFaint)}>
          <div className="relative">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent">{t("pressroom.title")}</h1>
            <DemoBadge />
          </div>
        </header>
        <Panel className="p-6 text-center text-sm text-muted-foreground">{t("tomorrow.noSeed")}</Panel>
      </div>
    );
  }

  const home = getClub(room.homeClubId);
  const away = getClub(room.awayClubId);
  const pH = forecast ? pct(forecast.homePct) : 0;
  const pD = forecast ? pct(forecast.drawPct) : 0;
  const pA = forecast ? pct(forecast.awayPct) : 0;

  const doorMeta = {
    form: { kicker: "pressroom.qForm", house: t("pressroom.houseFormPart", { home: home?.name ?? room.homeClubId, away: away?.name ?? room.awayClubId, comp: compName(room.competitionId), score: forecast?.mostLikelyScore.replace("-", SEPARATOR) ?? "", meetings: room.form.meetings, winsA: room.form.winsA, draws: room.form.draws, winsB: room.form.winsB }) },
    profile: { kicker: "pressroom.qProfile", house: t("pressroom.houseProfilePart", { home: home?.name ?? room.homeClubId, away: away?.name ?? room.awayClubId, hAttack: fmt2(room.profile.homeAttack), aDefence: fmt2(room.profile.awayDefence), hPpg: room.profile.homePpg ?? 0, aPpg: room.profile.awayPpg ?? 0 }) },
    nerve: { kicker: "pressroom.qNerve", house: t("pressroom.houseNervePart", { goals: fmt2(forecast?.expectedTotalGoals ?? 2.5), hWin: pH, dWin: pD, aWin: pA, score: forecast?.mostLikelyScore.replace("-", SEPARATOR) ?? "" }) },
  } as const;

  return (
    <div className="space-y-5">
      {/* The hero — tonight's fixture, framed as a pre-match session */}
      <header className={cn("relative overflow-hidden rounded-2xl px-5 py-7", PANEL_CLASS.panelFaint)}>
        <div aria-hidden className="fo-orb fo-orb-lime -left-20 -top-20 h-48 w-48" />
        <div aria-hidden className="fo-orb fo-orb-violet -right-16 -bottom-16 h-48 w-48" />
        <div aria-hidden className="fo-grid absolute inset-0 opacity-40" />
        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary">
            <span>{t("pressroom.kicker")}</span>
            <DemoBadge />
          </div>
          <h1 className="fo-spectrum mt-2 bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-6xl">
            {t("pressroom.title")}
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-xs text-muted-foreground">{t("pressroom.subtitle")}</p>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>{compName(room.competitionId)}</span>
            <span aria-hidden>·</span>
            <span>{fmtDateTime(locale, room.kickoff)}</span>
          </div>
          <div className="mt-5 flex items-center justify-center gap-5">
            <Crest colors={home?.colors} short={home?.short} size={76} />
            <div className="text-3xl font-black text-muted-foreground">{SEPARATOR}</div>
            <Crest colors={away?.colors} short={away?.short} size={76} />
          </div>
          <div className="mt-3 text-base font-bold sm:text-xl">
            {home?.name ?? room.homeClubId} <span className="text-muted-foreground">{SEPARATOR}</span> {away?.name ?? room.awayClubId}
          </div>
        </div>
      </header>

      {/* The three doors: the house answers first with the seed's own numbers */}
      <div className="grid gap-4">
        {PRESSROOM_DOORS.map((id) => {
          const d = doorMeta[id];
          const live = answers[id];
          const busy = streaming === id;
          return (
            <section key={id} className={cn("rounded-2xl border p-5 md:p-6", PANEL_CLASS.panelDeep)}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h2 className="text-sm font-bold sm:text-base">{t(d.kicker)}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground"><span className="text-[9px] uppercase tracking-widest">{t("pressroom.houseAnswer")}</span><br />{d.house}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { void askDesk(id); }}
                  className="fo-lift shrink-0 rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {busy ? t("pressroom.answering") : LLM_CONFIG.hasKey ? t("pressroom.askTheDesk") : t("pressroom.via.localShort")}
                </button>
              </div>
              {live && <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">{live}</p>}
              {busy && <p className="mt-2 text-[10px] uppercase tracking-widest text-primary fo-live-dot">{t("pressroom.answering")}</p>}
            </section>
          );
        })}
      </div>

      {/* honesty footer — the seed decides tomorrow's own story */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/tomorrow" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted">
          {t("tomorrow.openFixture")}
        </Link>
        <p className="max-w-md text-center text-[10px] leading-relaxed text-muted-foreground">{t("pressroom.method")}</p>
      </div>
    </div>
  );
}
