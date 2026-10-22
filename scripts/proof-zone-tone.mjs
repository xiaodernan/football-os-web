// Proof for the load-zone ↔ chip contract (ui/primitives.tsx's ZONE_CLASS). The dashboard's
// recovery chip, the /load banner and the player screen's load row each used to retype a
// `Record<LoadZone, string>` of Tailwind classes; the four ACTION rows (under/optimal/caution/
// high) were byte-identical across all three, so an edit on one screen would quietly make it
// disagree with the other two about what a zone looks like. They share one door.
//
// M441 moved that door. It used to be domain/load.ts's `ZONE_TONE`, and the reason it could not
// stay there is the reason this proof now reads the UI: a DOMAIN module that hands a screen a
// Tailwind class string knows the app's colours, so it can disagree with the UI about them. The
// domain says what a zone MEANS (its type, its thresholds, its advice); the UI says what the zone
// WEARS, and the palette it wears from is the app's one table of chips (ui/primitives.tsx).
//
// This script independently re-derives the seam the way the M345 comparator census does — a
// one-declaration scan, a LoadZone-KEYED signature scan over the whole source tree (never the bare
// class string, which legitimate non-zone maps reuse), an import/spread check on the three
// consumers, and two behavioural clauses that ask the SHIPPED ZONE_CLASS object for the classes
// every screen renders. The `none` state is deliberately excluded from the door and this proof
// PINS that the /load banner's none differs from the two chips', so a future "unify them" reddens
// instead of flattening a real presentational choice.
// Run: node scripts/proof-zone-tone.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { ZONE_CLASS } = await server.ssrLoadModule("/ui/primitives.tsx");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "ui/primitives.tsx";
const CONSUMERS = ["features/dashboard/Dashboard.tsx", "features/load/LoadPage.tsx", "features/player/PlayerOS.tsx"];

// The four action rows, exactly as every screen rendered them before the door. These live in this
// proof file (under scripts/, which the tree walk below never enters), so they are the reference
// the shipped object is checked against, not a second copy in the app.
const EXPECTED = {
  under: "border-primary/40 bg-primary/10 text-primary",
  optimal: "border-success/40 bg-success/10 text-success",
  caution: "border-warning/40 bg-warning/10 text-warning",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
};

// Walk the shipped source roots. The census charges the LoadZone-KEYED line (`optimal:` / `caution:`
// + the chip it names), never the bare class string: ReviewPage/HistoryPage/newsImpact reuse the
// same Tailwind tokens under keys that are not zones, so a literal-string census would over-charge
// the way a reverse-comparator census would.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n", "ui"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));

const SIGS = [
  /optimal:[ \t]*CHIP_CLASS\.success/g,
  /caution:[ \t]*CHIP_CLASS\.warning/g,
];
const DECL = /\nexport const ZONE_CLASS[ \t]*[:=]/g;
const count = (text, re) => (text.match(re) || []).length;
const carriersOf = (re) => carriers.filter((f) => count(src[f], re) > 0);

