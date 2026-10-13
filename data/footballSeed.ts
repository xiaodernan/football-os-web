import { makeRng, rngInt, rngFloat, pick } from "@/lib/rng";
import {
  baselineAttributes,
  overallRating,
  POSITION_BY_GROUP,
  byOverall,
} from "@/domain/attributes";
import { computeDna } from "@/domain/playerDna";
import { indexById, round2 } from "@/lib/utils";
import { byKickoff } from "@/domain/analytics";
import type {
  Club,
  Competition,
  Match,
  MatchEvent,
  MatchStats,
  NewsArticle,
  PlayerRef,
  PositionGroup,
  Standing,
} from "@/domain/types";

// Fixed anchor so all demo fixtures/time states are reproducible.
export const DEMO_NOW = "2026-09-22T18:00:00Z";
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
  { id: "mls", name: "Major League Soccer", nation: "USA", tier: 1, clubIds: [] },
  { id: "brasileirao", name: "Brasileirão Série A", nation: "Brazil", tier: 1, clubIds: [] },
  { id: "jleague", name: "J1 League", nation: "Japan", tier: 1, clubIds: [] },
  { id: "superlig", name: "Süper Lig", nation: "Türkiye", tier: 1, clubIds: [] },
  // Continental competitions
  { id: "ucl", name: "UEFA Champions League", nation: "Europe", tier: 0, clubIds: [] },
  { id: "uel", name: "UEFA Europa League", nation: "Europe", tier: 0, clubIds: [] },
  { id: "libertadores", name: "Copa Libertadores", nation: "South America", tier: 0, clubIds: [] },
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

  // Premier League additions
  { name: "Newcastle United", short: "NEW", nation: "England", competitionId: "pl", strength: 0.76, colors: ["#241F20", "#FFFFFF"], stadium: "St James' Park" },
  { name: "Aston Villa", short: "AVL", nation: "England", competitionId: "pl", strength: 0.74, colors: ["#670E36", "#95BFE5"], stadium: "Villa Park" },
  { name: "West Ham United", short: "WHU", nation: "England", competitionId: "pl", strength: 0.7, colors: ["#7A263A", "#1BB1E7"], stadium: "London Stadium" },
  { name: "Brighton & Hove Albion", short: "BHA", nation: "England", competitionId: "pl", strength: 0.68, colors: ["#0057B8", "#FFCD00"], stadium: "American Express Stadium" },

  // La Liga additions
  { name: "Real Sociedad", short: "RSO", nation: "Spain", competitionId: "liga", strength: 0.7, colors: ["#003DA5", "#FFFFFF"], stadium: "Reale Arena" },
  { name: "Villarreal", short: "VIL", nation: "Spain", competitionId: "liga", strength: 0.68, colors: ["#FFE667", "#005187"], stadium: "Estadio de la Cerámica" },
  { name: "Real Betis", short: "BET", nation: "Spain", competitionId: "liga", strength: 0.66, colors: ["#00954C", "#FFFFFF"], stadium: "Benito Villamarín" },

  // Serie A additions
  { name: "Atalanta", short: "ATA", nation: "Italy", competitionId: "seriea", strength: 0.76, colors: ["#1E71B8", "#000000"], stadium: "Gewiss Stadium" },
  { name: "Fiorentina", short: "FIO", nation: "Italy", competitionId: "seriea", strength: 0.7, colors: ["#482B83", "#FFFFFF"], stadium: "Artemio Franchi" },
  { name: "Torino", short: "TOR", nation: "Italy", competitionId: "seriea", strength: 0.66, colors: ["#8B1A10", "#FFFFFF"], stadium: "Stadio Olimpico Grande Torino" },

  // Bundesliga additions
  { name: "Borussia Mönchengladbach", short: "BMG", nation: "Germany", competitionId: "bundes", strength: 0.68, colors: ["#000000", "#FFFFFF"], stadium: "Borussia-Park" },
  { name: "VfL Wolfsburg", short: "WOB", nation: "Germany", competitionId: "bundes", strength: 0.66, colors: ["#65B32E", "#FFFFFF"], stadium: "Volkswagen Arena" },
  { name: "Union Berlin", short: "FCU", nation: "Germany", competitionId: "bundes", strength: 0.66, colors: ["#EB1923", "#FFFFFF"], stadium: "Stadion An der Alten Försterei" },

  // Ligue 1 additions
  { name: "Lens", short: "RCL", nation: "France", competitionId: "ligue1", strength: 0.72, colors: ["#FFC627", "#C8102E"], stadium: "Stade Bollaert-Delelis" },
  { name: "Rennes", short: "REN", nation: "France", competitionId: "ligue1", strength: 0.68, colors: ["#E30613", "#000000"], stadium: "Roazhon Park" },
  { name: "Strasbourg", short: "STR", nation: "France", competitionId: "ligue1", strength: 0.64, colors: ["#009EE0", "#FFFFFF"], stadium: "Stade de la Meinau" },

  // MLS clubs
  { name: "LA Galaxy", short: "LAG", nation: "USA", competitionId: "mls", strength: 0.68, colors: ["#00245D", "#EFB734"], stadium: "Dignity Health Sports Park" },
  { name: "Inter Miami", short: "MIA", nation: "USA", competitionId: "mls", strength: 0.72, colors: ["#F7B5CD", "#231F20"], stadium: "Chase Stadium" },
  { name: "Seattle Sounders", short: "SEA", nation: "USA", competitionId: "mls", strength: 0.66, colors: ["#5D9741", "#00599F"], stadium: "Lumen Field" },
  { name: "Atlanta United", short: "ATL", nation: "USA", competitionId: "mls", strength: 0.64, colors: ["#80000A", "#A19060"], stadium: "Mercedes-Benz Stadium" },
  { name: "New York Red Bulls", short: "NYRB", nation: "USA", competitionId: "mls", strength: 0.62, colors: ["#BA0C2F", "#FFFFFF"], stadium: "Red Bull Arena" },

  // Brasileirão clubs
  { name: "Flamengo", short: "FLA", nation: "Brazil", competitionId: "brasileirao", strength: 0.76, colors: ["#C3281E", "#000000"], stadium: "Maracanã" },
  { name: "Palmeiras", short: "PAL", nation: "Brazil", competitionId: "brasileirao", strength: 0.78, colors: ["#006430", "#FFFFFF"], stadium: "Allianz Parque" },
  { name: "São Paulo", short: "SAO", nation: "Brazil", competitionId: "brasileirao", strength: 0.72, colors: ["#C6122D", "#000000"], stadium: "Morumbi" },
  { name: "Corinthians", short: "COR", nation: "Brazil", competitionId: "brasileirao", strength: 0.7, colors: ["#000000", "#FFFFFF"], stadium: "Neo Química Arena" },
  { name: "Santos", short: "SAN", nation: "Brazil", competitionId: "brasileirao", strength: 0.66, colors: ["#000000", "#FFFFFF"], stadium: "Vila Belmiro" },

  // J-League clubs
  { name: "Kawasaki Frontale", short: "KAW", nation: "Japan", competitionId: "jleague", strength: 0.7, colors: ["#00A0E9", "#000000"], stadium: "Todoroki Athletics Stadium" },
  { name: "Yokohama F. Marinos", short: "YFM", nation: "Japan", competitionId: "jleague", strength: 0.68, colors: ["#004B9D", "#ED1C24"], stadium: "Nissan Stadium" },
  { name: "Vissel Kobe", short: "VIS", nation: "Japan", competitionId: "jleague", strength: 0.66, colors: ["#8B1A10", "#000000"], stadium: "Noevir Stadium Kobe" },
  { name: "Urawa Red Diamonds", short: "URD", nation: "Japan", competitionId: "jleague", strength: 0.64, colors: ["#E60012", "#000000"], stadium: "Saitama Stadium 2002" },

  // Süper Lig clubs
  { name: "Galatasaray", short: "GAL", nation: "Türkiye", competitionId: "superlig", strength: 0.74, colors: ["#FFA500", "#C8102E"], stadium: "NEF Stadyumu" },
  { name: "Fenerbahçe", short: "FEN", nation: "Türkiye", competitionId: "superlig", strength: 0.72, colors: ["#FFED00", "#001489"], stadium: "Şükrü Saracoğlu Stadyumu" },
  { name: "Beşiktaş", short: "BES", nation: "Türkiye", competitionId: "superlig", strength: 0.68, colors: ["#000000", "#FFFFFF"], stadium: "Tüpraş Stadyumu" },
  { name: "Trabzonspor", short: "TRA", nation: "Türkiye", competitionId: "superlig", strength: 0.64, colors: ["#7B1F2C", "#004B9D"], stadium: "Papara Park" },
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
  // New stars for expanded clubs
  { name: "Mohamed Salah", club: "LIV", group: "W", age: 33, nation: "Egypt", skill: 0.91, foot: "L" },
  { name: "Bruno Fernandes", club: "MUN", group: "AM", age: 31, nation: "Portugal", skill: 0.86, foot: "R" },
  { name: "Harry Kane", club: "FCB", group: "ST", age: 32, nation: "England", skill: 0.9, foot: "R" },
  { name: "Lautaro Martínez", club: "INT", group: "ST", age: 28, nation: "Argentina", skill: 0.88, foot: "R" },
  { name: "Bradley Barcola", club: "PSG", group: "W", age: 23, nation: "France", skill: 0.82, foot: "R" },
  { name: "Lionel Messi", club: "MIA", group: "AM", age: 38, nation: "Argentina", skill: 0.88, foot: "L" },
  { name: "Gabriel Jesus", club: "FLA", group: "ST", age: 28, nation: "Brazil", skill: 0.84, foot: "R" },
  { name: "Mauro Icardi", club: "GAL", group: "ST", age: 32, nation: "Argentina", skill: 0.82, foot: "R" },
  { name: "Edin Džeko", club: "FEN", group: "ST", age: 39, nation: "Bosnia and Herzegovina", skill: 0.78, foot: "R" },
  { name: "Yuki Soma", club: "KAW", group: "W", age: 28, nation: "Japan", skill: 0.76, foot: "R" },
];

