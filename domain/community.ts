import { makeRng, rngInt, pick } from "@/lib/rng";
import { pct, fmt0, fmt2 } from "@/lib/utils";
import { asRowText, type RowText } from "./rowText";
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
  body: RowText;
  at: string;
  likes: number;
  sample: boolean; // generated demonstration content, not a real person
}

export interface Thread {
  id: string;
  title: RowText;
  tag: string;
  author: string;
  body: RowText;
  at: string;
  seeded: boolean;
  comments: Comment[];
}

/** Threads and replies stored before these fields were rows hold the text the app wrote at the
 *  time — the visitor's own words, or a seeded sentence from an older build. Both are kept
 *  verbatim as a value and never re-read as a key, which is the same repair a session title, a
 *  goal title and a coach prompt get. Called from the store's hydration boundary. */
export function repairCommunityTexts<T extends { userThreads: Thread[]; replies: Record<string, Comment[]> }>(store: T): T {
  const legacy = (v: unknown) => typeof v === "string";
  const anyLegacy =
    store.userThreads.some((th) => legacy(th.title as unknown) || legacy(th.body as unknown)) ||
    Object.values(store.replies ?? {}).some((list) => (list ?? []).some((c) => legacy(c.body as unknown)));
  if (!anyLegacy) return store;
  const fixThread = (th: Thread): Thread => ({ ...th, title: asRowText(th.title as unknown as string), body: asRowText(th.body as unknown as string) });
  const fixComment = (c: Comment): Comment => ({ ...c, body: asRowText(c.body as unknown as string) });
  return {
    ...store,
    userThreads: store.userThreads.map((th) => (legacy(th.title as unknown) || legacy(th.body as unknown) ? fixThread(th) : th)),
    replies: Object.fromEntries(
      Object.entries(store.replies ?? {}).map(([k, list]) => [k, (list ?? []).map((c) => (legacy(c.body as unknown) ? fixComment(c) : c))]),
    ),
  };
}

const HANDLES = ["tiki_taka_tom", "lowblock_lena", "xg_or_nothing", "boxtobox_bea", "false9_felix", "pressing_pro", "setpiece_sam", "counter_kai", "libero_luca", "winger_wren"];

// The reply bank. Keys rather than sentences: these are the model's own voice pretending to be
// other people, so a reader on 简体中文 has to see Chinese sample replies, and the bank is
// picked by a seeded index the dictionary cannot be asked about. The two banks stay separate
// arrays because `seededComments` picks between them, not because the wording differs.
const OPINION_KEYS = [
  "comm.opinion.1",
  "comm.opinion.2",
  "comm.opinion.3",
  "comm.opinion.4",
  "comm.opinion.5",
  "comm.opinion.6",
  "comm.opinion.7",
  "comm.opinion.8",
];

const QUESTION_KEYS = ["comm.question.1", "comm.question.2", "comm.question.3", "comm.question.4"];

