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
// the classes in an attribute does not change what is painted. Five shapes are charged:
//
//   · the TONE chip — a border, a wash and a word, all of one colour, at rest;
//   · the MUTED chip — a border of the border colour and a muted word (with or without a wash);
//   · the option AT REST — muted words that turn primary when you point at them;
//   · the BADGE — a border and a word of one colour, with NO wash of that colour;
//   · the LABEL — a wash and a word of one colour with NO border (icon badges), OR a border and a wash with NO word (answer selections).
//
// The rule is one sentence: a chip that is written twice lives in the palette, and a chip written
// once is its screen's own. A BADGE is stricter: it is written once too, and that once is the
// palette — the amber badge alone was spelled out in seven places and the green one in five, and
// the family has one home like the chips do. A LABEL is equally strict: the app wore the primary
// wash in thirteen places and the answer border/wash in two — every label lives in the palette.
//
// Run: node scripts/proof-chips.mjs
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { walkApp, APP_DIRS } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const HOME = "ui/primitives.tsx";

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
  // A colour class with an opacity suffix is a SOFTENED one: `border-success/40` is a hint of a
  // colour, `border-success` is the colour itself. The mark needs the colour itself.
  const softened = /\/\d+$/.test(base);
  return { raw: cls, variant, role: m[1], colour: m[2], softened };
};

/** The colour classes a string carries, in the order they are written. */
const colourClasses = (str) => str.split(/\s+/).filter(Boolean).map(colourClass).filter(Boolean);

// The SURFACES: the colours a PANEL wears, not a label's. A wash of one of these is a card, a
// popover, a sidebar or a page, and the app's panels are not labels.
const SURFACES = new Set(["background", "card", "popover", "sidebar", "accent"]);

// The QUIET SURFACES: the two the app's own panels are drawn on — the card a page is made of, and
// the secondary a quiet row sits on. The shell's surfaces (the modal's background, the sidebar) are
// the shell's own, not panels the app composes.
const QUIET_SURFACES = new Set(["card", "secondary"]);

/**
 * The shape of a string, or null when it is not a chip.
 *
 * The shapes are named so the census can print which family it charged, and so a planted fixture
 * can be asked to be one of them.
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
  // The LABEL: a wash and a word, with NO border — the icon plates, the "yours" chip, the result
  // squares. The word is the wash's own colour, or the app's neutral word (the muted one, or the
  // default one); a wash of a SURFACE colour is a panel, and a word that is the wash's own
  // "-foreground" partner is a SOLID, not a label.
  if (!border && wash && word && !SURFACES.has(wash.colour) &&
      (word.colour === wash.colour || word.colour === "muted-foreground" || word.colour === "foreground") &&
      word.colour !== `${wash.colour}-foreground`) return "label";
  // The SOLID: a wash and the word that READS ON it — the wash's own "-foreground" companion, with
  // no border of its own. A label wears a word of its own colour; a solid wears the companion that
  // stays legible on the wash. The two are mirrors, and the companion is what tells them apart.
  if (!border && wash && word && word.colour === `${wash.colour}-foreground`) return "solid";
  // The MARK, the label's mirror: a FULL-STRENGTH border and a wash of that colour, with NO word
  // — the chosen answer, the selected player. A softened border is a container's edge, not a mark.
  if (border && wash && !word && border.colour === wash.colour && !border.softened) return "mark";
  // The PANEL: the app's own quiet box — a border and a wash of one of the app's quiet surfaces,
  // with NO word of its own, not even a word on hover. A bare `border` IS the border colour in
  // Tailwind, so the reader sees it as a border of the theme's border colour.
  if (wash && QUIET_SURFACES.has(wash.colour) && !classes.some((c) => c.role === "text")) {
    const hasBorder = border || str.split(/\s+/).includes("border");
    if (hasBorder) return "panel";
  }
  // The option at rest: muted words, and a border that appears when you point at them.
  const hoverBorder = classes.find((c) => c.variant && c.role === "border");
  if (!border && word && word.colour === "muted-foreground" && hoverBorder && hoverBorder.colour === "primary") return "rest";
  return null;
};

/** The chip's identity: the colour classes it wears, order-insensitive. */
const identityOf = (str) => colourClasses(str).map((c) => c.raw).sort().join(" ");