// A squad is this plan read from the FRONT, so every prefix a club can be dealt
// (7-9 slots) must already field all three lines. The previous ordering parked the
// AM, both Ws and the ST in slots 9-12, which no 7-9 slot squad ever reached: 26 of
// the 39 clubs had no attacking player at all, and clubInput then answered their
// attack line with the club's own rating instead of a squad measurement (README
// M196/M197, pinned by scripts/proof-career.mjs).
const GROUP_PLAN: PositionGroup[] = [
  "GK", "CB", "CB", "FB", "DM", "CM", "AM", "W", "ST",
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
    const squadSize = Math.min(rngInt(rng, 7, 9), GROUP_PLAN.length);
    // Inject curated stars for their clubs.
    const clubStars = STARS.filter((s) => s.club === club.short);
    for (const star of clubStars) {
      usedNames.add(star.name);
      pushPlayer(star.name, star.group, star.age, star.nation, club, star.skill, star.foot, def.strength);
    }
    for (let i = 0; i < squadSize; i++) {
      const group = GROUP_PLAN[i];
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
      archetype: dna.primary.id,
      value: marketValue(overall, age),
      foot,
      attributes: attrs,
    });
  }

  // Populate continental competitions based on league strength
  const uclClubs: string[] = [];
  const uelClubs: string[] = [];
  const libertadoresClubs: string[] = [];

  // UEFA Champions League: top European clubs
  for (const compId of ["pl", "liga", "seriea", "bundes", "ligue1"]) {
    const compClubs = clubs.filter((c) => c.competitionId === compId).sort(byOverall);
    uclClubs.push(...compClubs.slice(0, Math.min(4, compClubs.length)).map((c) => c.id));
    if (compClubs.length > 4) {
      uelClubs.push(...compClubs.slice(4, Math.min(6, compClubs.length)).map((c) => c.id));
    }
  }
  // Add Dutch and Portuguese champions to UCL
  for (const compId of ["eredivisie", "liga1"]) {
    const compClubs = clubs.filter((c) => c.competitionId === compId).sort(byOverall);
    if (compClubs.length > 0) uclClubs.push(compClubs[0].id);
  }
  // Turkish champion to Europa League
  const turkishClubs = clubs.filter((c) => c.competitionId === "superlig").sort(byOverall);
  if (turkishClubs.length > 0) uelClubs.push(turkishClubs[0].id);

  // Copa Libertadores: top South American clubs
  const brazilianClubs = clubs.filter((c) => c.competitionId === "brasileirao").sort(byOverall);
  libertadoresClubs.push(...brazilianClubs.slice(0, Math.min(4, brazilianClubs.length)).map((c) => c.id));

  // Assign continental clubs to their competitions
  compMap.get("ucl")!.clubIds = uclClubs;
  compMap.get("uel")!.clubIds = uelClubs;
  compMap.get("libertadores")!.clubIds = libertadoresClubs;

  const matches = buildMatches(clubs, players, compMap, rng);
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

