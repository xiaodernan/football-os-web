import { useMemo } from "react";
import { Link, useRouter } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs } from "@/store/useFootballOS";
import { achievementInput, evaluateAchievements, summary, type AchievementStatus, type Tier } from "@/domain/achievements";
import { summarizeLearn } from "@/domain/learn";
import { loadFilmClips } from "@/domain/filmLibrary";
import { useLearnRecords } from "@/lib/hooks";
import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The tier's chip: the app's shared palette (M441). A tier wears the same three-class chip the
// load zones and the review kinds wear, and the bronze tier wears the muted chip with its wash.
const TONE: Record<Tier, string> = {
  gold: CHIP_CLASS.warning,
  silver: CHIP_CLASS.info,
  bronze: CHIP_CLASS.mutedSoft,
};

// `labelKey`, not `label`: these strings are dictionary keys the panel below
// resolves through t(), which is what tells the raw-UI scan they are not copy.
const GROUPS: { id: string; labelKey: string }[] = [
  { id: "training", labelKey: "ach.group.training" },
  { id: "consistency", labelKey: "ach.group.consistency" },
  { id: "growth", labelKey: "ach.group.growth" },
  { id: "explorer", labelKey: "ach.group.explorer" },
  { id: "scholar", labelKey: "ach.group.scholar" },
  { id: "analyst", labelKey: "ach.group.analyst" },
];

export function AchievementsPage() {
  const { t } = useI18n();
  const { state } = useOs();
  const { navigate } = useRouter();
  const learn = useLearnRecords();

  const input = useMemo(() => achievementInput({
    xp: state.profile?.xp ?? 0,
    sessions: state.sessions,
    goals: state.goals,
    streak: state.streak.current,
    watchlist: state.watchlist,
    plans: state.plans,
    lessons: summarizeLearn(learn),
    filmClips: loadFilmClips().length,
  }), [state, learn]);

  const list = useMemo(() => evaluateAchievements(input), [input]);
  const stat = summary(list);

  if (!state.onboarded) {
    return (
      <Panel className="p-6">
        <EmptyState title={t("ach.needProfile")} icon="♛" hint={t("ach.needProfileHint")} />
        <div className="mt-4 flex justify-center">
          <Button size="sm" onClick={() => navigate("/onboarding")}>{t("prof.createProfile")}</Button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{t("ach.title")}</h1>
            <DemoBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("ach.subtitle")}</p>
        </div>
        <Link to="/profile" className="text-sm text-primary hover:underline">{t("ach.backToProfile")} →</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("ach.unlocked")} value={`${stat.unlocked}/${stat.total}`} tone="up" />
        <StatTile label={t("ach.points")} value={stat.points} />
        <StatTile label={t("ach.recentSessions")} value={input.sessions} />
        <StatTile label={t("ach.streak")} value={`${input.streak}d`} />
      </div>

      {stat.unlocked === 0 && (
        <Panel className="p-4">
          <EmptyState title={t("ach.noneYet")} hint={t("ach.noneYetHint")} icon="◇" />
        </Panel>
      )}

      {GROUPS.map((g) => {
        const items = list.filter((a) => a.group === g.id);
        const gs = stat.byGroup.get(g.id);
        return (
          <Panel key={g.id} className="p-4">
            <SectionTitle
              title={t(g.labelKey)}
              action={<span className="font-mono text-xs text-muted-foreground tabular-nums">{gs?.unlocked ?? 0}/{gs?.total ?? 0}</span>}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => <AchievementCard key={a.id} a={a} t={t} />)}
            </div>
          </Panel>
        );
      })}

      <p className="text-[11px] text-muted-foreground">{t("ach.disclaimer")}</p>
    </div>
  );
}

function AchievementCard({ a, t }: { a: AchievementStatus; t: (k: string) => string }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        a.unlocked ? TONE[a.tier] : "border-border/50 bg-secondary/10 opacity-80",
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg", a.unlocked ? "bg-card" : "bg-secondary text-muted-foreground")}>
          {a.unlocked ? a.icon : "🔒"}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{t(`ach.name.${a.id}`)}</div>
          <div className="truncate text-[11px] text-muted-foreground">{t(`ach.desc.${a.id}`)}</div>
        </div>
      </div>
      <div className="mt-2.5">
        <Progress value={a.pct * 100} />
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="uppercase tracking-wide">{t(`ach.tier.${a.tier}`)}</span>
          <span className="font-mono tabular-nums">{Math.min(a.value, a.target)}/{a.target}</span>
        </div>
      </div>
    </div>
  );
}
