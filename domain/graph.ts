// M1057: the football graph — the fixture network the finished results actually draw.
//
// Every other board in this app reads a club as a row: goals, points, cards, value. This fold
// reads the world as a graph instead. Nodes are clubs, an edge is a meeting, its weight is how
// many times the two met, and the questions are the ones a graph can answer and a table cannot:
// how many separate worlds do the results describe, who sits at the centre of each, and how
// tightly do a club's opponents know each other.
//
// Three structures do the work, and all three are the textbook ones rather than a re-invention:
// an adjacency map keyed by club id (the sparse form — 73 nodes and a few hundred edges do not
// want a 73×73 matrix), a union-find for the components, and a bounded min-heap for the cut.
// The heap and the union-find live in lib/structures.ts because they are general; the walk, the
// weights and the PageRank power iteration are this module's, because they are not.
//
// The numbers are re-derivable from the seed by construction: the fold only counts finished
// fixtures and never invents an edge. scripts/proof-graph.mjs recounts a hand fixture field by
// field and then recounts the whole seeded world independently.

import { UnionFind, topK } from "@/lib/structures";
import { round3 } from "@/lib/utils";
import { tally } from "./attributes";
import { isFinished } from "./analytics";
import type { Club, Match } from "./types";

/** The unordered pair key for an edge, in canonical id order — so the two directions of a
 *  meeting collapse to one count before the fold builds the adjacency out of it. */
function edgeKey(m: Match): string {
  return m.homeClubId < m.awayClubId ? `${m.homeClubId}|${m.awayClubId}` : `${m.awayClubId}|${m.homeClubId}`;
}

/** PageRank's damping factor. 0.85 is the value the original paper used and the one every
 *  reader will recognise; naming it here means the proof and the screen cannot disagree. */
export const GRAPH_DAMPING = 0.85;

/** Fixed iteration count rather than a tolerance test: 40 passes over a graph this shallow
 *  converge far past display precision, and a fixed count keeps the fold a pure function of the
 *  seed (a tolerance test would stop at a machine-dependent pass and could print a different
 *  last digit on a different engine). */
export const GRAPH_ITERATIONS = 40;

export interface GraphRow {
  clubId: string;
  /** Distinct opponents this club has actually faced in a finished fixture. */
  degree: number;
  /** Total meetings across those opponents — the sum of the edge weights. */
  strength: number;
  /** Local clustering coefficient: how many of this club's opponent pairs have also met,
   *  over how many pairs there are. 0 when the club has fewer than two opponents. 3dp. */
  clustering: number;
  /** PageRank over the weighted fixture graph. Sums to 1 across every row. */
  rank: number;
}

/** The centre of the graph — the highest-ranked clubs, for a panel that shows a short list.
 *  `rows` carries the full ordered table; this is the cut a screen reads. */
export interface GraphBoard {
  /** Ordered by rank desc, then degree desc, then clubId. */
  rows: GraphRow[];
  /** The top `limit` rows, selected with a bounded heap rather than by sorting again. */
  centres: GraphRow[];
  /** Clubs with at least one finished fixture. */
  clubs: number;
  /** Distinct pairs that have met. */
  edges: number;
  /** Finished fixtures walked (a pair that met twice contributes twice to strength). */
  meetings: number;
  /** How many separate worlds the results describe. */
  components: number;
  /** Size of the largest component. */
  biggest: number;
}

/** The undirected fixture graph, weighted by meetings. Deterministic on any input order: the
 *  adjacency is built from club ids, not from the order the matches arrive in. */
/** The centre-of-the-graph cut the leaders screen prints. Eight, named once so the proof and the screen agree. */
export const GRAPH_CENTRES = 8;