function buildMatches(clubs: Club[], players: PlayerRef[], compMap: Map<string, Competition>, rng: () => number): Match[] {
  const matches: Match[] = [];
  const byId = indexById(clubs);
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
            // Generate detailed match events and stats
            const homePool = players.filter((p) => p.clubId === home.id);
            const awayPool = players.filter((p) => p.clubId === away.id);
            const evs = generateMatchEvents(home, away, s, homePool, awayPool, rng);
            m.events = evs;
            m.stats = generateMatchStats(home, away, s, evs, rng);
          }
          matches.push(m);
        }
      }
    }
  }
  return matches.sort(byKickoff);
}

function scoreFromStrength(h: number, a: number, rng: () => number): { h: number; a: number } {
  const diff = (h + 5 - a) / 12; // home advantage
  const lh = Math.max(0, diff + rngFloat(rng, -0.9, 0.9));
  const la = Math.max(0, -diff + rngFloat(rng, -0.9, 0.9));
  return { h: Math.min(6, Math.round(lh * 1.4)), a: Math.min(6, Math.round(la * 1.4)) };
}

function generateMatchEvents(home: Club, away: Club, score: { h: number; a: number }, homePool: PlayerRef[], awayPool: PlayerRef[], rng: () => number): MatchEvent[] {
  const events: MatchEvent[] = [];
  const shotTypes = ["tap_in", "close_range", "header", "left_foot", "right_foot", "volley"];
  const named = (pool: PlayerRef[]): string =>
    pool.length > 0 ? pool[rngInt(rng, 0, pool.length - 1)].name : "Unknown";
  const keeper = (pool: PlayerRef[]): string =>
    pool.find((p) => p.position === "GK")?.name ?? named(pool);
  
  // Generate goal events with details
  for (let i = 0; i < score.h; i++) {
    const minute = rngInt(rng, 1, 90);
    const shotType = pick(rng, shotTypes);
    const xG = (rngFloat(rng, 0.05, 0.85)).toFixed(2);
    events.push({
      minute,
      type: "GOAL",
      side: "home",
      player: named(homePool),
      detail: { key: "sim.ev.goal", vars: { xg: xG, shot: shotType } },
    });
  }
  
  for (let i = 0; i < score.a; i++) {
    const minute = rngInt(rng, 1, 90);
    const shotType = pick(rng, shotTypes);
    const xG = (rngFloat(rng, 0.05, 0.85)).toFixed(2);
    events.push({
      minute,
      type: "GOAL",
      side: "away",
      player: named(awayPool),
      detail: { key: "sim.ev.goal", vars: { xg: xG, shot: shotType } },
    });
  }
  
  // Add some shots and saves
  const totalShots = rngInt(rng, 8, 20);
  for (let i = 0; i < totalShots; i++) {
    const side = rng() > 0.5 ? "home" : "away";
    const minute = rngInt(rng, 1, 90);
    if (rng() > 0.7) {
      events.push({ minute, type: "SAVE", side, player: keeper(side === "home" ? homePool : awayPool) });
    } else {
      events.push({ minute, type: "SHOT", side, player: named(side === "home" ? homePool : awayPool) });
    }
  }
  
  // Add occasional cards
  if (rng() > 0.6) {
    const cardSide = rng() > 0.5 ? "home" : "away";
    events.push({
      minute: rngInt(rng, 1, 90),
      type: "YELLOW",
      side: cardSide,
      player: named(cardSide === "home" ? homePool : awayPool),
    });
  }

  // Straight reds are rare but real, so the board's reds figure has an event source too
  if (rng() > 0.9) {
    const cardSide = rng() > 0.5 ? "home" : "away";
    events.push({
      minute: rngInt(rng, 55, 89),
      type: "RED",
      side: cardSide,
      player: named(cardSide === "home" ? homePool : awayPool),
    });
  }
  
  return events.sort((a, b) => a.minute - b.minute);
}

