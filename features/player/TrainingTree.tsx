// The player's career depth screen (M453): this week's injury and fitness answer, the
// training-course tree with its prerequisite locks and the gain each course promises, and the
// potential radar against the present. Every number comes from domain/playerCareer.ts, whose
// proof pins the graph, the determinism and the promise-equals-payment rule.
import { useI18n } from "@/i18n";
import { Panel, SectionTitle, StatTile, CHIP_CLASS } from "@/ui/primitives";
import { PotentialRadar } from "@/ui/charts/PotentialRadar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocalStorage } from "@/lib/hooks";
import { TRAINING_TREE_KEY } from "@/domain/localData";
import { cn, pctLabel } from "@/lib/utils";
import type { Attributes } from "@/domain/types";
import {
  COURSES,
  courseTier,
  unlockedCourses,
  planCourse,
  injuryFor,
  fitnessFor,
  weekIndexOf,
  headroom,
} from "@/domain/playerCareer";
import { unique } from "@/domain/attributes";

export function TrainingTree({
  attrs,
  potential,
  seed,
}: {
  attrs: Attributes;
  potential: number;
  seed: string;
}) {
  const { t } = useI18n();
  // Finished courses are the visitor's own record — stored, never translated.
  const [done, setDone] = useLocalStorage<string[]>(TRAINING_TREE_KEY, []);
  const finished = done.filter((k) => COURSES.some((c) => c.key === k));

  const week = weekIndexOf(new Date().toISOString());
  const injury = injuryFor(seed, week);
  const fitness = fitnessFor(seed, week);
  const open = new Set(unlockedCourses(finished).map((c) => c.key));
  const tiers = unique(COURSES.map((c) => courseTier(c.key))).sort((a, b) => a - b);
  const gaps = headroom(attrs, potential).slice(0, 5);

  return (
    <div className="space-y-5">
      <Panel className="p-4">
        <SectionTitle title={t("career.cycle")} hint={t("career.cycleHint")} />
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label={t("career.fitness")} value={pctLabel(fitness)} />
          <StatTile
            label={t("career.injury")}
            value={injury ? t(`injury.${injury.key}`) : t("career.healthy")}
            sub={injury ? t("career.outWeeks", { n: injury.weeks }) : t("career.readyNote")}
          />
          <StatTile label={t("career.week")} value={String(week)} />
        </div>
        <Progress value={fitness * 100} className="mt-3" />
        {injury && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("career.injuredNote", {
              attrs: injury.attrs.map((a) => t(`attr.name.${a}`)).join(" + "),
            })}
          </p>
        )}
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("career.courses")} hint={t("career.treeHint")} />
        <div className="space-y-4">
          {tiers.map((tier) => (
            <div key={tier}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("career.tier", { n: tier + 1 })}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {COURSES.filter((c) => courseTier(c.key) === tier).map((c) => {
                  const current = attrs[c.focus] ?? 50;
                  // Every course in the table plans (planCourse only refuses an unknown key),
                  // and the proof pins that; the guard keeps the render honest if one is added
                  // without a focus the player has.
                  const plan = planCourse(c.key, current);
                  if (!plan) return null;
                  const isDone = finished.includes(c.key);
                  const isOpen = open.has(c.key);
                  const missing = c.requires.filter((r) => !finished.includes(r));
                  return (
                    <div
                      key={c.key}
                      className={cn("rounded-lg border p-3", isDone ? CHIP_CLASS.optionOn : "border-border")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{t(`course.${c.key}`)}</span>
                        <span className="text-xs text-muted-foreground">{t(`attr.name.${c.focus}`)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("career.weeks", { n: c.weeks })} × {t("career.perWeek", { n: c.sessionsPerWeek })} ={" "}
                        {plan.sessions} {t("career.sessions")}
                      </div>
                      <div className="mt-1 font-mono text-sm">
                        <span className="text-muted-foreground">{t("career.gain")}: </span>
                        {plan.from} → {plan.to} <span className="text-success">+{plan.gain}</span>
                      </div>
                      <div className="mt-2">
                        {isDone ? (
                          <span className={cn("rounded-md px-2 py-1 text-xs", CHIP_CLASS.optionOn)}>{t("career.done")}</span>
                        ) : isOpen ? (
                          <Button size="sm" variant="outline" onClick={() => setDone([...finished, c.key])}>
                            {t("career.start")}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("career.locked")}: {missing.map((m) => t(`course.${m}`)).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("career.potential")} hint={t("career.potentialHint")} />
        <PotentialRadar attrs={attrs} potential={potential} />
        <ul className="mt-3 space-y-1">
          {gaps.map((g) => (
            <li key={g.key} className="flex items-center justify-between text-xs">
              <span>{t(`attr.name.${g.key}`)}</span>
              <span className="font-mono text-muted-foreground">
                {g.current} / {g.ceiling} <span className="text-info">+{g.gap}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
