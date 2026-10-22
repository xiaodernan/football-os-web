// M442: the BADGE family - a border and a word of one colour, with no wash.
//
// The app spells these out too: the same amber badge in seven places (the community hub's three
// size-10 badges, the film room's confidence badge, the detail page's two badges and the player
// screen's demo-confidence badge), the same green badge in five (the detail page's two, the
// learning hub's, the profile page's inactive goal and the dynamic world's), the same stronger
// amber badge in two (the dashboard's and the transfer centre's neutral stance) and one of each of
// the rest.
//
// The fold puts them in the palette beside the chips. The census (proof-chips) grows a fourth
// shape: a badge is a border and a word of ONE colour, with no wash.
//
// Run it against the tree that has M441 landed.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const edits = [];
const E = (file, from, to) => edits.push({ file, from, to });

// The palette grows the badge family.
E("ui/primitives.tsx",
  '  // The muted chips: a border and a word, with no colour of their own.',
  '  // The badges: a border and a word of ONE colour, with no wash of their own. The amber badge\n' +
  '  // alone was written out in seven places and the green one in five.\n' +
  '  badgeSuccess: "border-success/40 text-success",\n' +
  '  badgeWarning: "border-warning/40 text-warning",\n' +
  '  badgePrimary: "border-primary/40 text-primary",\n' +
  '  badgeWarningStrong: "border-warning/50 text-warning",\n' +
  '  badgeSuccessStrong: "border-success/50 text-success",\n' +
  '  badgeInfoStrong: "border-info/50 text-info",\n' +
  '  // The muted chips: a border and a word, with no colour of their own.');

// The sites.
E("features/community/CommunityHub.tsx", '"border-warning/40 text-[10px] text-warning"', 'CHIP_CLASS.badgeWarning');
E("features/film/FilmRoom.tsx", '"border-warning/40 text-warning"', 'CHIP_CLASS.badgeWarning');
E("features/football/Details.tsx", '"border-success/40 text-success"', 'CHIP_CLASS.badgeSuccess');
E("features/football/Details.tsx", '"border-warning/40 text-warning"', 'CHIP_CLASS.badgeWarning');
E("features/learn/LearnHub.tsx", '"border-success/40 text-success"', 'CHIP_CLASS.badgeSuccess');
E("features/profile/ProfilePage.tsx", '"border-success/40 text-success"', 'CHIP_CLASS.badgeSuccess');
E("features/world/DynamicWorld.tsx", '"border-success/40 text-success"', 'CHIP_CLASS.badgeSuccess');
E("features/player/PlayerOS.tsx", '"border-warning/40 text-warning"', 'CHIP_CLASS.badgeWarning');
E("features/dashboard/Dashboard.tsx", '"border-warning/50 text-warning"', 'CHIP_CLASS.badgeWarningStrong');
E("features/transfers/TransferCentre.tsx", '"border-warning/50 text-warning"', 'CHIP_CLASS.badgeWarningStrong');
E("features/transfers/TransferCentre.tsx", '"border-success/50 text-success"', 'CHIP_CLASS.badgeSuccessStrong');
E("features/transfers/TransferCentre.tsx", '"border-info/50 text-info"', 'CHIP_CLASS.badgeInfoStrong');
E("features/sim/SimulationLab.tsx", '"border-primary/40 text-primary"', 'CHIP_CLASS.badgePrimary');

// The census grows the fourth shape: a badge is a border and a word of one colour, with no wash.
E("scripts/proof-chips.mjs",
  '  // The muted chip: the border colour and the muted word.\n  if (border && word && border.colour === "border" && word.colour === "muted-foreground") return "muted";',
  '  // The muted chip: the border colour and the muted word.\n' +
  '  if (border && word && border.colour === "border" && word.colour === "muted-foreground") return "muted";\n' +
  '  // The badge: a border and a word of ONE colour, with no wash of its own.\n' +
  '  if (border && word && border.colour === word.colour && !wash) return "badge";');

// The imports the screens need.
const IMPORTS = [
  ["features/community/CommunityHub.tsx",
    'import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/film/FilmRoom.tsx",
    'import { Panel, SectionTitle, EmptyState, LoadingBlock, ErrorState, DemoBadge, DELTA_CLASS, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/learn/LearnHub.tsx",
    'import { Panel, SectionTitle, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/profile/ProfilePage.tsx",
    'import { Panel, SectionTitle, StatTile, Mini, Crest, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/dashboard/Dashboard.tsx",
    'import { Panel, SectionTitle, Crest, PositionTag, AttributeBar, EmptyState, CHIP_CLASS, ZONE_CLASS } from "@/ui/primitives";'],
  ["features/transfers/TransferCentre.tsx",
    'import { Panel, Crest, PositionTag, EmptyState, StatTile, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
];
for (const [file, line] of IMPORTS) E(file, line, line);

// The files that still need the palette in their import line.
for (const [file, from, to] of [
  ["features/football/Details.tsx", 'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";',
    'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/world/DynamicWorld.tsx", 'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";',
    'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
  ["features/player/PlayerOS.tsx",
    'import { Panel, SectionTitle, StatTile, AttributeBar, DnaCard, EmptyState, LoadingBlock, ErrorState, CHIP_CLASS, ZONE_CLASS } from "@/ui/primitives";',
    'import { Panel, SectionTitle, StatTile, AttributeBar, DnaCard, EmptyState, LoadingBlock, ErrorState, CHIP_CLASS, ZONE_CLASS } from "@/ui/primitives";'],
  ["features/sim/SimulationLab.tsx", 'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge } from "@/ui/primitives";',
    'import { Panel, SectionTitle, StatTile, EmptyState, DemoBadge, CHIP_CLASS } from "@/ui/primitives";'],
]) E(file, from, to);

const byFile = new Map();
for (const e of edits) {
  if (!byFile.has(e.file)) byFile.set(e.file, []);
  byFile.get(e.file).push(e);
}
let bad = 0;
for (const [file, list] of byFile) {
  const path = join(root, file);
  const raw = readFileSync(path, "utf8");
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  for (const e of list) {
    const n = text.split(e.from).length - 1;
    if (n === 0) { console.log(`MISS ${file}: ${JSON.stringify(e.from.slice(0, 60))}`); bad++; continue; }
    text = text.split(e.from).join(e.to);
  }
  writeFileSync(path, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
}
console.log(bad ? `${bad} replacement(s) missed` : "every replacement applied");
