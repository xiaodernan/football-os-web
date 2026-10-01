import type { RowText } from "./rowText";

// Knowledge Academy domain (spec §8). The lesson text is editorial content
// authored for this product; everything in this module is *accounting* — it turns
// what the learner actually did (quiz attempts, completions) and what they
// actually have in their other pillars (training log, career, film library) into
// an honest progress summary and a ranked set of next lessons. No lesson is ever
// marked mastered without a recorded quiz result.

export type Level = "Beginner" | "Intermediate" | "Advanced";

/** The subject a lesson belongs to. A code, not a word: the Academy badge prints it, so it
 *  resolves through `learn.cat.*` like every other code the interface shows. */
export type CategoryCode = "analytics" | "tactics" | "scouting" | "development";
export const CATEGORY_CODES: readonly CategoryCode[] = ["analytics", "tactics", "scouting", "development"];

export interface Lesson {
  id: string;
  titleKey: string;
  category: CategoryCode;
  level: Level;
  minutes: number;
  summaryKey: string;
  bodyKeys: string[];
  tryIt?: { labelKey: string; to: string };
  quiz: { qKey: string; optionKeys: string[]; answer: number };
  tags: string[]; // which pillars this lesson explains
}

// Editorial football-education content. Concepts are real football-analytics
// ideas; nothing here is presented as scraped data.
//
// M246 moved the words out and left the structure. A lesson is now an id, a category, a
// length, a route, an answer index and the KEYS of the sentences it shows — no prose at all.
// That is the honest reading of this module's own scope note, which put lesson texts beside
// news items as `data/` content: unlike the reference tables M240 moved, this text IS shown to
// a reader, so relocating it would have silenced the counter while the Academy went on teaching
// in English. The keys are written out rather than composed from the id, so the reachability
// check sees every one of them and a lesson cannot ship with a paragraph missing.
export const LESSONS: Lesson[] = [
  {
    id: "xg",
    titleKey: "learn.l.xg.title",
    category: "analytics",
    level: "Beginner",
    minutes: 5,
    summaryKey: "learn.l.xg.summary",
    bodyKeys: ["learn.l.xg.p1", "learn.l.xg.p2", "learn.l.xg.p3"],
    tryIt: { labelKey: "learn.l.xg.tryIt", to: "/simulation" },
    quiz: {
      qKey: "learn.l.xg.q",
      optionKeys: ["learn.l.xg.o1", "learn.l.xg.o2", "learn.l.xg.o3", "learn.l.xg.o4"],
      answer: 1,
    },
    tags: ["analytics", "simulation", "matches"],
  },
  {
    id: "press",
    titleKey: "learn.l.press.title",
    category: "tactics",
    level: "Intermediate",
    minutes: 6,
    summaryKey: "learn.l.press.summary",
    bodyKeys: ["learn.l.press.p1", "learn.l.press.p2", "learn.l.press.p3"],
    tryIt: { labelKey: "learn.l.press.tryIt", to: "/simulation" },
    quiz: {
      qKey: "learn.l.press.q",
      optionKeys: ["learn.l.press.o1", "learn.l.press.o2", "learn.l.press.o3", "learn.l.press.o4"],
      answer: 1,
    },
    tags: ["tactics", "manager", "studio"],
  },
  {
    id: "formations",
    titleKey: "learn.l.formations.title",
    category: "tactics",
    level: "Beginner",
    minutes: 5,
    summaryKey: "learn.l.formations.summary",
    bodyKeys: ["learn.l.formations.p1", "learn.l.formations.p2", "learn.l.formations.p3"],
    tryIt: { labelKey: "learn.l.formations.tryIt", to: "/tactical-studio" },
    quiz: {
      qKey: "learn.l.formations.q",
      optionKeys: ["learn.l.formations.o1", "learn.l.formations.o2", "learn.l.formations.o3", "learn.l.formations.o4"],
      answer: 1,
    },
    tags: ["tactics", "studio"],
  },
  {
    id: "value",
    titleKey: "learn.l.value.title",
    category: "scouting",
    level: "Advanced",
    minutes: 7,
    summaryKey: "learn.l.value.summary",
    bodyKeys: ["learn.l.value.p1", "learn.l.value.p2", "learn.l.value.p3"],
    tryIt: { labelKey: "learn.l.value.tryIt", to: "/transfers" },
    quiz: {
      qKey: "learn.l.value.q",
      optionKeys: ["learn.l.value.o1", "learn.l.value.o2", "learn.l.value.o3", "learn.l.value.o4"],
      answer: 2,
    },
    tags: ["scouting", "transfers", "manager"],
  },
  {
    id: "sample",
    titleKey: "learn.l.sample.title",
    category: "analytics",
    level: "Intermediate",
    minutes: 5,
    summaryKey: "learn.l.sample.summary",
    bodyKeys: ["learn.l.sample.p1", "learn.l.sample.p2", "learn.l.sample.p3"],
    tryIt: { labelKey: "learn.l.sample.tryIt", to: "/simulation" },
    quiz: {
      qKey: "learn.l.sample.q",
      optionKeys: ["learn.l.sample.o1", "learn.l.sample.o2", "learn.l.sample.o3", "learn.l.sample.o4"],
      answer: 2,
    },
    tags: ["analytics", "simulation", "development"],
  },
  {
    id: "load",
    titleKey: "learn.l.load.title",
    category: "development",
    level: "Beginner",
    minutes: 4,
    summaryKey: "learn.l.load.summary",
    bodyKeys: ["learn.l.load.p1", "learn.l.load.p2", "learn.l.load.p3"],
    tryIt: { labelKey: "learn.l.load.tryIt", to: "/load" },
    quiz: {
      qKey: "learn.l.load.q",
      optionKeys: ["learn.l.load.o1", "learn.l.load.o2", "learn.l.load.o3", "learn.l.load.o4"],
      answer: 1,
    },
    tags: ["development", "player", "load"],
  },
];

