// M441: fold the option chip - the chip a selected option wears - into the palette.
//
// "border-primary bg-primary/10 text-primary" was written out sixteen times, in nine screens: every
// tab bar, filter row and sort chip in the app wore its own copy of it.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LITERAL = '"border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40"';

const files = [
  "features/ai/AiStudio.tsx",
  "features/community/CommunityHub.tsx",
  "features/football/FootballWorld.tsx",
  "features/learn/LearnHub.tsx",
  "features/manager/ManagerOS.tsx",
  "features/onboarding/Onboarding.tsx",
  "features/player/PlayerOS.tsx",
  "features/scouting/ScoutingPanel.tsx",
  "features/tactical/TacticalStudio.tsx",
];

let sites = 0;
for (const file of files) {
  const path = join(root, file);
  const raw = readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  const n = text.split(LITERAL).length - 1;
  sites += n;
  text = text.split(LITERAL).join("CHIP_CLASS.optionOn : CHIP_CLASS.optionOff");
  // the palette import
  if (!/import[^;]*\bCHIP_CLASS\b[^;]*from "@\/ui\/primitives"/.test(text)) {
    const m = text.match(/import \{([^}]*)\} from "@\/ui\/primitives";/);
    if (!m) { console.log(`NO IMPORT LINE: ${file}`); continue; }
    text = text.replace(m[0], `import {${m[1].replace(/\s*$/, "")}, CHIP_CLASS } from "@/ui/primitives";`);
  }
  writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}
console.log(`${sites} option chip(s) folded into the palette`);
