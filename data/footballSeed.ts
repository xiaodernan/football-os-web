import { makeRng, rngInt, rngFloat, pick } from "@/lib/rng";
import {
  baselineAttributes,
  overallRating,
  POSITION_BY_GROUP,
} from "@/domain/attributes";
import { computeDna } from "@/domain/playerDna";
import type {
  Club,
  Competition,
  Match,
  NewsArticle,
  PlayerRef,
  PositionGroup,
  Standing,
} from "@/domain/types";

// Fixed anchor so all demo fixtures/time states are reproducible.
export const DEMO_NOW = "2026-09-22T18:00:00Z";
const SEASON = "2026/27";
const WORLD_SEED = "football-os-world-v1";

interface ClubDef {
  name: string;
  short: string;
  nation: string;
  competitionId: string;
  strength: number; // 0..1 seed for overall + market
  colors: [string, string];
  stadium: string;
}

const COMPETITIONS: Competition[] = [
  { id: "pl", name: "Premier League", nation: "England", tier: 1, clubIds: [] },
  { id: "liga", name: "La Liga", nation: "Spain", tier: 1, clubIds: [] },
  { id: "seriea", name: "Serie A", nation: "Italy", tier: 1, clubIds: [] },
  { id: "bundes", name: "Bundesliga", nation: "Germany", tier: 1, clubIds: [] },
  { id: "ligue1", name: "Ligue 1", nation: "France", tier: 1, clubIds: [] },
  { id: "eredivisie", name: "Eredivisie", nation: "Netherlands", tier: 1, clubIds: [] },
  { id: "liga1", name: "Primeira Liga", nation: "Portugal", tier: 1, clubIds: [] },
  { id: "spl", name: "Saudi Pro League", nation: "Saudi Arabia", tier: 1, clubIds: [] },
];

