import { useMemo, useRef, useState } from "react";
import { Link, useRouter, matchRoute } from "@/lib/router";
import { newId } from "@/lib/ids";
import { useI18n, formatDate } from "@/i18n";
import { useOs, levelInfo } from "@/store/useFootballOS";
import {
  ATTRIBUTE_KEYS,
  CATEGORY_ORDER,
  attributesByCategory,
  overallRating,
  weakestAttributes,
  sum,
  unique,
} from "@/domain/attributes";
import { computeDna } from "@/domain/playerDna";
import { SUPPORTED_MINUTES, sessionIntensity, plannedSessions, type GrowthDelta } from "@/domain/training";
import { buildLoad, ZONE_LABEL, ZONE_TONE, type LoadZone } from "@/domain/load";
import { videoProvider, type VideoReport } from "@/data/video";
import { loadFilmClips } from "@/domain/filmLibrary";
import { FIXTURES_KEY, browserStore, readJson, writeJson } from "@/domain/localData";
import { goalProgressPct, isValidGoalTarget } from "@/domain/goals";
import { ageGroupLabel, goalLabel, phaseLabel, positionLabel, rowLine } from "@/domain/rowText";
import { getClub, getPlayer } from "@/data/footballService";
import { Panel, SectionTitle, StatTile, AttributeBar, DnaCard, EmptyState, LoadingBlock, ErrorState, Crest } from "@/ui/primitives";
import { AttributeRadar, ProgressLine } from "@/ui/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {cn, pct, pctOf, fmt2, fmt1, ABSENT } from "@/lib/utils";
import { useLearnRecords } from "@/lib/hooks";
import { summarizeLearn } from "@/domain/learn";
import { achievementInput, evaluateAchievements, nextBadges } from "@/domain/achievements";
import type { GoalMetric, TrainingSession } from "@/domain/types";

// A provider identifier is data, not a sentence a visitor reads, but written inside a
// render hole the raw-UI scan reads the literal as children — the same reason the date
// option bags were hoisted at M164 and M170. Hoisting is the honest fix: the string is
// still one place, and it stops being counted as copy nobody translated.
const DEMO_PROVIDER = "demo-coach-v1";

// `labelKey`, not `label`: every value here is already a `player.*` dictionary key and
// the tab strip below renders it through t(). As `label` the raw-UI scan read all ten as
// display copy, which is the point of the convention — a key field is not copy.
const TABS = [
  { key: "", labelKey: "player.overview" },
  { key: "coach", labelKey: "player.coach" },
  { key: "attributes", labelKey: "player.attributes" },
  { key: "skills", labelKey: "player.skills" },
  { key: "training", labelKey: "player.training" },
  { key: "progress", labelKey: "player.progress" },
  { key: "goals", labelKey: "player.goals" },
  { key: "workload", labelKey: "player.workload" },
  { key: "video", labelKey: "player.video" },
  { key: "matches", labelKey: "player.matches" },
];

export function PlayerOS() {
  const { path, navigate } = useRouter();
  const { state } = useOs();
  const { t } = useI18n();

  if (!state.profile) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-xl font-bold">{t("player.profileSetup")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("player.profileSetupHint")}</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding")}>{t("player.startOnboarding")}</Button>
      </Panel>
    );
  }

  const sub = matchRoute("/player/:tab?", path)?.tab ?? "";
  const active = TABS.find((x) => x.key === sub) ? sub : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">⚽</span>
          <div>
            <h1 className="text-xl font-bold">{t("nav.player")} · {state.profile.displayName}</h1>
            <div className="text-sm text-muted-foreground">{positionLabel(state.profile.position, t)} · {ageGroupLabel(state.profile.ageGroup, t)} · {t("player.goalWord")}: {goalLabel(state.profile.goal, t)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">{t("player.ovr")} {overallRating(state.profile.attributes)}</Badge>
          <Badge variant="outline" className="font-mono text-primary">{t("player.levelLabel", { n: state.profile.level })}</Badge>
          <Badge variant="outline" className="font-mono">🔥 {state.streak.current}d</Badge>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-none border-b pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => navigate(`/player${tab.key ? "/" + tab.key : ""}`)}
            className={cn("whitespace-nowrap rounded-t-md px-3 py-2 text-sm transition", active === tab.key ? "border-b-2 border-primary font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {active === "" && <Overview />}
      {active === "coach" && <Coach />}
      {active === "attributes" && <Attributes />}
      {active === "skills" && <Skills />}
      {active === "training" && <Training />}
      {active === "progress" && <ProgressView />}
      {active === "goals" && <Goals />}
      {active === "workload" && <Workload />}
      {active === "video" && <Video />}
      {active === "matches" && <Matches />}
    </div>
  );
}

