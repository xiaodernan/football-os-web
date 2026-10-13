// Retrieval-grounded Football AI (spec §44–§47, §50, §76).
// Every answer is assembled from the world dataset: we retrieve matching
// entities, pull concrete facts, then hand a grounded context to the coach
// provider. Answers always carry evidence, sources and confidence.

import type { RowText } from "@/domain/rowText";
import type { SearchKind } from "@/domain/types";
import { formatDate } from "@/i18n/format";
import type { Locale } from "@/i18n/dictionaries";
import { scoutReport } from "@/domain/scouting";
import { byKickoff } from "@/domain/analytics";
import { byOverall } from "@/domain/attributes";
import { careerArc } from "@/domain/careerArc";
import {
  globalSearch,
  getClub,
  getPlayer,
  getCompetition,
  getMatch,
  getNews,
  footballProvider,
  playersByClub,
  matchesByStatus,
  fixtureForecast,
  formatValue,
  type SearchResult,
} from "@/data/footballService";

export interface EvidenceFact {
  /** Both halves are rows. A chip word the app chooses ("Standings") is a keyed row; the
   *  entity the fact is about (a club name, a headline kind) is a value row, because those
   *  words came out of the record. A sentence composed here reaches a 繁體中文 reader as
   *  English with no gate able to see it — the raw-UI scan reads components only. */
  label: RowText;
  text: RowText;
  to?: string;
}

export interface RagContext {
  hits: SearchResult[];
  facts: EvidenceFact[];
  /** What the answer retrieved, as `Club · Manchester City` rows. The type:id pair the
   *  retrieval layer works in (`club:mci`) is a code, and a code printed to a visitor is
   *  the bug class M58 was about. */
  sources: RowText[];
  confidence: number;
}

export interface RagAnswer {
  question: string;
  /** The lead row plus the retrieved facts it stands on, as rows. `composeAnswer` used to
   *  return one string joining a lead, a fact and two more facts with spaces — a paragraph
   *  no target language could reorder. The panel renders these in order. */
  answer: RowText[];
  facts: EvidenceFact[];
  sources: RowText[];
  confidence: number;
  at: string;
}

function clubFacts(clubId: string): EvidenceFact[] {
  const c = getClub(clubId);
  if (!c) return [];
  const squad = playersByClub(clubId).sort(byOverall);
  const table = footballProvider.standings(c.competitionId);
  const pos = table.findIndex((s) => s.clubId === clubId);
  const out: EvidenceFact[] = [
    {
      label: { value: c.name },
      text: { key: "ai.fact.club", vars: { name: c.name, short: c.short, comp: getCompetition(c.competitionId)?.name ?? "", overall: c.overall, stadium: c.stadium } },
      to: `/clubs/${c.id}`,
    },
  ];
  if (pos >= 0) {
    const s = table[pos];
    out.push({
      label: { key: "ai.lab.standings" },
      // The English ordinal suffix (`1st`) is gone: a rank is a number, and `1st` is
      // morphology no other language in this app shares.
      text: { key: "ai.fact.standings", vars: { pos: pos + 1, points: s.points, w: s.won, d: s.drawn, l: s.lost, gd: s.gf - s.ga } },
      to: `/competitions/${c.competitionId}`,
    });
  }
  if (squad[0])
    out.push({
      label: { key: "ai.lab.keyMan" },
      text: { key: "ai.fact.keyMan", vars: { name: squad[0].name, position: squad[0].position, overall: squad[0].overall, value: formatValue(squad[0].value) } },
      to: `/players/${squad[0].id}`,
    });
  const fixture = [...matchesByStatus("SCHEDULED").filter((m) => m.homeClubId === clubId || m.awayClubId === clubId)].sort(byKickoff)[0];
  if (fixture) {
    const opp = fixture.homeClubId === clubId ? getClub(fixture.awayClubId) : getClub(fixture.homeClubId);
    out.push({
      label: { key: "ai.lab.nextFixture" },
      text: { key: "ai.fact.nextFixture", vars: { opponent: opp?.name ?? "", comp: getCompetition(fixture.competitionId)?.name ?? "" } },
      to: `/matches/${fixture.id}`,
    });
    const fc = fixtureForecast(fixture.id);
    if (fc) {
      const home = getClub(fixture.homeClubId);
      const away = getClub(fixture.awayClubId);
      out.push({
        label: { key: "ai.lab.nextFixtureModel" },
        text:
          fc.sample === 1
            ? { key: "ai.fact.poissonClubOne", vars: { home: home?.name ?? "", away: away?.name ?? "", hp: fc.homePct, dp: fc.drawPct, ap: fc.awayPct, lh: fc.lambdaHome.toFixed(2), la: fc.lambdaAway.toFixed(2), score: fc.mostLikelyScore } }
            : { key: "ai.fact.poissonClubMany", vars: { n: fc.sample, home: home?.name ?? "", away: away?.name ?? "", hp: fc.homePct, dp: fc.drawPct, ap: fc.awayPct, lh: fc.lambdaHome.toFixed(2), la: fc.lambdaAway.toFixed(2), score: fc.mostLikelyScore } },
        to: `/matches/${fixture.id}`,
      });
    }
  }
  return out;
}