const CLUB_DEFS: ClubDef[] = [
  { name: "Arsenal", short: "ARS", nation: "England", competitionId: "pl", strength: 0.9, colors: ["#EF0107", "#023474"], stadium: "Emirates Stadium" },
  { name: "Manchester City", short: "MCI", nation: "England", competitionId: "pl", strength: 0.95, colors: ["#6CABDD", "#1C2C5B"], stadium: "Etihad Stadium" },
  { name: "Liverpool", short: "LIV", nation: "England", competitionId: "pl", strength: 0.9, colors: ["#C8102E", "#00B2A9"], stadium: "Anfield" },
  { name: "Chelsea", short: "CHE", nation: "England", competitionId: "pl", strength: 0.82, colors: ["#034694", "#DBA111"], stadium: "Stamford Bridge" },
  { name: "Manchester United", short: "MUN", nation: "England", competitionId: "pl", strength: 0.8, colors: ["#DA291C", "#FBE122"], stadium: "Old Trafford" },
  { name: "Tottenham Hotspur", short: "TOT", nation: "England", competitionId: "pl", strength: 0.78, colors: ["#132257", "#ffffff"], stadium: "Tottenham Hotspur Stadium" },

  { name: "Real Madrid", short: "RMA", nation: "Spain", competitionId: "liga", strength: 0.95, colors: ["#FEBE10", "#00529F"], stadium: "Santiago Bernabéu" },
  { name: "Barcelona", short: "BAR", nation: "Spain", competitionId: "liga", strength: 0.9, colors: ["#A50044", "#004D98"], stadium: "Spotify Camp Nou" },
  { name: "Atlético Madrid", short: "ATM", nation: "Spain", competitionId: "liga", strength: 0.83, colors: ["#CB3524", "#253E78"], stadium: "Metropolitano" },
  { name: "Athletic Club", short: "ATH", nation: "Spain", competitionId: "liga", strength: 0.72, colors: ["#EE2523", "#ffffff"], stadium: "San Mamés" },
  { name: "Sevilla", short: "SEV", nation: "Spain", competitionId: "liga", strength: 0.68, colors: ["#D8112D", "#ffffff"], stadium: "Ramón Sánchez-Pizjuán" },
  { name: "Valencia", short: "VAL", nation: "Spain", competitionId: "liga", strength: 0.66, colors: ["#EE3524", "#F5A800"], stadium: "Mestalla" },

  { name: "Inter", short: "INT", nation: "Italy", competitionId: "seriea", strength: 0.9, colors: ["#0068A8", "#22201F"], stadium: "San Siro" },
  { name: "AC Milan", short: "MIL", nation: "Italy", competitionId: "seriea", strength: 0.82, colors: ["#FB090B", "#000000"], stadium: "San Siro" },
  { name: "Juventus", short: "JUV", nation: "Italy", competitionId: "seriea", strength: 0.8, colors: ["#000000", "#ffffff"], stadium: "Allianz Stadium" },
  { name: "Napoli", short: "NAP", nation: "Italy", competitionId: "seriea", strength: 0.83, colors: ["#12A0D7", "#003E7E"], stadium: "Diego Armando Maradona" },
  { name: "Roma", short: "ROM", nation: "Italy", competitionId: "seriea", strength: 0.72, colors: ["#8E1F2F", "#F0BC41"], stadium: "Stadio Olimpico" },
  { name: "Lazio", short: "LAZ", nation: "Italy", competitionId: "seriea", strength: 0.7, colors: ["#87D8F7", "#142C5C"], stadium: "Stadio Olimpico" },

  { name: "Bayern München", short: "FCB", nation: "Germany", competitionId: "bundes", strength: 0.93, colors: ["#DC052D", "#0066B2"], stadium: "Allianz Arena" },
  { name: "Bayer Leverkusen", short: "B04", nation: "Germany", competitionId: "bundes", strength: 0.85, colors: ["#E32219", "#10273A"], stadium: "BayArena" },
  { name: "Borussia Dortmund", short: "BVB", nation: "Germany", competitionId: "bundes", strength: 0.83, colors: ["#FDE100", "#000000"], stadium: "Signal Iduna Park" },
  { name: "RB Leipzig", short: "RBL", nation: "Germany", competitionId: "bundes", strength: 0.78, colors: ["#DD0741", "#001F47"], stadium: "Red Bull Arena" },
  { name: "Eintracht Frankfurt", short: "SGE", nation: "Germany", competitionId: "bundes", strength: 0.7, colors: ["#E1000F", "#000000"], stadium: "Deutsche Bank Park" },
  { name: "VfB Stuttgart", short: "VFB", nation: "Germany", competitionId: "bundes", strength: 0.7, colors: ["#FFFFFF", "#E30613"], stadium: "MHPArena" },

  { name: "Paris Saint-Germain", short: "PSG", nation: "France", competitionId: "ligue1", strength: 0.92, colors: ["#004170", "#DA291C"], stadium: "Parc des Princes" },
  { name: "AS Monaco", short: "ASM", nation: "France", competitionId: "ligue1", strength: 0.78, colors: ["#E51B22", "#FFFFFF"], stadium: "Stade Louis-II" },
  { name: "Marseille", short: "OM", nation: "France", competitionId: "ligue1", strength: 0.74, colors: ["#2FAEE0", "#FFFFFF"], stadium: "Orange Vélodrome" },
  { name: "Lille", short: "LOSC", nation: "France", competitionId: "ligue1", strength: 0.7, colors: ["#E01E13", "#002B5E"], stadium: "Decagon Stadium" },
  { name: "Lyon", short: "OL", nation: "France", competitionId: "ligue1", strength: 0.7, colors: ["#1A4B8F", "#DA291C"], stadium: "Groupama Stadium" },
  { name: "OGC Nice", short: "NIC", nation: "France", competitionId: "ligue1", strength: 0.66, colors: ["#C8102E", "#000000"], stadium: "Allianz Riviera" },

  { name: "Ajax", short: "AJA", nation: "Netherlands", competitionId: "eredivisie", strength: 0.72, colors: ["#D2122E", "#FFFFFF"], stadium: "Johan Cruijff ArenA" },
  { name: "PSV", short: "PSV", nation: "Netherlands", competitionId: "eredivisie", strength: 0.74, colors: ["#ED1C24", "#FFFFFF"], stadium: "Philips Stadion" },
  { name: "Feyenoord", short: "FEY", nation: "Netherlands", competitionId: "eredivisie", strength: 0.72, colors: ["#E30613", "#000000"], stadium: "De Kuip" },

  { name: "Benfica", short: "SLB", nation: "Portugal", competitionId: "liga1", strength: 0.76, colors: ["#E5BDDC", "#000000"], stadium: "Estádio da Luz" },
  { name: "Porto", short: "POR", nation: "Portugal", competitionId: "liga1", strength: 0.74, colors: ["#003399", "#FFFFFF"], stadium: "Estádio do Dragão" },
  { name: "Sporting CP", short: "SCP", nation: "Portugal", competitionId: "liga1", strength: 0.76, colors: ["#008057", "#FFFFFF"], stadium: "Estádio José Alvalade" },

  { name: "Al-Hilal", short: "HIL", nation: "Saudi Arabia", competitionId: "spl", strength: 0.78, colors: ["#0057B7", "#FFFFFF"], stadium: "Kingdom Arena" },
  { name: "Al-Nassr", short: "NSR", nation: "Saudi Arabia", competitionId: "spl", strength: 0.74, colors: ["#F5D000", "#005499"], stadium: "Al-Awwal Park" },
  { name: "Al-Ahli", short: "AHL", nation: "Saudi Arabia", competitionId: "spl", strength: 0.72, colors: ["#00843D", "#FFFFFF"], stadium: "King Abdullah Sports City" },
];