function Overview() {
  const { state } = useOs();
  const { t } = useI18n();
  const { navigate } = useRouter();
  const p = state.profile!;
  const info = levelInfo(p.xp);
  const dna = computeDna(p.attributes);
  const next = plannedSessions(state.sessions)[0];
  const weak = weakestAttributes(p.attributes, 3);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title={t("player.footballIdentity")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <AttributeRadar attrs={p.attributes} />
          <div className="space-y-3">
            <DnaCard dna={dna} />
            <div className="rounded-lg border bg-card/40 p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("player.biggestGaps")}</div>
              <div className="mt-2 space-y-2">
                {weak.map((w) => <AttributeBar key={w.key} label={t(`attr.name.${w.key}`)} value={w.value} />)}
              </div>
            </div>
          </div>
        </div>
      </Panel>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={t("common.level")} value={info.level} sub={`${info.intoLevel}/${info.forNext} XP`} />
          <StatTile label={t("common.overall")} value={overallRating(p.attributes)} />
        </div>
        <Panel className="p-4">
          <SectionTitle title={t("player.nextAction")} />
          {next ? (
            <div>
              <div className="text-sm font-medium">{rowLine(next.title, t)}</div>
              <div className="text-xs text-muted-foreground">{t("player.minPlanned", { n: next.targetMinutes })}</div>
              <Button size="sm" className="mt-3 w-full" onClick={() => navigate("/player/training")}>{t("player.goToTraining")}</Button>
            </div>
          ) : (
            <Button size="sm" className="w-full" onClick={() => navigate("/player/coach")}>{t("player.askCoach")}</Button>
          )}
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={t("player.aiMemoryTitle")} hint={t("player.aiMemoryHint")} />
          <div className="space-y-2">
            {state.memory.slice(0, 4).map((m) => (
              <div key={m.id} className="flex gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span className="text-muted-foreground">{rowLine(m.text, t)}</span>
              </div>
            ))}
            {state.memory.length === 0 && <p className="text-xs text-muted-foreground">{t("player.noMemory")}</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Coach() {
  const { state, requestPlan } = useOs();
  const { t } = useI18n();
  const { navigate, query } = useRouter();
  // A "Plan these in Coach" handoff from the Development page carries the
  // player's top role-gap priorities in `?f=`. Validate them against the real
  // attribute keys and cap at two (mirroring generatePlan's own limit); while
  // they're active the coach targets them explicitly rather than inferring from
  // the prompt. Editing the prompt or hitting "New" hands focus back to the text.
  const carriedFocus = useMemo(() => {
    const raw = query.get("f");
    if (!raw) return [] as string[];
    return unique(raw.split(",").map((k) => k.trim()).filter((k) => ATTRIBUTE_KEYS.includes(k))).slice(0, 2);
  }, [query]);
  const [carryKeys, setCarryKeys] = useState<string[]>(carriedFocus);
  // `brief` rather than `prompt`: the plan's prompt is a ROW now, and a local string under
  // the same name sits one keystroke from proof-i18n's row contract (which reads `{prompt}`
  // as a row printed raw). The user's own words never were a row — they become `{ value }`.
  const [brief, setBrief] = useState(() =>
    carriedFocus.length ? t("player.coachCarry", { labels: carriedFocus.map((k) => t(`attr.name.${k}`)).join(", ") }) : "",
  );
  const [minutes, setMinutes] = useState(45);
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState<string | null>(() => state.plans[0]?.id ?? null);
  const plan = state.plans.find((x) => x.id === planId) ?? null;
  const load = useMemo(() => buildLoad({ nowMs: Date.now(), sessions: state.sessions }), [state.sessions]);
  const LOAD_TONE: Record<LoadZone, string> = {
    none: "border-border text-muted-foreground",
    ...ZONE_TONE,
  };

  const onBriefChange = (v: string) => {
    setBrief(v);
    if (carryKeys.length) setCarryKeys([]);
  };

  const run = async () => {
    if (!brief.trim()) {
      toast.error(t("player.tellCoach"));
      return;
    }
    setBusy(true);
    try {
      const p = await requestPlan({ value: brief }, minutes, carryKeys.length ? carryKeys : undefined);
      setPlanId(p.id);
      toast.success(t("player.generatePlan"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("player.tellCoach"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.coach")} hint={t("player.coachCarryHint")} />
        <Textarea
          value={brief}
          onChange={(e) => onBriefChange(e.target.value)}
          rows={4}
          placeholder={t("player.coachPlaceholder")}
          className="resize-none"
        />
        {carryKeys.length > 0 && (
          <p className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] text-muted-foreground">
            {t("player.coachCarryHint")} <span className="font-medium text-primary">{carryKeys.map((k) => t(`attr.name.${k}`)).join(", ")}</span>
          </p>
        )}
        <div className="mt-3">
          <Label>{t("player.availableTime")}</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SUPPORTED_MINUTES.map((m) => (
              <button key={m} onClick={() => setMinutes(m)} className={cn("rounded-md border px-2.5 py-1 text-xs", minutes === m ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
                {m}′
              </button>
            ))}
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={run} disabled={busy}>
          {busy ? t("player.coachThinking") : t("player.generatePlan")}
        </Button>
        {load.hasData && (
          <Link
            to="/load"
            className={cn("mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-secondary/40", LOAD_TONE[load.zone])}
          >
            <span className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-widest">{rowLine(ZONE_LABEL[load.zone], t)}</span>
              <span className="font-mono">{t("player.acwr")} {load.acwr == null ? ABSENT : fmt2(load.acwr)}</span>
            </span>
            <span className="text-muted-foreground">{t("player.coachAdapts")}</span>
          </Link>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">{t("player.providerNote", { provider: plan?.provider ?? DEMO_PROVIDER })}</p>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("player.coachPlan")} />
        {busy && <LoadingBlock rows={4} />}
        {!busy && !plan && <EmptyState title={t("player.noPlanYet")} hint={t("player.askCoachBuild")} icon="✦" />}
        {!busy && plan && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-card/40 p-3 text-sm">{plan.diagnosis.map((d) => rowLine(d, t)).join(" ")}</div>
            <div className="flex flex-wrap gap-1.5">
              {plan.focus.map((f) => <Badge key={f} variant="outline" className="text-primary">{t(`attr.name.${f}`)}</Badge>)}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("player.sessionMinutes", { n: plan.session.targetMinutes })}</div>
              <div className="mt-2 space-y-1.5">
                {plan.session.exercises.map((e, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border bg-card/30 px-3 py-1.5 text-sm">
                    <span><span className="mr-2 font-mono text-[10px] text-muted-foreground">{phaseLabel(e.phase, t)}</span>{t(`drill.${e.key}`)}</span>
                    <span className="font-mono text-xs text-muted-foreground">{e.minutes}′</span>
                  </div>
                ))}
              </div>
            </div>
            <details className="rounded-md border bg-card/30 p-3 text-sm">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("player.rationaleEvidenceSources")}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {plan.rationale.map((r, i) => <li key={i}>{rowLine(r, t)}</li>)}
              </ul>
              <div className="mt-2 text-xs">{t("player.confidencePct", { n: plan.confidence })}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t("common.sources")}: {plan.sources.map((s) => rowLine(s, t)).join(" · ")}</div>
            </details>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => navigate("/player/training")}>{t("player.scheduleTrain")}</Button>
              <Button size="sm" variant="outline" onClick={() => { setBrief(""); setCarryKeys([]); setPlanId(null); }}>{t("player.newPlan")}</Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Attributes() {
  const { state } = useOs();
  const { t } = useI18n();
  const p = state.profile!;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="p-4">
        <SectionTitle title={t("player.capabilityRadar")} />
        <AttributeRadar attrs={p.attributes} height={300} />
      </Panel>
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
        {CATEGORY_ORDER.map((cat) => (
          <Panel key={cat} className="p-4">
            <SectionTitle title={t(`attr.${cat}`)} />
            <div className="space-y-2">
              {attributesByCategory(cat).map((d) => <AttributeBar key={d.key} label={t(`attr.name.${d.key}`)} value={p.attributes[d.key]} />)}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function Skills() {
  const { state } = useOs();
  const { t } = useI18n();
  const p = state.profile!;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CATEGORY_ORDER.map((cat) => (
        <Panel key={cat} className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t(`attr.${cat}`)}</h3>
            <span className="font-mono text-xs text-muted-foreground">{Math.round(sum(attributesByCategory(cat), (d) => p.attributes[d.key]) / attributesByCategory(cat).length)}</span>
          </div>
          <div className="space-y-2.5">
            {attributesByCategory(cat).map((d) => {
              const v = p.attributes[d.key];
              const nodeLevel = Math.max(1, Math.floor(v / 12));
              return (
                <div key={d.key} className="flex items-center gap-2">
                  <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-bold", v >= 70 ? "bg-primary/20 text-primary" : v >= 50 ? "bg-info/20 text-info" : "bg-secondary text-muted-foreground")}>
                    {nodeLevel}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">{t(`attr.name.${d.key}`)}</div>
                    <Progress value={v} className="mt-1 h-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Training() {
  const { state, completeSession } = useOs();
  const { t, locale } = useI18n();
  const planned = plannedSessions(state.sessions);
  // The counters count the world, the rows render a cut — the same split the
  // dashboard's live strip took at M294 and the hub's at M297: a hint that
  // reads the sliced array prints the cut's size against worlds the cut
  // cannot represent (9 missed → "8 slipped", 40 done → "20 completed").
  const missedAll = state.sessions.filter((s) => s.status === "missed");
  const missed = missedAll.slice(0, 8);
  const historyAll = state.sessions.filter((s) => s.status === "completed");
  const history = historyAll.slice(0, 20);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.trainingToday")} hint={t("player.plannedCount", { n: planned.length })} action={<Link to="/player/coach" className="text-xs text-primary hover:underline">{t("player.newPlanShort")}</Link>} />
        {planned.length ? (
          <div className="space-y-3">{planned.map((s) => <SessionCard key={s.id} session={s} onComplete={completeSession} />)}</div>
        ) : (
          <EmptyState title={t("player.noPlannedSessions")} hint={t("player.askCoachBuildOne")} icon="⚑" />
        )}
      </Panel>
      {missed.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title={t("player.missed")} hint={t("player.slippedCount", { n: missedAll.length })} />
          <div className="divide-y">
            {missed.map((sess) => (
              <div key={sess.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{rowLine(sess.title, t)}</div>
                  <div className="text-xs text-muted-foreground">{t("player.missedDate", { date: formatDate(locale, sess.date), min: sess.targetMinutes })}</div>
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-muted-foreground">{t("player.missedBadge")}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel className="p-4">
        <SectionTitle title={t("player.history")} hint={t("player.completedCount", { n: historyAll.length })} />
        {history.length ? (
          <div className="divide-y">
            {history.map((sess) => (
              <div key={sess.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{rowLine(sess.title, t)}</div>
                  <div className="text-xs text-muted-foreground">{t("player.completedDate", { date: sess.completedAt ? formatDate(locale, sess.completedAt) : ABSENT, rating: sess.selfRating ?? ABSENT })}</div>
                  {sess.growth && sess.growth.some((g) => g.delta > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sess.growth.filter((g) => g.delta > 0).map((g) => (
                        <span key={g.key} className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">{t(`attr.name.${g.key}`)} +{g.delta}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-success">{t("player.xpAwarded", { n: sess.xpAwarded ?? 0 })}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t("player.noCompletedSessions")} icon="✓" />
        )}
      </Panel>
    </div>
  );
}

function SessionCard({ session, onComplete }: { session: TrainingSession; onComplete: (id: string, r: number, notes?: string) => GrowthDelta[] }) {
  const { t } = useI18n();
  const [rating, setRating] = useState("4");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{rowLine(session.title, t)}</div>
          <div className="text-xs text-muted-foreground">{t("player.sessionSummary", { min: session.targetMinutes, r: sessionIntensity(session), n: session.exercises.length })}</div>
        </div>
        <button className="text-xs text-primary" onClick={() => setOpen((o) => !o)}>{open ? t("player.hide") : t("player.detail")}</button>
      </div>
      {open && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {session.exercises.map((e, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground"><span>{t(`drill.${e.key}`)}</span><span className="font-mono">{e.minutes}′</span></div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-end gap-3">
        <div>
          <div className="mb-1 text-[11px] text-muted-foreground">{t("player.howDidItFeel")}</div>
          <RadioGroup value={rating} onValueChange={setRating} className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex items-center gap-1 text-xs">
                <RadioGroupItem id={`${session.id}-${n}`} value={String(n)} />
                <span>{n}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
        <div className="flex-1">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("player.notesOptional")} className="h-8 text-xs" />
        </div>
        <Button size="sm" onClick={() => {
          const deltas = onComplete(session.id, Number(rating), notes || undefined);
          const grew = deltas.filter((d) => d.delta > 0).map((d) => `${t(`attr.name.${d.key}`)} +${d.delta}`).join(" · ");
          toast.success(grew ? t("player.sessionCompleteGrowth", { growth: grew }) : t("player.sessionCompleteXp"));
        }}>{t("player.complete")}</Button>
      </div>
    </div>
  );
}

function ProgressView() {
  const { t } = useI18n();
  const { state } = useOs();
  const learn = useLearnRecords();
  const p = state.profile!;
  const info = levelInfo(p.xp);
  const pts = state.progress.map((x, i) => ({ label: i === 0 ? t("common.chartStart") : t("player.levelLabel", { n: i }), value: x.overall }));
  // The badge list IS the catalogue on /achievements, ranked by the same comparator the
  // Dashboard tile uses. It used to be six hand-written rows, one of which ("1000 XP")
  // named a badge that exists nowhere in the app.
  const next = useMemo(() => nextBadges(evaluateAchievements(achievementInput({
    xp: p.xp,
    sessions: state.sessions,
    goals: state.goals,
    streak: state.streak.current,
    watchlist: state.watchlist,
    plans: state.plans,
    lessons: summarizeLearn(learn),
    filmClips: loadFilmClips().length,
  })), 6), [state, p.xp, learn]);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title={t("player.growthCurve")} hint={t("player.growthCurveHint")} />
        {pts.length > 1 ? <ProgressLine points={pts} height={220} /> : <EmptyState title={t("player.plotCurve")} icon="📈" />}
      </Panel>
      <div className="space-y-4">
        <Panel className="p-4">
          <SectionTitle title={t("common.level")} />
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{t("player.levelLabel", { n: info.level })}</span><span>{t("player.levelNextLabel", { n: info.level + 1 })}</span></div>
          <Progress value={info.progress * 100} className="h-2" />
          <div className="mt-2 text-xs text-muted-foreground">{t("player.xpToNextTotal", { a: info.forNext - info.intoLevel, b: p.xp })}</div>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title={t("player.nextBadges")} />
          <div className="space-y-2">
            {next.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className="w-4 shrink-0 text-center">{a.icon}</span>
                <span className="min-w-0 flex-1 truncate">{t(`ach.name.${a.id}`)}</span>
                <Progress value={a.pct * 100} className="h-1.5 w-14 shrink-0" />
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{Math.min(a.value, a.target)}/{a.target}</span>
              </div>
            ))}
            {next.length === 0 && <div className="text-xs text-muted-foreground">{t("player.allBadgesUnlocked")}</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Goals() {
  const { t } = useI18n();
  const { state, addGoal, removeGoal } = useOs();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("5");
  const [metric, setMetric] = useState<GoalMetric>("sessions");
  const targetOk = isValidGoalTarget(Number(target));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.goalsTitle")} />
        <div className="space-y-3">
          {state.goals.map((g) => (
            <div key={g.id} className="group rounded-lg border bg-card/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className={cn("min-w-0 truncate", g.done && "text-muted-foreground line-through")}>{rowLine(g.title, t)}</span>
                <span className="ml-2 flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-xs">{Math.min(g.current, g.target)}/{g.target}</span>
                  <button onClick={() => { removeGoal(g.id); toast.success(t("player.goalRemoved")); }} aria-label={t("player.goalRemoveAria")} className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100">✕</button>
                </span>
              </div>
              <Progress value={goalProgressPct(g)} className="mt-2 h-1.5" />
            </div>
          ))}
          {state.goals.length === 0 && <EmptyState title={t("prof.noGoals")} icon="◎" />}
        </div>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title={t("player.goalsAdd")} />
        <div className="space-y-3">
          <div><Label>{t("player.goalFieldTitle")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder={t("player.goalPlaceholder")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{t("player.goalFieldMetric")}</Label><select value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"><option value="xp">{t("player.goalMetricXp")}</option><option value="sessions">{t("player.goalMetricSessions")}</option><option value="level">{t("player.goalMetricLevel")}</option></select></div>
            <div><Label>{t("player.goalFieldTarget")}</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" /></div>
          </div>
          {!targetOk && <p className="text-[11px] text-destructive">{t("player.goalTargetHint")}</p>}
          <Button disabled={!targetOk || !title.trim()} onClick={() => { addGoal({ title: { value: title.trim() }, metric, target: Number(target), current: metric === "xp" ? state.profile!.xp : metric === "level" ? state.profile!.level : state.sessions.filter((s) => s.status === "completed").length }); setTitle(""); toast.success(t("player.goalAdded")); }}>{t("player.goalsAdd")}</Button>
        </div>
      </Panel>
    </div>
  );
}

function Workload() {
  const { t } = useI18n();
  const { state } = useOs();
  const completed = state.sessions.filter((s) => s.status === "completed");
  // Single source of truth: use the canonical rolling 7-/28-DAY model the Load
  // page and Dashboard already use, so this panel can never disagree with them.
  const load = buildLoad({ nowMs: Date.now(), sessions: state.sessions });
  const acwr = load.acwr;
  const byWeek = load.weekly.map((w, i) => ({ label: `w${i + 1}`, value: w.load }));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-3 lg:col-span-1">
        <StatTile label={t("player.acuteLoad")} value={load.acute} sub={t("player.7dayAvg")} />
        <StatTile label={t("player.chronicLoad")} value={load.chronic} sub={t("player.28dayAvg")} />
        <StatTile label={t("player.acwr")} value={acwr ?? ABSENT} tone={acwr && acwr > 1.5 ? "down" : acwr && acwr >= 0.8 ? "up" : "neutral"} sub={rowLine(ZONE_LABEL[load.zone], t)} />
        <StatTile label={t("player.sessionsCount")} value={completed.length} />
      </div>
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title={t("player.trainingVolume")} hint={t("player.volumeHint")} />
        {load.hasData ? (
          <div className="flex h-48 items-end gap-2">
            {byWeek.map((w) => {
              const max = Math.max(...byWeek.map((x) => x.value), 1);
              return (
                <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-primary/60 transition-all" style={{ height: pctOf(w.value, max) }} />
                  <span className="text-[10px] text-muted-foreground">{w.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title={t("ld.emptyTitle")} hint={t("player.completeSessionsLoad")} icon="⚖" />
        )}
        {load.zone === "high" && <p className="mt-3 text-xs text-warning">{t("player.acwrWarning", { ratio: acwr?.toFixed(2) ?? ABSENT })}</p>}
      </Panel>
    </div>
  );
}

function Video() {
  const { state, requestPlan } = useOs();
  const { t } = useI18n();
  const { navigate } = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<VideoReport | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const analyze = async (file: File) => {
    lastFileRef.current = file;
    if (!state.profile) {
      setError(new Error(t("common.err.needOnboarding")));
      return;
    }
    setBusy(true);
    setReport(null);
    setError(null);
    setProgress(0);
    try {
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 260));
        setProgress(pct((i + 1) / 6));
      }
      const rep = await videoProvider.analyze({ fileId: `${file.name}-${file.size}`, fileName: file.name, sizeBytes: file.size, attrs: state.profile.attributes });
      setReport(rep);
      toast.success(t("film.toastAnalysed"));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(t("common.err.analysisFailed")));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.video")} hint={t("player.uploadClip")} />
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])} />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) analyze(f); }}
          className="grid place-items-center rounded-xl border-2 border-dashed py-12 text-center"
        >
          <div className="text-3xl opacity-40">⬆</div>
          <p className="mt-2 text-sm text-muted-foreground">{t("player.dropVideo")}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => inputRef.current?.click()}>{t("player.chooseFile")}</Button>
        </div>
        {busy && (
          <div className="mt-4">
            <Progress value={progress} className="h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">{t("player.processing", { n: progress })}</p>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">{t("player.demoDisclosureVideo")}</p>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title={t("player.report")} />
        {error && <ErrorState error={error} retry={() => lastFileRef.current && analyze(lastFileRef.current)} />}
        {!error && !report && !busy && <EmptyState title={t("player.noAnalysisYet")} icon="▶" />}
        {busy && <LoadingBlock rows={4} />}
        {report && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">{report.fileName}</span>
              <Badge variant="outline" className="border-warning/40 text-warning">{t("player.demoConfidence", { n: report.confidence })}</Badge>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-success">{t("player.strengths")}</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{report.strengths.map((s, i) => <li key={i}>{rowLine(s, t)}</li>)}</ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-destructive">{t("player.weaknesses")}</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{report.weaknesses.map((s, i) => <li key={i}>{rowLine(s, t)}</li>)}</ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">{t("player.threeImprovements")}</div>
              <ol className="mt-1 list-decimal pl-5 text-xs text-muted-foreground">{report.improvements.map((s, i) => <li key={i}>{rowLine(s, t)}</li>)}</ol>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("player.evidenceFrames")}</div>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {report.frames.map((f, i) => (
                  <div key={i} className="grid aspect-video place-items-center rounded bg-gradient-to-br from-secondary to-card text-center text-[9px] text-muted-foreground">{rowLine(f.label, t)}</div>
                ))}
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={async () => { await requestPlan({ key: "ai.videoAnalysisPrompt", vars: { improvement: report.improvements[0] && "key" in report.improvements[0] ? report.improvements[0].key : "", focus: report.recommendedFocus.join(",") } }, 30); toast.success(t("film.toastBuilt", { min: 30, n: report.recommendedFocus.length, focus: report.recommendedFocus.map((k) => t(`attr.name.${k}`)).join(", ") })); navigate("/player/training"); }}>
              {t("player.createTrainingFromAnalysis")}
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Matches() {
  const { state } = useOs();
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<{ id: string; opp: string; date: string; g: number; a: number; r: number }[]>(
    // M331: through the door. `readJson` answers `present` for a row that is really there and
    // keeps a corrupt one from being read as an empty match list, which is what the old
    // `JSON.parse(getItem() || "[]")` did — a real list and a broken one looked identical.
    () => readJson<{ id: string; opp: string; date: string; g: number; a: number; r: number }[]>(browserStore(), FIXTURES_KEY, []).value,
  );
  const [form, setForm] = useState({ opp: "", g: "0", a: "0", r: "7" });
  const save = (next: typeof rows) => { setRows(next); writeJson(browserStore(), FIXTURES_KEY, next); };
  const add = () => {
    if (!form.opp.trim()) return;
    save([{ id: newId("m-"), opp: form.opp, date: new Date().toISOString(), g: Number(form.g), a: Number(form.a), r: Number(form.r) }, ...rows]);
    setForm({ opp: "", g: "0", a: "0", r: "7" });
  };
  const remove = (id: string) => save(rows.filter((r) => r.id !== id));
  const club = state.profile?.favoriteClubId ? getClub(state.profile.favoriteClubId) : undefined;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.logMatch")} hint={t("player.localLogHint")} />
        <div className="space-y-3">
          <div><Label>{t("player.opponent")}</Label><Input value={form.opp} onChange={(e) => setForm({ ...form, opp: e.target.value })} className="mt-1" placeholder={t("player.opponentPlaceholder")} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>{t("player.statGoals")}</Label><Input type="number" value={form.g} onChange={(e) => setForm({ ...form, g: e.target.value })} className="mt-1" /></div>
            <div><Label>{t("player.assists")}</Label><Input type="number" value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} className="mt-1" /></div>
            <div><Label>{t("player.rating")}</Label><Input type="number" step="0.1" value={form.r} onChange={(e) => setForm({ ...form, r: e.target.value })} className="mt-1" /></div>
          </div>
          <Button onClick={add}>{t("player.addPerformance")}</Button>
        </div>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title={t("player.recentMatches")} action={club && <span className="text-xs text-muted-foreground">{club.name}</span>} />
        {rows.length ? (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="group flex items-center justify-between py-2 text-sm">
                <div><div>{r.opp}</div><div className="text-xs text-muted-foreground">{formatDate(locale, r.date)}</div></div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 font-mono text-xs"><span>{r.g}G {r.a}A</span><Badge variant="outline">{fmt1(r.r)}</Badge></div>
                  <button onClick={() => remove(r.id)} aria-label={t("player.deleteMatch", { opp: r.opp })} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100">✕</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t("player.noMatchesLogged")} icon="⚽" />
        )}
      </Panel>
    </div>
  );
}
