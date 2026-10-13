import { useMemo } from "react";
import { Link, useRouter } from "@/lib/router";
import { formatDate, useI18n, type Locale } from "@/i18n";
import { getClub, getPlayer } from "@/data/footballService";
import { useOs } from "@/store/useFootballOS";
import { useLearnRecords } from "@/lib/hooks";
import { levelInfo } from "@/domain/xp";
import { goalProgressPct, goalUnitKey } from "@/domain/goals";
import { positionLabel, rowLine } from "@/domain/rowText";
import { overallRating, weakestAttributes, ATTRIBUTE_DEFS } from "@/domain/attributes";
import { isCompleted, summarizeLearn } from "@/domain/learn";
import { completedMinutes, completedSessions } from "@/domain/training";
import { seasonSummary, type CareerState } from "@/domain/career";
import { buildFootprint } from "@/domain/footprint";
import { buildFilmInsights } from "@/domain/filmInsights";
import { loadFilmClips, newestClipAt, toClipInputs } from "@/domain/filmLibrary";
import { CAREER_KEY, COMMUNITY_KEY, browserStore, readJson } from "@/domain/localData";
import { Panel, SectionTitle, StatTile, Mini, Crest, EmptyState, DemoBadge } from "@/ui/primitives";
import { AttributeRadar, ProgressLine } from "@/ui/charts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn, epochMs, pctLabel } from "@/lib/utils";