// --- Plants: arm every scan so a "0 found" or "appears once" verdict is a measurement. ---------
// Each signature must read 1 in a synthetic action-row block; a lone `export const ZONE_CLASS`
// decl must read 1; and a consumer-style import line must read 1. If any plant reads 0 the scan is
// blind and the clauses below would pass vacuously.
const synthBlock = `  optimal: CHIP_CLASS.success,\n  caution: CHIP_CLASS.warning,`;
const plants = SIGS.map((re) => count(synthBlock, re));
const plantDecl = count(`\nexport const ZONE_CLASS: Record<X, string> = {};`, DECL);
const plantImport = count(`import { ZONE_CLASS } from "@/ui/primitives";`, /import[^;]*\bZONE_CLASS\b[^;]*from ["']@\/ui\/primitives["']/g);
ok(`the four scans are armed (sigs ${plants.join(",")}, decl ${plantDecl}, import ${plantImport})`,
  plants.every((n) => n === 1) && plantDecl === 1 && plantImport === 1);

// --- Structural: one declaration, and the action signatures live in exactly one file. ---------
const sigCarriers = SIGS.map(carriersOf);
ok(`ZONE_CLASS is declared exactly once, in the door, and no screen re-declares it (home ${count(src[HOME], DECL)}, consumers ${CONSUMERS.map((f) => count(src[f], DECL).toString()).join(",")})`,
  count(src[HOME], DECL) === 1 && CONSUMERS.every((f) => count(src[f], DECL) === 0));
ok(`each LoadZone-keyed action signature appears in the whole tree exactly once, inside the door (${sigCarriers.map((c) => c.join(",")).join(" | ")})`,
  sigCarriers.every((c) => c.length === 1 && c[0] === HOME));
ok(`no file outside the door retypes an action row (${SIGS.map((re) => carriers.filter((f) => f !== HOME && count(src[f], re) > 0)).flat().join(", ") || "none"})`,
  SIGS.every((re) => carriers.filter((f) => f !== HOME && count(src[f], re) > 0).length === 0));

// --- Every consumer reads the door. ---------------------------------------------------------
const imports = CONSUMERS.filter((f) => /import[^;]*\bZONE_CLASS\b[^;]*from ["']@\/ui\/primitives["']/.test(src[f]));
const spreads = CONSUMERS.filter((f) => /\.\.\.ZONE_CLASS\b/.test(src[f]));
ok(`all three zone screens import ZONE_CLASS from @/ui/primitives and spread it (${imports.join(", ")} / ${spreads.join(", ")})`,
  imports.length === CONSUMERS.length && spreads.length === CONSUMERS.length &&
    CONSUMERS.every((f) => imports.includes(f) && spreads.includes(f)));

// --- Behavioural: the shipped object is what the screens render. ----------------------------
ok(`the shipped ZONE_CLASS yields the four classes every screen renders, has exactly four keys, and omits none`,
  ["under", "optimal", "caution", "high"].every((z) => ZONE_CLASS[z] === EXPECTED[z]) &&
    Object.keys(ZONE_CLASS).length === 4 && ZONE_CLASS.none === undefined);

// Each screen composes { none: <its own>, ...ZONE_CLASS }; reconstruct it and confirm an action zone
// still resolves to the shared class while none resolves to the screen's local row. The door holds
// four rows, so the composed object must hold exactly five — that positive floor makes this clause
// fail on a blind read rather than pass because the compose returned nothing.
const compose = (none) => ({ none, ...ZONE_CLASS });
const composed = compose("border-border bg-secondary/30 text-muted-foreground");
ok(`composing a caller's none over the door keeps both halves intact (banner caution=shared, none=local, 5 rows)`,
  composed.caution === EXPECTED.caution &&
    composed.none === "border-border bg-secondary/30 text-muted-foreground" &&
    Object.keys(composed).length === 5);

// --- The must-not-unify pin: the banner's none differs from the chips'. ---------------------
// The floor that every consumer parsed a non-empty none row makes this fail when the `none:` reader
// is blind: an unparsed consumer yields "" and the clause reddens instead of quietly comparing
// three empties. The row names a chip in the palette, and the palette is the SHIPPED one, so the
// comparison is against the classes the screens actually wear.
const { CHIP_CLASS } = await server.ssrLoadModule("/ui/primitives.tsx");
const noneRowOf = (f) => (src[f].match(/none:[ \t]*CHIP_CLASS\.(\w+)/) || [, ""])[1];
const noneOf = Object.fromEntries(CONSUMERS.map((f) => [f, noneRowOf(f)]));
const noneClass = Object.fromEntries(CONSUMERS.map((f) => [f, CHIP_CLASS[noneOf[f]] ?? ""]));
ok(`the none-state divergence is preserved — the /load banner carries a secondary fill the chips do not (banner "${noneClass[CONSUMERS[1]]}" vs chip "${noneClass[CONSUMERS[0]]}")`,
  Object.values(noneOf).every((v) => v.length > 0) &&
    Object.values(noneClass).every((v) => v.length > 0) &&
    noneClass[CONSUMERS[1]].includes("bg-secondary/30") &&
    !noneClass[CONSUMERS[0]].includes("bg-secondary/30") &&
    !noneClass[CONSUMERS[2]].includes("bg-secondary/30"));

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
