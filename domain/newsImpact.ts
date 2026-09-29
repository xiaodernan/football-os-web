import type { NewsArticle, NewsKind } from "./types";
import type { RowText } from "./rowText";

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
  context: RowText[];
  watch: RowText[];
  evidence: RowText[];
}

// The article type picks the certainty paragraph. A static record of keys rather than a
// composed `ni.stance.${…}`, because the value is a closed union the module already knows:
// spelling each key out here means the i18n reachability check sees them as quoted literals
// and no dynamic-site declaration is needed for a family that never varies at runtime.
const STANCE_KEY: Record<NewsKind, string> = {
  Confirmed: "ni.stance.confirmed",
  Reported: "ni.stance.reported",
  Rumor: "ni.stance.rumor",
  Opinion: "ni.stance.opinion",
  Analysis: "ni.stance.analysis",
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

  // A rank is a number, not an English ordinal: `1st`/`3rd` is a suffix only English has,
  // and the row's own language has to be free to write 第 3 名. `data/intelligence.ts`
  // dropped its suffix for the same reason, so this is the second place the tree agrees on it.
  const context: RowText[] = [];
  for (const s of standings) {
    context.push({
      key: s.position <= 4 ? "ni.ctx.standingTop" : s.position > s.total - 3 ? "ni.ctx.standingBottom" : "ni.ctx.standingMid",
      vars: { club: s.clubLabel, rank: s.position, total: s.total, competition: s.competitionName, points: s.points },
    });
  }
  for (const e of entities) {
    if (e.role === "player" && e.clubName) {
      context.push(e.competitionName
        ? { key: "ni.ctx.atClubComp", vars: { player: e.label, club: e.clubName, competition: e.competitionName } }
        : { key: "ni.ctx.atClub", vars: { player: e.label, club: e.clubName } });
    }
  }

  const watch: RowText[] = [{ key: STANCE_KEY[article.kind] }];
  if (article.topics.length) {
    watch.push({ key: "ni.watch.topics", vars: { topics: article.topics.map((tp) => `#${tp}`).join(" ") } });
  }
  if (resolved === 0) watch.push({ key: "ni.watch.unresolved" });

  const evidence: RowText[] = [
    { key: "ni.ev.credibility", vars: { n: Math.round(article.credibility * 100) } },
    // `stance` is a rowText code variable, so the article's own type is resolved to the
    // reader's word rather than printed as the dataset's `Confirmed`/`Rumor`.
    { key: "ni.ev.kind", vars: { stance: article.kind } },
    { key: "ni.ev.resolved", vars: { n: resolved } },
    ...standings.map((s) => ({ key: "ni.ev.standing", vars: { club: s.clubLabel, rank: s.position, total: s.total, points: s.points } })),
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

export const CERTAINTY_TONE: Record<Certainty, string> = {
  high: "border-success/40 bg-success/10 text-success",
  moderate: "border-warning/40 bg-warning/10 text-warning",
  low: "border-destructive/40 bg-destructive/10 text-destructive",
};
