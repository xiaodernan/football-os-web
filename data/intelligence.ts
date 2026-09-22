// Retrieval-grounded Football AI (spec §44–§47, §50, §76).
// Every answer is assembled from the world dataset: we retrieve matching
// entities, pull concrete facts, then hand a grounded context to the coach
// provider. Answers always carry evidence, sources and confidence.

import { archetypeLabel } from "@/domain/playerDna";
import { scoutReport } from "@/domain/scouting";
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
  label: string;
  text: string;
  to?: string;
}

export interface RagContext {
  hits: SearchResult[];
  facts: EvidenceFact[];
  sources: string[];
  confidence: number;
  entityLabel: string | null;
}

export interface RagAnswer {
  question: string;
  answer: string;
  facts: EvidenceFact[];
  sources: string[];
  confidence: number;
  retrieved: SearchResult[];
  at: string;
}

function clubFacts(clubId: string): EvidenceFact[] {
  const c = getClub(clubId);
  if (!c) return [];
  const squad = playersByClub(clubId).sort((a, b) => b.overall - a.overall);
  const table = footballProvider.standings(c.competitionId);
  const pos = table.findIndex((s) => s.clubId === clubId);
  const out: EvidenceFact[] = [
    { label: c.name, text: `${c.name} (${c.short}) play in ${getCompetition(c.competitionId)?.name}, overall ${c.overall}, at ${c.stadium}.`, to: `/clubs/${c.id}` },
  ];
  if (pos >= 0) {
    const s = table[pos];
    out.push({ label: "Standings", text: `They sit ${pos + 1}${ord(pos + 1)} with ${s.points} pts (${s.won}W ${s.drawn}D ${s.lost}L, GD ${s.gf - s.ga}).`, to: `/competitions/${c.competitionId}` });
  }
  if (squad[0]) out.push({ label: "Key man", text: `Top-rated in the squad is ${squad[0].name} (${squad[0].position}, OVR ${squad[0].overall}, ${formatValue(squad[0].value)}).`, to: `/players/${squad[0].id}` });
  const fixture = [...matchesByStatus("SCHEDULED").filter((m) => m.homeClubId === clubId || m.awayClubId === clubId)][0];
  if (fixture) {
    const opp = fixture.homeClubId === clubId ? getClub(fixture.awayClubId) : getClub(fixture.homeClubId);
    out.push({ label: "Next fixture", text: `Next up vs ${opp?.name} in ${getCompetition(fixture.competitionId)?.name}.`, to: `/matches/${fixture.id}` });
  }
  return out;
}

function playerFacts(pid: string): EvidenceFact[] {
  const p = getPlayer(pid);
  if (!p) return [];
  const c = getClub(p.clubId);
  const out: EvidenceFact[] = [
    { label: p.name, text: `${p.name} — ${p.position}, ${p.age}y, ${p.nation}, at ${c?.name}. Overall ${p.overall}, potential ${p.potential}, worth ${formatValue(p.value)}, ${p.foot} foot.`, to: `/players/${p.id}` },
    { label: "Profile", text: `Scouting archetype: ${archetypeLabel(p.archetype)}.`, to: `/players/${p.id}` },
  ];
  const report = scoutReport(p);
  if (report.hasVector) {
    const up = report.strengths.slice(0, 3).map((s) => `${s.label} +${s.delta}`).join(", ");
    const down = report.concerns.slice(-3).reverse().map((s) => `${s.label} ${s.delta}`).join(", ");
    out.push({
      label: "Template edge",
      text: `Against a ${p.positionGroup} of the same implied skill: ${report.headline}.${up ? ` Above template — ${up}.` : ""}${down ? ` Below template — ${down}.` : ""}`,
      to: `/players/${p.id}`,
    });
  }
  const arc = careerArc(p);
  if (arc.hasData) {
    out.push({
      label: "Career arc",
      text: `${arc.trajectory} at ${arc.age}: modelled peak ${arc.projectedPeak} around ${arc.peakAge} (${arc.yearsToPeak} year${arc.yearsToPeak === 1 ? "" : "s"} away), ${arc.remainingPrimeYears} prime year${arc.remainingPrimeYears === 1 ? "" : "s"} left. Age-curve model, not a forecast about a real person.`,
      to: `/players/${p.id}`,
    });
  }
  return out;
}

