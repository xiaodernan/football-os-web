import { useMemo, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { relativeDay, useI18n } from "@/i18n";
import { useOs, levelInfo } from "@/store/useFootballOS";
import {
  matchesByStatus,
  trendingPlayers,
  getClub,
  getCompetition,
  getPlayer,
  upcomingMatchesForClub,
  todayMatches,
  DEMO_ANCHOR_MS,
} from "@/data/footballService";
import type { Match } from "@/domain/types";
import { buildLoad, ZONE_LABEL, type LoadZone } from "@/domain/load";
import { nextSteps, type NextStepKind } from "@/domain/nextStep";
import { newsKindLabel, newsTitle, rowLine } from "@/domain/rowText";
import { overallRating, byDateDesc } from "@/domain/attributes";
import { achievementInput, evaluateAchievements, nextBadges } from "@/domain/achievements";
import { summarizeLearn } from "@/domain/learn";
import { plannedSessions } from "@/domain/training";
import { loadFilmClips } from "@/domain/filmLibrary";
import { useLearnRecords, usePersonalNews } from "@/lib/hooks";
import { Panel, SectionTitle, Crest, PositionTag, AttributeBar, EmptyState, CHIP_CLASS, ZONE_CLASS, PANEL_CLASS, BAR_FILL } from "@/ui/primitives";
import { AttributeRadar, ProgressLine } from "@/ui/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn, clamp, ABSENT, SEPARATOR, fmtMoney } from "@/lib/utils";

const RECOVERY_TONE: Record<LoadZone, string> = {
  none: CHIP_CLASS.muted,
  ...ZONE_CLASS,
};

export function Dashboard() {
  const { t, locale } = useI18n();const { state, completeSession } = useOs();
  const { navigate } = useRouter();
  const learn = useLearnRecords();
  const personalNews = usePersonalNews();
  const profile = state.profile;
  const info = profile ? levelInfo(profile.xp) : null;

  const liveAll = matchesByStatus("LIVE");
  const live = liveAll.slice(0, 4);
  const today = todayMatches(5);
  const breaking = personalNews.items.slice(0, 4);
  const trending = trendingPlayers(6);
  const nextSession = plannedSessions(state.sessions)[0];
  const upcoming = profile?.favoriteClubId ? upcomingMatchesForClub(profile.favoriteClubId, 3) : [];
  const progressPts = state.progress.map((p, i) => ({ label: i === 0 ? t("common.chartStart") : `${i}`, value: p.overall }));

  const growth = useMemo(() => {
    if (!profile) return null;
    const completed = state.sessions.filter((s) => s.status === "completed");
    const list = evaluateAchievements(achievementInput({
      xp: profile.xp,
      sessions: state.sessions,
      goals: state.goals,
      streak: state.streak.current,
      watchlist: state.watchlist,
      plans: state.plans,
      lessons: summarizeLearn(learn),
      filmClips: loadFilmClips().length,
    }));
    const next = nextBadges(list, 1)[0] ?? null;
    const last = completed
      .slice()
      .sort((a, b) => byDateDesc(a.completedAt ?? a.date, b.completedAt ?? b.date))[0];
    const load = buildLoad({ nowMs: Date.now(), sessions: state.sessions });
    const focusGoals = state.goals
      .filter((g) => g.metric === "attribute" && g.key && !g.done)
      .map((g) => ({ key: g.key!, current: g.current, target: g.target, pct: clamp(g.target ? g.current / g.target : 0, 0, 1) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
    return { next, total: list.length, unlocked: list.filter((a) => a.unlocked).length, last, recovery: load.hasData ? { acwr: load.acwr, zone: load.zone } : null, focusGoals };
  }, [profile, info, state, learn]);

  // M573: the ranked answer to "what now", read straight off the state the page already holds.
  const facts = {
    liveMatchId: liveAll[0]?.id ?? null,
    nextMatchId: upcoming.find((m) => m.status === "SCHEDULED")?.id ?? null,
    plannedSessions: plannedSessions(state.sessions).length,
    filmClips: loadFilmClips().length,
    badgeWaiting: Boolean(growth?.next),
    watchlist: state.watchlist.length,
  };
  const steps = nextSteps(facts);
  const stepRoute = (kind: NextStepKind): string => {
    if (kind === "live" && facts.liveMatchId) return `/matches/${facts.liveMatchId}`;
    if (kind === "fixture" && facts.nextMatchId) return `/matches/${facts.nextMatchId}`;
    if (kind === "training") return "/development";
    if (kind === "film") return "/film";
    if (kind === "badge") return "/achievements";
    if (kind === "watchlist") return "/scouting";
    return "/discipline";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {profile ? `${t("nav.home")} · ${profile.displayName}` : t("nav.home")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("dash.subtitle")}</p>
        </div>
        {info && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{t("common.level")} {info.level}</Badge>
            <Badge variant="outline" className="font-mono text-primary">{t("dash.xpBadge", { n: profile?.xp ?? 0 })}</Badge>
            <Badge variant="outline" className="font-mono">🔥 {t("dash.streakDays", { n: state.streak.current })}</Badge>
          </div>
        )}
      </div>

      <Panel className="p-4">
        <SectionTitle title={t("dash.nextTitle")} hint={t("dash.nextHint")} />
        <div className="mt-2 flex flex-col gap-1.5">
          {steps.map((kind, i) => (
            <Link
              key={kind}
              to={stepRoute(kind)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50",
                i === 0 ? CHIP_CLASS.success : PANEL_CLASS.panelGhost,
              )}
            >
              <span className="grid w-5 place-items-center text-base leading-none text-primary">{STEP_ICON[kind]}</span>
              <span className="min-w-0 flex-1 truncate">{t(STEP_LABEL[kind])}</span>
              {i === 0 && <span className="text-[11px] text-muted-foreground">{t("dash.nextPrimary")}</span>}
              <span className="text-primary">→</span>
            </Link>
          ))}
        </div>
      </Panel>

      {/* live strip */}
      {live.length > 0 && (
        <Panel className="p-0">
          <div className="flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold uppercase tracking-widest text-destructive">
            <span className={cn("fo-live-dot h-2 w-2 rounded-full", BAR_FILL.bad)} /> {t("dash.live")}
            {/* M294: the strip shows 4 of the world's in-play matches; the count and the
                door to the full LIVE tab make the other 45 reachable from here. */}
            <Link to="/matches?status=LIVE" className="ml-auto normal-case tracking-normal hover:underline">
              {t("dash.liveAll", { n: liveAll.length })}
            </Link>
          </div>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4">
            {live.map((m) => <LiveCell key={m.id} m={m} />)}
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* today's matches */}
          <Panel className="p-4">
            <SectionTitle title={t("dash.today")} hint={t("dash.nextUpHint")} action={<Link to="/matches" className="text-xs text-primary hover:underline">{t("dash.allMatches")}</Link>} />
            {today.length ? (
              <div className="divide-y">
                {today.map((m) => <FixtureRow key={m.id} m={m} />)}
              </div>
            ) : (
              <EmptyState title={t("dash.noMatches")} icon="⚽" />
            )}
          </Panel>

          {/* training + coach */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-4">
              <SectionTitle title={t("dash.training")} />
              {nextSession ? (
                <div>
                  <div className="text-sm font-medium">{rowLine(nextSession.title, t)}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{nextSession.targetMinutes}′ · {t("dash.blocks", { n: nextSession.exercises.length })}</div>
                  <CompleteQuick onDone={(r) => completeSession(nextSession.id, r)} />
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">{t("dash.noSession")}</p>
                  <Button size="sm" className="mt-3" onClick={() => navigate("/player/coach")}>{t("dash.coach")} →</Button>
                </div>
              )}
            </Panel>

            <Panel className="p-4">
              <SectionTitle title={t("dash.progress")} />
              {profile && progressPts.length > 1 ? (
                <>
                  <ProgressLine points={progressPts} height={120} />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{t("dash.overallN", { n: profile ? overallRating(profile.attributes) : 0 })}</span>
                    <span>{t("common.nextLevel")}: {info && info.forNext - info.intoLevel} XP</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("dash.noGrowth")}</p>
              )}
            </Panel>
          </div>

          {/* breaking */}
          <Panel className="p-4">
            <SectionTitle
              title={t("dash.breaking")}
              hint={personalNews.orderedFor ? t("news.forClub", { club: personalNews.orderedFor, n: personalNews.matched }) : undefined}
              action={<Link to="/news" className="text-xs text-primary hover:underline">{t("dash.newsLink")}</Link>}
            />
            <div className="divide-y">
              {breaking.map((n) => (
                <Link key={n.id} to={`/news/${n.id}`} className="flex items-start gap-3 py-2.5 hover:bg-secondary/40">
                  <Badge variant="outline" className={cn("mt-0.5 shrink-0 text-[10px]", n.kind === "Rumor" && CHIP_CLASS.badgeWarningStrong)}>{newsKindLabel(n.kind, t)}</Badge>
                  <div className="min-w-0">
                    <div className="truncate text-sm">{newsTitle(n, t)}</div>
                    <div className="text-xs text-muted-foreground">{n.source} · {t("dash.confidence", { n: Math.round(n.credibility * 100) })}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        {/* right column */}
        <div className="space-y-4">
          {growth && (
            <Panel className="p-4">
              <SectionTitle
                title={t("dash.growth")}
                action={<span className="font-mono text-xs text-muted-foreground tabular-nums">{growth.unlocked}/{growth.total}</span>}
              />
              {growth.next ? (
                <Link to="/achievements" className={cn("block rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40", PANEL_CLASS.panelGhost)}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>🔒</span>
                    <span className="uppercase tracking-wide">{t("dash.nextBadge")}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm", CHIP_CLASS.labelPrimary)}>{growth.next.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{t(`ach.name.${growth.next.id}`)}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{Math.min(growth.next.value, growth.next.target)}/{growth.next.target}</span>
                  </div>
                  <div className="mt-2"><Progress value={growth.next.pct * 100} /></div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t(`ach.desc.${growth.next.id}`)}</div>
                </Link>
              ) : (
                <Link to="/achievements" className={cn("block rounded-lg border p-3 text-sm", CHIP_CLASS.success)}>
                  {t("dash.allBadges")} →
                </Link>
              )}
              <div className="mt-3 border-t pt-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="uppercase tracking-wide text-muted-foreground">{t("dash.recent")}</span>
                  <Link to="/history" className="text-primary hover:underline">{t("dash.viewHistory")} →</Link>
                </div>
                {growth.last ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="min-w-0 truncate">{rowLine(growth.last.title, t)}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">{rowLine(relativeDay(locale, growth.last.completedAt ?? growth.last.date), t)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("dash.noActivity")}</p>
                )}
              </div>
              {growth.recovery && (
                <Link
                  to="/load"
                  className={cn(
                    "mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors hover:brightness-110",
                    RECOVERY_TONE[growth.recovery.zone]
                  )}
                >
                  <span className="font-medium uppercase tracking-wide">{t("dash.recovery")}</span>
                  <span className="flex items-center gap-2">
                    <span>{rowLine(ZONE_LABEL[growth.recovery.zone], t)}</span>
                    <span className="font-mono tabular-nums">{t("dash.acwrN", { n: growth.recovery.acwr?.toFixed(2) ?? ABSENT })}</span>
                    <span aria-hidden>→</span>
                  </span>
                </Link>
              )}
              {growth.focusGoals.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="uppercase tracking-wide text-muted-foreground">{t("dash.focusGoals")}</span>
                    <Link to="/development" className="text-primary hover:underline">{t("dash.develop")} →</Link>
                  </div>
                  <div className="space-y-2">
                    {growth.focusGoals.map((f) => (
                      <div key={f.key}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="min-w-0 truncate">{t(`attr.name.${f.key}`)}</span>
                          <span className="ml-2 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{f.current}/{f.target}</span>
                        </div>
                        <Progress value={f.pct * 100} className="mt-1 h-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Panel>
          )}

          <Panel className="p-4">
            <SectionTitle title={t("dash.attributesTitle")} />
            {profile ? (
              <>
                <AttributeRadar attrs={profile.attributes} height={220} />
                <div className="mt-3 space-y-2">
                  <AttributeBar label={t(`attr.name.first_touch`)} value={profile.attributes.first_touch} />
                  <AttributeBar label={t(`attr.name.passing`)} value={profile.attributes.passing} />
                  <AttributeBar label={t(`attr.name.decision_making`)} value={profile.attributes.decision_making} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("dash.noRadar")}</p>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("dash.trending")} />
            <div className="space-y-1">
              {trending.map((p) => {
                const club = getClub(p.clubId);
                return (
                  <Link key={p.id} to={`/players/${p.id}`} className="flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-secondary/40">
                    <Crest colors={club?.colors} short={club?.short} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground"><PositionTag position={p.position} /> {fmtMoney(p.value)}</div>
                    </div>
                    <div className="font-mono text-sm font-semibold">{p.overall}</div>
                  </Link>
                );
              })}
            </div>
          </Panel>

          {profile?.favoriteClubId && (
            <Panel className="p-4">
              <SectionTitle title={t("dash.upcoming")} hint={getClub(profile.favoriteClubId)?.name} />
              {upcoming.length ? (
                <div className="divide-y">{upcoming.map((m) => <FixtureRow key={m.id} m={m} />)}</div>
              ) : (
                <p className="text-xs text-muted-foreground">{t("dash.noFixtures")}</p>
              )}
            </Panel>
          )}

          <Panel className="p-4">
            <SectionTitle title={t("dash.watchlist")} action={<Link to="/scouting" className="text-xs text-primary hover:underline">{t("dash.scoutLink")}</Link>} />
            {state.watchlist.length ? (
              <div className="space-y-1">
                {state.watchlist.slice(0, 5).map((id) => {
                  const p = getPlayer(id);
                  if (!p) return null;
                  return (
                    <Link key={id} to={`/players/${id}`} className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-secondary/40">
                      <span>{p.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.overall}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("dash.watchlistEmpty")}</p>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("dash.modules")} hint={t("dash.modulesHint")} />
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {MODULE_LINKS.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50", PANEL_CLASS.panelGhost)}
                >
                  <span className="grid w-5 place-items-center text-base leading-none text-primary">{m.icon}</span>
                  <span className="truncate">{t(m.labelKey)}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// M573: the ranked steps' copy and glyphs, held as keys so the dictionary owns the words.
const STEP_LABEL: Record<NextStepKind, string> = {
  live: "step.live",
  fixture: "step.fixture",
  training: "step.training",
  film: "step.film",
  badge: "step.badge",
  watchlist: "step.watchlist",
  explore: "step.explore",
};
const STEP_ICON: Record<NextStepKind, string> = {
  live: "●",
  fixture: "▷",
  training: "✎",
  film: "✂",
  badge: "♛",
  watchlist: "☆",
  explore: "▨",
};

const MODULE_LINKS = [
  { to: "/player", labelKey: "nav.player", icon: "●" },
  { to: "/manager", labelKey: "nav.manager", icon: "▤" },
  { to: "/profile", labelKey: "nav.profile", icon: "☺" },
  { to: "/review", labelKey: "nav.review", icon: "◷" },
  { to: "/load", labelKey: "nav.load", icon: "◔" },
  { to: "/achievements", labelKey: "nav.achievements", icon: "♛" },
  { to: "/settings", labelKey: "nav.settings", icon: "⚙" },
  { to: "/history", labelKey: "nav.history", icon: "⧗" },
  { to: "/scouting", labelKey: "nav.scouting", icon: "⌖" },
  { to: "/world", labelKey: "nav.world", icon: "⧗" },
  { to: "/film", labelKey: "nav.film", icon: "✂" },
  { to: "/data", labelKey: "nav.data", icon: "▨" },
  { to: "/transfers", labelKey: "nav.transfers", icon: "⇄" },
  { to: "/compare", labelKey: "nav.compare", icon: "⚖" },
  { to: "/watchlist", labelKey: "nav.watch", icon: "☆" },
  { to: "/tactical-studio", labelKey: "nav.tactical", icon: "⛶" },
  { to: "/simulation", labelKey: "nav.simulation", icon: "▷" },
  { to: "/ai", labelKey: "nav.ai", icon: "⚡" },
  { to: "/knowledge", labelKey: "nav.knowledge", icon: "☰" },
  { to: "/learn", labelKey: "nav.learn", icon: "✎" },
  { to: "/community", labelKey: "nav.community", icon: "❉" },
  { to: "/football", labelKey: "nav.football", icon: "◎" },
];

function LiveCell({ m }: { m: Match }) {
  const { t } = useI18n();
  const h = getClub(m.homeClubId);
  const a = getClub(m.awayClubId);
  return (
    <Link to={`/matches/${m.id}`} className="flex flex-col gap-1 p-3 hover:bg-secondary/40">
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{getCompetition(m.competitionId)?.name}</span><span className="fo-live-dot text-destructive">{t("dash.live")}</span></div>
      <div className="space-y-0.5">
        <TeamLine name={h?.name} goals={m.homeGoals} />
        <TeamLine name={a?.name} goals={m.awayGoals} />
      </div>
    </Link>
  );
}

function TeamLine({ name, goals }: { name?: string; goals: number | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="truncate">{name}</span>
      <span className="font-mono font-semibold tabular-nums">{goals ?? ABSENT}</span>
    </div>
  );
}

function FixtureRow({ m }: { m: Match }) {
  const { locale, t } = useI18n();
  const h = getClub(m.homeClubId);
  const a = getClub(m.awayClubId);
  // Both call sites list world fixtures, so the label measures against the world's
  // anchor — the same clock the lists select on — not the reader's (M293).
  return (
    <Link to={`/matches/${m.id}`} className="flex items-center gap-3 py-2.5 hover:bg-secondary/40">
      <div className="w-14 shrink-0 text-xs text-muted-foreground">{rowLine(relativeDay(locale, m.kickoff, DEMO_ANCHOR_MS), t)}</div>
      <div className="flex flex-1 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm">{h?.name}</span>
          <Crest colors={h?.colors} short={h?.short} size={24} />
        </div>
        <div className="rounded bg-secondary px-2 py-0.5 font-mono text-sm tabular-nums">{m.status === "SCHEDULED" ? "vs" : `${m.homeGoals}${SEPARATOR}${m.awayGoals}`}</div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Crest colors={a?.colors} short={a?.short} size={24} />
          <span className="truncate text-sm">{a?.name}</span>
        </div>
      </div>
    </Link>
  );
}

function CompleteQuick({ onDone }: { onDone: (rating: number) => void }) {
  const { t } = useI18n();
  const [rating, setRating] = useState("4");
  const [done, setDone] = useState(false);
  const { navigate } = useRouter();
  if (done)
    return (
      <div className={cn("mt-3 rounded-lg border p-2 text-xs", CHIP_CLASS.success)}>
        {t("dash.logged")} <button className="underline" onClick={() => navigate("/player/progress")}>{t("dash.viewProgress")}</button>
      </div>
    );
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs text-muted-foreground">{t("dash.howFelt")}</div>
      <RadioGroup value={rating} onValueChange={setRating} className="flex gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex items-center gap-1">
            <RadioGroupItem id={`r${n}`} value={String(n)} />
            <Label htmlFor={`r${n}`} className="text-xs">{n}</Label>
          </div>
        ))}
      </RadioGroup>
      <Button size="sm" className="mt-3 w-full" onClick={() => { onDone(Number(rating)); setDone(true); }}>
        {t("dash.completeSession")}
      </Button>
    </div>
  );
}