/**
 * The PANEL's identity: its wash and its border, order-insensitive.
 *
 * A bare `border` IS the border colour in Tailwind, so it counts as a border here — without it, a
 * panel with the theme's border colour and a panel with a softened one would share an identity.
 */
const panelIdentityOf = (str) => {
  const tokens = str.split(/\s+/).filter(Boolean);
  const plain = colourClasses(str).filter((c) => !c.variant);
  const wash = plain.find((c) => c.role === "bg");
  const border = plain.find((c) => c.role === "border");
  const set = [wash?.raw];
  if (border) set.push(border.raw);
  else if (tokens.includes("border")) set.push("border");
  return set.filter(Boolean).sort().join(" ");
};

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
      if (!str.includes("border-") && !str.includes("text-") && !str.includes("bg-")) continue;
      const shape = shapeOf(str);
      if (!shape) continue;
      const id = shape === "panel" ? panelIdentityOf(str) : identityOf(str);
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
  ["bg-primary/15 text-primary", "label"],
  ["border-success bg-success/10", "mark"],
  ["bg-primary text-primary-foreground", "solid"],
  ["rounded-md border bg-card/30 px-2 py-1.5", "panel"],
  ["border border-border/60 bg-secondary/20 p-3 transition-colors hover:border-primary/40", "panel"],
  // A wash of a surface colour with a word is not a label: it says something.
  ["bg-card/50 px-3 py-1 text-sm text-muted-foreground", null],
  // A softened border is a container's edge, not a mark.
  ["border-success/40 bg-success/10 p-3", null],
  // A panel with a word of its own is not a panel: it says something.
  ["rounded-md border bg-card/30 px-2 py-1.5 text-muted-foreground", null],
  // A wash of the shell's own surface is not a panel the app composes.
  ["border bg-background p-6 shadow-lg", null],
  // A solid button is not a label: its word is the wash's own foreground companion — that is what
  // makes it a SOLID, and the two families are mirrors.
  ["bg-primary/90 px-3.5 py-2 text-sm text-primary-foreground", "solid"],
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
// there: the copy in a screen is the defect this milestone closed. The clause reads the CHIP
// family — the tone chip, the muted chip and the option at rest. The families that came after it
// (the badge, the label, the mark, the panel, the solid) each carry a stricter rule of their own
// below, so they are not read twice.
const CHIP_SHAPES = new Set(["tone", "muted", "rest"]);
const shared = chipGroups.filter(([, g]) => g.sites.length > 1 && CHIP_SHAPES.has(g.shape));
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

// --- 2c · a label and a mark are written once, in the palette ----------------------------------------
// The label family is stricter than the chips in the same way the badge family is. A LABEL is a wash
// and a word with no border (an icon's plate, a "yours" chip, a result square); its mirror, a MARK,
// is a full-strength border and a wash with no word (a chosen answer, a selected player). The app wore
// the primary wash on thirteen icon plates and the answer's border-and-wash in two — every label and
// every mark the app knows must live in the palette, because a screen that spells one out is exactly
// the defect this closes.
const labelGroups = chipGroups.filter(([, g]) => g.shape === "label");
const markGroups = chipGroups.filter(([, g]) => g.shape === "mark");
const labelsOutside = labelGroups.flatMap(([id, g]) => g.sites.filter((s) => !s.startsWith(HOME + ":")).map((s) => `${id} at ${s}`));
const marksOutside = markGroups.flatMap(([id, g]) => g.sites.filter((s) => !s.startsWith(HOME + ":")).map((s) => `${id} at ${s}`));
ok(`every label the app wears is written in the palette alone (${labelGroups.length} label(s); ${labelsOutside.length} written outside it)`,
  labelGroups.length > 0 && labelsOutside.length === 0,
  labelsOutside.join("; "));
ok(`and so is every mark, its mirror (${markGroups.length} mark(s); ${marksOutside.length} written outside it)`,
  markGroups.length > 0 && marksOutside.length === 0,
  marksOutside.join("; "));