function matchFacts(mid: string): EvidenceFact[] {
  const m = getMatch(mid);
  if (!m) return [];
  const h = getClub(m.homeClubId);
  const a = getClub(m.awayClubId);
  const base = `${h?.name} v ${a?.name} — ${getCompetition(m.competitionId)?.name}, round ${m.round}.`;
  const status = m.status === "SCHEDULED" ? `Kickoff ${new Date(m.kickoff).toLocaleString()}.` : `Result ${m.homeGoals}–${m.awayGoals}.`;
  const out: EvidenceFact[] = [{ label: "Fixture", text: `${base} ${status}`, to: `/matches/${m.id}` }];
  const fc = m.status === "SCHEDULED" ? fixtureForecast(m.id) : null;
  if (fc) {
    out.push({
      label: "Model",
      text: `Poisson model on current form: ${h?.name} ${fc.homePct}% · draw ${fc.drawPct}% · ${a?.name} ${fc.awayPct}%; expected goals ${fc.lambdaHome.toFixed(2)}–${fc.lambdaAway.toFixed(2)}, most likely ${fc.mostLikelyScore}. Based on ${fc.sample} match${fc.sample === 1 ? "" : "es"} of form data — a projection, not a result.`,
      to: `/matches/${m.id}`,
    });
  }
  return out;
}

function newsFacts(nid: string): EvidenceFact[] {
  const n = getNews(nid);
  if (!n) return [];
  return [{ label: n.kind, text: `${n.title} — ${n.summary} (Source: ${n.source})`, to: `/news/${n.id}` }];
}