export const LESSON_IDS = LESSONS.map((l) => l.id);

export const LEARN_STORE_KEY = "football-os.learn.v2";
export const LEGACY_LEARN_KEY = "football-os.learn.v1";

export interface LearnRecord {
  id: string;
  completedAt: string;
  quizCorrect: boolean;
  attempts: number;
}

// Accepts the current record shape or the legacy plain-id array so existing
// on-device progress is not silently discarded. A record counts as completed
// when completedAt is non-empty; a quiz attempt with no completion is "started".
export function parseLearnRecords(raw: unknown): LearnRecord[] {
  if (!Array.isArray(raw)) return [];
  const out: LearnRecord[] = [];
  for (const item of raw) {
    if (typeof item === "string" && LESSON_IDS.includes(item)) {
      out.push({ id: item, completedAt: "migrated", quizCorrect: false, attempts: 0 });
    } else if (item && typeof item === "object") {
      const r = item as Partial<LearnRecord>;
      if (typeof r.id === "string" && LESSON_IDS.includes(r.id)) {
        out.push({ id: r.id, completedAt: r.completedAt ?? "", quizCorrect: r.quizCorrect === true, attempts: Math.max(0, Number(r.attempts) || 0) });
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

export interface CategoryProgress {
  category: string;
  completed: number;
  total: number;
}

export interface LearnSummary {
  totalLessons: number;
  started: number;
  completed: number;
  mastered: number; // completed AND quiz passed
  attemptedOnly: number; // quiz taken but lesson not marked learned
  pct: number;
  masteredPct: number;
  byCategory: CategoryProgress[];
  weakestCategory: { category: string; completed: number; total: number } | null;
  evidence: RowText[];
  sources: RowText[];
  hasData: boolean;
}

export const isCompleted = (r: LearnRecord | undefined): boolean => !!r && r.completedAt !== "";

export function summarizeLearn(records: LearnRecord[]): LearnSummary {
  const byId = new Map(records.map((r) => [r.id, r]));
  const completed = LESSONS.filter((l) => isCompleted(byId.get(l.id))).length;
  const mastered = LESSONS.filter((l) => byId.get(l.id)?.quizCorrect && isCompleted(byId.get(l.id))).length;
  const attemptedOnly = records.filter((r) => r.attempts > 0 && !isCompleted(r)).length;
  const attempts = records.reduce((s, r) => s + r.attempts, 0);

  const cats = new Map<string, CategoryProgress>();
  for (const l of LESSONS) {
    const c = cats.get(l.category) ?? { category: l.category, completed: 0, total: 0 };
    c.total++;
    if (isCompleted(byId.get(l.id))) c.completed++;
    cats.set(l.category, c);
  }
  const byCategory = [...cats.values()].sort((a, b) => a.category.localeCompare(b.category));
  const untouched = byCategory.filter((c) => c.completed === 0);
  const weakestCategory = untouched.length
    ? { category: untouched[0].category, completed: 0, total: untouched[0].total }
    : null;

  const evidence: RowText[] = [
    { key: "learn.ev.done", vars: { done: completed, total: LESSONS.length, mastered } },
    attempts
      ? attempts === 1
        ? { key: "learn.ev.attemptsOne", vars: { n: attempts } }
        : { key: "learn.ev.attemptsMany", vars: { n: attempts } }
      : { key: "learn.ev.attemptsNone" },
  ];
  if (attemptedOnly) {
    evidence.push(
      attemptedOnly === 1
        ? { key: "learn.ev.attemptedOne", vars: { n: attemptedOnly } }
        : { key: "learn.ev.attemptedMany", vars: { n: attemptedOnly } },
    );
  }
  evidence.push(
    weakestCategory
      // The category is a code; the reader words it through `learn.cat.*` at the column,
      // so a reader whose language has no "Development" never sees the code either.
      ? { key: "learn.ev.noCat", vars: { cat: { key: `learn.cat.${weakestCategory.category}` }, n: weakestCategory.total } }
      : { key: "learn.ev.allCats" },
  );

  return {
    totalLessons: LESSONS.length,
    started: records.length,
    completed,
    mastered,
    attemptedOnly,
    pct: Math.round((completed / LESSONS.length) * 100),
    masteredPct: Math.round((mastered / LESSONS.length) * 100),
    byCategory,
    weakestCategory,
    evidence,
    sources: [{ key: "learn.src.device" }, { key: "learn.src.catalogue" }],
    hasData: records.length > 0,
  };
}

export interface LearnSignals {
  completedSessions: number;
  weakestAttributes: string[]; // attribute keys
  hasCareer: boolean;
  filmClips: number;
  watchlist: number;
}

export interface LessonRecommendation {
  lesson: Lesson;
  score: number;
  reason: RowText;
}

// Rank the lessons the learner has NOT completed by how much their own data makes
// the lesson immediately useful. Every reason quotes a real number from the user's
// state, so the suggestion can be checked rather than taken on trust.
export function recommendLessons(records: LearnRecord[], signals: LearnSignals, limit = 3): LessonRecommendation[] {
  const done = new Set(records.filter((r) => isCompleted(r)).map((r) => r.id));
  const out: LessonRecommendation[] = [];
  for (const l of LESSONS) {
    if (done.has(l.id)) continue;
    let score = 1;
    let reason: RowText = { key: "learn.rec.default" };
    const has = (t: string) => l.tags.includes(t);

    if (has("development") && signals.completedSessions > 0 && signals.completedSessions < 12) {
      score += 4;
      reason = signals.completedSessions === 1
        ? { key: "learn.rec.doseOne", vars: { n: signals.completedSessions } }
        : { key: "learn.rec.doseMany", vars: { n: signals.completedSessions } };
    } else if (has("load") && signals.weakestAttributes.length) {
      score += 3;
      // The codes, not their labels: the reader's column words them (`attrs` is a code
      // var), so this module holds no attribute word in any language.
      reason = { key: "learn.rec.load", vars: { attrs: signals.weakestAttributes.slice(0, 2).join(",") } };
    }
    if (has("manager") && signals.hasCareer) {
      score += 3;
      reason = signals.completedSessions > 0
        ? { key: "learn.rec.careerLink" }
        : { key: "learn.rec.careerDials" };
    }
    if (has("simulation") && signals.hasCareer) {
      score += 2;
      reason = { key: "learn.rec.samples" };
    }
    if (has("scouting") && signals.watchlist > 0) {
      score += 3;
      reason = signals.watchlist === 1
        ? { key: "learn.rec.watchOne", vars: { n: signals.watchlist } }
        : { key: "learn.rec.watchMany", vars: { n: signals.watchlist } };
    }
    if (has("tactics") && signals.filmClips > 0) {
      score += 2;
      reason = signals.filmClips === 1
        ? { key: "learn.rec.filmOne", vars: { n: signals.filmClips } }
        : { key: "learn.rec.filmMany", vars: { n: signals.filmClips } };
    }
    if (has("analytics") && signals.completedSessions >= 12) {
      score += 2;
      reason = { key: "learn.rec.rates", vars: { n: signals.completedSessions } };
    }
    out.push({ lesson: l, score, reason });
  }
  return out
    // The tie-break is the lesson's KEY, not its title: the module no longer holds the words
    // (M246 moved them to the dictionary), and ordering by a key is stable and deterministic —
    // which is what this line needs — where ordering by a title would need a language.
    .sort((a, b) => b.score - a.score || a.lesson.minutes - b.lesson.minutes || a.lesson.titleKey.localeCompare(b.lesson.titleKey))
    .slice(0, limit);
}
