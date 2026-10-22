// M441. The app's CHIP is written once.
//
// The defect, measured before it was fixed. A chip is the app's smallest coloured badge: a border,
// a wash and a word, all of one colour. The same chips were spelled out in many files at once —
//
//   · the load module's four zone chips, the news module's three certainty chips and the review
//     screen's three kind chips each wrote the same three class strings, so the app could wear a
//     caution in one colour on one screen and in another colour on the next;
//   · the muted chip ("border-border text-muted-foreground") was written out in five files;
//   · the chip an option wears when you have PICKED it — "border-primary bg-primary/10
//     text-primary" — was written out sixteen times, in nine screens, each one a copy of the rest.
//
// The fold put the chips in one table (ui/primitives.tsx's CHIP_CLASS), moved the load zone's map
// there too (ZONE_CLASS), and took the colours out of the domain: the domain says what a chip
// MEANS, the UI says what it wears.
//
// This script reads the app and charges the family. Its shape is a class string that carries a
// border colour and a word colour, and it is read as a SET of colour classes, because the order of
// the classes in an attribute does not change what is painted. Four shapes are charged:
//
//   · the TONE chip — a border, a wash and a word, all of one colour, at rest;
//   · the MUTED chip — a border of the border colour and a muted word (with or without a wash);
//   · the option AT REST — muted words that turn primary when you point at them;
//   · the BADGE — a border and a word of one colour, with NO wash of that colour.
//
// The rule is one sentence: a chip that is written twice lives in the palette, and a chip written
// once is its screen's own. A BADGE is stricter: it is written once too, and that once is the
// palette — the amber badge alone was spelled out in seven places and the green one in five, and
// the family has one home like the chips do.
//
// Run: node scripts/proof-chips.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { walkApp } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const HOME = "ui/primitives.tsx";
const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// The theme's colours: the `--color-<name>` definitions. A class that names a colour the theme
// does not define paints nothing, so the census reads the theme rather than guessing a palette.
const css = readFileSync(join(root, "src", "globals.css"), "utf8");
const themeColours = new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));

/** A colour class: `border-success/40`, `hover:border-primary/40`, `text-muted-foreground`. */
const colourClass = (cls) => {
  const variant = cls.includes(":");
  const base = variant ? cls.slice(cls.indexOf(":") + 1) : cls;
  const m = base.match(/^(border|bg|text)-([a-z][a-z0-9-]*)(?:\/\d+)?$/);
  if (!m || !themeColours.has(m[2])) return null;
  return { raw: cls, variant, role: m[1], colour: m[2] };
};

/** The colour classes a string carries, in the order they are written. */
const colourClasses = (str) => str.split(/\s+/).filter(Boolean).map(colourClass).filter(Boolean);

/**
 * The shape of a string, or null when it is not a chip.
 *
 * The three shapes are named so the census can print which family it charged, and so a planted
 * fixture can be asked to be one of them.
 */
const shapeOf = (str) => {
  const classes = colourClasses(str);
  const plain = classes.filter((c) => !c.variant);
  const border = plain.find((c) => c.role === "border");
  const wash = plain.find((c) => c.role === "bg");
  const word = plain.find((c) => c.role === "text");
  // The tone chip: a border, a wash and a word, all of one colour.
  if (border && wash && word && border.colour === word.colour && wash.colour === border.colour) return "tone";
  // The muted chip: the border colour and the muted word.
  if (border && word && border.colour === "border" && word.colour === "muted-foreground") return "muted";
  // The badge: a border and a word of one colour, with no wash of that colour.
  if (border && word && border.colour === word.colour && !(wash && wash.colour === border.colour)) return "badge";
  // The option at rest: muted words, and a border that appears when you point at them.
  const hoverBorder = classes.find((c) => c.variant && c.role === "border");
  if (!border && word && word.colour === "muted-foreground" && hoverBorder && hoverBorder.colour === "primary") return "rest";
  return null;
};

/** The chip's identity: the colour classes it wears, order-insensitive. */
const identityOf = (str) => colourClasses(str).map((c) => c.raw).sort().join(" ");

/**
 * The source without its comments.
 *
 * A class string quoted in a comment is prose about a chip, not a spelling of one — the palette's
 * own comment names the chip it replaced — so the census reads code. The newlines are kept, so a
 * string's line number is still the line it sits on.
 */
const stripComments = (text) => {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    if (quote) {
      if (c === "\\") { out += c + (text[i + 1] ?? ""); i += 2; continue; }
      out += c;
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && text[i + 1] === "*") {
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) { out += text[i] === "\n" ? "\n" : " "; i++; }
      out += "  "; i += 2; continue;
    }
    out += c;
    i++;
  }
  return out;
};

/** Every quoted class string in a source file, with the line it sits on. */
const quotedStrings = (text) => {
  const out = [];
  stripComments(text).split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/"([^"]*)"/g)) out.push({ str: m[1], line: i + 1 });
  });
  return out;
};