function ago(days: number): string {
  // Calendar days, not elapsed 24-hour blocks - the convention relativeDay counts, so a
  // seeded instant and the word the door renders for it agree on a DST day (M303; the
  // constructor-wrapped subtraction this replaced was the relative-time census's blind shape).
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function seededComments(threadSeed: string): Comment[] {
  const rng = makeRng(threadSeed);
  const n = rngInt(rng, 1, 4);
  return Array.from({ length: n }, (_, i) => {
    const useQ = rng() < 0.35;
    const bank = useQ ? QUESTION_KEYS : OPINION_KEYS;
    return {
      id: `${threadSeed}-c${i}`,
      author: pick(rng, HANDLES),
      body: { key: bank[(rngInt(rng, 0, bank.length - 1)) % bank.length] },
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
      title: {
        key: "comm.thread.raceTitle",
        vars: { competition: getCompetition(comp.id)?.name ?? comp.name, a: a.name, b: b.name },
      },
      tag: "Debates",
      author: pick(makeRng(id), HANDLES),
      body: {
        key: "comm.thread.raceBody",
        vars: { a: a.name, pa: table[0].points, b: b.name, pb: table[1].points },
      },
      at: ago(rngInt(makeRng(id), 1, 4)),
      seeded: true,
      comments: seededComments(id),
    });
  }

  // A thread per top transfer-style news item.
  for (const n of newsFeed.slice(0, 4)) {
    const id = `t-news-${n.id}`;
    // The article's own headline as its keyed row (M274): before, the thread
    // title was `{ value: n.title }` — the seed's English sentence frozen at
    // seed time — so a 简体中文 reader opened a Chinese community and read an
    // English headline. The body quotes the localized summary line the same
    // way the article screen composes it: title row inside, kind code var
    // resolved by the row door, whole-percent credibility.
    threads.push({
      id,
      title: { key: n.titleKey, vars: n.titleVars },
      tag: n.kind === "Rumor" ? "Rumours" : "News",
      author: pick(makeRng(id), HANDLES),
      body: {
        key: "comm.thread.newsBody",
        vars: {
          summary: {
            key: "ni.summaryLine",
            vars: { title: { key: n.titleKey, vars: n.titleVars }, club: n.titleVars.club, player: n.titleVars.player, kind: n.kind, cred: pct(n.credibility) },
          },
          cred: fmt0(n.credibility * 100),
        },
      },
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
  training?: { sessions: number; minutes: number; topFocusKey?: string; topFocusSessions?: number; avgRating: number | null };
  academy?: { completed: number; mastered: number; lastLesson?: string };
  watchlist?: number;
}

export interface StarterDraft {
  id: string;
  title: RowText;
  body: RowText;
  tag: string;
  evidence: RowText[];
}

// Drafts assembled ONLY from numbers the user's own pillars actually produced.
// Each one carries the figures it was built from so the suggestion can be
// checked, and none is offered unless the underlying record exists.
export function buildStarters(input: StarterInput, limit = 3): StarterDraft[] {
  const out: StarterDraft[] = [];

  if (input.career && input.career.won + input.career.drawn + input.career.lost >= 3) {
    const c = input.career;
    // A code, not a phrase: `feels` is a rowText code variable, so the word that says how the
    // performances sit against the points is the reader's own — three copies of this long
    // sentence would have been the alternative.
    const feels = c.pointsPerGame >= 1.8 ? "ahead" : c.pointsPerGame >= 1.2 ? "inline" : "behind";
    out.push({
      id: "starter-career",
      tag: "Tactics",
      title: {
        key: "comm.starter.careerTitle",
        vars: { club: c.clubName, won: c.won, drawn: c.drawn, lost: c.lost, ppg: fmt2(c.pointsPerGame) },
      },
      body: {
        key: "comm.starter.careerBody",
        vars: { club: c.clubName, remaining: c.gamesRemaining, position: c.position, count: c.clubCount, feels },
      },
      evidence: [
        { key: "comm.starter.evRecord", vars: { won: c.won, drawn: c.drawn, lost: c.lost } },
        { key: "comm.starter.evPpg", vars: { n: fmt2(c.pointsPerGame) } },
        { key: "comm.starter.evTable", vars: { position: c.position, count: c.clubCount } },
        { key: "comm.starter.evRemaining", vars: { n: c.gamesRemaining } },
      ],
    });
  }

  // The focus arm needs the whole record: the label AND how many sessions hit it. A name
  // without a count would print "undefined of 5 sessions", so the draft is withheld rather
  // than guessed at — the same rule the other arms follow.
  if (input.training && input.training.sessions >= 2 && input.training.topFocusKey && typeof input.training.topFocusSessions === "number") {
    const t = input.training;
    // M204: this said "Most of my work is X" whatever the numbers were. The caller hands over
    // the most frequent focus and its count, and 1 of 5 sessions is reachable from the store
    // (five completed sessions, five different focus attributes) — so the draft could claim a
    // majority the record does not have. The word now follows the ratio.
    const hits = t.topFocusSessions ?? 0;
    const majority = hits * 2 > t.sessions;
    // The guard above established the focus key; `!` here is the same reading the old
    // `attributeLabel(t.topFocusKey!)` took, and the draft is withheld without it.
    const vars = { a: t.topFocusKey!, hits, sessions: t.sessions };
    out.push({
      id: "starter-training",
      tag: "General",
      title: { key: majority ? "comm.starter.trainingTitleMost" : "comm.starter.trainingTitleFocus", vars },
      // Written out rather than spread: the placeholder audit reads a `vars:` body through a
      // balanced-brace scanner and refuses a shape it cannot read, which `{ ...vars }` is.
      body: t.avgRating != null
        ? { key: "comm.starter.trainingBodyRated", vars: { a: t.topFocusKey!, hits, sessions: t.sessions, minutes: t.minutes, rating: t.avgRating } }
        : { key: "comm.starter.trainingBody", vars: { a: t.topFocusKey!, hits, sessions: t.sessions, minutes: t.minutes } },
      evidence: [
        { key: "comm.starter.evSessions", vars: { n: t.sessions, min: t.minutes } },
        { key: "comm.starter.evFocus", vars: { a: t.topFocusKey!, hits } },
        t.avgRating != null ? { key: "comm.starter.evRating", vars: { n: t.avgRating } } : { key: "comm.starter.evNoRating" },
      ],
    });
  }

  if (input.academy && input.academy.completed > 0 && input.academy.lastLesson) {
    const a = input.academy;
    // The lesson title is the catalogue's own word, so it travels as a variable and is never
    // re-read as a key.
    const lesson = a.lastLesson!;
    const vars = { n: a.completed, mastered: a.mastered, lesson };
    out.push({
      id: "starter-academy",
      tag: "Debates",
      title: { key: "comm.starter.academyTitle", vars: { lesson } },
      body: { key: a.completed === 1 ? "comm.starter.academyBodyOne" : "comm.starter.academyBody", vars },
      evidence: [
        { key: "comm.starter.evCompleted", vars: { n: a.completed } },
        { key: a.mastered === 1 ? "comm.starter.evChecksOne" : "comm.starter.evChecks", vars: { n: a.mastered } },
        { key: "comm.starter.evLatest", vars: { lesson } },
      ],
    });
  }

  if (input.watchlist && input.watchlist > 0) {
    const w = input.watchlist;
    out.push({
      id: "starter-watchlist",
      tag: "Transfers",
      title: { key: w === 1 ? "comm.starter.watchTitleOne" : "comm.starter.watchTitle", vars: { n: w } },
      body: { key: "comm.starter.watchBody", vars: { n: w } },
      evidence: [{ key: "comm.starter.evWatched", vars: { n: w } }],
    });
  }

  return out.slice(0, limit);
}