const FIRST = ["Luca", "Marco", "Diego", "Kai", "Youssef", "Andrés", "Bruno", "Tomas", "Milan", "Ivan", "Noah", "Ethan", "Rafa", "Luka", "Emre", "Pavel", "Simone", "Adam", "Yann", "Nico", "Mateo", "Omar", "Felix", "Jonas", "Andre", "Karim", "Diogo", "Piotr", "Sven", "Tariq", "Enzo", "Ravi", "Malik", "Theo", "Milos", "Pau", "Iker", "Jota", "Aleks", "Nabil"];
const LAST = ["Silva", "Kovač", "Rossi", "Müller", "Fernández", "Dubois", "Novak", "Yılmaz", "Petrović", "Costa", "Berg", "Haddad", "Moretti", "Larsen", "Ibrahim", "Vidal", "Nagy", "Ferrari", "Sørensen", "Traoré", "Kowalski", "Adeyemi", "Blom", "Marín", "Vargas", "Pires", "Solberg", "Kaya", "Ríos", "Donnelly", "Bakker", "Fournier", "Grassi", "Lopes", "Neumann", "Ortega", "Popescu", "Roche", "Santos", "Toth"];
const NATIONS = ["England", "Spain", "Italy", "Germany", "France", "Brazil", "Argentina", "Portugal", "Netherlands", "Belgium", "Croatia", "Serbia", "Morocco", "Senegal", "Nigeria", "Japan", "South Korea", "Norway", "Denmark", "Sweden", "Poland", "Uruguay", "Colombia", "Mexico", "Türkiye", "Ghana", "Ivory Coast", "Switzerland", "Austria", "Ukraine"];

// Curated stars (recognisable names used by the spec's examples); their numeric
// attributes are synthetic demo values, never presented as authoritative.
const STARS: { name: string; club: string; group: PositionGroup; age: number; nation: string; skill: number; foot: "L" | "R" }[] = [
  { name: "Kylian Mbappé", club: "RMA", group: "ST", age: 27, nation: "France", skill: 0.96, foot: "R" },
  { name: "Erling Haaland", club: "MCI", group: "ST", age: 25, nation: "Norway", skill: 0.95, foot: "L" },
  { name: "Jude Bellingham", club: "RMA", group: "AM", age: 22, nation: "England", skill: 0.9, foot: "R" },
  { name: "Pedri", club: "BAR", group: "CM", age: 22, nation: "Spain", skill: 0.89, foot: "R" },
  { name: "Virgil van Dijk", club: "LIV", group: "CB", age: 33, nation: "Netherlands", skill: 0.88, foot: "R" },
  { name: "William Saliba", club: "ARS", group: "CB", age: 24, nation: "France", skill: 0.85, foot: "R" },
  { name: "Lamine Yamal", club: "BAR", group: "W", age: 18, nation: "Spain", skill: 0.86, foot: "L" },
  { name: "Vinícius Júnior", club: "RMA", group: "W", age: 25, nation: "Brazil", skill: 0.93, foot: "R" },
  { name: "Rodri", club: "MCI", group: "DM", age: 29, nation: "Spain", skill: 0.92, foot: "R" },
  { name: "Florian Wirtz", club: "B04", group: "AM", age: 22, nation: "Germany", skill: 0.89, foot: "R" },
];

const GROUP_PLAN: PositionGroup[] = [
  "GK", "CB", "CB", "FB", "FB", "DM", "CM", "CM", "AM", "W", "W", "ST",
];

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function marketValue(overall: number, age: number): number {
  const base = Math.pow(Math.max(0, overall - 45) / 10, 3.1) * 6_000_000;
  const ageCurve = age < 23 ? 1.5 : age < 28 ? 1.3 : age < 31 ? 1.0 : age < 34 ? 0.6 : 0.3;
  return Math.round((base * ageCurve) / 100_000) * 100_000;
}