// The app's source. The rule for what is the app lives in scripts/lib/appTree.mjs, and this script
// reads it rather than keeping a list of its own.
const appFiles = APP_DIRS.flatMap((d) => walkApp(join(root, d), { exts: [".ts", ".tsx"] }));
const src = Object.fromEntries(appFiles.map((f) => [f.slice(root.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8")]));

/** Every chip in the app: its identity, its shape, and where it is written. */
const census = () => {
  const groups = new Map();
  for (const [file, text] of Object.entries(src)) {
    for (const { str, line } of quotedStrings(text)) {
      if (!str.includes("border-") && !str.includes("text-")) continue;
      const shape = shapeOf(str);
      if (!shape) continue;
      const id = identityOf(str);
      if (!groups.has(id)) groups.set(id, { shape, sites: [] });
      groups.get(id).sites.push(`${file}:${line}`);
    }
  }
  return groups;
};

// --- 1 · the reader is armed ---------------------------------------------------------------------
// A planted chip must be read as a chip, and a planted card must not be. If the scan were blind,
// every clause below would pass on an empty census.
const PLANTS = [
  ["border-success/40 bg-success/10 text-success", "tone"],
  ["border-border text-muted-foreground", "muted"],
  ["text-muted-foreground hover:border-primary/40", "rest"],
  ["border-warning/40 text-warning", "badge"],
  ["border-warning/40 bg-warning/10 text-warning", "tone"],
  ["border border-border/60 bg-secondary/20 p-3 transition-colors hover:border-primary/40", null],
  ["text-xs text-muted-foreground", null],
];
const planted = PLANTS.map(([str, want]) => ({ str, want, got: shapeOf(str) }));
ok(`the shape reader is armed (${planted.map((p) => `${p.want ?? "not a chip"}=${p.got ?? "not a chip"}`).join(", ")})`,
  planted.every((p) => p.got === p.want),
  planted.filter((p) => p.got !== p.want).map((p) => `${p.str} read ${p.got}`).join("; "));

const groups = census();
const chipGroups = [...groups.entries()];
ok(`the app holds ${chipGroups.length} chip(s) and the census is not empty (${chipGroups.length > 0})`,
  chipGroups.length > 0);

// --- 2 · a chip written twice lives in the palette ------------------------------------------------
// The palette is ui/primitives.tsx. A chip that appears in two or more places must appear ONLY
// there: the copy in a screen is the defect this milestone closed.
const shared = chipGroups.filter(([, g]) => g.sites.length > 1);
const outsideHome = shared.map(([id, g]) => ({ id, sites: g.sites.filter((s) => !s.startsWith(HOME + ":")) }));
ok(`every chip written more than once lives in the palette alone (${shared.length} shared chip(s); ${outsideHome.filter((o) => o.sites.length).length} still written outside it)`,
  outsideHome.every((o) => o.sites.length === 0) && chipGroups.length > 0,
  outsideHome.filter((o) => o.sites.length).map((o) => `${o.id} at ${o.sites.join(", ")}`).join("; "));

const singles = chipGroups.filter(([, g]) => g.sites.length === 1);
ok(`a chip written once is its screen's own, and the palette's own chips are single (${singles.length} single-site chip(s), ${singles.filter(([, g]) => g.sites[0].startsWith(HOME + ":")).length} of them in the palette)`,
  singles.length > 0);

// --- 2b · a badge is written once, in the palette ---------------------------------------------------
// The badge family is stricter than the chips: a badge is a border and a word of one colour with no
// wash, and the app wore the amber one in seven places and the green one in five. Every badge the
// app knows must live in the palette — a screen that spells one out is the defect this closes.
const badgeGroups = chipGroups.filter(([, g]) => g.shape === "badge");
const badgesOutside = badgeGroups.flatMap(([id, g]) => g.sites.filter((s) => !s.startsWith(HOME + ":")).map((s) => `${id} at ${s}`));
ok(`every badge the app wears is written in the palette alone (${badgeGroups.length} badge(s); ${badgesOutside.length} written outside it)`,
  badgeGroups.length > 0 && badgesOutside.length === 0,
  badgesOutside.join("; "));

// --- 3 · the palette holds the chips the screens used to spell out ---------------------------------
// The reference classes live in this proof file, not in the app: this is the text the app wore
// before the fold, and the shipped table is checked against it.
const EXPECTED = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  primary: "border-primary/40 bg-primary/10 text-primary",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-info/40 bg-info/10 text-info",
  muted: "border-border text-muted-foreground",
  mutedSoft: "border-border bg-secondary/30 text-muted-foreground",
  optionOn: "border-primary bg-primary/10 text-primary",
  optionOff: "text-muted-foreground hover:border-primary/40",
  filterOn: "border-primary/50 bg-primary/10 text-primary",
  filterOff: "border-border/60 text-muted-foreground hover:border-primary/30",
  badgeSuccess: "border-success/40 text-success",
  badgeWarning: "border-warning/40 text-warning",
  badgePrimary: "border-primary/40 text-primary",
  badgeSuccessStrong: "border-success/50 text-success",
  badgeWarningStrong: "border-warning/50 text-warning",
  badgeInfoStrong: "border-info/50 text-info",
};
const { CHIP_CLASS, ZONE_CLASS } = await server.ssrLoadModule("/ui/primitives.tsx");
ok(`the palette holds the seventeen chips and badges the app wore (${CHIP_CLASS ? Object.keys(CHIP_CLASS).length : 0} entries)`,
  CHIP_CLASS !== null && Object.keys(EXPECTED).every((k) => CHIP_CLASS[k] === EXPECTED[k]) &&
    Object.keys(CHIP_CLASS).length === Object.keys(EXPECTED).length,
  CHIP_CLASS ? Object.keys(EXPECTED).filter((k) => CHIP_CLASS[k] !== EXPECTED[k]).join(", ") : "the palette did not load");

// --- 4 · the zone map rides the palette ------------------------------------------------------------
// The load zones wear the tone chips; the map names the palette, not the classes.
const ZONE_EXPECTED = {
  under: EXPECTED.primary,
  optimal: EXPECTED.success,
  caution: EXPECTED.warning,
  high: EXPECTED.destructive,
};
ok(`the four load zones wear the palette's chips (${ZONE_CLASS ? Object.keys(ZONE_CLASS).length : 0} zones)`,
  ZONE_CLASS !== null && Object.keys(ZONE_EXPECTED).every((z) => ZONE_CLASS[z] === ZONE_EXPECTED[z]) &&
    Object.keys(ZONE_CLASS).length === 4 && ZONE_CLASS.none === undefined,
  ZONE_CLASS ? Object.keys(ZONE_EXPECTED).filter((z) => ZONE_CLASS[z] !== ZONE_EXPECTED[z]).join(", ") : "the zone map did not load");

// --- 5 · the domain names no colour ------------------------------------------------------------------
// The load module and the news module used to hand the screens a class string. A domain module
// that knows a Tailwind colour is a domain module that can disagree with the UI about it.
// The reader is armed: the same reader, asked about a planted domain module that does carry a
// chip, must find it — so the zero below is measured and not a blind spot.
const DOMAINS = ["domain/load.ts", "domain/newsImpact.ts"];
const domainChips = DOMAINS.flatMap((f) =>
  quotedStrings(src[f] ?? "").filter(({ str }) => shapeOf(str)).map(({ str, line }) => `${f}:${line} ${str}`));
const PLANTED_DOMAIN = `const chip = "border-success/40 bg-success/10 text-success";`;
const plantedDomainChips = quotedStrings(PLANTED_DOMAIN).filter(({ str }) => shapeOf(str)).length;
ok(`the domain names no chip (${domainChips.length} chip string(s) in ${DOMAINS.join(", ")}; a planted one reads ${plantedDomainChips})`,
  domainChips.length === 0 && plantedDomainChips === 1,
  domainChips.join("; "));

// --- 6 · the screens read the palette -----------------------------------------------------------------
// The screens that wear a chip import it from the palette; none of them carries the classes.
const CONSUMERS = [
  "features/dashboard/Dashboard.tsx",
  "features/load/LoadPage.tsx",
  "features/player/PlayerOS.tsx",
  "features/review/ReviewPage.tsx",
  "features/history/HistoryPage.tsx",
  "features/football/FootballWorld.tsx",
  "features/achievements/AchievementsPage.tsx",
  "features/analytics/DataRoom.tsx",
  "features/watchlist/WatchlistBoard.tsx",
  "features/transfers/TransferCentre.tsx",
  "features/profile/ProfilePage.tsx",
  "features/ai/AiStudio.tsx",
  "features/community/CommunityHub.tsx",
  "features/learn/LearnHub.tsx",
  "features/manager/ManagerOS.tsx",
  "features/onboarding/Onboarding.tsx",
  "features/scouting/ScoutingPanel.tsx",
  "features/tactical/TacticalStudio.tsx",
  "features/sim/SimulationLab.tsx",
  "features/world/DynamicWorld.tsx",
  "features/film/FilmRoom.tsx",
  "features/football/Details.tsx",
];
const readers = CONSUMERS.filter((f) => /import[^;]*\bCHIP_CLASS\b[^;]*from ["']@\/ui\/primitives["']/.test(src[f] ?? ""));
ok(`every screen that wears a chip or a badge reads the palette (${readers.length} of ${CONSUMERS.length})`,
  readers.length === CONSUMERS.length,
  `not reading it: ${CONSUMERS.filter((f) => !readers.includes(f)).join(", ")}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
