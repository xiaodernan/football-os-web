import { makeRng, rngInt, pick } from "@/lib/rng";
import { footballProvider, getClub, getCompetition, newsFeed } from "@/data/footballService";

// Community is a genuine discussion surface that runs fully in Demo Mode: seed
// threads are derived deterministically from the real world dataset (fixtures and
// news), and anything a visitor posts persists on their device. A future backend
// provider can replace `seedThreads` + local storage without touching the UI.

export interface Comment {
  id: string;
  author: string;
  body: string;
  at: string;
  likes: number;
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
      likes: rngInt(rng, 0, 42),
    };
  }).sort((a, b) => b.likes - a.likes);
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
