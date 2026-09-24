import type { NewsArticle } from "./types";

// A grounded "what does this mean" read for a news article. It never invents
// facts: every line is built from the article's own metadata (kind,
// credibility, topics) and relationships that already exist in the world
// dataset (which club a player belongs to, where a referenced club sits in its
// live standings). The confidence is derived from the source credibility and
// how many entities actually resolved — an unverified rumour about unknown
// names scores low rather than pretending authority (spec §6, §57, §60).

export interface ImpactEntity {
  id: string;
  label: string;
  role: "player" | "club";
  to: string;
  clubName?: string;
  competitionName?: string;
}

export interface ClubStandingFact {
  clubLabel: string;
  competitionName: string;
  position: number;
  total: number;
  points: number;
}

export interface ImpactInput {
  article: Pick<NewsArticle, "kind" | "credibility" | "topics">;
  entities: ImpactEntity[];
  standings: ClubStandingFact[];
}

export type Certainty = "high" | "moderate" | "low";

export interface NewsImpact {
  confidence: number;
  certainty: Certainty;
  context: string[];
  watch: string[];
  evidence: string[];
}

const KIND_STANCE: Record<NewsArticle["kind"], string> = {
  Confirmed: "Reported as confirmed — safe to treat as fact for planning.",
  Reported: "Reported by a named source but not yet officially confirmed.",
  Rumor: "Unverified rumour — weight it lightly until a club or player confirms.",
  Opinion: "Commentary rather than a factual claim — reflects the writer's view.",
  Analysis: "Analytical read — grounded in data but interpretive.",
};

function bandCertainty(confidence: number): Certainty {
  if (confidence >= 70) return "high";
  if (confidence >= 45) return "moderate";
  return "low";
}

export function buildImpact(input: ImpactInput): NewsImpact {
  const { article, entities, standings } = input;
  const resolved = entities.length;

  // Confidence = source credibility, nudged by how much of the story actually
  // resolves to real dataset entities, and damped for soft story types.
  const base = article.credibility * 100;
  const resolutionBonus = Math.min(15, resolved * 5);
  const kindPenalty = article.kind === "Rumor" ? 18 : article.kind === "Opinion" ? 12 : 0;
  const confidence = Math.max(5, Math.min(96, Math.round(base + resolutionBonus - kindPenalty)));
  const certainty = bandCertainty(confidence);

  const context: string[] = [];
  for (const s of standings) {
    const zone =
      s.position <= 4 ? "in the top four" : s.position > s.total - 3 ? "near the bottom" : "mid-table";
    context.push(`${s.clubLabel} sit ${ordinal(s.position)} of ${s.total} in ${s.competitionName} on ${s.points} points — ${zone}.`);
  }
  for (const e of entities) {
    if (e.role === "player" && e.clubName) {
      context.push(`${e.label} is currently at ${e.clubName}${e.competitionName ? ` (${e.competitionName})` : ""}.`);
    }
  }

  const watch: string[] = [KIND_STANCE[article.kind]];
  if (article.topics.length) watch.push(`Topics in play: ${article.topics.map((tp) => `#${tp}`).join(" ")}.`);
  if (resolved === 0) watch.push("No entity in this article maps to the world dataset, so treat the specifics with extra caution.");

  const evidence: string[] = [
    `Source credibility: ${Math.round(article.credibility * 100)}%`,
    `Story type: ${article.kind}`,
    `Entities resolved to the world dataset: ${resolved}`,
    ...standings.map((s) => `${s.clubLabel}: ${ordinal(s.position)}/${s.total}, ${s.points} pts`),
  ];

  return { confidence, certainty, context, watch, evidence };
}

// Feed personalisation for a visitor who picked a club during onboarding. This
// only reorders: a story moves up when its OWN entityIds mention that club (or
// one of the players registered to it in the world dataset). Nothing is
// filtered out, added or rewritten, so a club with no coverage leaves the feed
// byte-identical and `matched` reports 0 rather than inventing relevance.
export interface RankedNews<T> {
  items: T[];
  matched: number;
}

export function rankNewsForClub<T extends Pick<NewsArticle, "entityIds">>(
  articles: readonly T[],
  clubId: string | null | undefined,
  clubPlayerIds: readonly string[] = []
): RankedNews<T> {
  if (!clubId) return { items: [...articles], matched: 0 };
  const related = new Set<string>([clubId, ...clubPlayerIds]);
  const about: T[] = [];
  const rest: T[] = [];
  for (const a of articles) (a.entityIds.some((id) => related.has(id)) ? about : rest).push(a);
  return { items: [...about, ...rest], matched: about.length };
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const CERTAINTY_TONE: Record<Certainty, string> = {
  high: "border-success/40 bg-success/10 text-success",
  moderate: "border-warning/40 bg-warning/10 text-warning",
  low: "border-destructive/40 bg-destructive/10 text-destructive",
};