// The two clauses above must be able to REFUSE: a label spelled out in a screen has to be caught,
// or the zeros above would be a blind spot rather than a measurement. The census is asked about a
// planted label and a planted mark in a screen's own file, and both must be charged.
const PLANTED_SCREEN = [
  ["features/community/CommunityHub.tsx", 900, 'const x = "bg-primary/15 text-primary";'],
  ["features/learn/LearnHub.tsx", 900, 'const y = "border-success bg-success/10";'],
  ["features/film/FilmRoom.tsx", 900, 'const z = "rounded-md border bg-card/30 px-2 py-1.5";'],
];
const plantedCharged = PLANTED_SCREEN.map(([file, line, src]) => {
  const planted = [...quotedStrings(src)].filter(({ str }) => shapeOf(str));
  return planted.length;
});
ok(`the label and mark clauses can refuse a screen that spells one out (${plantedCharged.join(", ")} planted string(s) charged)`,
  plantedCharged.every((n) => n === 1),
  `planted strings read ${plantedCharged.join(", ")}`);

// --- 2d · a panel is written once, in the palette -----------------------------------------------------
// The panel is the app's own quiet box: a border and a wash of one of the app's quiet surfaces, with
// no word of its own. The app drew its panels in FOUR strengths of the card surface, and each
// strength was used consistently for its own kind of panel — so the four are NAMED rather than
// merged, and the panel's LAYOUT (its radius, its padding) stays at the screen that draws it. Every
// panel the app wears must live in PANEL_CLASS, because a screen that spells its wash out is the
// defect this closes: the shade a panel wore was decided by whichever screen wrote it first.
const panelGroups = chipGroups.filter(([, g]) => g.shape === "panel");
const panelsOutside = panelGroups.flatMap(([id, g]) => g.sites.filter((s) => !s.startsWith(HOME + ":")).map((s) => `${id} at ${s}`));
ok(`every panel the app wears is written in the palette alone (${panelGroups.length} panel(s); ${panelsOutside.length} written outside it)`,
  panelGroups.length > 0 && panelsOutside.length === 0,
  panelsOutside.join("; "));

// --- 2d · a solid is written once, in the palette ------------------------------------------------------
// The SOLID is the label's third mirror: a wash and the word that READS ON it — the wash's own
// "-foreground" companion — with no border of its own. The app wore the primary solid in the
// settings page's chosen tab, the shell's own two solids on its emblem and its active mode, and
// the muted one in the result squares.
//
// The starter's own components (components/ui) are NOT the app's: they came with the template, and
// the app's palette must not depend on the components that wear it — a palette that the badge
// imported would close a loop from ui/primitives back to ui/primitives, and the class it read
// would not be initialised yet. So the starter's solids are left as they are, and the clause says
// so rather than hiding them.
const VENDOR = "components/";
const solidGroups = chipGroups.filter(([, g]) => g.shape === "solid");
const appSolids = solidGroups.filter(([, g]) => g.sites.some((s) => !s.startsWith(VENDOR)));
const vendorSolids = solidGroups.filter(([, g]) => g.sites.every((s) => s.startsWith(VENDOR)));
const solidsOutside = appSolids.flatMap(([id, g]) => g.sites.filter((s) => !s.startsWith(VENDOR) && !s.startsWith(HOME + ":")).map((s) => `${id} at ${s}`));
ok(`every solid the app wears is written in the palette alone (${appSolids.length} solid(s) in the app's own code; ${solidsOutside.length} written outside it; ${vendorSolids.length} left to the starter)`,
  appSolids.length > 0 && solidsOutside.length === 0,
  solidsOutside.join("; "));