function generateMatchStats(home: Club, away: Club, score: { h: number; a: number }, events: MatchEvent[], rng: () => number): { home: MatchStats; away: MatchStats } {
  // Possession based on overall strength with some randomness
  const strengthDiff = home.overall - away.overall;
  let basePossession = 50 + strengthDiff * 0.8;
  basePossession = Math.max(35, Math.min(65, basePossession + rngFloat(rng, -5, 5)));
  
  // The countable board figures are the timeline's own counts (M287): the seed's
  // stats pair describes the events printed beside it, not an independent model.
  const count = (type: string, side: "home" | "away") =>
    events.filter((e) => e.type === type && e.side === side).length;
  const homeShots = count("SHOT", "home") + count("SAVE", "home") + count("GOAL", "home");
  const awayShots = count("SHOT", "away") + count("SAVE", "away") + count("GOAL", "away");
  
  const homeOnTarget = count("SAVE", "home") + count("GOAL", "home");
  const awayOnTarget = count("SAVE", "away") + count("GOAL", "away");
  
  const homeXg = parseFloat((homeOnTarget * rngFloat(rng, 0.08, 0.15) + score.h * rngFloat(rng, 0.1, 0.2)).toFixed(2));
  const awayXg = parseFloat((awayOnTarget * rngFloat(rng, 0.08, 0.15) + score.a * rngFloat(rng, 0.1, 0.2)).toFixed(2));
  
  const homePasses = rngInt(rng, 300, 550);
  const awayPasses = rngInt(rng, 300, 550);
  const homePassAcc = parseFloat((rngFloat(rng, 75, 90)).toFixed(1));
  const awayPassAcc = parseFloat((rngFloat(rng, 75, 90)).toFixed(1));
  
  const homeTackles = rngInt(rng, 12, 25);
  const awayTackles = rngInt(rng, 12, 25);
  const homeDuels = rngInt(rng, 40, 70);
  const awayDuels = rngInt(rng, 40, 70);
  
  const homeCorners = rngInt(rng, 2, 10);
  const awayCorners = rngInt(rng, 2, 10);
  const homeFouls = rngInt(rng, 8, 18);
  const awayFouls = rngInt(rng, 8, 18);
  
  const homeYellows = count("YELLOW", "home");
  const awayYellows = count("YELLOW", "away");
  const homeReds = count("RED", "home");
  const awayReds = count("RED", "away");
  
  return {
    home: {
      possession: Math.round(basePossession),
      shots: homeShots,
      onTarget: homeOnTarget,
      xg: homeXg,
      passes: homePasses,
      passAcc: homePassAcc,
      tackles: homeTackles,
      duels: homeDuels,
      corners: homeCorners,
      fouls: homeFouls,
      yellows: homeYellows,
      reds: homeReds,
    },
    away: {
      possession: Math.round(100 - basePossession),
      shots: awayShots,
      onTarget: awayOnTarget,
      xg: awayXg,
      passes: awayPasses,
      passAcc: awayPassAcc,
      tackles: awayTackles,
      duels: awayDuels,
      corners: awayCorners,
      fouls: awayFouls,
      yellows: awayYellows,
      reds: awayReds,
    },
  };
}