function playerFacts(pid: string): EvidenceFact[] {
  const p = getPlayer(pid);
  if (!p) return [];
  const c = getClub(p.clubId);
  const out: EvidenceFact[] = [
    {
      label: { value: p.name },
      text: { key: "ai.fact.player", vars: { name: p.name, position: p.position, age: p.age, nation: p.nation, club: c?.name ?? "", overall: p.overall, potential: p.potential, value: formatValue(p.value), foot: p.foot } },
      to: `/players/${p.id}`,
    },
    { label: { key: "ai.lab.profile" }, text: { key: "ai.fact.archetype", vars: { arch: p.archetype } }, to: `/players/${p.id}` },
  ];
  let up = "";
  let down = "";
  const report = scoutReport(p);
  if (report.hasVector) {
// Attribute CODES joined, not names with deltas: the reader's own words name them, and
// the per-attribute figures stay where they are already rendered (the scouting panel),
// because "Passing +3, Dribbling +2" is a string no translation can rebuild.
    up = report.strengths.slice(0, 3).map((s) => s.key).join(",");
    down = report.concerns.slice(-3).reverse().map((s) => s.key).join(",");
    out.push({
      label: { key: "ai.lab.templateEdge" },
      // The scout's headline is keyed (sc.out.head.*, M270); this row names the
      // template comparison itself, and the two rows after it name the attributes
      // by their code words.
      text: { key: "ai.fact.templateEdge", vars: { group: p.positionGroup } },
      to: `/players/${p.id}`,
    });
  }
  if (up)
    out.push({ label: { key: "det.scout.above" }, text: { key: "ai.fact.aboveTemplate", vars: { focus: up } }, to: `/players/${p.id}` });
  if (down)
    out.push({ label: { key: "det.scout.below" }, text: { key: "ai.fact.belowTemplate", vars: { focus: down } }, to: `/players/${p.id}` });
  const arc = careerArc(p);
  if (arc.hasData) {
    out.push({
      label: { key: "ai.lab.careerArc" },
      text: { key: "ai.fact.arcPeak", vars: { age: arc.age, traj: arc.trajectory, peak: arc.projectedPeak, peakAge: arc.peakAge } },
      to: `/players/${p.id}`,
    });
    out.push({
      label: { key: "ai.lab.careerArc" },
      // The runway is its own row: two countables in one sentence means two One/Many
      // pairs and four arms, so the second figure is phrased as a label and value.
      text:
        arc.yearsToPeak === 1
          ? { key: "ai.fact.arcRunwayOne", vars: { m: arc.remainingPrimeYears } }
          : { key: "ai.fact.arcRunwayMany", vars: { n: arc.yearsToPeak, m: arc.remainingPrimeYears } },
      to: `/players/${p.id}`,
    });
  }
  return out;
}

