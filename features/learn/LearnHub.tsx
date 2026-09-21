import { useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useLocalStorage } from "@/lib/hooks";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Level = "Beginner" | "Intermediate" | "Advanced";
interface Quiz {
  q: string;
  options: string[];
  answer: number;
}
interface Lesson {
  id: string;
  title: string;
  category: string;
  level: Level;
  minutes: number;
  summary: string;
  body: string[];
  tryIt?: { label: string; to: string };
  quiz: Quiz;
}

const LEVEL_COLOR: Record<Level, string> = {
  Beginner: "text-success",
  Intermediate: "text-warning",
  Advanced: "text-destructive",
};

// Editorial football-education content authored for this product. Concepts are
// real football-analytics ideas; nothing here is presented as scraped data.
const LESSONS: Lesson[] = [
  {
    id: "xg",
    title: "Expected Goals (xG)",
    category: "Analytics",
    level: "Beginner",
    minutes: 5,
    summary: "What xG measures and why a 0.1 chance scoring ten times is luck.",
    body: [
      "Expected Goals turns a shot into a probability: a chance that, in isolation, results in a goal. A penalty sits around 0.76 xG; a tight-angle header maybe 0.05.",
      "Sum a team's shot xG and you get how many goals they 'should' have scored. When real goals exceed xG over many games, that is usually finishing quality or good fortune; when they fall short, it points to poor conversion or bad luck — not necessarily bad chances.",
      "xG is a rate, not a result. One match has enormous variance: a low-xG team can win on a deflection. Trust xG over a large sample to judge how well a side actually creates.",
    ],
    tryIt: { label: "See xG vs goals in the Simulation Lab", to: "/simulation" },
    quiz: { q: "A team's goals are well above its cumulative xG over 30 games. The most likely reading is:", options: ["They are unlucky", "Sustained overperformance from finishing or fortune", "Their xG model is broken", "They defend poorly"], answer: 1 },
  },
  {
    id: "press",
    title: "Pressing & the defensive block",
    category: "Tactics",
    level: "Intermediate",
    minutes: 6,
    summary: "High press vs a low block: where you win it back and the risk trade-off.",
    body: [
      "Pressing is organised attempts to win the ball high up the pitch. A high press squeezes the space behind the opponent's midfield, forcing errors close to their goal — but it leaves space behind your own defensive line if it is bypassed.",
      "A low block does the opposite: it protects space behind the defence, invites pressure and hits on the counter, but concedes territory and lets opponents build from deep.",
      "The 'height' of your press and your defensive line are two of the most consequential dials a manager sets; the Football OS engine models both as a press intensity and a mentality that shifts your line up or down.",
    ],
    tryIt: { label: "Set a press in Tactical Studio", to: "/tactical-studio" },
    quiz: { q: "The main risk of a sustained high press is:", options: ["Too few chances", "Space behind your defensive line when the press is beaten", "Lower possession", "More substitutions"], answer: 1 },
  },
  {
    id: "formations",
    title: "Formations vs roles",
    category: "Tactics",
    level: "Beginner",
    minutes: 5,
    summary: "Why 4-3-3 in name can be a 2-3-5 in attack.",
    body: [
      "A formation is a starting snapshot of positions. What matters is the structure in possession: full-backs tucking in turn a 4-3-3 into a 2-3-5; a single pivot sits as a 3-2-5 build.",
      "Roles describe behaviour — an inside forward drifts centrally, a box-to-box mid covers both boxes, an inverted full-back moves infield. Two teams can share a number and look completely different.",
      "When you build a shape, think in phases: how you defend, how you build from the back, and how you attack. Dragging tokens in the Tactical Studio is exactly this exercise.",
    ],
    tryIt: { label: "Build a shape", to: "/tactical-studio" },
    quiz: { q: "The best way to describe how a team really plays is:", options: ["Its formation number only", "Its roles and behaviour across phases of play", "Its average player height", "Its possession percentage"], answer: 1 },
  },
  {
    id: "value",
    title: "Market value vs ability",
    category: "Scouting",
    level: "Advanced",
    minutes: 7,
    summary: "Age, potential and contract length move price as much as current quality.",
    body: [
      "Market value is not a pure function of ability. A 22-year-old with high potential can out-price a better 31-year-old, because resale value and years of prime remain.",
      "Contract length is a lever too: a player entering the final year can be cheap to buy and expensive to keep, since the selling club loses leverage.",
      "Good scouting separates present contribution from future trajectory. In Football OS the player cards show overall, potential, age and value together precisely so you can reason about the gap between them.",
    ],
    quiz: { q: "All else equal, which raises a player's market value the most?", options: ["Older age", "Shorter remaining contract", "High potential and young age", "Playing in a lower league"], answer: 2 },
  },
  {
    id: "sample",
    title: "Sample size & variance",
    category: "Analytics",
    level: "Intermediate",
    minutes: 5,
    summary: "Why you cannot judge a striker in six games.",
    body: [
      "Football is a low-scoring, high-variance sport. Small samples are dominated by luck: streaky finishing, deflections, refereeing decisions.",
      "Underlying indicators that aggregate many events — shot volume, xG, chances conceded — stabilise far sooner than goals or points do. Use them to form an early view, then let results confirm or deny it.",
      "This is why a season simulation, not one match, is the honest way to judge whether a squad or tactic works.",
    ],
    tryIt: { label: "Run a full season", to: "/simulation" },
    quiz: { q: "Which metric stabilises fastest as a signal of true quality?", options: ["Goals scored in the last 3 games", "League position after a week", "Shot xG per match over many games", "A single hat-trick"], answer: 2 },
  },
  {
    id: "load",
    title: "Training load & recovery",
    category: "Development",
    level: "Beginner",
    minutes: 4,
    summary: "Progress needs the right dose of stress and rest, not maximal effort.",
    body: [
      "Adaptation follows the stress-recovery cycle: enough intensity to challenge the body, then enough rest to supercompensate. Chronic high load without recovery drives performance down and injury risk up.",
      "Consistency beats heroic one-off sessions. Small, repeatable loads accumulate; skipped or overstuffed weeks erase progress.",
      "That is why the Player OS tracks streaks, session quality and self-ratings, and why fatigue in the manager model suppresses a team's engine ratings after a run of matches.",
    ],
    quiz: { q: "The most reliable driver of long-term improvement is:", options: ["One maximal session a week", "Consistent, appropriately-dosed load with recovery", "Ignoring rest", "Always training at maximum heart rate"], answer: 1 },
  },
];

