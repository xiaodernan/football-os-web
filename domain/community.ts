import { makeRng, rngInt, pick } from "@/lib/rng";
import { footballProvider, getClub, getCompetition, newsFeed } from "@/data/footballService";

// Community in Demo Mode is a local discussion surface, not a networked one.
// Thread topics are derived deterministically from the real world dataset
// (standings and news), but their authors and replies are GENERATED SAMPLE
// CONTENT and are flagged `seeded` / `sample` so the UI can label them — no real
// people are behind them and sample posts never claim likes. Anything the
// visitor writes is stored on their own device. A future backend provider can
// replace `seedThreads` + local storage without touching the UI.

export interface Comment {
  id: string;
  author: string;
  body: string;
  at: string;
  likes: number;
  sample: boolean; // generated demonstration content, not a real person
}

export interface Thread {
  id: string;
  title: string;
  tag: string;
  author: string;
  body: string;
  at: string;
  seeded: boolean;
  comments: Comment[];
}

const HANDLES = ["tiki_taka_tom", "lowblock_lena", "xg_or_nothing", "boxtobox_bea", "false9_felix", "pressing_pro", "setpiece_sam", "counter_kai", "libero_luca", "winger_wren"];

const OPINIONS = [
  "The underlying numbers back that up — the chances were there for most of the game.",
  "I'd caution against reading too much into one result; the sample is tiny.",
  "That's exactly the trade-off the new shape is trying to manage.",
  "People sleep on how much that costs physically by the final twenty minutes.",
  "Genuinely the most underrated role on the pitch right now.",
  "Fair point, but I think you're overweighting the goals and underweighting the chance creation.",
  "The tactical discipline to hold that line is not easy to coach.",
  "This is where squad depth quietly decides a season.",
];

const QUESTIONS = [
  "Would you change the approach if you were a game ahead rather than a game level?",
  "Is that a system issue or a personnel issue, honestly?",
  "How much of this comes down to the opponent's block height?",
  "What would you tweak at half-time if it stayed goalless?",
];