function matchFacts(mid: string, locale: Locale): EvidenceFact[] {
  const m = getMatch(mid);
  if (!m) return [];
  const h = getClub(m.homeClubId);
  const a = getClub(m.awayClubId);
// Base and status used to be joined by hand; one row per state now carries both.
  const out: EvidenceFact[] = [
    {
      label: { key: "ai.lab.fixture" },
      text:
        m.status === "SCHEDULED"
          ? { key: "ai.fact.fixtureScheduled", vars: { home: h?.name ?? "", away: a?.name ?? "", comp: getCompetition(m.competitionId)?.name ?? "", round: m.round, when: formatDate(locale, m.kickoff, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) } }
          : { key: "ai.fact.fixtureResult", vars: { home: h?.name ?? "", away: a?.name ?? "", comp: getCompetition(m.competitionId)?.name ?? "", round: m.round, hg: String(m.homeGoals ?? "—"), ag: String(m.awayGoals ?? "—") } },
      to: `/matches/${m.id}`,
    },
  ];
  const fc = m.status === "SCHEDULED" ? fixtureForecast(m.id) : null;
  if (fc) {
    out.push({
      label: { key: "ai.lab.model" },
      text:
        fc.sample === 1
          ? { key: "ai.fact.poissonMatchOne", vars: { home: h?.name ?? "", away: a?.name ?? "", hp: fc.homePct, dp: fc.drawPct, ap: fc.awayPct, lh: fc.lambdaHome.toFixed(2), la: fc.lambdaAway.toFixed(2), score: fc.mostLikelyScore } }
          : { key: "ai.fact.poissonMatchMany", vars: { n: fc.sample, home: h?.name ?? "", away: a?.name ?? "", hp: fc.homePct, dp: fc.drawPct, ap: fc.awayPct, lh: fc.lambdaHome.toFixed(2), la: fc.lambdaAway.toFixed(2), score: fc.mostLikelyScore } },
      to: `/matches/${m.id}`,
    });
  }
  return out;
}

function newsFacts(nid: string): EvidenceFact[] {
  const n = getNews(nid);
  if (!n) return [];
  return [
    {
      label: { value: n.kind },
      // Title and summary ride as their keyed rows (M274), so the evidence card
      // words the story in the reader's locale instead of quoting the seed's
      // English sentence; the raw `n.title` stays the matcher's data, not glass.
      text: {
        key: "ai.fact.news",
        vars: {
          title: { key: n.titleKey, vars: n.titleVars },
          summary: {
            key: "ni.summaryLine",
            vars: { title: { key: n.titleKey, vars: n.titleVars }, club: n.titleVars.club, player: n.titleVars.player, kind: n.kind, cred: Math.round(n.credibility * 100) },
          },
          source: n.source,
        },
      },
      to: `/news/${n.id}`,
    },
  ];
}

function factsFor(hit: SearchResult, locale: Locale): EvidenceFact[] {
  switch (hit.type) {
    case "club": return clubFacts(hit.id);
    case "player": return playerFacts(hit.id);
    case "match": return matchFacts(hit.id, locale);
    case "news": return newsFacts(hit.id);
    case "competition": {
      const comp = getCompetition(hit.id);
      if (!comp) return [];
      const table = footballProvider.standings(hit.id);
      const leader = table[0] ? getClub(table[0].clubId) : null;
      return [
        {
          label: { value: comp.name },
          text: leader
            ? { key: "ai.fact.competitionLeaders", vars: { name: comp.name, nation: comp.nation, tier: comp.tier, n: comp.clubIds.length, leader: leader.name, points: table[0].points } }
            : { key: "ai.fact.competition", vars: { name: comp.name, nation: comp.nation, tier: comp.tier, n: comp.clubIds.length } },
          to: `/competitions/${comp.id}`,
        },
      ];
    }
  }
}

const STOPWORDS = new Set([
  "the", "a", "an", "who", "what", "where", "when", "why", "how", "which", "is", "are", "was",
  "were", "do", "does", "did", "in", "on", "at", "to", "of", "for", "with", "about", "and",
  "or", "sit", "sits", "play", "plays", "team", "best", "key", "top", "any", "his", "her",
  "they", "them", "it", "this", "that", "much", "worth", "news", "vs", "versus",
]);

/** Build candidate search phrases from a natural-language question:
 *  adjacent word-pairs first (more specific), then meaningful single words. */
