// M444: the BADGE family - a border and a word of one colour, with no wash.
//
// The chip (M441) was a border, a wash and a word. A badge is a border and a word, with NO wash of
// its own, and the app spelled those out too: the same amber badge in seven places, the same green
// badge in five, the same strong amber in two.
//
// This folds them into the palette. The badge's own classes are replaced by the palette's entry;
// every other class the site wore stays where it was. The class SET is unchanged - the badge's
// classes move to the end of the list and CSS does not read the order of a class attribute - so
// nothing is painted differently.
//
// Run: node dev/.m444-fold.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The badge's own classes, and the palette entry that wears them.
const BADGES = {
  "border-success/40 text-success": "badgeSuccess",
  "border-warning/40 text-warning": "badgeWarning",
  "border-primary/40 text-primary": "badgePrimary",
  "border-success/50 text-success": "badgeSuccessStrong",
  "border-warning/50 text-warning": "badgeWarningStrong",
  "border-info/50 text-info": "badgeInfoStrong",
};

const files = [
  "features/community/CommunityHub.tsx",
  "features/film/FilmRoom.tsx",
  "features/football/Details.tsx",
  "features/player/PlayerOS.tsx",
  "features/learn/LearnHub.tsx",
  "features/profile/ProfilePage.tsx",
  "features/world/DynamicWorld.tsx",
  "features/dashboard/Dashboard.tsx",
  "features/transfers/TransferCentre.tsx",
  "features/sim/SimulationLab.tsx",
];

// The palette must already hold the badges, or the fold would name an entry that does not exist.
const palette = readFileSync(join(root, "ui", "primitives.tsx"), "utf8");
for (const [spec, entry] of Object.entries(BADGES)) {
  const m = palette.match(new RegExp(`${entry}:\\s*"([^"]+)"`));
  if (!m || m[1] !== spec) {
    console.log(`PALETTE MISSING: ${entry} is not "${spec}"`);
    process.exit(1);
  }
}

let folded = 0;
let problems = 0;
for (const file of files) {
  const path = join(root, file);
  const raw = readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");

  // Every quoted class string that carries a badge.
  const fold = (classes) => {
    const tokens = classes.split(/\s+/).filter(Boolean);
    for (const [spec, entry] of Object.entries(BADGES)) {
      const specTokens = spec.split(" ");
      if (!specTokens.every((t) => tokens.includes(t))) continue;
      const rest = tokens.filter((t) => !specTokens.includes(t));
      // The class set must survive the fold.
      const before = new Set(tokens);
      const after = new Set([...rest, ...specTokens]);
      if (before.size !== after.size || [...before].some((t) => !after.has(t))) {
        console.log(`SET CHANGED in ${file}: "${classes}"`);
        problems++;
        return null;
      }
      folded++;
      if (!rest.length) return `CHIP_CLASS.${entry}`;
      return `cn("${rest.join(" ")}", CHIP_CLASS.${entry})`;
    }
    return null;
  };

  // A JSX attribute that holds a whole class string becomes an expression.
  text = text.replace(/className="([^"]*)"/g, (whole, classes) => {
    const folded = fold(classes);
    return folded === null ? whole : `className={${folded}}`;
  });

  // The rest: class strings inside cn(...), ternaries and tables.
  text = text.replace(/"([^"]*)"/g, (whole, classes) => {
    const folded = fold(classes);
    return folded === null ? whole : folded;
  });

  // the palette import
  if (!/import[^;]*\bCHIP_CLASS\b[^;]*from ["']@\/ui\/primitives["']/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from ["']@\/ui\/primitives["'];/);
    if (m) {
      const names = m[1].trim();
      text = text.replace(m[0], `import { ${names}, CHIP_CLASS } from "@/ui/primitives";`);
    } else {
      console.log(`NO PALETTE IMPORT LINE: ${file}`);
      problems++;
    }
  }
  // the cn import
  if (!/import[^;]*\bcn\b[^;]*from ["']@\/lib\/utils["']/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from ["']@\/lib\/utils["'];/);
    if (m) {
      const names = m[1].trim();
      text = text.replace(m[0], `import { cn, ${names} } from "@/lib/utils";`);
    } else {
      console.log(`NO CN IMPORT LINE: ${file}`);
      problems++;
    }
  }
  writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}
console.log(`${folded} badge(s) folded (${problems} problem(s))`);
