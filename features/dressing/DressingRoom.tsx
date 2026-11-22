import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { footballProvider, getClub } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import { upcomingMatchesForClub } from "@/data/footballService";
import {
  createDressing, dressingBuild, dressingCommit, dressingPrecommit, dressingPreflight, dressingRefused,
  foldBrief, opponentRecord, parseDressingBrief, verifyDressingText,
  type DressingTraceEntry, type DressingViolation, type OpponentRecord,
} from "@/domain/dressingRoom";
import { callLlmStream, LLM_CONFIG, withWorldBook } from "@/data/llm";
import { ABSENT } from "@/lib/utils";
import { Panel, SectionTitle, DemoBadge, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalStorage } from "@/lib/hooks";
import { DRESSING_KEY } from "@/domain/localData";

// M1242 · The Dressing Room — door 20, the one that briefs the next match. The desk takes the
// OPPONENT's own demonstrated season — their record, their form, their best player — and the model
// briefs the dressing room on it. Every numeral is proved against that record; a refusal walks to
// the fold's own deterministic briefing. The model may describe what the opponent has done; it
// may not predict the match.
export function DressingRoom() {
  const { t, locale } = useI18n();
  const { state } = useOs();
  const [busy, setBusy] = useState(false);
  const [trace, setTrace] = useState<readonly DressingTraceEntry[] | null>(null);
  const [violations, setViolations] = useState<readonly DressingViolation[] | null>(null);
  const [answer, setAnswer] = useState("");
  const [saved, setSaved] = useLocalStorage<string>(DRESSING_KEY, "");

  // The opponent: the next fixture's away side for the visitor's club — deterministic, no RNG.
  const opponent = useMemo<OpponentRecord | null>(() => {
    const clubId = state.profile?.favoriteClubId ?? "ars";
    const next = upcomingMatchesForClub(clubId, 1)[0];
    if (!next) return null;
    const oppId = next.homeClubId === clubId ? next.awayClubId : next.homeClubId;
    const club = getClub(oppId);
    if (!club) return null;
    return opponentRecord(oppId, club.name, footballProvider.matches(), footballProvider.players());
  }, [state.profile?.favoriteClubId]);

  const fold = useMemo(() => (opponent ? foldBrief(opponent) : null), [opponent]);

  const ask = async () => {
    if (busy || !opponent) return;
    const desk0 = createDressing(opponent, locale);
    let desk = dressingBuild(dressingPreflight(desk0));
    setTrace(desk.trace);
    setViolations(null);
    setAnswer("");
    if (desk.status !== "build" || !LLM_CONFIG.hasKey) {
      const refused = dressingRefused(desk, t("dress.via.local"));
      setTrace(refused.trace);
      setAnswer(t("dress.via.local"));
      return;
    }
    setBusy(true);
    const system = withWorldBook(JSON.stringify({
      opponent: {
        id: opponent.clubId, club: opponent.clubName,
        record: { played: opponent.played, won: opponent.won, drawn: opponent.drawn, lost: opponent.lost, gf: opponent.gf, ga: opponent.ga, points: opponent.points },
        form: opponent.form.join(""),
        bestPlayer: { name: opponent.bestPlayer, overall: opponent.bestOverall },
      },
      commandment:
        "You are the assistant coach writing the dressing-room briefing on THIS opponent and nothing else. " +
        "Your FIRST line must be exactly: BRIEF:<id> with the id from THE OPPONENT above. " +
        "Then 3-6 tight sentences in the visitor's language: their record, their recent form, and the danger their best player carries. " +
        "Every numeral you write MUST appear in THE OPPONENT above (the record, the overall) or in the world book. " +
        "Describe only what they have ALREADY done — never predict the coming match, never use a future tense about it.",
    }));
    const result = await callLlmStream(t("dress.prompt"), [], (d) => setAnswer((p) => p + d), { system });
    setBusy(false);
    if (!result.ok) {
      const refused = dressingRefused(desk, t("dress.via.local"));
      setTrace(refused.trace);
      setAnswer(t("dress.via.local"));
      return;
    }
    const parsed = parseDressingBrief(result.text, opponent);
    const lawBreaks = verifyDressingText(result.text, opponent);
    if (parsed.ok && lawBreaks.length === 0) {
      const committed = dressingCommit(dressingPrecommit(desk, "pass"), result.text);
      setTrace(committed.trace);
      setAnswer(result.text);
      setSaved(`${opponent.clubName} · ${result.text.split("\n")[0]}`);
      return;
    }
    setViolations([...parsed.violations, ...lawBreaks]);
    const refused = dressingRefused(dressingPrecommit(desk, "refused"), result.text);
    setTrace(refused.trace);
    setAnswer(t("dress.via.local"));
  };

  if (!opponent || !fold) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{t("dress.title")}</h1>
              <DemoBadge />
            </div>
            <p className="text-xs text-muted-foreground">{t("dress.subtitle")}</p>
          </div>
        </div>
        <Panel className="p-4"><p className="text-sm text-muted-foreground">{t("dress.noOpponent")}</p></Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{t("dress.title")}</h1>
            <DemoBadge />
          </div>
          <p className="text-xs text-muted-foreground">{t("dress.subtitle")}</p>
        </div>
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("dress.opponentTitle", { club: opponent.clubName })} hint={t("dress.opponentHint")} />
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <StatTile label={t("dress.tileRecord")} value={`${fold.won}-${fold.drawn}-${fold.lost}`} sub={t("dress.playedN", { n: fold.played })} />
          <StatTile label={t("dress.tileGoals")} value={`${fold.gf}:${fold.ga}`} sub={t("dress.pointsN", { n: fold.points })} />
          <StatTile label={t("dress.tileDanger")} value={fold.bestPlayer} sub={t("dress.overallN", { n: fold.bestOverall })} tone="down" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("dress.formLabel")}</span>
          <span className="font-mono text-sm tracking-widest text-primary">{fold.form || ABSENT}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={ask} disabled={busy}>{busy ? t("dress.briefing") + "…" : t("dress.ask")}</Button>
          {!LLM_CONFIG.hasKey && <span className="text-xs text-muted-foreground">{t("dress.noKey")}</span>}
          {saved && <span className="text-[11px] text-muted-foreground">{t("dress.savedLine", { what: saved })}</span>}
        </div>
      </Panel>

      {(answer || trace) && (
        <Panel className="p-4">
          <SectionTitle
            title={violations ? t("dress.refusedTitle") : t("dress.briefTitle")}
            hint={violations ? t("dress.refusedHint") : t("dress.briefHint")}
          />
          {violations && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {violations.map((v) => (
                <Badge key={v} variant="outline" className={CHIP_CLASS.badgeWarningStrong}>{t(`dress.v.${v}`)}</Badge>
              ))}
            </div>
          )}
          {answer && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>}
          {trace && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {trace.map((e, i) => (
                <span key={i} className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {e.stage}:{e.verdict}
                </span>
              ))}
            </div>
          )}
        </Panel>
      )}

      <Panel className="p-4">
        <SectionTitle title={t("dress.foldTitle")} hint={t("dress.foldHint")} />
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {t("dress.foldLine", { club: opponent.clubName, w: fold.won, d: fold.drawn, l: fold.lost, gf: fold.gf, ga: fold.ga, pts: fold.points, form: fold.form || ABSENT, player: fold.bestPlayer, overall: fold.bestOverall })}
        </p>
        <p className="mt-3 text-[11px] text-muted-foreground">{t("dress.foldMethod")}</p>
      </Panel>
    </div>
  );
}