function phrases(question: string): string[] {
  const words = question.toLowerCase().replace(/[^a-z0-9' -]/g, " ").split(/\s+/).map((w) => w.replace(/^['-]|['-]$/g, "")).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    if (!STOPWORDS.has(words[i]) && !STOPWORDS.has(words[i + 1])) out.push(`${words[i]} ${words[i + 1]}`);
  }
  for (const w of words) if (w.length >= 3 && !STOPWORDS.has(w)) out.push(w);
  return [...new Set(out)];
}

/** Retrieve, ground and answer one question.
 *
 *  `locale` is a required argument because a fact is composed HERE, in a module with no
 *  React context and no `t()` in scope: the fixture line carries a kickoff instant, and an
 *  instant has no written form until someone's language decides one. Left to the machine it
 *  would default to the browser's — which is the defect M194 closed on every screen, and
 *  check 33 of proof-i18n now refuses. */
export function retrieve(question: string, locale: Locale): RagContext {
  const hits = new Map<string, SearchResult>();
  for (const phrase of phrases(question)) {
    for (const h of globalSearch(phrase, 3)) {
      const id = h.type + ":" + h.id;
      if (!hits.has(id)) hits.set(id, h);
    }
    if (hits.size >= 5) break;
  }
  // Prefer entities whose title actually appears in the question text.
  const ql = question.toLowerCase();
  const ranked = [...hits.values()].sort((a, b) => {
    const sa = ql.includes(a.title.toLowerCase()) ? 1 : 0;
    const sb = ql.includes(b.title.toLowerCase()) ? 1 : 0;
    return sb - sa;
  }).slice(0, 5);

  const facts: EvidenceFact[] = [];
  const seen = new Set<string>();
  for (const h of ranked) {
    for (const f of factsFor(h, locale)) {
      // Rows dedupe by identity, not by a slice of English text — and a fact whose text
      // is not a row is kept (it is a bug the gates must see) instead of throwing here.
      const key =
        f.text && typeof f.text === "object" && "key" in f.text
          ? f.text.key + JSON.stringify(f.text.vars ?? null)
          : "raw:" + JSON.stringify(f.text);
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push(f);
    }
  }
  const seenHit = new Set<string>();
  const sources: RowText[] = [];
  for (const h of ranked) {
    const id = `${h.type}:${h.id}`;
    if (seenHit.has(id)) continue;
    seenHit.add(id);
    // The news family's name is a composed sentence, so it rides on its keyed row
    // (M275); the proper-noun families pass their string as a value var. Either way
    // fillRowVars words it in the reader's locale, never the seed's English.
    sources.push({ key: "ai.src.entity", vars: { kind: h.type, name: h.titleRow ?? h.title } });
  }
  let confidence = 20;
  if (ranked.length) confidence = Math.min(92, 45 + ranked.length * 8 + (facts.length > 2 ? 6 : 0));
  return {
    hits: ranked,
    facts: facts.slice(0, 6),
    sources: sources.length ? sources : [{ key: "ai.src.none" }],
    confidence,
  };
}

// Deterministic answer synthesis over retrieved facts. Swappable for a real
// Cloud Agent: replace composeAnswer with an agent call using the same shape.
// The answer is rows, in order: a lead and the retrieved facts it stands on. It used to
// be one string — a lead with the first fact interpolated into it, then two more facts
// appended with spaces — which is the shape a translator cannot rebuild, because the
// host sentence's word order decides whether the fragments even read.
function composeAnswer(question: string, ctx: RagContext): RowText[] {
  const q = question.toLowerCase();
  if (!ctx.hits.length) return [{ key: "ai.answer.refusal" }];
  const top = ctx.hits[0];
  // The value read used to scrape a €figure out of an already-rendered sentence with a
  // regex. The record carries that figure, so it is taken from the record and handed to
  // the row as a value — the same M102 guarantee (the answer states the listed figure),
  // without depending on how the figure was once worded.
  const player = top.type === "player" ? getPlayer(top.id) : null;
  const askingValue = /value|worth|cost|price|费用|身价/.test(q);
  let lead: RowText;
  // The lead's {title} var takes the news family's keyed row when the top hit is a
  // story (M275) and the proper nouns as plain values otherwise — fillRowVars words
  // either against the reader's dictionary.
  const titleVar: string | RowText = top.titleRow ?? top.title;
  if (askingValue && player) lead = { key: "ai.answer.value", vars: { title: titleVar, v: formatValue(player.value) } };
  else if (askingValue) lead = { key: "ai.answer.valueUnknown", vars: { title: titleVar } };
  else if (/who|which|best|top|key|star|核心|谁/.test(q)) lead = { key: "ai.answer.given", vars: { title: titleVar } };
  else if (/stand|position|table|排名|榜首|第几/.test(q)) lead = { key: "ai.answer.standing", vars: { title: titleVar } };
  else if (/when|kickoff|fixture|next|time|何时|比赛/.test(q)) lead = { key: "ai.answer.fixture", vars: { title: titleVar } };
  else lead = { key: "ai.answer.default", vars: { title: titleVar } };
  return [lead, ...ctx.facts.slice(0, 3).map((f) => f.text)];
}

export function askIntelligence(question: string, locale: Locale): RagAnswer {
  const ctx = retrieve(question, locale);
  return {
    question,
    answer: composeAnswer(question, ctx),
    facts: ctx.facts,
    sources: ctx.sources,
    confidence: ctx.confidence,
    at: new Date().toISOString(),
  };
}

// ---- Knowledge graph (spec §45) ----
// A node's label is a row, not a string: four families label themselves with the
// record's own proper noun (a value row), but a news hit labels itself with the
// composed headline, which is a keyed row (M275) — the canvas resolves both
// through rowLine, the same door every other row goes through.
export interface KgNode { id: string; label: RowText; type: SearchKind; to: string }
// An edge's label is a word the app chooses ("plays for"), not a value a record
// carries, so it publishes a row and the canvas resolves it — see domain/rowText.ts.
export interface KgEdge { from: string; to: string; relation: RowText }
export interface KgGraph { root: string | null; nodes: KgNode[]; edges: KgEdge[] }

export function buildGraph(query: string): KgGraph {
  const hits = globalSearch(query, 3);
  const nodes = new Map<string, KgNode>();
  const edges: KgEdge[] = [];
  const add = (n: KgNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); };

  for (const h of hits) {
    add({ id: h.type + ":" + h.id, label: h.titleRow ?? { value: h.title }, type: h.type, to: h.to });
    if (h.type === "club") {
      const c = getClub(h.id)!;
      const compN: KgNode = { id: "competition:" + c.competitionId, label: { value: getCompetition(c.competitionId)?.name ?? c.competitionId }, type: "competition", to: `/competitions/${c.competitionId}` };
      add(compN); edges.push({ from: "club:" + c.id, to: compN.id, relation: { key: "ai.rel.competes" } });
      for (const p of playersByClub(c.id).sort(byOverall).slice(0, 6)) {
        const pn: KgNode = { id: "player:" + p.id, label: { value: p.name }, type: "player", to: `/players/${p.id}` };
        add(pn); edges.push({ from: "club:" + c.id, to: pn.id, relation: { key: "ai.rel.hasPlayer" } });
      }
    }
    if (h.type === "player") {
      const p = getPlayer(h.id)!;
      const cn: KgNode = { id: "club:" + p.clubId, label: { value: getClub(p.clubId)?.name ?? p.clubId }, type: "club", to: `/clubs/${p.clubId}` };
      add(cn); edges.push({ from: "player:" + p.id, to: cn.id, relation: { key: "ai.rel.playsFor" } });
    }
    if (h.type === "news") {
      const n = getNews(h.id)!;
      for (const e of n.entityIds) {
        if (getPlayer(e)) { const pn: KgNode = { id: "player:" + e, label: { value: getPlayer(e)!.name }, type: "player", to: `/players/${e}` }; add(pn); edges.push({ from: "news:" + n.id, to: pn.id, relation: { key: "ai.rel.mentions" } }); }
        else if (getClub(e)) { const cn: KgNode = { id: "club:" + e, label: { value: getClub(e)!.name }, type: "club", to: `/clubs/${e}` }; add(cn); edges.push({ from: "news:" + n.id, to: cn.id, relation: { key: "ai.rel.mentions" } }); }
      }
    }
    if (h.type === "competition") {
      const table = footballProvider.standings(h.id);
      for (const s of table.slice(0, 8)) {
        const c = getClub(s.clubId);
        if (!c) continue;
        const cn: KgNode = { id: "club:" + c.id, label: { value: c.name }, type: "club", to: `/clubs/${c.id}` };
        add(cn); edges.push({ from: "competition:" + h.id, to: cn.id, relation: { key: "ai.kg.pts", vars: { n: s.points } } });
      }
    }
  }
  return { root: hits[0] ? hits[0].type + ":" + hits[0].id : null, nodes: [...nodes.values()], edges };
}
