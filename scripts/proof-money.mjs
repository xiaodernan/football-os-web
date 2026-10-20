// Proof for the app's ONE money door.
//
// The defect class M401 closes: the app states its money convention in two places' prose --
// domain/career.ts:617 "The season prize total prints through the app's one `formatValue`, not
// a private copy" and domain/compare.ts:146 "the value row prints money through the app's one
// `formatValue`, not a local copy" -- and a THIRD private copy survived in domain/worldEngine.ts
// anyway. That copy was the one with the reader-visible defect: it had NO K branch, so a squad
// worth €400K read "€0M" and one worth €500K read "€1M" -- a figure that says ZERO where the
// value is not zero. It also quoted the billions at two decimals and the millions at none, so
// the same currency read three different ways on one screen.
//
// The census below charges the door's UNIQUENESS (a compact-magnitude euro template may exist
// in exactly one function in the tree, and it must be the shared door), the door's per-branch
// conventions (pinned by exact reading, because "€0M" is a reading and not an absence), and
// the fact that the world screen now reads the shared door -- with the tile's first-paint text
// computed the way the screen computes it.
//
// Run: node scripts/proof-money.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-money-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});
const { formatValue } = await server.ssrLoadModule("/data/footballService.ts");
const SVC = await server.ssrLoadModule("/data/footballService.ts");
const { sum } = await server.ssrLoadModule("/domain/attributes.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "data/footballService.ts";
const DOOR_NAME = "formatValue";
const SCREEN = "features/world/DynamicWorld.tsx";
const ENGINE = "domain/worldEngine.ts";
// The private copy this unit removed. Its NAME is charged too: a copy that survived under a
// different spelling would still be a copy, and a reader of the tree must not find it.
const PRIVATE = "formatMarket";

// A compact-magnitude euro: a euro, an interpolation that DIVIDES by a magnitude scale, and a
// K/M/B suffix. This is the shape of a money formatter and nothing else -- a plain euro
// (`€${v}`) has no scale, and a euro label without a division (`€{maxValue}M`) is a caption.
const MAG = /(?:1_000_000_000|1_000_000|1_000|1e9|1e6|1e3)/;
const COMPACT = new RegExp("€\\$\\{[^}]*\\/[^}]*" + MAG.source + "[^}]*\\}[KMB]", "g");
const CALL = new RegExp("\\b" + DOOR_NAME + "\\s*\\(", "g");
const DECL = new RegExp("export function " + DOOR_NAME + "\\s*\\(");

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const n = (text, re) => (text.match(re) || []).length;
// A function head, and the body that belongs to it: the brace-matched span that follows.
const FN_HEAD = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)[^{]*\{|const\s+(\w+)\s*=\s*(?:\([^)]*\)|[\w]+)\s*=>\s*(?:[^{]*\{)?/g;
const bodies = (text) => {
  const out = [];
  for (const h of text.matchAll(FN_HEAD)) {
    const start = h.index + h[0].length;
    let depth = 1, i = start;
    while (i < text.length && depth > 0) { if (text[i] === "{") depth++; else if (text[i] === "}") depth--; i++; }
    out.push({ name: h[1] || h[2], body: text.slice(start, i) });
  }
  return out;
};

// --- 1. Plants: arm the scan, and prove it refuses the two shapes it must not charge. --------
const pPrivate = n("return `€${(v / 1_000_000).toFixed(0)}M`;", COMPACT);
const pPrivateB = n("return `€${fmt2(v / 1_000_000_000)}B`;", COMPACT);
const pPlain = n("return `€${v}`;", COMPACT);
const pCaption = n("return <span>€{maxValue}M</span>;", COMPACT);
const pCall = n("const s = formatValue(p.value);", CALL);
ok(`the scans are armed and the compact-magnitude shape is what draws the line (planted private copy ${pPrivate}/${pPrivateB}, a plain euro ${pPlain}, a euro caption without a division ${pCaption}, a door call ${pCall})`,
  pPrivate === 1 && pPrivateB === 1 && pPlain === 0 && pCaption === 0 && pCall === 1);

// --- 2. Population floor + subject presence. -------------------------------------------------
const subjects = [HOME, SCREEN, ENGINE, "domain/career.ts", "domain/compare.ts"]
  .every((p) => Object.prototype.hasOwnProperty.call(raw, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx, floor 90)`,
  carriers.length >= 90 && subjects);

// --- 3. THE DOOR IS UNIQUE: exactly one function in the tree carries a compact-magnitude euro,
// --- and it is the shared door. This is the clause that would have caught the survivor. -------
const holders = [];
for (const f of carriers) {
  for (const b of bodies(raw[f])) {
    if (n(b.body, COMPACT) > 0) holders.push([f, b.name, n(b.body, COMPACT)]);
  }
}
const holderFiles = [...new Set(holders.map(([f]) => f))];
ok(`the money door is UNIQUE: exactly one function in the whole tree carries a compact-magnitude euro, and it is the shared door (${holders.length} holder(s) [${holders.map(([f, nm, c]) => `${f}:${nm}=${c}`).join(", ")}]; the private copy is gone)`,
  holders.length === 1 && holders[0][0] === HOME && holders[0][1] === DOOR_NAME && holderFiles.length === 1);

// --- 4. The private copy is gone by NAME too: a copy that survived under a different spelling
// --- would still be a copy, and the tree must not name it. The name is looked for in CODE --
// --- the module that carried it records the removal in a comment, and a comment that names
// --- the thing it removed is the record of the removal, not a second copy. ------------------
const codeOnly = (f) => raw[f].split(/\r?\n/)
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l) && !/\*\//.test(l)).join("\n");
const privateSites = carriers.filter((f) => codeOnly(f).includes(PRIVATE));
ok(`the private copy is gone by name as well as by shape (${PRIVATE} appears in ${privateSites.length} file(s) of CODE [${privateSites.join(",")}]; the module that carried it names it only in the comment that records its removal)`,
  privateSites.length === 0);

// --- 5. THE K BRANCH EXISTS -- the defect this unit closes. A squad worth €400K read "€0M"
// --- and one worth €500K read "€1M"; the shared door reads them. The plant is a door WITHOUT
// --- the K branch, and it must read "€0M" -- that is what the old copy did. -------------------
const oldCopy = (v) => `€${Math.round(v / 1_000_000)}M`;
ok(`the K branch is there: the door reads a small total as a small total, not as zero (formatValue(400000) = "${formatValue(400000)}", formatValue(500000) = "${formatValue(500000)}", formatValue(999) = "${formatValue(999)}"; the old private copy read "${oldCopy(400000)}" and "${oldCopy(500000)}" — a figure that says ZERO where the value is not zero)`,
  formatValue(400000) === "€400K" && formatValue(500000) === "€500K" && formatValue(999) === "€999" &&
  oldCopy(400000) === "€0M" && oldCopy(500000) === "€1M");

// --- 6. The door's per-branch conventions, pinned by exact reading. ---------------------------
const branches = [
  [1_500_000_000, "€1.5B"], [2_170_000_000, "€2.2B"],
  [1_000_000, "€1.0M"], [9_500_000, "€9.5M"], [10_000_000, "€10M"], [553_400_000, "€553M"],
  [1_000, "€1K"], [999, "€999"], [0, "€0"],
];
const branchMiss = branches.filter(([v, want]) => formatValue(v) !== want);
ok(`the door's per-branch conventions are pinned by exact reading: billions at ONE decimal, millions conditional on €10M (one below, none at or above), thousands at zero, and the raw euro below a thousand (${branches.length} pins, ${branchMiss.length} miss [${branchMiss.map(([v, w]) => `${v} wanted ${w} got ${formatValue(v)}`).join("; ")}])`,
  branchMiss.length === 0 && branches.length === 9);

// --- 7. The world screen reads the shared door, and its market tile's first paint is the
// --- door's reading of the world's own total -- computed the way the screen computes it. -----
const worldPlayers = SVC.footballProvider.players();
const marketNow = sum(worldPlayers, (p) => p.value);
const marketReading = formatValue(marketNow);
const screenSrc = raw[SCREEN];
ok(`the world screen reads the shared door and its market tile prints the door's reading of the world's own total (${worldPlayers.length} players -> ${Math.round(marketNow)} -> "${marketReading}"; the screen names ${DOOR_NAME} ${n(screenSrc, CALL)}x and the private copy 0x; the old private copy would have printed "${oldCopy(marketNow)}")`,
  n(screenSrc, CALL) >= 1 && !screenSrc.includes(PRIVATE) && marketReading === "€86.0B" && oldCopy(marketNow) === "€86030M");

// --- 8. Every money reader reads the ONE door: the reader set is derived from the tree, and
// --- the world screen is now one of them. A reader is a file that NAMES the door -- including
// --- one that hands it as a value (domain/compare.ts's `display: formatValue`), which a
// --- call-parenthesis scan would miss. A second formatter would show up as a second reader
// --- of something else, and clause 3 already holds the shape count at one. -----------------
const NAME = new RegExp("\\b" + DOOR_NAME + "\\b", "g");
const readers = carriers.filter((f) => n(codeOnly(f), NAME) > 0).sort();
const doorFile = HOME;
const readersOutside = readers.filter((f) => f !== doorFile);
ok(`every money reader reads the one door, and the world screen is one of them (${readers.length} readers [${readers.join(",")}]; ${readersOutside.length} outside the door's own file; the world screen among them: ${readers.includes(SCREEN) ? "yes" : "no"}; the value-handed reader domain/compare.ts: ${readers.includes("domain/compare.ts") ? "counted" : "MISSED"})`,
  readers.includes(SCREEN) && readers.includes("domain/compare.ts") && readersOutside.length === 10 && readers.length === 11);

// --- 9. The app's WORDS and the code agree: the two prose claims still name the one door, and
// --- the module that used to carry the copy now says why it is gone. -------------------------
const careerSrc = raw["domain/career.ts"];
const compareSrc = raw["domain/compare.ts"];
const engineSrc = raw[ENGINE];
ok(`the app's words and the code agree: both prose claims still name the one door, and the module that carried the copy says so (career.ts names ${n(careerSrc, /the app's one `formatValue`/g)}, compare.ts names ${n(compareSrc, /the app's one `formatValue`/g)}, the engine declares ${n(engineSrc, /export function formatMarket/g)} money formatter(s) and records the removal in ${n(engineSrc, /M401/g)})`,
  n(careerSrc, /the app's one `formatValue`/g) === 1 && n(compareSrc, /the app's one `formatValue`/g) === 1 &&
  n(engineSrc, /export function formatMarket/g) === 0 && n(engineSrc, /M401/g) >= 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
