// M442: the badge family - a border and a word of one colour, with no wash.
//
// The amber badge ("border-warning/40 text-warning") was written out in seven places, the green one
// ("border-success/40 text-success") in five, and the stronger amber one in two. This folds them into
// the palette beside the chips, replacing the badge's own classes with the palette's entry and
// keeping every other class the site wore.
//
// The class SET is unchanged: the badge's classes move to the end of the list, and CSS does not read
// the order of a class attribute, so nothing is painted differently.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The badge's own classes, and the palette entry that wears them.
const BADGES = {
  "border-warning/40 text-warning": "badgeWarning",
  "border-success/40 text-success": "badgeSuccess",
  "border-warning/50 text-warning": "badgeWarningStrong",
  "border-info/50 text-info": "badgeInfoStrong",
  "border-success/50 text-success": "badgeSuccessStrong",
  "border-primary/40 text-primary": "badgePrimary",
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

let folded = 0;
let missed = 0;
for (const file of files) {
  const path = join(root, file);
  const raw = readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");

  // Every class attribute that carries a badge.
  text = text.replace(/className="([^"]*)"/g, (whole, classes) => {
    const tokens = classes.split(/\s+/).filter(Boolean);
    const badge = Object.entries(BADGES).find(([spec]) => tokens.includes(spec));
    if (!badge) return whole;
    const [spec, entry] = badge;
    const rest = tokens.filter((t) => !spec.split(" ").includes(t));
    folded++;
    return `className={cn("${rest.join(" ")}", CHIP_CLASS.${entry})}`;
  });

  // the palette import
  if (!/import[^;]*\bCHIP_CLASS\b[^;]*from "@\/ui\/primitives"/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from "@\/ui\/primitives";/);
    if (m) text = text.replace(m[0], `import {${m[1].replace(/\s*$/, "")}, CHIP_CLASS } from "@/ui/primitives";`);
    else { console.log(`NO IMPORT LINE: ${file}`); missed++; }
  }
  // the cn import
  if (!/import[^;]*\bcn\b[^;]*from "@\/lib\/utils"/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from "@\/lib\/utils";/);
    if (m) text = text.replace(m[0], `import { cn, ${m[1].replace(/\s*$/, "")} } from "@/lib/utils";`);
    else { console.log(`NO CN IMPORT: ${file}`); missed++; }
  }
  writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}
console.log(`${folded} badge(s) folded into the palette (${missed} import(s) missing)`);