export function LearnHub() {
  const [done, setDone] = useLocalStorage<string[]>("football-os.learn.v1", []);
  const [category, setCategory] = useState<"All" | string>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => ["All", ...Array.from(new Set(LESSONS.map((l) => l.category)))], []);
  const list = LESSONS.filter((l) => category === "All" || l.category === category);
  const open = openId ? LESSONS.find((l) => l.id === openId) ?? null : null;
  const pct = Math.round((done.length / LESSONS.length) * 100);

  const toggleDone = (id: string) => {
    setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  };

  if (open) return <LessonDetail lesson={open} done={done.includes(open.id)} onDone={() => toggleDone(open.id)} onBack={() => setOpenId(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">◈</div>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Knowledge Academy</h1>{<DemoBadge />}</div>
          <p className="text-xs text-muted-foreground">Short, honest lessons on how football actually works — with places to try each idea live.</p>
        </div>
      </div>

      <Panel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{done.length} of {LESSONS.length} lessons completed</div>
            <div className="mt-1 h-1.5 w-48 max-w-full overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
          {done.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setDone([]); toast("Progress cleared"); }}>Reset progress</Button>}
        </div>
      </Panel>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={cn("rounded-md border px-2.5 py-1 text-xs", category === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{c}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((l) => (
          <button key={l.id} onClick={() => setOpenId(l.id)} className="group flex flex-col rounded-xl border bg-card/50 p-4 text-left hover:border-primary/50">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px]">{l.category}</Badge>
              {done.includes(l.id) && <span className="text-xs text-success">✓ learned</span>}
            </div>
            <div className="mt-2 font-semibold group-hover:text-primary">{l.title}</div>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">{l.summary}</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><span className={LEVEL_COLOR[l.level]}>{l.level}</span>·<span>{l.minutes} min</span></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LessonDetail({ lesson, done, onDone, onBack }: { lesson: Lesson; done: boolean; onDone: () => void; onBack: () => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const correct = choice !== null && choice === lesson.quiz.answer;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>← All lessons</Button>
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{lesson.category}</Badge>
          <span className={LEVEL_COLOR[lesson.level]}>{lesson.level}</span>
          <span>· {lesson.minutes} min</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold">{lesson.title}</h1>
      </div>
      <Panel className="p-5">
        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
          {lesson.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {lesson.tryIt && (
          <Link to={lesson.tryIt.to} className="mt-4 inline-flex">
            <Button size="sm" variant="secondary">Try it: {lesson.tryIt.label} →</Button>
          </Link>
        )}
      </Panel>
      <Panel className="p-5">
        <SectionTitle title="Check your understanding" />
        <p className="text-sm">{lesson.quiz.q}</p>
        <div className="mt-3 space-y-2">
          {lesson.quiz.options.map((o, i) => {
            const picked = choice === i;
            const isAnswer = i === lesson.quiz.answer;
            return (
              <button key={i} disabled={choice !== null} onClick={() => setChoice(i)} className={cn("w-full rounded-md border px-3 py-2 text-left text-sm disabled:cursor-default",
                choice === null ? "hover:border-primary/50" : isAnswer ? "border-success bg-success/10" : picked ? "border-destructive bg-destructive/10" : "opacity-60")}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>{o}
                {choice !== null && isAnswer && <span className="float-right text-success">✓</span>}
              </button>
            );
          })}
        </div>
        {choice !== null && (
          <div className="mt-3 flex items-center justify-between">
            <div className={cn("text-sm", correct ? "text-success" : "text-destructive")}>{correct ? "Correct." : `Not quite — the answer is ${String.fromCharCode(65 + lesson.quiz.answer)}.`}</div>
            <Button size="sm" variant={done ? "outline" : "default"} onClick={() => { onDone(); toast(done ? "Marked as not learned" : "Lesson completed"); }}>{done ? "Undo complete" : "Mark as learned"}</Button>
          </div>
        )}
      </Panel>
      {lesson.tryIt && <EmptyState title="Put it into practice" hint="The best way to learn a concept is to apply it in the studio or lab." icon="→" />}
    </div>
  );
}

export { LearnHub as default };