function factsFor(hit: SearchResult): EvidenceFact[] {
  switch (hit.type) {
    case "club": return clubFacts(hit.id);
    case "player": return playerFacts(hit.id);
    case "match": return matchFacts(hit.id);
    case "news": return newsFacts(hit.id);
    case "competition": {
      const comp = getCompetition(hit.id);
      if (!comp) return [];
      const table = footballProvider.standings(hit.id);
      const leader = table[0] ? getClub(table[0].clubId) : null;
      return [{ label: comp.name, text: `${comp.name} (${comp.nation}, Tier ${comp.tier}) has ${comp.clubIds.length} teams.${leader ? ` Current leaders: ${leader.name} (${table[0].points} pts).` : ""}`, to: `/competitions/${comp.id}` }];
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

export function retrieve(question: string): RagContext {
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
    for (const f of factsFor(h)) {
      const key = f.text.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      facts.push(f);
    }
  }
  const sources = [...new Set(ranked.map((h) => `${h.type}:${h.id}`))];
  let confidence = 20;
  if (ranked.length) confidence = Math.min(92, 45 + ranked.length * 8 + (facts.length > 2 ? 6 : 0));
  return {
    hits: ranked,
    facts: facts.slice(0, 6),
    sources: sources.length ? sources : ["No specific entity retrieved — general reasoning only"],
    confidence,
    entityLabel: ranked[0]?.title ?? null,
  };
}

// Deterministic answer synthesis over retrieved facts. Swappable for a real
// Cloud Agent: replace composeAnswer with an agent call using the same shape.
function composeAnswer(question: string, ctx: RagContext): string {
  const q = question.toLowerCase();
  if (!ctx.hits.length) {
    return `I could not find that in the football world dataset, so I will not invent an answer. Try naming a club, player, competition, fixture or headline. (Demo retrieval provider — no live model or API key.)`;
  }
  const top = ctx.hits[0];
  const primary = ctx.facts[0]?.text ?? top.subtitle;
  let lead: string;
  if (/value|worth|cost|price|费用|身价/.test(q) && top.type === "player")
    lead = `${top.title}'s current market value sits at ${primary.match(/value \$?€?[\d.]+[MBK]?/)?.[0] ?? "listed"} — see the full profile.`;
  else if (/who|which|best|top|key|star|核心|谁/.test(q))
    lead = `Based on the retrieved data about ${top.title}: ${primary}`;
  else if (/stand|position|table|排名|榜首|第几/.test(q))
    lead = `League-position read for ${top.title}: ${primary}`;
  else if (/when|kickoff|fixture|next|time|何时|比赛/.test(q))
    lead = `Fixture detail for ${top.title}: ${primary}`;
  else lead = `Here is what the football world data says about ${top.title}: ${primary}`;

  const extras = ctx.facts.slice(1, 3).map((f) => f.text);
  return extras.length
    ? `${lead} ${extras.join(" ")}`
    : lead;
}

export function askIntelligence(question: string): RagAnswer {
  const ctx = retrieve(question);
  return {
    question,
    answer: composeAnswer(question, ctx),
    facts: ctx.facts,
    sources: ctx.sources,
    confidence: ctx.confidence,
    retrieved: ctx.hits,
    at: new Date().toISOString(),
  };
}

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ---- Knowledge graph (spec §45) ----
export interface KgNode { id: string; label: string; type: "club" | "player" | "competition" | "news" | "match"; to: string; weight?: number }
export interface KgEdge { from: string; to: string; relation: string }
export interface KgGraph { root: string | null; nodes: KgNode[]; edges: KgEdge[] }

export function buildGraph(query: string): KgGraph {
  const hits = globalSearch(query, 3);
  const nodes = new Map<string, KgNode>();
  const edges: KgEdge[] = [];
  const add = (n: KgNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); };

  for (const h of hits) {
    add({ id: h.type + ":" + h.id, label: h.title, type: h.type, to: h.to });
    if (h.type === "club") {
      const c = getClub(h.id)!;
      const compN: KgNode = { id: "competition:" + c.competitionId, label: getCompetition(c.competitionId)?.name ?? c.competitionId, type: "competition", to: `/competitions/${c.competitionId}` };
      add(compN); edges.push({ from: "club:" + c.id, to: compN.id, relation: "competes in" });
      for (const p of playersByClub(c.id).sort((a, b) => b.overall - a.overall).slice(0, 6)) {
        const pn: KgNode = { id: "player:" + p.id, label: p.name, type: "player", to: `/players/${p.id}`, weight: p.overall };
        add(pn); edges.push({ from: "club:" + c.id, to: pn.id, relation: "has player" });
      }
    }
    if (h.type === "player") {
      const p = getPlayer(h.id)!;
      const cn: KgNode = { id: "club:" + p.clubId, label: getClub(p.clubId)?.name ?? p.clubId, type: "club", to: `/clubs/${p.clubId}` };
      add(cn); edges.push({ from: "player:" + p.id, to: cn.id, relation: "plays for" });
    }
    if (h.type === "news") {
      const n = getNews(h.id)!;
      for (const e of n.entityIds) {
        if (getPlayer(e)) { const pn: KgNode = { id: "player:" + e, label: getPlayer(e)!.name, type: "player", to: `/players/${e}` }; add(pn); edges.push({ from: "news:" + n.id, to: pn.id, relation: "mentions" }); }
        else if (getClub(e)) { const cn: KgNode = { id: "club:" + e, label: getClub(e)!.name, type: "club", to: `/clubs/${e}` }; add(cn); edges.push({ from: "news:" + n.id, to: cn.id, relation: "mentions" }); }
      }
    }
    if (h.type === "competition") {
      const table = footballProvider.standings(h.id);
      for (const s of table.slice(0, 8)) {
        const c = getClub(s.clubId);
        if (!c) continue;
        const cn: KgNode = { id: "club:" + c.id, label: c.name, type: "club", to: `/clubs/${c.id}`, weight: s.points };
        add(cn); edges.push({ from: "competition:" + h.id, to: cn.id, relation: `${s.points} pts` });
      }
    }
  }
  return { root: hits[0] ? hits[0].type + ":" + hits[0].id : null, nodes: [...nodes.values()], edges };
}
