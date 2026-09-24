import { useMemo, useRef, useState } from "react";
import { Link, useRouter, matchRoute } from "@/lib/router";
import { useI18n } from "@/i18n";
import { useOs, levelInfo } from "@/store/useFootballOS";
import {
  ATTRIBUTE_DEFS,
  ATTRIBUTE_KEYS,
  CATEGORY_ORDER,
  attributesByCategory,
  attributeLabel,
  overallRating,
  weakestAttributes,
  strongestAttributes,
} from "@/domain/attributes";
import { computeDna } from "@/domain/playerDna";
import { SUPPORTED_MINUTES, sessionIntensity, type GrowthDelta } from "@/domain/training";
import { buildLoad, ZONE_LABEL, type LoadZone } from "@/domain/load";
import { videoProvider, type VideoReport } from "@/data/video";
import { loadFilmClips } from "@/domain/filmLibrary";
import { FIXTURES_KEY } from "@/domain/localData";
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
import { cn } from "@/lib/utils";
import type { GoalMetric, TrainingSession } from "@/domain/types";

const TABS = [
  { key: "", label: "player.overview" },
  { key: "coach", label: "player.coach" },
  { key: "attributes", label: "player.attributes" },
  { key: "skills", label: "player.skills" },
  { key: "training", label: "player.training" },
  { key: "progress", label: "player.progress" },
  { key: "goals", label: "player.goals" },
  { key: "workload", label: "player.workload" },
  { key: "video", label: "player.video" },
  { key: "matches", label: "player.matches" },
];