// A date-format option bag is not interface copy, but written inside a render hole the
// raw-UI scan reads every string literal there as a child text node — three hits on one
// line. Hoisting it is the same remedy the Landing page needed at M164.
const ACTIVITY_TIME: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function ProfilePage() {
  const { t, locale } = useI18n();
  const { state, toggleGoal } = useOs();
  const { navigate } = useRouter();
  const learn = useLearnRecords();
  const p = state.profile;

  const completed = useMemo(() => completedSessions(state.sessions), [state.sessions]);
  const goalsDone = state.goals.filter((g) => g.done).length;

  // One record across every pillar, read from what this device actually holds.
  const footprint = useMemo(() => {
    const lessons = summarizeLearn(learn);
    const lastLesson = learn.filter((r) => isCompleted(r)).sort((a, b) => epochMs(b.completedAt) - epochMs(a.completedAt))[0];

    let manager = { active: false, matches: 0 } as Parameters<typeof buildFootprint>[0]["manager"];
    // M331: through the door, like every other read of this key. `present` is what makes the
    // difference between "no career on this device" and "a career the page cannot read".
    const heldCareer = readJson<CareerState | null>(browserStore(), CAREER_KEY, null);
    if (heldCareer.present && heldCareer.value) {
      const cs = heldCareer.value;
      const s = seasonSummary(cs);
      const lastResult = cs.results[cs.results.length - 1];
      manager = {
        active: true,
        clubName: getClub(cs.clubId)?.name,
        matches: s.played,
        pointsPerGame: s.ppg,
        position: s.position,
        clubCount: s.clubCount,
        lastMatchAt: lastResult?.at,
      };
    }

    let film = { clips: 0, minutes: 0 } as Parameters<typeof buildFootprint>[0]["film"];
    const clips = loadFilmClips();
    if (clips.length) {
      const fi = buildFilmInsights(toClipInputs(clips));
      film = {
        clips: fi.clips,
        minutes: clips.reduce((n, c) => n + (c.report?.durationSec ?? 0), 0) / 60,
        lastClipAt: newestClipAt(clips),
        detections: fi.detections,
        scanPerMinute: fi.scanPerMinute,
        avgConfidence: fi.avgConfidence,
        recurringFocus: fi.topFocus.slice(0, 3).map((f) => ({ key: f.key, clips: f.clips })),
      };
    }

    let posts = 0;
    let replies = 0;
    let lastPostAt: string | undefined;
    // M331: through the door. The old `JSON.parse(getItem() ?? "null")` could not tell a device
    // with no community store from one whose row is corrupt, and the footprint silently read
    // both as zero — the same "nothing to show" answer for two very different situations.
    const heldCommunity = readJson<{ userThreads?: { at: string }[]; replies?: Record<string, unknown[]> } | null>(browserStore(), COMMUNITY_KEY, null);
    if (heldCommunity.present && heldCommunity.value) {
      const st = heldCommunity.value;
      const threads = Array.isArray(st?.userThreads) ? st.userThreads : [];
      posts = threads.length;
      lastPostAt = threads[0]?.at;
      const groups = st?.replies && typeof st.replies === "object" ? Object.values(st.replies as Record<string, unknown[]>) : [];
      replies = groups.reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0);
    }

    return buildFootprint({
      locale,
      player: {
        sessionsCompleted: completed.length,
        minutes: completedMinutes(state.sessions),
        xp: p?.xp ?? 0,
        level: p ? levelInfo(p.xp).level : 1,
        plans: state.plans.length,
        goalsDone,
        lessonsCompleted: lessons.completed,
        lessonsMastered: lessons.mastered,
        lastSessionAt: completed.map((x) => x.completedAt ?? x.date).sort().slice(-1)[0],
        lastLessonAt: lastLesson?.completedAt,
      },
      manager,
      film,
      fan: {
        watchlist: state.watchlist.length,
        posts,
        replies,
        favouriteClubName: p?.favoriteClubId ? getClub(p.favoriteClubId)?.name : undefined,
        lastPostAt,
      },
    });
  }, [state, learn, completed, goalsDone, p, locale]);

  const ranked = useMemo(() => {
    if (!p) return [];
    return ATTRIBUTE_DEFS.map((d) => ({ key: d.key, value: p.attributes[d.key] ?? 0 })).sort((a, b) => b.value - a.value);
  }, [p]);
  const strengths = ranked.slice(0, 4);
  const focus = p ? weakestAttributes(p.attributes, 4) : [];

  const points = useMemo(
    () => state.progress.slice(-24).map((r) => ({ label: fmtDate(locale, r.date), value: r.overall })),
    [state.progress, locale],
  );

  if (!p) {
    return (
      <Panel className="p-6">
        <EmptyState title={t("prof.noProfile")} icon="☺" hint={t("prof.noProfileHint")} />
        <div className="mt-4 flex justify-center">
          <Button size="sm" onClick={() => navigate("/onboarding")}>{t("prof.createProfile")}</Button>
        </div>
      </Panel>
    );
  }

  const info = levelInfo(p.xp);
  const overall = overallRating(p.attributes);
  const club = p.favoriteClubId ? getClub(p.favoriteClubId) : undefined;
  const favPlayer = p.favoritePlayerId ? getPlayer(p.favoritePlayerId) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-2xl font-bold text-primary">
            {p.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{p.displayName}</h1>
              <DemoBadge />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-primary capitalize">{t(`prof.mode.${p.mode}`)}</Badge>
              <span>·</span>
              <span>{positionLabel(p.position, t)}</span>
              <span>·</span>
              <span>{t("prof.created")} {fmtDate(locale, p.createdAt)}</span>
            </div>
          </div>
        </div>
        <Link to="/player" className="text-sm text-primary hover:underline">{t("prof.goTraining")} →</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("common.level")} value={info.level} sub={`${info.intoLevel}/${info.forNext} XP`} />
        <StatTile label={t("common.overall")} value={overall} tone="up" />
        <StatTile label={t("prof.xp")} value={p.xp} />
        <StatTile label={t("prof.streak")} value={`${state.streak.current}d`} sub={state.streak.lastCompletedDate ? t("prof.active") : t("prof.idle")} />
      </div>

      <Panel className="p-4">
        <div className="mb-1 flex items-center justify-between">
          <SectionTitle title={t("prof.toNextLevel")} />
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{pctLabel(info.progress)}</span>
        </div>
        <Progress value={info.progress * 100} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle title={t("prof.abilities")} hint={t("prof.abilitiesHint")} />
          <AttributeRadar attrs={p.attributes} />
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {strengths.map((s) => (
              <div key={`s-${s.key}`} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t(`attr.name.${s.key}`)}</span>
                <span className="font-mono font-semibold tabular-nums text-success">{s.value}</span>
              </div>
            ))}
            {focus.map((s) => (
              <div key={`f-${s.key}`} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t(`attr.name.${s.key}`)}</span>
                <span className="font-mono tabular-nums text-warning">{s.value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("prof.progress")} hint={t("prof.progressHint")} />
          {points.length > 1 ? (
            <ProgressLine points={points} />
          ) : (
            <div className="py-10 text-center text-xs text-muted-foreground">{t("prof.needMoreData")}</div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label={t("prof.sessions")} value={completed.length} />
            <Mini label={t("prof.goalsDone")} value={`${goalsDone}/${state.goals.length}`} />
            <Mini label={t("prof.watchlist")} value={state.watchlist.length} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <SectionTitle title={t("prof.goals")} hint={t("prof.goalsHint")} />
          {state.goals.length ? (
            <div className="mt-2 space-y-3">
              {state.goals.map((g) => {
                // The row stores a metric code, never a unit word, so the label is
                // the reader's: a goal made in English no longer prints "sessions"
                // beside a Chinese profile. An unrecognised code shows no word.
                const unit = goalUnitKey(g.metric);
                const title = rowLine(g.title, t);
                return (
                  <button key={g.id} onClick={() => toggleGoal(g.id)} className="block w-full text-left">
                    <div className="flex items-center justify-between text-sm">
                      <span className={cn("font-medium", g.done && "text-muted-foreground line-through")}>
                        <span className={cn("mr-1.5", g.done ? "text-success" : "text-muted-foreground")}>{g.done ? "☑" : "☐"}</span>
                        {title}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{g.current}/{g.target}{unit ? ` ${t(unit)}` : ""}</span>
                    </div>
                    <div className="mt-1"><Progress value={goalProgressPct(g)} /></div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">{t("prof.noGoals")}</div>
          )}
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("prof.recent")} hint={t("prof.recentHint")} />
          {completed.length ? (
            <div className="mt-2 divide-y">
              {completed.slice(0, 6).map((sess) => (
                <div key={sess.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate">{rowLine(sess.title, t)}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtDate(locale, sess.completedAt ?? sess.date)}{sess.selfRating ? ` · ${sess.selfRating}/5` : ""}</div>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono text-success">+{sess.xpAwarded ?? 0} XP</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground">{t("prof.noSessions")}</div>
          )}
        </Panel>
      </div>

      {(club || favPlayer) && (
        <Panel className="p-4">
          <SectionTitle title={t("prof.favourites")} />
          <div className="mt-2 flex flex-wrap gap-4">
            {club && (
              <Link to={`/clubs/${club.id}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Crest colors={club.colors} short={club.short} size={28} />
                <span>{club.name}</span>
              </Link>
            )}
            {favPlayer && (
              <Link to={`/players/${favPlayer.id}`} className="flex items-center gap-2 text-sm hover:text-primary">
                <Crest colors={getClub(favPlayer.clubId)?.colors} short={getClub(favPlayer.clubId)?.short} size={28} />
                <span>{favPlayer.name}</span>
              </Link>
            )}
          </div>
        </Panel>
      )}

      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle title={t("prof.footprint")} hint={t("prof.footprintHint", { n: footprint.pillarsTouched })} />
          <DemoBadge />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {footprint.rows.map((r) => (
            <Link key={r.id} to={r.to} className="rounded-lg border bg-card/40 p-3 hover:border-primary/50">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("text-sm font-semibold", r.active ? "text-foreground" : "text-muted-foreground")}>{t(`prof.mode.${r.id}`)}</span>
                <span className={cn("rounded border px-1.5 py-px text-[10px] uppercase tracking-wide", r.active ? "border-success/40 text-success" : "border-border text-muted-foreground")}>
                  {r.active ? t("prof.active") : t("prof.notStarted")}
                </span>
              </div>
              <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                {r.lines.map((l, i) => <li key={i}>{rowLine(l, t)}</li>)}
              </ul>
              {r.lastAt && epochMs(r.lastAt) > 0 && (
                <div className="mt-1.5 text-[10px] text-muted-foreground">{t("prof.lastActivity")} {formatDate(locale, r.lastAt, ACTIVITY_TIME)}</div>
              )}
            </Link>
          ))}
        </div>
        <ul className="mt-3 space-y-0.5 text-[11px] text-muted-foreground">
          {footprint.evidence.map((e, i) => <li key={i}>› {rowLine(e, t)}</li>)}
        </ul>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{t("common.sources")}: {footprint.sources.map((s) => rowLine(s, t)).join(" · ")}</p>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <LinkCard to="/player" icon="●" title={t("prof.cardTraining")} hint={t("prof.cardTrainingHint")} />
        <LinkCard to="/scouting" icon="⌖" title={t("prof.cardScouting")} hint={t("prof.cardScoutingHint")} />
        <LinkCard to="/watchlist" icon="☆" title={t("prof.cardWatchlist")} hint={t("prof.cardWatchlistHint")} />
        <LinkCard to="/achievements" icon="♛" title={t("prof.cardAchievements")} hint={t("prof.cardAchievementsHint")} />
      </div>

      <p className="text-[11px] text-muted-foreground">{t("prof.disclaimer")}</p>
    </div>
  );
}

function LinkCard({ to, icon, title, hint }: { to: string; icon: string; title: string; hint: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 px-3.5 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-secondary/40">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
    </Link>
  );
}

function fmtDate(locale: Locale, iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return formatDate(locale, d, { month: "numeric", day: "numeric" });
}