// And the clause must be able to REFUSE: a solid spelled out in a screen has to be caught, or the
// zero above would be a blind spot rather than a measurement.
const PLANTED_SOLID = 'const s = "bg-primary text-primary-foreground";';
const plantedSolid = [...quotedStrings(PLANTED_SOLID)].filter(({ str }) => shapeOf(str)).length;
ok(`the solid clause can refuse a screen that spells one out (${plantedSolid} planted string(s) charged)`,
  plantedSolid === 1,
  `the planted solid read ${plantedSolid}`);

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
  labelPrimary: "bg-primary/15 text-primary",
  labelPrimary20: "bg-primary/20 text-primary",
  labelPrimaryForeground: "bg-primary/10 text-foreground",
  labelSuccess: "bg-success/20 text-success",
  labelSuccess10: "bg-success/10 text-success",
  labelDestructive: "bg-destructive/20 text-destructive",
  labelInfo: "bg-info/20 text-info",
  labelSecondary: "bg-secondary text-muted-foreground",
  labelSidebarPrimary: "bg-sidebar-primary/15 text-sidebar-primary",
  labelBorderSuccess: "border-success bg-success/10",
  labelBorderDestructive: "border-destructive bg-destructive/10",
  labelBorderPrimary: "border-primary bg-primary/10",
  labelBorderPrimarySoft: "border-primary bg-primary/5",
  solidPrimary: "bg-primary text-primary-foreground",
  solidPrimarySoft: "bg-primary/90 text-primary-foreground",
  solidSecondary: "bg-secondary text-secondary-foreground",
  solidMuted: "bg-muted text-muted-foreground",
  solidSidebar: "bg-sidebar text-sidebar-foreground",
  solidSidebarPrimary: "bg-sidebar-primary text-sidebar-primary-foreground",
};
const { CHIP_CLASS, ZONE_CLASS, PANEL_CLASS } = await server.ssrLoadModule("/ui/primitives.tsx");
ok(`the palette holds the thirty-six chips, badges, labels, marks and solids the app wore (${CHIP_CLASS ? Object.keys(CHIP_CLASS).length : 0} entries)`,
  CHIP_CLASS !== null && Object.keys(EXPECTED).every((k) => CHIP_CLASS[k] === EXPECTED[k]) &&
    Object.keys(CHIP_CLASS).length === Object.keys(EXPECTED).length,
  CHIP_CLASS ? Object.keys(EXPECTED).filter((k) => CHIP_CLASS[k] !== EXPECTED[k]).join(", ") : "the palette did not load");

// The PANEL palette: the app's quiet boxes, named by the wash and the border they wear. The
// reference classes live here too — this is the text the app wore before the fold.
const PANEL_EXPECTED = {
  panelFaint: "border bg-card/30",
  panelSoft: "border bg-card/40",
  panelMuted: "border bg-card/50",
  panelDeep: "border bg-card/60",
  panelPlain: "border bg-card",
  panelGhost: "border-border/60 bg-secondary/20",
  panelDim: "border-border/50 bg-secondary/10",
  panelQuiet: "border bg-secondary/20",
};
ok(`the panel palette holds the eight washes the app's boxes wore (${PANEL_CLASS ? Object.keys(PANEL_CLASS).length : 0} entries)`,
  PANEL_CLASS !== null && Object.keys(PANEL_EXPECTED).every((k) => PANEL_CLASS[k] === PANEL_EXPECTED[k]) &&
    Object.keys(PANEL_CLASS).length === Object.keys(PANEL_EXPECTED).length,
  PANEL_CLASS ? Object.keys(PANEL_EXPECTED).filter((k) => PANEL_CLASS[k] !== PANEL_EXPECTED[k]).join(", ") : "the panel palette did not load");
// The stronger half of the panel rule: a panel the app wears must be one of the palette's ENTRIES,
// not merely written in the palette's file. A panel written in ui/primitives.tsx but missing from
// PANEL_CLASS would pass the "written outside it" clause and still be a wash the app spells out.
const panelPaletteIds = new Set(PANEL_CLASS ? Object.values(PANEL_CLASS).map((v) => panelIdentityOf(v)) : []);
const panelsUnnamed = panelGroups.filter(([id]) => !panelPaletteIds.has(id)).map(([id, g]) => `${id} at ${g.sites.join(", ")}`);
ok(`and every panel the app wears is one of the palette's own entries (${panelPaletteIds.size} named; ${panelsUnnamed.length} unnamed)`,
  panelsUnnamed.length === 0,
  panelsUnnamed.join("; "));

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
  "features/command/CommandPalette.tsx",
  "features/shell/AppShell.tsx",
];
const readers = CONSUMERS.filter((f) => /import[^;]*\bCHIP_CLASS\b[^;]*from ["']@\/ui\/primitives["']/.test(src[f] ?? ""));
ok(`every screen that wears a chip, a badge, a label or a mark reads the palette (${readers.length} of ${CONSUMERS.length})`,
  readers.length === CONSUMERS.length,
  `not reading it: ${CONSUMERS.filter((f) => !readers.includes(f)).join(", ")}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
