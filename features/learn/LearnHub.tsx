import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useLocalStorage } from "@/lib/hooks";
import { useOs } from "@/store/useFootballOS";
import { weakestAttributes } from "@/domain/attributes";
import {
  LESSONS,
  LEGACY_LEARN_KEY,
  LEARN_STORE_KEY,
  isCompleted,
  parseLearnRecords,
  recommendLessons,
  summarizeLearn,
  type LearnRecord,
  type Lesson,
  type Level,
} from "@/domain/learn";
import { Panel, SectionTitle, EmptyState, DemoBadge } from "@/ui/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LEVEL_COLOR: Record<Level, string> = {
  Beginner: "text-success",
  Intermediate: "text-warning",
  Advanced: "text-destructive",
};

function readLength(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
    return 0;
  } catch {
    return 0;
  }
}

export function LearnHub() {
  const { state } = useOs();
  const [records, setRecords] = useLocalStorage<LearnRecord[]>(LEARN_STORE_KEY, []);
  const [category, setCategory] = useState<"All" | string>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  // One-time upgrade of pre-existing on-device progress (plain id list).
  useEffect(() => {
    try {
      const legacy = localStorage.getItem(LEGACY_LEARN_KEY);
      if (!legacy) return;
      const migrated = parseLearnRecords(JSON.parse(legacy));
      if (migrated.length) setRecords((cur) => (cur.length ? cur : migrated));
      localStorage.removeItem(LEGACY_LEARN_KEY);
    } catch {
      /* unreadable legacy store — start fresh rather than crash the page */
    }
  }, [setRecords]);

  const byId = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const summary = useMemo(() => summarizeLearn(records), [records]);
  const signals = useMemo(
    () => ({
      completedSessions: state.sessions.filter((s) => s.status === "completed").length,
      weakestAttributes: state.profile ? weakestAttributes(state.profile.attributes, 3).map((a) => a.key) : [],
      hasCareer: !!localStorage.getItem("football-os.career.v1"),
      filmClips: readLength("football-os.film.v1"),
      watchlist: state.watchlist.length,
    }),
    [state.sessions, state.profile, state.watchlist],
  );
  const picks = useMemo(() => recommendLessons(records, signals, 3), [records, signals]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(LESSONS.map((l) => l.category)))], []);
  const list = LESSONS.filter((l) => category === "All" || l.category === category);
  const open = openId ? LESSONS.find((l) => l.id === openId) ?? null : null;

  const recordAttempt = (id: string, correct: boolean) =>
    setRecords((cur) => {
      const found = cur.find((r) => r.id === id);
      if (found) return cur.map((r) => (r.id === id ? { ...r, attempts: r.attempts + 1 } : r));
      return [...cur, { id, completedAt: "", quizCorrect: false, attempts: 1 }];
    });

  const markLearned = (id: string, correct: boolean) =>
    setRecords((cur) => {
      const found = cur.find((r) => r.id === id);
      if (found) {
        return cur.map((r) => (r.id === id ? { ...r, completedAt: new Date().toISOString(), quizCorrect: correct || r.quizCorrect } : r));
      }
      return [...cur, { id, completedAt: new Date().toISOString(), quizCorrect: correct, attempts: 1 }];
    });

  const undo = (id: string) => setRecords((cur) => cur.filter((r) => r.id !== id));

  if (open) {
    return (
      <LessonDetail
        lesson={open}
        record={byId.get(open.id) ?? null}
        onAttempt={recordAttempt}
        onLearned={markLearned}
        onUndo={undo}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">◈</div>
        <div>
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">Knowledge Academy</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">Short, honest lessons on how football actually works — with places to try each idea live.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-4 lg:col-span-2">
          <SectionTitle title="Your progress" hint="Recorded on this device" />
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Completed</span><span className="font-mono">{summary.completed}/{summary.totalLessons} · {summary.pct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${summary.pct}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Check quiz passed</span><span className="font-mono text-success">{summary.mastered}/{summary.totalLessons} · {summary.masteredPct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-success transition-all" style={{ width: `${summary.masteredPct}%` }} /></div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.byCategory.map((c) => (
              <Badge key={c.category} variant="outline" className={cn("text-[11px]", c.completed === c.total && "border-success/40 text-success")}>
                {c.category} {c.completed}/{c.total}
              </Badge>
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            {summary.evidence.map((e, i) => <li key={i}>› {e}</li>)}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Sources: {summary.sources.join(" · ")}</span>
            {records.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setRecords([]); toast("Progress cleared"); }}>Reset progress</Button>}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title="Recommended next" hint="From your own data" />
          {picks.length ? (
            <div className="mt-2 space-y-3">
              {picks.map((p) => (
                <button key={p.lesson.id} onClick={() => setOpenId(p.lesson.id)} className="block w-full rounded-lg border bg-card/40 p-3 text-left hover:border-primary/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.lesson.title}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{p.lesson.minutes} min</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{p.reason}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Catalogue complete" hint="You have finished every lesson in the catalogue." icon="✓" />
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Suggestions are ranked from your training log, watchlist, career and film library — the reason quotes the signal that triggered it.</p>
        </Panel>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={cn("rounded-md border px-2.5 py-1 text-xs", category === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{c}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((l) => {
          const rec = byId.get(l.id);
          const done = isCompleted(rec);
          return (
            <button key={l.id} onClick={() => setOpenId(l.id)} className="group flex flex-col rounded-xl border bg-card/50 p-4 text-left hover:border-primary/50">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px]">{l.category}</Badge>
                {done ? (
                  <span className={cn("text-xs", rec?.quizCorrect ? "text-success" : "text-muted-foreground")}>{rec?.quizCorrect ? "✓ passed" : "✓ learned"}</span>
                ) : rec?.attempts ? (
                  <span className="text-xs text-warning">· attempted</span>
                ) : null}
              </div>
              <div className="mt-2 font-semibold group-hover:text-primary">{l.title}</div>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{l.summary}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><span className={LEVEL_COLOR[l.level]}>{l.level}</span>·<span>{l.minutes} min</span></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LessonDetail({ lesson, record, onAttempt, onLearned, onUndo, onBack }: {
  lesson: Lesson;
  record: LearnRecord | null;
  onAttempt: (id: string, correct: boolean) => void;
  onLearned: (id: string, correct: boolean) => void;
  onUndo: (id: string) => void;
  onBack: () => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const correct = choice !== null && choice === lesson.quiz.answer;
  const done = isCompleted(record ?? undefined);

  const answer = (i: number) => {
    if (choice !== null) return;
    const isRight = i === lesson.quiz.answer;
    setChoice(i);
    onAttempt(lesson.id, isRight);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>← All lessons</Button>
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{lesson.category}</Badge>
          <span className={LEVEL_COLOR[lesson.level]}>{lesson.level}</span>
          <span>· {lesson.minutes} min</span>
          {record?.attempts ? <span>· {record.attempts} quiz attempt{record.attempts === 1 ? "" : "s"} recorded</span> : null}
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
        <SectionTitle title="Check your understanding" hint="Your answer is recorded as an attempt" />
        <p className="text-sm">{lesson.quiz.q}</p>
        <div className="mt-3 space-y-2">
          {lesson.quiz.options.map((o, i) => {
            const picked = choice === i;
            const isAnswer = i === lesson.quiz.answer;
            return (
              <button key={i} disabled={choice !== null} onClick={() => answer(i)} className={cn("w-full rounded-md border px-3 py-2 text-left text-sm disabled:cursor-default",
                choice === null ? "hover:border-primary/50" : isAnswer ? "border-success bg-success/10" : picked ? "border-destructive bg-destructive/10" : "opacity-60")}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>{o}
                {choice !== null && isAnswer && <span className="float-right text-success">✓</span>}
              </button>
            );
          })}
        </div>
        {choice !== null && (
          <div className="mt-3 space-y-2">
            <div className={cn("text-sm", correct ? "text-success" : `text-destructive`)}>
              {correct ? "Correct." : `Not quite — the answer is ${String.fromCharCode(65 + lesson.quiz.answer)}.`}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {done && record?.quizCorrect ? (
                <Button size="sm" variant="outline" disabled>Completed · check passed</Button>
              ) : done && correct ? (
                <Button size="sm" onClick={() => { onLearned(lesson.id, true); toast("Passed check recorded"); }}>Record passed check</Button>
              ) : (
                <Button size="sm" variant={done ? "outline" : "default"} disabled={done} onClick={() => { onLearned(lesson.id, correct); toast(correct ? "Lesson completed — check passed" : "Lesson completed — check missed"); }}>
                  {done ? "Completed" : correct ? "Mark as learned (check passed)" : "Mark as reviewed (check missed)"}
                </Button>
              )}
              {done && !record?.quizCorrect && <Button size="sm" variant="ghost" onClick={() => { onUndo(lesson.id); toast("Progress removed"); }}>Undo</Button>}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {record?.quizCorrect
                ? "You have passed this check before, so it stays counted as mastered."
                : "Marking a lesson learned without a passed check is recorded as reviewed — the progress panel keeps the two apart."}
            </p>
          </div>
        )}
      </Panel>
      {lesson.tryIt && <EmptyState title="Put it into practice" hint="The best way to learn a concept is to apply it in the studio or lab." icon="→" />}
    </div>
  );
}

export { LearnHub as default };