function buildStandings(clubs: Club[], matches: Match[]): Record<string, Standing[]> {
  const table: Record<string, Standing[]> = {};
  const byId = indexById(clubs);
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

// Each template is [kind, raw English headline, dictionary key]. The raw form
// stays on the record for matching (search scoring, AI fact layer); the key is
// what the glass reads, through `newsTitle`, so a 简体中文 reader gets the
// headline in their own words and the proper nouns ride as vars.
const NEWS_TEMPLATES: [NewsArticle["kind"], string, string][] = [
  ["Confirmed", "{club} confirm {player} fit for the derby", "ni.headline.confirmed"],
  ["Reported", "{club} open talks over {player} extension", "ni.headline.reported"],
  ["Rumor", "{club} weighing a January move for {player}", "ni.headline.rumor"],
  ["Analysis", "How {club}'s press is breaking the first line", "ni.headline.analysis"],
  ["Opinion", "{club} need to trust their academy, not the market", "ni.headline.opinion"],
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
    const clubName = club.name;
    const playerSurname = player.name.split(" ").slice(-1)[0];
    const title = kind[1].replace("{club}", clubName).replace("{player}", playerSurname);
    const src = pick(rng, sources);
    const cred = Math.max(0.3, Math.min(0.97, src.cred + rngFloat(rng, -0.12, 0.08)));
    out.push({
      id: `N${(i + 1).toString().padStart(3, "0")}`,
      title,
      titleKey: kind[2],
      titleVars: { club: clubName, player: playerSurname },
      source: src.name,
      publishedAt: new Date(anchor - rngInt(rng, 0, 72) * 3600000).toISOString(),
      credibility: round2(cred),
      kind: kind[0],
      entityIds: [club.id, player.id],
      topics: [pick(rng, ["Transfers", "Tactics", "Injury", "Match Preview", "Academy"]), club.name],
    });
  }
  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export const WORLD = makeWorld();
