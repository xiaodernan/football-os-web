// Proof for the shared compact stat tile (ui/primitives.tsx's `Mini`). DataRoom's per-team tiles and
// ProfilePage's progress tiles each carried a PRIVATE `function Mini` — byte-identical JSX, only the
// `value` prop's declared type differed (number vs ReactNode). Since `value` is only ever rendered as
// `{value}`, ReactNode (the superset) is behaviour-preserving for both, so the two copies could fold
// onto one export. This is a UI component door, so it lives in ui/primitives alongside DnaCard/StatTile
// (the numeric/display doors live in lib/utils to dodge import cycles; a component has no such cycle).
//
// The census keys on `function Mini(` (the open paren is load-bearing) and the anchor is what keeps two
// look-alikes OUT of this door:
//   · StatTile (same file) is a DIFFERENT tile on purpose: it prints label FIRST, reserves a larger type
//     scale (text-[11px] label / text-2xl value), sits in a roomier px-4 py-3 card, and carries `sub` +
//     `tone`. Mini prints the value FIRST in a tighter px-2 py-1.5 box with no sub line. Folding Mini
//     into StatTile would flip the visual order and gain a line no Mini caller passes — so both tiles
//     must stay distinct and both must survive. The structural clauses measure that separation.
//   · Details.tsx's `MiniMatches` is a coincidental name, not a tile: `function Mini\(` cannot match
//     `function MiniMatches(` (no boundary before the paren), and that whole file is the concurrent
//     writer's lane — pinned as an unrelated reader, never converged.
// scripts/ is not walked, so the plants below arm the scans rather than enter the census.
// Run: node scripts/proof-mini-tile.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { Mini, StatTile } = await server.ssrLoadModule("/ui/primitives.tsx");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "ui/primitives.tsx";
// Clean screens that dropped their private Mini for the shared one.
const CONSUMERS = ["features/analytics/DataRoom.tsx", "features/profile/ProfilePage.tsx"];
// The writer's coincidental-name file — an unrelated reader, pinned, never converged.
const UNRELATED = "features/football/Details.tsx";

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["ui", "domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// Any `function Mini(` declaration — export or private. The open paren excludes MiniMatches.
const DECL_MINI = /function Mini\(/g;
const EXPORT_MINI = /export function Mini\(/g;
const PRIVATE_MINI = /(?<!export )function Mini\(/g;
const IMPORT_MINI = /import[^;]*\bMini\b[^;]*from ["']@\/ui\/primitives["']/g;
const USE_MINI = /<Mini\b/g;
// The sibling tile that must stay distinct.
const EXPORT_STAT = /export function StatTile\(/g;
const USE_STAT = /<StatTile\b/g;

// --- Plants: arm every scan so a "once" or "gone" verdict is a measurement, not an empty set. -----
const plantExport = count(`\nexport function Mini({ label, value }: { label: string }) {`, EXPORT_MINI);
const plantPrivate = count(`\nfunction Mini({ label, value }: { label: string; value: number }) {`, PRIVATE_MINI);
// A private Mini must read as private and NOT as the export; the export must NOT read as private.
const plantExportNotPrivate = count(`\nexport function Mini({ label }: { label: string }) {`, PRIVATE_MINI);
const plantImport = count(`import { Panel, Mini, Crest } from "@/ui/primitives";`, IMPORT_MINI);
const plantUse = count(`<Mini label="x" value={1} />`, USE_MINI);
const plantStat = count(`\nexport function StatTile({ label }: { label: string }) {`, EXPORT_STAT);
const plantMatches = count(`function MiniMatches({ title }: { title: string }) {`, DECL_MINI);
ok(`the seven scans are armed and MiniMatches is excluded by the open paren (export ${plantExport}, private ${plantPrivate}, export-not-private ${plantExportNotPrivate}, import ${plantImport}, use ${plantUse}, stat ${plantStat}, matches ${plantMatches})`,
  plantExport === 1 && plantPrivate === 1 && plantExportNotPrivate === 0 && plantImport === 1 && plantUse === 1 && plantStat === 1 && plantMatches === 0);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). ---
const present = CONSUMERS.concat([HOME, UNRELATED]).every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: Mini is declared exactly once in the whole tree, and only as the door's export. ---
const declByFile = carriers.filter((f) => count(src[f], DECL_MINI) > 0);
const exportByFile = carriers.filter((f) => count(src[f], EXPORT_MINI) > 0);
ok(`Mini is declared once, as the door's export, in exactly one file (home export ${count(src[HOME], EXPORT_MINI)}, tree decls ${declByFile.join(",") || "none"}, exports ${exportByFile.join(",")})`,
  count(src[HOME], EXPORT_MINI) === 1 && exportByFile.length === 1 && exportByFile[0] === HOME && declByFile.length === 1 && declByFile[0] === HOME);

// --- Convergence completeness: no consumer keeps a private Mini any more (planted private reads 1,
// so a "0 in the tree outside the door" claim is a measurement of the removed copies). --------------
const privateOutside = carriers.filter((f) => f !== HOME).reduce((s, f) => s + count(src[f], PRIVATE_MINI), 0);
const privateInHome = count(src[HOME], PRIVATE_MINI);
ok(`no module outside the door re-declares Mini privately (tree private-outside ${privateOutside}; the door itself is an export so private-in-home ${privateInHome}; planted private reads ${plantPrivate})`,
  plantPrivate === 1 && privateOutside === 0 && privateInHome === 0);

// --- Every consumer imports the shared Mini and actually renders it. ------------------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_MINI) >= 1);
const uses = CONSUMERS.map((f) => [f, count(src[f], USE_MINI)]);
ok(`both clean screens import Mini from @/ui/primitives and render it (importers ${importing.length}/${CONSUMERS.length}, per-file <Mini/> uses ${uses.map(([, n]) => n).join(",")})`,
  importing.length === CONSUMERS.length && uses.every(([, n]) => n >= 1));

// --- The door body is the compact value-first tile: tighter box than StatTile, no sub line. --------
const doorBody = (src[HOME].match(/export function Mini\([\s\S]*?\n\}/) || [""])[0];
ok(`the door body is the value-first px-2 py-1.5 tile with text-lg/text-[10px] and no sub or tone (blind spot a merged StatTile would introduce)`,
  /px-2 py-1\.5/.test(doorBody) && doorBody.indexOf("{value}") < doorBody.indexOf("{label}") &&
  /text-lg/.test(doorBody) && /text-\[10px\]/.test(doorBody) && !/\bsub\b/.test(doorBody) && !/\btone\b/.test(doorBody));

// --- Must-not-unify, StatTile: the sibling tile keeps its label-first, roomier, sub-carrying shape
// and both tiles stay live in the same screens. -----------------------------------------------------
const statBody = (src[HOME].match(/export function StatTile\([\s\S]*?\n\}/) || [""])[0];
const statIn = CONSUMERS.filter((f) => count(src[f], USE_STAT) >= 1);
ok(`StatTile survives as the distinct label-first px-4 py-3 text-2xl tile that carries sub/tone, and is still rendered beside Mini (screens ${statIn.length}/${CONSUMERS.length})`,
  /px-4 py-3/.test(statBody) && statBody.indexOf("{label}") < statBody.indexOf("{value}") && /text-2xl/.test(statBody) &&
  /\bsub\b/.test(statBody) && /\btone\b/.test(statBody) && count(src[HOME], EXPORT_STAT) === 1 && statIn.length === CONSUMERS.length);

// --- Must-not-unify, coincidental name: Details' MiniMatches is a different reader the door does not
// claim, and the open-paren anchor keeps it out of the census. --------------------------------------
const details = src[UNRELATED];
ok(`Details.tsx's MiniMatches stays a separate, un-merged reader the open-paren anchor never charges (MiniMatches uses ${count(details, /<MiniMatches\b/g)}, Mini decls ${count(details, DECL_MINI)})`,
  /function MiniMatches\(/.test(details) && count(details, DECL_MINI) === 0);

// --- Behavioural: the door is a real component that renders value-over-label; the ReactNode value
// superset means a numeric value (DataRoom) and a string value (ProfilePage) both flow unchanged. ---
const rendered = Mini({ label: "GF", value: 12 });
const renderedStr = Mini({ label: "Goals", value: "3/5" });
ok(`Mini renders the number and string value shapes through one export without throwing (${typeof rendered})`,
  rendered != null && renderedStr != null && typeof Mini === "function" && typeof StatTile === "function");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
