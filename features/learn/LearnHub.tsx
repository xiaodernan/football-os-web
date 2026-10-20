import { useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router";
import { useLocalStorage } from "@/lib/hooks";
import { CAREER_KEY, browserStore, readJson, removeJson, type WriteVerdict } from "@/domain/localData";
import { useOs } from "@/store/useFootballOS";
import { weakestAttributes, unique } from "@/domain/attributes";
import { loadFilmClips } from "@/domain/filmLibrary";
import {
  LESSONS,
  lessonById,
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
import { rowLine } from "@/domain/rowText";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, indexById } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/i18n";

const LEVEL_COLOR: Record<Level, string> = {
  Beginner: "text-success",
  Intermediate: "text-warning",
  Advanced: "text-destructive",
};

export function LearnHub() {
  const { t } = useI18n();
  const { state } = useOs();
  const [records, setRecords] = useLocalStorage<LearnRecord[]>(LEARN_STORE_KEY, []);
  const [category, setCategory] = useState<"All" | string>("All");
  const [openId, setOpenId] = useState<string | null>(null);

  // One-time upgrade of pre-existing on-device progress (plain id list).
  useEffect(() => {
    // M331: through the door on both legs. `present` says the device really holds the legacy
    // list, and `removeJson` answers whether the legacy key was actually cleared — the old
    // bare `removeItem` inside a try could fail and still report a successful migration.
    const legacy = readJson<unknown>(browserStore(), LEGACY_LEARN_KEY, null);
    if (!legacy.present || legacy.value == null) return;
    const migrated = parseLearnRecords(legacy.value);
    if (migrated.length) setRecords((cur) => (cur.length ? cur : migrated));
    removeJson(browserStore(), LEGACY_LEARN_KEY);
  }, [setRecords]);

  const byId = useMemo(() => indexById(records), [records]);
  const summary = useMemo(() => summarizeLearn(records), [records]);
  const signals = useMemo(
    () => ({
      completedSessions: state.sessions.filter((s) => s.status === "completed").length,
      weakestAttributes: state.profile ? weakestAttributes(state.profile.attributes, 3).map((a) => a.key) : [],
      // useLocalStorage writes JSON.stringify(null) = "null" the moment anyone
      // opens /manager, so a mere key presence is not a career — only a stored
      // value that parses back to a real object counts (matches CommunityHub).
      hasCareer: (() => {
        // M331: through the door. useLocalStorage writes JSON.stringify(null) = "null" the
        // moment anyone opens /manager, so a mere key presence is not a career — only a stored
        // value that parses back to a real object counts (matches CommunityHub).
        const held = readJson<unknown>(browserStore(), CAREER_KEY, null);
        return held.present && held.value != null;
      })(),
      filmClips: loadFilmClips().length,
      watchlist: state.watchlist.length,
    }),
    [state.sessions, state.profile, state.watchlist],
  );
  const picks = useMemo(() => recommendLessons(records, signals, 3), [records, signals]);

  const categories = useMemo(() => ["All", ...unique(LESSONS.map((l) => l.category))], []);
  const list = LESSONS.filter((l) => category === "All" || l.category === category);
  const open = openId ? lessonById(openId) : null;

  // An attempt only counts tries; correctness is recorded by markLearned at the
  // point the learner commits the lesson, so "mastered" always needs a passed check.
  const recordAttempt = (id: string) =>
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
          <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{t("learn.title")}</h1><DemoBadge /></div>
          <p className="text-xs text-muted-foreground">{t("learn.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="p-4 lg:col-span-2">
          <SectionTitle title={t("learn.progress")} hint={t("learn.onDevice")} />
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t("learn.completed")}</span><span className="font-mono">{summary.completed}/{summary.totalLessons} · {summary.pct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${summary.pct}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t("learn.quizPassed")}</span><span className="font-mono text-success">{summary.mastered}/{summary.totalLessons} · {summary.masteredPct}%</span></div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted"><div className="h-full bg-success transition-all" style={{ width: `${summary.masteredPct}%` }} /></div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {summary.byCategory.map((c) => (
              <Badge key={c.category} variant="outline" className={cn("text-[11px]", c.completed === c.total && "border-success/40 text-success")}>
                {t(`learn.cat.${c.category}`)} {c.completed}/{c.total}
              </Badge>
            ))}
          </div>
          <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
            {summary.evidence.map((e, i) => <li key={i}>› {rowLine(e, t)}</li>)}
          </ul>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>{t("learn.sources")} {summary.sources.map((s) => rowLine(s, t)).join(" · ")}</span>
            {records.length > 0 && <Button variant="ghost" size="sm" onClick={() => { const v = setRecords([]); toast(v.landed ? t("learn.cleared") : t("common.notStored")); }}>{t("learn.reset")}</Button>}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle title={t("learn.reco")} hint={t("learn.fromData")} />
          {picks.length ? (
            <div className="mt-2 space-y-3">
              {picks.map((p) => (
                <button key={p.lesson.id} onClick={() => setOpenId(p.lesson.id)} className="block w-full rounded-lg border bg-card/40 p-3 text-left hover:border-primary/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{t(p.lesson.titleKey)}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{p.lesson.minutes} {t("ld.minutesUnit")}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{rowLine(p.reason, t)}</p>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title={t("learn.allDone")} hint={t("learn.allDoneHint")} icon="✓" />
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">{t("learn.rankNote")}</p>
        </Panel>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)} className={cn("rounded-md border px-2.5 py-1 text-xs", category === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40")}>{c === "All" ? t("learn.filterAll") : t(`learn.cat.${c}`)}</button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((l) => {
          const rec = byId.get(l.id);
          const done = isCompleted(rec);
          return (
            <button key={l.id} onClick={() => setOpenId(l.id)} className="group flex flex-col rounded-xl border bg-card/50 p-4 text-left hover:border-primary/50">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px]">{t(`learn.cat.${l.category}`)}</Badge>
                {done ? (
                  <span className={cn("text-xs", rec?.quizCorrect ? "text-success" : "text-muted-foreground")}>{rec?.quizCorrect ? t("learn.tickPassed") : t("learn.tickLearned")}</span>
                ) : rec?.attempts ? (
                  <span className="text-xs text-warning">{t("learn.attempted")}</span>
                ) : null}
              </div>
              <div className="mt-2 font-semibold group-hover:text-primary">{t(l.titleKey)}</div>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{t(l.summaryKey)}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground"><span className={LEVEL_COLOR[l.level]}>{t(`learn.level.${l.level.toLowerCase()}`)}</span>·<span>{l.minutes} {t("ld.minutesUnit")}</span></div>
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
  onAttempt: (id: string) => void;
  onLearned: (id: string, correct: boolean) => WriteVerdict;
  onUndo: (id: string) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [choice, setChoice] = useState<number | null>(null);
  const correct = choice !== null && choice === lesson.quiz.answer;
  const done = isCompleted(record ?? undefined);

  const answer = (i: number) => {
    if (choice !== null) return;
    setChoice(i);
    onAttempt(lesson.id);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>{t("learn.back")}</Button>
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{t(`learn.cat.${lesson.category}`)}</Badge>
          <span className={LEVEL_COLOR[lesson.level]}>{t(`learn.level.${lesson.level.toLowerCase()}`)}</span>
          <span>· {lesson.minutes} {t("ld.minutesUnit")}</span>
          {record?.attempts ? <span>· {record.attempts === 1 ? t("learn.attemptOne", { n: record.attempts }) : t("learn.attemptMany", { n: record.attempts })}</span> : null}
        </div>
        <h1 className="mt-2 text-2xl font-bold">{t(lesson.titleKey)}</h1>
      </div>
      <Panel className="p-5">
        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
          {lesson.bodyKeys.map((k, i) => <p key={i}>{t(k)}</p>)}
        </div>
        {lesson.tryIt && (
          <Link to={lesson.tryIt.to} className="mt-4 inline-flex">
            <Button size="sm" variant="secondary">{t("learn.tryIt")} {t(lesson.tryIt.labelKey)} →</Button>
          </Link>
        )}
      </Panel>
      <Panel className="p-5">
        <SectionTitle title={t("learn.checkTitle")} hint={t("learn.attemptNote")} />
        <p className="text-sm">{t(lesson.quiz.qKey)}</p>
        <div className="mt-3 space-y-2">
          {lesson.quiz.optionKeys.map((ok, i) => {
            const picked = choice === i;
            const isAnswer = i === lesson.quiz.answer;
            return (
              <button key={i} disabled={choice !== null} onClick={() => answer(i)} className={cn("w-full rounded-md border px-3 py-2 text-left text-sm disabled:cursor-default",
                choice === null ? "hover:border-primary/50" : isAnswer ? "border-success bg-success/10" : picked ? "border-destructive bg-destructive/10" : "opacity-60")}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}</span>{t(ok)}
                {choice !== null && isAnswer && <span className="float-right text-success">✓</span>}
              </button>
            );
          })}
        </div>
        {choice !== null && (
          <div className="mt-3 space-y-2">
            <div className={cn("text-sm", correct ? "text-success" : `text-destructive`)}>
              {correct ? t("learn.correct") : t("learn.notQuite", { a: String.fromCharCode(65 + lesson.quiz.answer) })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {done && record?.quizCorrect ? (
                <Button size="sm" variant="outline" disabled>{t("learn.donePassed")}</Button>
              ) : done && correct ? (
                <Button size="sm" onClick={() => { const v = onLearned(lesson.id, true); toast(v.landed ? t("learn.passRecorded") : t("common.notStored")); }}>{t("learn.recordPassed")}</Button>
              ) : (
                <Button size="sm" variant={done ? "outline" : "default"} disabled={done} onClick={() => { onLearned(lesson.id, correct); toast(correct ? t("learn.doneToast") : t("learn.missedToast")); }}>
                  {done ? t("learn.completed") : correct ? t("learn.markLearned") : t("learn.markReviewed")}
                </Button>
              )}
              {done && !record?.quizCorrect && <Button size="sm" variant="ghost" onClick={() => { onUndo(lesson.id); toast(t("learn.removed")); }}>{t("learn.undo")}</Button>}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {record?.quizCorrect
                ? t("learn.staysMastered")
                : t("learn.reviewedNote")}
            </p>
          </div>
        )}
      </Panel>
      {lesson.tryIt && <EmptyState title={t("learn.practice")} hint={t("learn.practiceNote")} icon="→" />}
    </div>
  );
}