export function PlayerOS() {
  const { path, navigate } = useRouter();
  const { state } = useOs();
  const { t } = useI18n();

  if (!state.profile) {
    return (
      <Panel className="p-8 text-center">
        <h1 className="text-xl font-bold">Set up your Player profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Onboarding creates your attributes, XP and AI coach memory.</p>
        <Button className="mt-4" onClick={() => navigate("/onboarding")}>Start onboarding</Button>
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
            <div className="text-sm text-muted-foreground">{state.profile.position} · {state.profile.ageGroup} · goal: {state.profile.goal}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">OVR {overallRating(state.profile.attributes)}</Badge>
          <Badge variant="outline" className="font-mono text-primary">Lv {state.profile.level}</Badge>
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
            {t(tab.label)}
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
  const next = state.sessions.find((s) => s.status === "planned");
  const weak = weakestAttributes(p.attributes, 3);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title="Your football identity" />
        <div className="grid gap-4 sm:grid-cols-2">
          <AttributeRadar attrs={p.attributes} />
          <div className="space-y-3">
            <DnaCard dna={dna} />
            <div className="rounded-lg border bg-card/40 p-3">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Biggest gaps</div>
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
          <StatTile label="Overall" value={overallRating(p.attributes)} />
        </div>
        <Panel className="p-4">
          <SectionTitle title="Next action" />
          {next ? (
            <div>
              <div className="text-sm font-medium">{next.title}</div>
              <div className="text-xs text-muted-foreground">{next.targetMinutes}′ planned</div>
              <Button size="sm" className="mt-3 w-full" onClick={() => navigate("/player/training")}>Go to training →</Button>
            </div>
          ) : (
            <Button size="sm" className="w-full" onClick={() => navigate("/player/coach")}>Ask the AI Coach →</Button>
          )}
        </Panel>
        <Panel className="p-4">
          <SectionTitle title="AI memory" hint="What your coach remembers" />
          <div className="space-y-2">
            {state.memory.slice(0, 4).map((m) => (
              <div key={m.id} className="flex gap-2 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span className="text-muted-foreground">{m.text}</span>
              </div>
            ))}
            {state.memory.length === 0 && <p className="text-xs text-muted-foreground">No memory yet.</p>}
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
    return [...new Set(raw.split(",").map((k) => k.trim()).filter((k) => ATTRIBUTE_KEYS.includes(k)))].slice(0, 2);
  }, [query]);
  const [carryKeys, setCarryKeys] = useState<string[]>(carriedFocus);
  const [prompt, setPrompt] = useState(() =>
    carriedFocus.length ? t("player.coachCarry").replace("{labels}", carriedFocus.map((k) => t(`attr.name.${k}`)).join(", ")) : "",
  );
  const [minutes, setMinutes] = useState(45);
  const [busy, setBusy] = useState(false);
  const [planId, setPlanId] = useState<string | null>(() => state.plans[0]?.id ?? null);
  const plan = state.plans.find((x) => x.id === planId) ?? null;
  const load = useMemo(() => buildLoad({ nowMs: Date.now(), sessions: state.sessions }), [state.sessions]);
  const LOAD_TONE: Record<LoadZone, string> = {
    none: "border-border text-muted-foreground",
    under: "border-primary/40 bg-primary/10 text-primary",
    optimal: "border-success/40 bg-success/10 text-success",
    caution: "border-warning/40 bg-warning/10 text-warning",
    high: "border-destructive/40 bg-destructive/10 text-destructive",
  };

  const onPromptChange = (v: string) => {
    setPrompt(v);
    if (carryKeys.length) setCarryKeys([]);
  };

  const run = async () => {
    if (!prompt.trim()) {
      toast.error("Tell the coach what to work on");
      return;
    }
    setBusy(true);
    try {
      const p = await requestPlan(prompt, minutes, carryKeys.length ? carryKeys : undefined);
      setPlanId(p.id);
      toast.success("Training plan generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not build a plan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.coach")} hint="Describe your situation — the coach reads your history" />
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          rows={4}
          placeholder="e.g. I only have 45 minutes today, my right foot is weak and my first touch was poor in the last match."
          className="resize-none"
        />
        {carryKeys.length > 0 && (
          <p className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] text-muted-foreground">
            {t("player.coachCarryHint")} <span className="font-medium text-primary">{carryKeys.map((k) => t(`attr.name.${k}`)).join(", ")}</span>
          </p>
        )}
        <div className="mt-3">
          <Label>Available time</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {SUPPORTED_MINUTES.map((m) => (
              <button key={m} onClick={() => setMinutes(m)} className={cn("rounded-md border px-2.5 py-1 text-xs", minutes === m ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>
                {m}′
              </button>
            ))}
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={run} disabled={busy}>
          {busy ? "Coach is thinking…" : "Generate training plan"}
        </Button>
        {load.hasData && (
          <Link
            to="/load"
            className={cn("mt-3 flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-secondary/40", LOAD_TONE[load.zone])}
          >
            <span className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-widest">{ZONE_LABEL[load.zone]}</span>
              <span className="font-mono">ACWR {load.acwr == null ? "—" : load.acwr.toFixed(2)}</span>
            </span>
            <span className="text-muted-foreground">Coach adapts to this →</span>
          </Link>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">Provider: {plan?.provider ?? "demo-coach-v1"} · deterministic Demo Mode · swap to a Cloud Agent without UI changes.</p>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title="Coach plan" />
        {busy && <LoadingBlock rows={4} />}
        {!busy && !plan && <EmptyState title="No plan yet" hint="Ask the coach to build your next session." icon="✦" />}
        {!busy && plan && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-card/40 p-3 text-sm">{plan.diagnosis}</div>
            <div className="flex flex-wrap gap-1.5">
              {plan.focus.map((f) => <Badge key={f} variant="outline" className="text-primary">{t(`attr.name.${f}`)}</Badge>)}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Session · {plan.session.targetMinutes}′</div>
              <div className="mt-2 space-y-1.5">
                {plan.session.exercises.map((e, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md border bg-card/30 px-3 py-1.5 text-sm">
                    <span><span className="mr-2 font-mono text-[10px] uppercase text-muted-foreground">{e.phase}</span>{e.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{e.minutes}′</span>
                  </div>
                ))}
              </div>
            </div>
            <details className="rounded-md border bg-card/30 p-3 text-sm">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-muted-foreground">Rationale · Evidence · Sources</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {plan.rationale.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
              <div className="mt-2 text-xs">Confidence: <span className="font-mono text-primary">{plan.confidence}%</span></div>
              <div className="mt-1 text-xs text-muted-foreground">{t("common.sources")}: {plan.sources.join(" · ")}</div>
            </details>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => navigate("/player/training")}>Schedule & train →</Button>
              <Button size="sm" variant="outline" onClick={() => { setPrompt(""); setCarryKeys([]); setPlanId(null); }}>New</Button>
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
        <SectionTitle title="Capability radar" />
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
            <span className="font-mono text-xs text-muted-foreground">{Math.round(attributesByCategory(cat).reduce((s, d) => s + p.attributes[d.key], 0) / attributesByCategory(cat).length)}</span>
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
  const { t } = useI18n();
  const planned = state.sessions.filter((s) => s.status === "planned");
  const missed = state.sessions.filter((s) => s.status === "missed").slice(0, 8);
  const history = state.sessions.filter((s) => s.status === "completed").slice(0, 20);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.training") + " · Today"} hint={`${planned.length} planned`} action={<Link to="/player/coach" className="text-xs text-primary hover:underline">+ New plan</Link>} />
        {planned.length ? (
          <div className="space-y-3">{planned.map((s) => <SessionCard key={s.id} session={s} onComplete={completeSession} />)}</div>
        ) : (
          <EmptyState title="No planned sessions" hint="Ask the AI coach to build one." icon="⚑" />
        )}
      </Panel>
      {missed.length > 0 && (
        <Panel className="p-4">
          <SectionTitle title="Missed" hint={`${missed.length} slipped`} />
          <div className="divide-y">
            {missed.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString()} · {s.targetMinutes}′ · not completed</div>
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-muted-foreground">missed</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel className="p-4">
        <SectionTitle title="History" hint={`${history.length} completed`} />
        {history.length ? (
          <div className="divide-y">
            {history.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.completedAt!).toLocaleDateString()} · rated {s.selfRating}/5</div>
                  {s.growth && s.growth.some((g) => g.delta > 0) && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.growth.filter((g) => g.delta > 0).map((g) => (
                        <span key={g.key} className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">{t(`attr.name.${g.key}`)} +{g.delta}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 font-mono text-success">+{s.xpAwarded} XP</Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No completed sessions yet" icon="✓" />
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
          <div className="text-sm font-medium">{session.title}</div>
          <div className="text-xs text-muted-foreground">{session.targetMinutes}′ · intensity {sessionIntensity(session)}/5 · {session.exercises.length} blocks</div>
        </div>
        <button className="text-xs text-primary" onClick={() => setOpen((o) => !o)}>{open ? "hide" : "detail"}</button>
      </div>
      {open && (
        <div className="mt-2 space-y-1 border-t pt-2">
          {session.exercises.map((e, i) => (
            <div key={i} className="flex justify-between text-xs text-muted-foreground"><span>{e.label}</span><span className="font-mono">{e.minutes}′</span></div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-end gap-3">
        <div>
          <div className="mb-1 text-[11px] text-muted-foreground">How did it feel?</div>
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
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-8 text-xs" />
        </div>
        <Button size="sm" onClick={() => {
          const deltas = onComplete(session.id, Number(rating), notes || undefined);
          const grew = deltas.filter((d) => d.delta > 0).map((d) => `${t(`attr.name.${d.key}`)} +${d.delta}`).join(" · ");
          toast.success(grew ? `Session complete — ${grew}` : "Session complete — XP awarded");
        }}>Complete</Button>
      </div>
    </div>
  );
}

function ProgressView() {
  const { state } = useOs();
  const p = state.profile!;
  const info = levelInfo(p.xp);
  const pts = state.progress.map((x, i) => ({ label: i === 0 ? "start" : `${i}`, value: x.overall }));
  const achievements = useMemo(() => {
    const completed = state.sessions.filter((s) => s.status === "completed").length;
    const clips = loadFilmClips().length;
    return [
      { label: "First session", ok: completed >= 1 },
      { label: "Level 5", ok: info.level >= 5 },
      { label: "7-day streak", ok: state.streak.current >= 7 },
      { label: "1000 XP", ok: p.xp >= 1000 },
      { label: clips > 0 ? `${clips} clip${clips === 1 ? "" : "s"} analysed` : "Analyse a video", ok: clips >= 1 },
      { label: "10 sessions", ok: completed >= 10 },
    ];
  }, [state, info.level, p.xp]);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title="Growth curve" hint="Overall rating as you complete real training" />
        {pts.length > 1 ? <ProgressLine points={pts} height={220} /> : <EmptyState title="Complete a session to plot your curve" icon="📈" />}
      </Panel>
      <div className="space-y-4">
        <Panel className="p-4">
          <SectionTitle title="Level" />
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Lv {info.level}</span><span>Lv {info.level + 1}</span></div>
          <Progress value={info.progress * 100} className="h-2" />
          <div className="mt-2 text-xs text-muted-foreground">{info.forNext - info.intoLevel} XP to next · total {p.xp} XP</div>
        </Panel>
        <Panel className="p-4">
          <SectionTitle title="Achievements" />
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((a) => (
              <div key={a.label} className={cn("rounded-lg border px-3 py-2 text-xs", a.ok ? "border-success/40 bg-success/10 text-success" : "text-muted-foreground")}>
                {a.ok ? "★" : "☆"} {a.label}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Goals() {
  const { state, addGoal } = useOs();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("5");
  const [metric, setMetric] = useState<GoalMetric>("sessions");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title="Your goals" />
        <div className="space-y-3">
          {state.goals.map((g) => (
            <div key={g.id} className="rounded-lg border bg-card/40 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className={cn(g.done && "text-muted-foreground line-through")}>{g.title}</span>
                <span className="font-mono text-xs">{Math.min(g.current, g.target)}/{g.target}</span>
              </div>
              <Progress value={(Math.min(g.current, g.target) / g.target) * 100} className="mt-2 h-1.5" />
            </div>
          ))}
          {state.goals.length === 0 && <EmptyState title="No goals" icon="◎" />}
        </div>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title="Add goal" />
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Reach level 6" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Metric</Label><select value={metric} onChange={(e) => setMetric(e.target.value as GoalMetric)} className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"><option value="xp">XP</option><option value="sessions">Sessions</option><option value="level">Level</option></select></div>
            <div><Label>Target</Label><Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1" /></div>
          </div>
          <Button onClick={() => { if (!title.trim()) return; addGoal({ title, metric, target: Number(target), current: metric === "xp" ? state.profile!.xp : metric === "level" ? state.profile!.level : state.sessions.filter((s) => s.status === "completed").length }); setTitle(""); toast.success("Goal added"); }}>Add goal</Button>
        </div>
      </Panel>
    </div>
  );
}

function Workload() {
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
        <StatTile label="Acute load" value={load.acute} sub="7-day daily avg" />
        <StatTile label="Chronic" value={load.chronic} sub="28-day daily avg" />
        <StatTile label="ACWR" value={acwr ?? "—"} tone={acwr && acwr > 1.5 ? "down" : acwr && acwr >= 0.8 ? "up" : "neutral"} sub={ZONE_LABEL[load.zone]} />
        <StatTile label="Sessions" value={completed.length} />
      </div>
      <Panel className="p-4 lg:col-span-2">
        <SectionTitle title="Training volume" hint="weekly load · intensity × duration (AU)" />
        {load.hasData ? (
          <div className="flex h-48 items-end gap-2">
            {byWeek.map((w) => {
              const max = Math.max(...byWeek.map((x) => x.value), 1);
              return (
                <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-primary/60 transition-all" style={{ height: `${(w.value / max) * 100}%` }} />
                  <span className="text-[10px] text-muted-foreground">{w.label}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No training load yet" hint="Complete sessions to build your workload." icon="⚖" />
        )}
        {load.zone === "high" && <p className="mt-3 text-xs text-warning">⚠ ACWR {acwr?.toFixed(2)} is above the 1.5 spike threshold — consider a recovery session.</p>}
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
      setError(new Error("Complete onboarding so the analysis can reference your attributes."));
      return;
    }
    setBusy(true);
    setReport(null);
    setError(null);
    setProgress(0);
    const stages = ["Uploading", "Extracting frames", "Detecting players", "Pose / movement", "Event detection", "AI analysis"];
    try {
      for (let i = 0; i < stages.length; i++) {
        await new Promise((r) => setTimeout(r, 260));
        setProgress(Math.round(((i + 1) / stages.length) * 100));
      }
      const rep = await videoProvider.analyze({ fileId: `${file.name}-${file.size}`, fileName: file.name, sizeBytes: file.size, attrs: state.profile.attributes });
      setReport(rep);
      toast.success("Video analysed (demo provider)");
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Analysis failed"));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title={t("player.video")} hint="Upload a clip — pipeline runs in Demo Mode" />
        <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])} />
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) analyze(f); }}
          className="grid place-items-center rounded-xl border-2 border-dashed py-12 text-center"
        >
          <div className="text-3xl opacity-40">⬆</div>
          <p className="mt-2 text-sm text-muted-foreground">Drop a video or</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => inputRef.current?.click()}>Choose file</Button>
        </div>
        {busy && (
          <div className="mt-4">
            <Progress value={progress} className="h-1.5" />
            <p className="mt-2 text-xs text-muted-foreground">Processing… {progress}%</p>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">No real pose model is bundled. The DemoVideoProvider runs the same pipeline over a deterministic file fingerprint and is labelled DEMO — it does not impersonate a live model.</p>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title="Report" />
        {error && <ErrorState error={error} retry={() => lastFileRef.current && analyze(lastFileRef.current)} />}
        {!error && !report && !busy && <EmptyState title="No analysis yet" icon="▶" />}
        {busy && <LoadingBlock rows={4} />}
        {report && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">{report.fileName}</span>
              <Badge variant="outline" className="border-warning/40 text-warning">DEMO · {report.confidence}% conf</Badge>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-success">Strengths</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-destructive">Weaknesses</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">{report.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">3 most important improvements</div>
              <ol className="mt-1 list-decimal pl-5 text-xs text-muted-foreground">{report.improvements.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Evidence frames</div>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {report.frames.map((f, i) => (
                  <div key={i} className="grid aspect-video place-items-center rounded bg-gradient-to-br from-secondary to-card text-center text-[9px] text-muted-foreground">{f.label}</div>
                ))}
              </div>
            </div>
            <Button size="sm" className="w-full" onClick={async () => { await requestPlan(`Video analysis flagged: ${report.improvements[0]}. Build a session on ${report.recommendedFocus.map(attributeLabel).join(" and ")}.`, 30); toast.success("Training created from video"); navigate("/player/training"); }}>
              Create training from this analysis →
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Matches() {
  const { state } = useOs();
  const [rows, setRows] = useState<{ id: string; opp: string; date: string; g: number; a: number; r: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem(FIXTURES_KEY) || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState({ opp: "", g: "0", a: "0", r: "7" });
  const save = (next: typeof rows) => { setRows(next); try { localStorage.setItem(FIXTURES_KEY, JSON.stringify(next)); } catch { /* ignore */ } };
  const add = () => {
    if (!form.opp.trim()) return;
    save([{ id: `m${Date.now()}`, opp: form.opp, date: new Date().toISOString(), g: Number(form.g), a: Number(form.a), r: Number(form.r) }, ...rows]);
    setForm({ opp: "", g: "0", a: "0", r: "7" });
  };
  const remove = (id: string) => save(rows.filter((r) => r.id !== id));
  const club = state.profile?.favoriteClubId ? getClub(state.profile.favoriteClubId) : undefined;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="p-4">
        <SectionTitle title="Log a match performance" hint="Local log · saved on this device and included in Settings export" />
        <div className="space-y-3">
          <div><Label>Opponent</Label><Input value={form.opp} onChange={(e) => setForm({ ...form, opp: e.target.value })} className="mt-1" placeholder="e.g. Rovers" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Goals</Label><Input type="number" value={form.g} onChange={(e) => setForm({ ...form, g: e.target.value })} className="mt-1" /></div>
            <div><Label>Assists</Label><Input type="number" value={form.a} onChange={(e) => setForm({ ...form, a: e.target.value })} className="mt-1" /></div>
            <div><Label>Rating</Label><Input type="number" step="0.1" value={form.r} onChange={(e) => setForm({ ...form, r: e.target.value })} className="mt-1" /></div>
          </div>
          <Button onClick={add}>Add performance</Button>
        </div>
      </Panel>
      <Panel className="p-4">
        <SectionTitle title="Recent matches" action={club && <span className="text-xs text-muted-foreground">{club.name}</span>} />
        {rows.length ? (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="group flex items-center justify-between py-2 text-sm">
                <div><div>{r.opp}</div><div className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</div></div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 font-mono text-xs"><span>{r.g}G {r.a}A</span><Badge variant="outline">{r.r.toFixed(1)}</Badge></div>
                  <button onClick={() => remove(r.id)} aria-label={`Delete match vs ${r.opp}`} className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100">✕</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No matches logged" icon="⚽" />
        )}
      </Panel>
    </div>
  );
}