export function fixtureGraph(matches: Match[], clubs: Club[]): GraphBoard {
  const known = new Set(clubs.map((c) => c.id));
  const adjacency = new Map<string, Map<string, number>>();
  let meetings = 0;

  // The occurrence tally lives behind its own door; this fold walks the fixtures once and
  // asks the door for the per-pair counts rather than incrementing by hand.
  const replayable = matches.filter((m) =>
    isFinished(m) && known.has(m.homeClubId) && known.has(m.awayClubId) && m.homeClubId !== m.awayClubId);
  const pairCount = tally(replayable, (m) => edgeKey(m));
  for (const [key, count] of pairCount) {
    const [a, b] = key.split("|");
    const bucketA = adjacency.get(a);
    if (bucketA) bucketA.set(b, count);
    else adjacency.set(a, new Map([[b, count]]));
    const bucketB = adjacency.get(b);
    if (bucketB) bucketB.set(a, count);
    else adjacency.set(b, new Map([[a, count]]));
    meetings += count;
  }
  const pairs = new Set<string>(pairCount.keys());

  const nodes = clubs.filter((c) => adjacency.has(c.id)).map((c) => c.id);
  if (nodes.length === 0) {
    return { rows: [], centres: [], clubs: 0, edges: 0, meetings: 0, components: 0, biggest: 0 };
  }

  // Components, in the world's own club order so the label is stable across runs.
  const sets = new UnionFind<string>();
  for (const id of nodes) sets.add(id);
  for (const [a, bucket] of adjacency) for (const b of bucket.keys()) sets.union(a, b);
  // The component labels land in the world's own club order so they are stable across runs; the
  // door carries the sizes.
  const label = new Map<string, number>();
  for (const id of nodes) {
    const root = sets.find(id);
    if (!label.has(root)) label.set(root, label.size + 1);
  }
  const sizes = tally(nodes, (id) => sets.find(id));

  // PageRank over the weighted graph. A club's vote is split across its opponents in proportion
  // to how often they met, so the seeded world's 1,000+ fixtures produce a smooth distribution
  // rather than the uniform one an unweighted walk would.
  const n = nodes.length;
  const strength = new Map<string, number>();
  for (const id of nodes) {
    let total = 0;
    for (const w of (adjacency.get(id) as Map<string, number>).values()) total += w;
    strength.set(id, total);
  }
  let rank = new Map<string, number>(nodes.map((id) => [id, 1 / n]));
  for (let pass = 0; pass < GRAPH_ITERATIONS; pass += 1) {
    const next = new Map<string, number>(nodes.map((id) => [id, (1 - GRAPH_DAMPING) / n]));
    for (const id of nodes) {
      const share = (GRAPH_DAMPING * (rank.get(id) as number)) / (strength.get(id) as number);
      for (const [other, w] of (adjacency.get(id) as Map<string, number>)) {
        next.set(other, (next.get(other) as number) + share * w);
      }
    }
    rank = next;
  }
  let mass = 0;
  for (const id of nodes) mass += rank.get(id) as number;
  if (mass > 0) for (const id of nodes) rank.set(id, (rank.get(id) as number) / mass);

  const rows: GraphRow[] = nodes.map((id) => {
    const neighbours = adjacency.get(id) as Map<string, number>;
    const degree = neighbours.size;
    let linkedPairs = 0;
    if (degree >= 2) {
      const list = [...neighbours.keys()];
      for (let i = 0; i < list.length; i += 1) {
        const row = adjacency.get(list[i]) as Map<string, number>;
        for (let j = i + 1; j < list.length; j += 1) if (row.has(list[j])) linkedPairs += 1;
      }
    }
    const possible = (degree * (degree - 1)) / 2;
    return {
      clubId: id,
      degree,
      strength: strength.get(id) as number,
      clustering: possible > 0 ? round3(linkedPairs / possible) : 0,
      rank: rank.get(id) as number,
    };
  });
  rows.sort((a, b) => b.rank - a.rank || b.degree - a.degree || a.clubId.localeCompare(b.clubId));

  // The panel's cut. `rows` is already ordered, so the heap here is O(k) pops rather than a
  // second full sort — and the same call is the one the proof measures at scale, where the
  // difference between selecting k and sorting n is the whole point of the structure.
  const centres = topK(rows, GRAPH_CENTRES, (a, b) => b.rank - a.rank || b.degree - a.degree || a.clubId.localeCompare(b.clubId));

  return {
    rows,
    centres,
    clubs: nodes.length,
    edges: pairs.size,
    meetings,
    components: label.size,
    biggest: Math.max(...sizes.values()),
  };
}