function makeWorld() {
  const rng = makeRng(WORLD_SEED);
  const clubs: Club[] = [];
  const players: PlayerRef[] = [];
  const compMap = new Map(COMPETITIONS.map((c) => [c.id, { ...c, clubIds: [] as string[] }]));

  for (const def of CLUB_DEFS) {
    const id = slug(def.short);
    const overall = Math.round(52 + def.strength * 38 + rngFloat(rng, -2, 2));
    clubs.push({
      id,
      name: def.name,
      short: def.short,
      competitionId: def.competitionId,
      nation: def.nation,
      overall: Math.max(50, Math.min(90, overall)),
      colors: def.colors,
      stadium: def.stadium,
    });
    compMap.get(def.competitionId)!.clubIds.push(id);
  }

  const usedNames = new Set<string>();
  for (const club of clubs) {
    const def = CLUB_DEFS.find((d) => d.short === club.short)!;
    const squadSize = rngInt(rng, 7, 9);
    // Inject curated stars for their clubs.
    const clubStars = STARS.filter((s) => s.club === club.short);
    for (const star of clubStars) {
      usedNames.add(star.name);
      pushPlayer(star.name, star.group, star.age, star.nation, club, star.skill, star.foot, def.strength);
    }
    for (let i = 0; i < squadSize; i++) {
      const group = GROUP_PLAN[i % GROUP_PLAN.length];
      let name = "";
      let guard = 0;
      do {
        name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
        guard++;
      } while (usedNames.has(name) && guard < 20);
      usedNames.add(name);
      const skill = Math.max(0.2, def.strength + rngFloat(rng, -0.22, 0.12));
      const age = rngInt(rng, 18, 34);
      pushPlayer(name, group, age, pick(rng, NATIONS), club, skill, rng() > 0.18 ? "R" : "L", def.strength);
    }
  }

  function pushPlayer(
    name: string,
    group: PositionGroup,
    age: number,
    nation: string,
    club: Club,
    skill: number,
    foot: "L" | "R",
    clubStrength: number,
  ) {
    const attrs = baselineAttributes(group, Math.max(0.05, Math.min(1, skill)));
    const prng = makeRng(`${club.id}-${name}`);
    for (const k of Object.keys(attrs)) attrs[k] = Math.max(20, Math.min(97, attrs[k] + rngInt(prng, -6, 6)));
    const overall = overallRating(attrs);
    const potential = Math.min(97, overall + (age < 23 ? rngInt(prng, 5, 16) : age < 27 ? rngInt(prng, 1, 6) : 0));
    const dna = computeDna(attrs);
    players.push({
      id: slug(`${club.short}-${name}`),
      name,
      position: POSITION_BY_GROUP[group],
      positionGroup: group,
      age,
      nation,
      clubId: club.id,
      overall,
      potential,
      archetype: dna.primary.key,
      value: marketValue(overall, age),
      foot,
      attributes: attrs,
    });
  }

  const matches = buildMatches(clubs, compMap, rng);
  const standings = buildStandings(clubs, matches);
  const news = buildNews(clubs, players, rng);

  return {
    clubs,
    players,
    competitions: [...compMap.values()],
    matches,
    standings,
    news,
  };
}

function buildMatches(clubs: Club[], compMap: Map<string, Competition>, rng: () => number): Match[] {
  const matches: Match[] = [];
  const byId = new Map(clubs.map((c) => [c.id, c]));
  let anchor = new Date(DEMO_NOW).getTime();
  let idx = 0;
  for (const comp of compMap.values()) {
    const ids = comp.clubIds;
    for (let round = 0; round < 2; round++) {
      for (let a = 0; a < ids.length; a++) {
        for (let b = 0; b < ids.length; b++) {
          if (a === b) continue;
          if (round === 1 && a > b) continue; // second round only mirrors some; keep deterministic subset
          const home = byId.get(ids[a])!;
          const away = byId.get(ids[b])!;
          const offsetDays = rngInt(rng, -45, 21);
          const kickoff = new Date(anchor + offsetDays * 86400000 + rngInt(rng, 0, 8) * 3600000).toISOString();
          const status: Match["status"] =
            offsetDays < -2 ? "FINISHED" : offsetDays < 0 ? "LIVE" : "SCHEDULED";
          const m: Match = {
            id: `M${(++idx).toString().padStart(4, "0")}`,
            competitionId: comp.id,
            season: SEASON,
            homeClubId: home.id,
            awayClubId: away.id,
            kickoff,
            round: round + 1,
            status,
            homeGoals: null,
            awayGoals: null,
          };
          if (status !== "SCHEDULED") {
            const s = scoreFromStrength(home.overall, away.overall, rng);
            m.homeGoals = s.h;
            m.awayGoals = s.a;
          }
          matches.push(m);
        }
      }
    }
  }
  return matches.sort((x, y) => x.kickoff.localeCompare(y.kickoff));
}