function ago(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function seededComments(threadSeed: string): Comment[] {
  const rng = makeRng(threadSeed);
  const n = rngInt(rng, 1, 4);
  return Array.from({ length: n }, (_, i) => {
    const useQ = rng() < 0.35;
    const bank = useQ ? QUESTIONS : OPINIONS;
    return {
      id: `${threadSeed}-c${i}`,
      author: pick(rng, HANDLES),
      body: bank[(rngInt(rng, 0, bank.length - 1)) % bank.length],
      at: ago(rngInt(rng, 0, 6)),
      likes: 0, // generated replies never claim popularity they don't have
      sample: true,
    };
  });
}

export function seedThreads(): Thread[] {
  const threads: Thread[] = [];

  // A thread per competition title race (from standings top two).
  for (const comp of footballProvider.competitions().slice(0, 4)) {
    const table = footballProvider.standings(comp.id).slice(0, 2);
    if (table.length < 2) continue;
    const a = getClub(table[0].clubId);
    const b = getClub(table[1].clubId);
    if (!a || !b) continue;
    const id = `t-race-${comp.id}`;
    threads.push({
      id,
      title: `${getCompetition(comp.id)?.name ?? comp.name} title race: ${a.name} vs ${b.name}?`,
      tag: "Debates",
      author: pick(makeRng(id), HANDLES),
      body: `${a.name} lead on ${table[0].points} points with ${b.name} on ${table[1].points}. Who has the better squad to go all the way?`,
      at: ago(rngInt(makeRng(id), 1, 4)),
      seeded: true,
      comments: seededComments(id),
    });
  }

  // A thread per top transfer-style news item.
  for (const n of newsFeed.slice(0, 4)) {
    const id = `t-news-${n.id}`;
    threads.push({
      id,
      title: n.title,
      tag: n.kind === "Rumor" ? "Rumours" : "News",
      author: pick(makeRng(id), HANDLES),
      body: `${n.summary}\n\nSource credibility is ${(n.credibility * 100).toFixed(0)}%. Take it accordingly.`,
      at: n.publishedAt,
      seeded: true,
      comments: seededComments(id),
    });
  }

  return threads;
}

export function allTags(): string[] {
  return ["All", "General", "Tactics", "Transfers", "Rumours", "Debates", "News"];
}

export interface StarterInput {
  career?: {
    clubName: string;
    position: number;
    clubCount: number;
    won: number;
    drawn: number;
    lost: number;
    pointsPerGame: number;
    gamesRemaining: number;
  };
  training?: { sessions: number; minutes: number; topFocusLabel?: string; topFocusSessions?: number; avgRating: number | null };
  academy?: { completed: number; mastered: number; lastLesson?: string };
  watchlist?: number;
}

export interface StarterDraft {
  id: string;
  title: string;
  body: string;
  tag: string;
  evidence: string[];
}

// Drafts assembled ONLY from numbers the user's own pillars actually produced.
// Each one carries the figures it was built from so the suggestion can be
// checked, and none is offered unless the underlying record exists.
export function buildStarters(input: StarterInput, limit = 3): StarterDraft[] {
  const out: StarterDraft[] = [];

  if (input.career && input.career.won + input.career.drawn + input.career.lost >= 3) {
    const c = input.career;
    const feels = c.pointsPerGame >= 1.8 ? "ahead of" : c.pointsPerGame >= 1.2 ? "in line with" : "behind";
    out.push({
      id: "starter-career",
      tag: "Tactics",
      title: `${c.clubName}: ${c.won}-${c.drawn}-${c.lost} at ${c.pointsPerGame.toFixed(2)} pts/game — playing to the record or against it?`,
      body: `Running ${c.clubName} with ${c.gamesRemaining} fixtures left, currently #${c.position} of ${c.clubCount}. The underlying performances feel ${feels} the points, so what would you change about the approach?`,
      evidence: [
        `${c.won}-${c.drawn}-${c.lost}`,
        `${c.pointsPerGame.toFixed(2)} pts/game`,
        `#${c.position} of ${c.clubCount}`,
        `${c.gamesRemaining} fixtures left`,
      ],
    });
  }

  if (input.training && input.training.sessions >= 2 && input.training.topFocusLabel) {
    const t = input.training;
    out.push({
      id: "starter-training",
      tag: "General",
      title: `Most of my work is ${t.topFocusLabel} (${t.topFocusSessions} of ${t.sessions} sessions) — bias or plan?`,
      body: `I have logged ${t.sessions} sessions totalling ${t.minutes} minutes${t.avgRating != null ? `, self-rated ${t.avgRating}/5 on average` : ""}, and ${t.topFocusSessions} of them hit ${t.topFocusLabel}. At what point does focus become neglect of everything else?`,
      evidence: [
        `${t.sessions} sessions · ${t.minutes} min`,
        `${t.topFocusLabel} ×${t.topFocusSessions}`,
        t.avgRating != null ? `avg self-rating ${t.avgRating}/5` : "no self-ratings yet",
      ],
    });
  }

  if (input.academy && input.academy.completed > 0 && input.academy.lastLesson) {
    const a = input.academy;
    out.push({
      id: "starter-academy",
      tag: "Debates",
      title: `The academy says ${a.lastLesson} — does that kind of theory show up under pressure?`,
      body: `Academy so far: ${a.completed} lesson${a.completed === 1 ? "" : "s"} completed, ${a.mastered} with a passed check, most recently ${a.lastLesson}. Has anyone seen a measurable difference in their own games from this kind of study, or is it mostly coaching language?`,
      evidence: [`${a.completed} completed`, `${a.mastered} passed check${a.mastered === 1 ? "" : "s"}`, `latest lesson: ${a.lastLesson}`],
    });
  }

  if (input.watchlist && input.watchlist > 0) {
    const w = input.watchlist;
    out.push({
      id: "starter-watchlist",
      tag: "Transfers",
      title: `Watching ${w} player${w === 1 ? "" : "s"} — what would actually make you sign one?`,
      body: `I have ${w} on my watchlist. Rather than arguing about names: what is your decision rule — age and resale, immediate contribution, or squad fit?`,
      evidence: [`${w} watched`],
    });
  }

  return out.slice(0, limit);
}
