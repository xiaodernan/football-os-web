import { useMemo, useState } from "react";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs, levelInfo } from "@/store/useFootballOS";
import {
  matchesByStatus,
  newsFeed,
  trendingPlayers,
  getClub,
  getCompetition,
  getPlayer,
  upcomingMatchesForClub,
  formatValue,
} from "@/data/footballService";
import type { Match } from "@/domain/types";
import { overallRating } from "@/domain/attributes";
import { evaluateAchievements, type AchievementInput } from "@/domain/achievements";
import { Panel, SectionTitle, StatTile, Crest, PositionTag, AttributeBar, EmptyState } from "@/ui/primitives";
import { AttributeRadar, ProgressLine } from "@/ui/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function relTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const d = Math.round(diff / 86400000);
  if (Math.abs(d) > 1) return `${d > 0 ? "in " : ""}${d}d${d > 0 ? "" : " ago"}`;
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Dashboard() {
  const { t } = useI18n();
  const { state, completeSession } = useOs();
  const { navigate } = useRouter();
  const profile = state.profile;
  const info = profile ? levelInfo(profile.xp) : null;

  const live = matchesByStatus("LIVE").slice(0, 4);
  const today = useMemo(() => {
    const now = Date.now();
    return matchesByStatus("SCHEDULED")
      .filter((m) => Math.abs(new Date(m.kickoff).getTime() - now) < 2 * 86400000)
      .slice(0, 5);
  }, []);
  const breaking = newsFeed.slice(0, 4);
  const trending = trendingPlayers(6);
  const nextSession = state.sessions.find((s) => s.status === "planned");
  const upcoming = profile?.favoriteClubId ? upcomingMatchesForClub(profile.favoriteClubId, 3) : [];
  const progressPts = state.progress.map((p, i) => ({ label: i === 0 ? "start" : `${i}`, value: p.overall }));

  const growth = useMemo(() => {
    if (!profile) return null;
    const completed = state.sessions.filter((s) => s.status === "completed");
    const input: AchievementInput = {
      level: info?.level ?? 1,
      xp: profile.xp,
      sessions: completed.length,
      streak: state.streak.current,
      goalsDone: state.goals.filter((g) => g.done).length,
      watchlist: state.watchlist.length,
      plans: state.plans.length,
    };
    const list = evaluateAchievements(input);
    const locked = list
      .filter((a) => !a.unlocked)
      .sort((a, b) => b.pct - a.pct || a.target - b.target);
    const next = locked[0] ?? null;
    const last = completed
      .slice()
      .sort((a, b) => new Date(b.completedAt ?? b.date).getTime() - new Date(a.completedAt ?? a.date).getTime())[0];
    return { next, total: list.length, unlocked: list.length - locked.length, last };
  }, [profile, info, state]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {profile ? `${t("nav.home")} · ${profile.displayName}` : t("nav.home")}
          </h1>
          <p className="text-sm text-muted-foreground">What's happening in football — and what your own game should do next.</p>
        </div>
        {info && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">Lv {info.level}</Badge>
            <Badge variant="outline" className="font-mono text-primary">{profile?.xp} XP</Badge>
            <Badge variant="outline" className="font-mono">🔥 {state.streak.current}d</Badge>
          </div>
        )}
      </div>

      {/* live strip */}
      {live.length > 0 && (
        <Panel className="p-0">
          <div className="flex items-center gap-2 border-b px-4 py-2 text-xs font-semibold uppercase tracking-widest text-destructive">
            <span className="fo-live-dot h-2 w-2 rounded-full bg-destructive" /> {t("dash.live")}
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
            <SectionTitle title={t("dash.today")} hint="Next up in the demo world" action={<Link to="/matches" className="text-xs text-primary hover:underline">All matches →</Link>} />
            {today.length ? (
              <div className="divide-y">
                {today.map((m) => <FixtureRow key={m.id} m={m} />)}
              </div>
            ) : (
              <EmptyState title="No matches in the next 48h window" icon="⚽" />
            )}
          </Panel>

          {/* training + coach */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-4">
              <SectionTitle title={t("dash.training")} />
              {nextSession ? (
                <div>
                  <div className="text-sm font-medium">{nextSession.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{nextSession.targetMinutes}′ · {nextSession.exercises.length} blocks</div>
                  <CompleteQuick sessionId={nextSession.id} onDone={(r) => completeSession(nextSession.id, r)} />
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">No session planned yet. Let the AI coach build one.</p>
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
                    <span>Overall {profile ? overallRating(profile.attributes) : 0}</span>
                    <span>{t("common.nextLevel")}: {info && info.forNext - info.intoLevel} XP</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Complete a training session to start your growth curve.</p>
              )}
            </Panel>
          </div>

          {/* breaking */}
          <Panel className="p-4">
            <SectionTitle title={t("dash.breaking")} action={<Link to="/news" className="text-xs text-primary hover:underline">News →</Link>} />
            <div className="divide-y">
              {breaking.map((n) => (
                <Link key={n.id} to={`/news/${n.id}`} className="flex items-start gap-3 py-2.5 hover:bg-secondary/40">
                  <Badge variant="outline" className={cn("mt-0.5 shrink-0 text-[10px]", n.kind === "Rumor" && "border-warning/50 text-warning")}>{n.kind}</Badge>
                  <div className="min-w-0">
                    <div className="truncate text-sm">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{n.source} · {Math.round(n.credibility * 100)}% confidence</div>
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
                <Link to="/achievements" className="block rounded-lg border border-border/60 bg-secondary/20 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>🔒</span>
                    <span className="uppercase tracking-wide">{t("dash.nextBadge")}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/15 text-sm text-primary">{growth.next.icon}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{t(`ach.name.${growth.next.id}`)}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">{Math.min(growth.next.value, growth.next.target)}/{growth.next.target}</span>
                  </div>
                  <div className="mt-2"><Progress value={growth.next.pct * 100} /></div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t(`ach.desc.${growth.next.id}`)}</div>
                </Link>
              ) : (
                <Link to="/achievements" className="block rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
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
                    <span className="min-w-0 truncate">{growth.last.title}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">{relTime(growth.last.completedAt ?? growth.last.date)}</span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("dash.noActivity")}</p>
                )}
              </div>
            </Panel>
          )}

          <Panel className="p-4">
            <SectionTitle title="Your attributes" />
            {profile ? (
              <>
                <AttributeRadar attrs={profile.attributes} height={220} />
                <div className="mt-3 space-y-2">
                  {Object.entries(profile.attributes).slice(0, 0)}
                  <AttributeBar label="First Touch" value={profile.attributes.first_touch} />
                  <AttributeBar label="Passing" value={profile.attributes.passing} />
                  <AttributeBar label="Decision Making" value={profile.attributes.decision_making} />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Finish onboarding to see your radar.</p>
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
                      <div className="text-xs text-muted-foreground"><PositionTag position={p.position} /> {formatValue(p.value)}</div>
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
                <p className="text-xs text-muted-foreground">No upcoming fixtures.</p>
              )}
            </Panel>
          )}

          <Panel className="p-4">
            <SectionTitle title={t("dash.watchlist")} action={<Link to="/scouting" className="text-xs text-primary hover:underline">Scout →</Link>} />
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
              <p className="text-sm text-muted-foreground">Tap "Scout watch" on any player to track them here.</p>
            )}
          </Panel>

          <Panel className="p-4">
            <SectionTitle title={t("dash.modules")} hint="Everything in your Football OS" />
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {MODULE_LINKS.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50"
                >
                  <span className="grid w-5 place-items-center text-base leading-none text-primary">{m.icon}</span>
                  <span className="truncate">{t(m.label)}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

const MODULE_LINKS = [
  { to: "/player", label: "nav.player", icon: "●" },
  { to: "/manager", label: "nav.manager", icon: "▤" },
  { to: "/profile", label: "nav.profile", icon: "☺" },
  { to: "/review", label: "nav.review", icon: "◷" },
  { to: "/achievements", label: "nav.achievements", icon: "♛" },
  { to: "/settings", label: "nav.settings", icon: "⚙" },
  { to: "/history", label: "nav.history", icon: "⧗" },
  { to: "/scouting", label: "nav.scouting", icon: "⌖" },
  { to: "/world", label: "nav.world", icon: "⧗" },
  { to: "/film", label: "nav.film", icon: "✂" },
  { to: "/data", label: "nav.data", icon: "▨" },
  { to: "/transfers", label: "nav.transfers", icon: "⇄" },
  { to: "/compare", label: "nav.compare", icon: "⚖" },
  { to: "/watchlist", label: "nav.watch", icon: "☆" },
  { to: "/tactical-studio", label: "nav.tactical", icon: "⛶" },
  { to: "/simulation", label: "nav.simulation", icon: "▷" },
  { to: "/ai", label: "nav.ai", icon: "⚡" },
  { to: "/knowledge", label: "nav.knowledge", icon: "☰" },
  { to: "/learn", label: "nav.learn", icon: "✎" },
  { to: "/community", label: "nav.community", icon: "❉" },
  { to: "/football", label: "nav.football", icon: "◎" },
];

function LiveCell({ m }: { m: Match }) {
  const h = getClub(m.homeClubId);
  const a = getClub(m.awayClubId);
  return (
    <Link to={`/matches/${m.id}`} className="flex flex-col gap-1 p-3 hover:bg-secondary/40">
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{getCompetition(m.competitionId)?.name}</span><span className="fo-live-dot text-destructive">LIVE</span></div>
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
      <span className="font-mono font-semibold tabular-nums">{goals ?? "–"}</span>
    </div>
  );
}

function FixtureRow({ m }: { m: Match }) {
  const h = getClub(m.homeClubId);
  const a = getClub(m.awayClubId);
  return (
    <Link to={`/matches/${m.id}`} className="flex items-center gap-3 py-2.5 hover:bg-secondary/40">
      <div className="w-14 shrink-0 text-xs text-muted-foreground">{relTime(m.kickoff)}</div>
      <div className="flex flex-1 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm">{h?.name}</span>
          <Crest colors={h?.colors} short={h?.short} size={24} />
        </div>
        <div className="rounded bg-secondary px-2 py-0.5 font-mono text-sm tabular-nums">{m.status === "FINISHED" ? `${m.homeGoals}–${m.awayGoals}` : "vs"}</div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Crest colors={a?.colors} short={a?.short} size={24} />
          <span className="truncate text-sm">{a?.name}</span>
        </div>
      </div>
    </Link>
  );
}

function CompleteQuick({ sessionId, onDone }: { sessionId: string; onDone: (rating: number) => void }) {
  const [rating, setRating] = useState("4");
  const [done, setDone] = useState(false);
  const { navigate } = useRouter();
  if (done)
    return (
      <div className="mt-3 rounded-lg border border-success/40 bg-success/10 p-2 text-xs text-success">
        Logged — XP awarded. <button className="underline" onClick={() => navigate("/player/progress")}>View progress</button>
      </div>
    );
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs text-muted-foreground">How did it feel?</div>
      <RadioGroup value={rating} onValueChange={setRating} className="flex gap-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="flex items-center gap-1">
            <RadioGroupItem id={`r${n}`} value={String(n)} />
            <Label htmlFor={`r${n}`} className="text-xs">{n}</Label>
          </div>
        ))}
      </RadioGroup>
      <Button size="sm" className="mt-3 w-full" onClick={() => { onDone(Number(rating)); setDone(true); }}>
        Complete session
      </Button>
    </div>
  );
}
