import { useMemo } from "react";
import { toast } from "sonner";
import { Link } from "@/lib/router";
import { formatDate, useI18n, type Locale } from "@/i18n";
import { getClub } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import { useLocalStorage } from "@/lib/hooks";
import {
  buildCoachResume, publicCoachCard, badgeIsPublic, BADGE_IDS,
  DEFAULT_VISIBILITY, type CoachVisibility, type BadgeId,
} from "@/domain/coachCareer";
import { CAREER_KEY, COACH_KEY } from "@/domain/localData";
import type { CareerState } from "@/domain/career";
import { rowLine } from "@/domain/rowText";
import { Panel, SectionTitle, StatTile, Mini, Crest, EmptyState, DemoBadge, CHIP_CLASS, PANEL_CLASS, TONE_CLASS } from "@/ui/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, fmt2, isRealInstant } from "@/lib/utils";

// M523 — the coach's public résumé. One page answers the visitor's question — who is
// this manager, what have they done — while the toggles answer the coach's: what part
// of that record is theirs to show. The figures are never stored here; the résumé is
// derived from the career the manager OS keeps, and only the visibility switches are
// this page's own state.

export function CoachProfile() {
  const { t, locale } = useI18n();
  const { state: os } = useOs();
  const [career] = useLocalStorage<CareerState | null>(CAREER_KEY, null);
  const [visibility, setVisibility] = useLocalStorage<CoachVisibility>(COACH_KEY, DEFAULT_VISIBILITY);

  const resume = useMemo(() => (career ? buildCoachResume(career) : null), [career]);

  if (!career || !resume) {
    return (
      <Panel className="p-6">
        <EmptyState title={t("coach.noCareer")} icon="⛨" hint={t("coach.noCareerHint")} />
        <div className="mt-4 flex justify-center">
          <Link to="/manager">
            <Button size="sm">{t("coach.startCareer")}</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  const club = getClub(career.clubId);
  const card = publicCoachCard(resume, visibility, os.profile?.displayName || t("coach.unnamed"));

  const toggleBadge = (id: BadgeId) => {
    const verdict = setVisibility((v) => ({ ...v, badges: { ...v.badges, [id]: !badgeIsPublic(v, id) } }));
    if (!verdict.landed) toast.error(t("common.notStored"));
  };
  const toggleRecord = () => {
    const verdict = setVisibility((v) => ({ ...v, record: !v.record }));
    if (!verdict.landed) toast.error(t("common.notStored"));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Crest colors={club?.colors} short={club?.short} size={48} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{t("coach.title")}</h1>
              <DemoBadge />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {resume.managerClub} · {resume.managerCompetition} · {t("coach.since", { date: fmtDate(locale, resume.startedAt) })}
            </p>
          </div>
        </div>
        {resume.honour && (
          <Badge variant="outline" className={cn("text-xs capitalize", TONE_CLASS[resume.honour.tone])}>
            {rowLine(resume.honour.label, t)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("coach.matches")} value={resume.matches} />
        <StatTile label={t("coach.points")} value={resume.points} tone="up" />
        <StatTile label={t("coach.ppg")} value={fmt2(resume.ppg)} />
        <StatTile label={t("coach.cleanSheets")} value={resume.cleanSheets} />
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title={t("coach.record")} hint={t("coach.recordHint")} />
          <Button size="sm" variant="outline" onClick={toggleRecord}>
            {visibility.record ? t("coach.makePrivate") : t("coach.makePublic")}
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          <Mini label={t("coach.won")} value={resume.won} />
          <Mini label={t("coach.drawn")} value={resume.drawn} />
          <Mini label={t("coach.lost")} value={resume.lost} />
          <Mini label={t("coach.goalsFor")} value={resume.goalsFor} />
          <Mini label={t("coach.goalsAgainst")} value={resume.goalsAgainst} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("coach.standing", { position: resume.position, clubCount: resume.clubCount })}
        </p>
        <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
          {resume.evidence.map((e, i) => <li key={i}>› {rowLine(e, t)}</li>)}
        </ul>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("coach.badges")} hint={t("coach.badgesHint")} />
        <div className="mt-2 flex flex-wrap gap-2">
          {BADGE_IDS.map((id) => {
            const earned = resume.badges.find((b) => b.id === id);
            if (!earned) {
              return (
                <span key={id} className={cn("rounded border px-2 py-1 text-xs", CHIP_CLASS.mutedSoft)}>
                  <span className="mr-1 opacity-50">◇</span>{t(`coach.badge.${id}.name`)}
                </span>
              );
            }
            const pub = badgeIsPublic(visibility, id);
            return (
              <button
                key={id}
                onClick={() => toggleBadge(id)}
                title={t("coach.visibilityToggle")}
                className={cn("rounded border px-2 py-1 text-left text-xs transition-colors hover:border-primary/40", pub ? CHIP_CLASS.badgeSuccess : CHIP_CLASS.muted)}
              >
                <span className="block font-medium">{t(`coach.badge.${id}.name`)}</span>
                <span className="block text-[10px] text-muted-foreground">{t("coach.matchN", { n: earned.earnedAtIndex + 1 })} · {fmtDate(locale, earned.at)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("coach.visibilityHint")}</p>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("coach.publicCard")} hint={t("coach.publicCardHint")} />
        <div className={cn("rounded-xl p-4", PANEL_CLASS.panelGhost)}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-base font-semibold">{card.managerName}</div>
            <Badge variant="outline" className={CHIP_CLASS.badgeInfoStrong}>{t("coach.publicWord")}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{card.clubName} · {card.competitionName}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Mini label={t("coach.matches")} value={card.matches} />
            <Mini label={t("coach.points")} value={card.points} />
            <Mini label={t("coach.ppg")} value={fmt2(card.ppg)} />
          </div>
          {card.recordShown && card.honour && (
            <p className={cn("mt-2 text-xs font-medium", TONE_CLASS[card.honour.tone])}>{rowLine(card.honour.label, t)}</p>
          )}
          {!card.recordShown && <p className="mt-2 text-xs text-muted-foreground">{t("coach.recordHidden")}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {card.badges.length ? (
              card.badges.map((b) => (
                <span key={b.id} className={cn("rounded px-1.5 py-0.5 text-[10px] font-mono", CHIP_CLASS.labelSuccess)}>
                  {t(`coach.badge.${b.id}.name`)}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">{t("coach.noPublicBadges")}</span>
            )}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("coach.demoNote")}</p>
      </Panel>
    </div>
  );
}

function fmtDate(locale: Locale, iso: string): string {
  if (!isRealInstant(iso)) return "";
  return formatDate(locale, new Date(iso), { year: "numeric", month: "short", day: "numeric" });
}
