import { attributeLabel } from "./attributes";

// Knowledge Academy domain (spec §8). The lesson text is editorial content
// authored for this product; everything in this module is *accounting* — it turns
// what the learner actually did (quiz attempts, completions) and what they
// actually have in their other pillars (training log, career, film library) into
// an honest progress summary and a ranked set of next lessons. No lesson is ever
// marked mastered without a recorded quiz result.

export type Level = "Beginner" | "Intermediate" | "Advanced";

export interface Quiz {
  q: string;
  options: string[];
  answer: number;
}

export interface Lesson {
  id: string;
  title: string;
  category: string;
  level: Level;
  minutes: number;
  summary: string;
  body: string[];
  tryIt?: { label: string; to: string };
  quiz: Quiz;
  tags: string[]; // which pillars this lesson explains
}

// Editorial football-education content. Concepts are real football-analytics
// ideas; nothing here is presented as scraped data.
export const LESSONS: Lesson[] = [
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
    tags: ["analytics", "simulation", "matches"],
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
    tags: ["tactics", "manager", "studio"],
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
    tags: ["tactics", "studio"],
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
    tags: ["scouting", "transfers", "manager"],
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
    tags: ["analytics", "simulation", "development"],
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
  evidence: string[];
  sources: string[];
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

  const evidence = [
    `${completed} of ${LESSONS.length} lessons completed · ${mastered} with a passed check quiz`,
    attempts ? `${attempts} quiz attempt${attempts === 1 ? "" : "s"} recorded on this device` : "No quiz attempts recorded yet",
    attemptedOnly ? `${attemptedOnly} lesson${attemptedOnly === 1 ? "" : "s"} attempted but not marked learned` : "",
    weakestCategory ? `No lesson completed in ${weakestCategory.category} (${weakestCategory.total} available)` : "Every category has at least one completed lesson",
  ].filter(Boolean);

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
    sources: ["Your local academy records (this device)", "Lesson catalogue (editorial, authored for Football OS)"],
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
  reason: string;
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
    let reason = "Next unfinished lesson in the catalogue.";
    const has = (t: string) => l.tags.includes(t);

    if (has("development") && signals.completedSessions > 0 && signals.completedSessions < 12) {
      score += 4;
      reason = `You have completed ${signals.completedSessions} training session${signals.completedSessions === 1 ? "" : "s"} — the dose-vs-effort idea applies to your log right now.`;
    } else if (has("load") && signals.weakestAttributes.length) {
      score += 3;
      reason = `Your lowest attributes (${signals.weakestAttributes.slice(0, 2).map(attributeLabel).join(", ")}) improve through consistent load, not one hard session.`;
    }
    if (has("manager") && signals.hasCareer) {
      score += 3;
      reason = signals.completedSessions > 0
        ? `You manage a career and train as a player — this links the two models you are already using.`
        : `Your Manager career uses exactly these press and mentality dials each fixture.`;
    }
    if (has("simulation") && signals.hasCareer) {
      score += 2;
      reason = "Your career results are single-match samples; this explains how to read them without over-reacting.";
    }
    if (has("scouting") && signals.watchlist > 0) {
      score += 3;
      reason = `You are watching ${signals.watchlist} player${signals.watchlist === 1 ? "" : "s"} — value vs ability decides whether you should act on them.`;
    }
    if (has("tactics") && signals.filmClips > 0) {
      score += 2;
      reason = `${signals.filmClips} analysed clip${signals.filmClips === 1 ? "" : "s"} in your film library — this is the language those events are written in.`;
    }
    if (has("analytics") && signals.completedSessions >= 12) {
      score += 2;
      reason = `With ${signals.completedSessions} sessions logged, rates and samples matter more than single results.`;
    }
    out.push({ lesson: l, score, reason });
  }
  return out
    .sort((a, b) => b.score - a.score || a.lesson.minutes - b.lesson.minutes || a.lesson.title.localeCompare(b.lesson.title))
    .slice(0, limit);
}