function scoreFromStrength(h: number, a: number, rng: () => number): { h: number; a: number } {
  const diff = (h + 5 - a) / 12; // home advantage
  const lh = Math.max(0, diff + rngFloat(rng, -0.9, 0.9));
  const la = Math.max(0, -diff + rngFloat(rng, -0.9, 0.9));
  return { h: Math.min(6, Math.round(lh * 1.4)), a: Math.min(6, Math.round(la * 1.4)) };
}

function buildStandings(clubs: Club[], matches: Match[]): Record<string, Standing[]> {
  const table: Record<string, Standing[]> = {};
  const byId = new Map(clubs.map((c) => [c.id, c]));
  const ensure = (compId: string, clubId: string): Standing => {
    if (!table[compId]) table[compId] = [];
    let row = table[compId].find((s) => s.clubId === clubId);
    if (!row) {
      row = { clubId, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
      table[compId].push(row);
    }
    return row;
  };
  for (const m of matches) {
    if (m.status !== "FINISHED" || m.homeGoals == null || m.awayGoals == null) continue;
    const compId = byId.get(m.homeClubId)!.competitionId;
    const h = ensure(compId, m.homeClubId);
    const a = ensure(compId, m.awayClubId);
    h.played++; a.played++;
    h.gf += m.homeGoals; h.ga += m.awayGoals;
    a.gf += m.awayGoals; a.ga += m.homeGoals;
    if (m.homeGoals > m.awayGoals) { h.won++; a.lost++; h.points += 3; }
    else if (m.homeGoals < m.awayGoals) { a.won++; h.lost++; a.points += 3; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  for (const compId of Object.keys(table)) {
    table[compId].sort(
      (x, y) => y.points - x.points || y.gf - y.ga - (x.gf - x.ga) || (byId.get(y.clubId)?.overall ?? 0) - (byId.get(x.clubId)?.overall ?? 0),
    );
  }
  return table;
}

const NEWS_TEMPLATES: [NewsArticle["kind"], string][] = [
  ["Confirmed", "{club} confirm {player} fit for the derby"],
  ["Reported", "{club} open talks over {player} extension"],
  ["Rumor", "{club} weighing a January move for {player}"],
  ["Analysis", "How {club}'s press is breaking the first line"],
  ["Opinion", "{club} need to trust their academy, not the market"],
];

function buildNews(clubs: Club[], players: PlayerRef[], rng: () => number): NewsArticle[] {
  const out: NewsArticle[] = [];
  const anchor = new Date(DEMO_NOW).getTime();
  const sources = [
    { name: "Football OS Wire", cred: 0.9 },
    { name: "Touchline Report", cred: 0.72 },
    { name: "Inside Transfer", cred: 0.5 },
    { name: "The Counterpress", cred: 0.66 },
  ];
  for (let i = 0; i < 24; i++) {
    const kind = pick(rng, NEWS_TEMPLATES);
    const club = pick(rng, clubs);
    const pool = players.filter((p) => p.clubId === club.id);
    const player = pool.length ? pick(rng, pool) : pick(rng, players);
    const title = kind[1].replace("{club}", club.name).replace("{player}", player.name.split(" ").slice(-1)[0]);
    const src = pick(rng, sources);
    const cred = Math.max(0.3, Math.min(0.97, src.cred + rngFloat(rng, -0.12, 0.08)));
    out.push({
      id: `N${(i + 1).toString().padStart(3, "0")}`,
      title,
      summary: `${title}. Our intelligence layer cross-checks this against ${club.name}'s recent match data and ${player.name}'s form. Flagged as ${kind[0]} with ${Math.round(cred * 100)}% source confidence.`,
      source: src.name,
      url: `https://demo.football-os.local/news/${i + 1}`,
      publishedAt: new Date(anchor - rngInt(rng, 0, 72) * 3600000).toISOString(),
      credibility: Math.round(cred * 100) / 100,
      kind: kind[0],
      entityIds: [club.id, player.id],
      topics: [pick(rng, ["Transfers", "Tactics", "Injury", "Match Preview", "Academy"]), club.name],
    });
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export const WORLD = makeWorld();
