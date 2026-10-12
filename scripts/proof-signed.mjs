// Proof for the shared signed-display door (lib/utils.ts's `signed`). A rising rating, a film scan
// trend, a goal difference and a Manager-OS delta all show a leading `+` when the figure is
// non-negative and a plain number when it is negative. domain/review spelled that as a PRIVATE
// `signed` helper (three call sites); domain/filmInsights and the Weekly Review screen each glued
// the same `>= 0 ? "+" : ""` inline. Identical today — so no string a reader sees moves — but a sign
// convention spelled four ways that part company the moment one gains a locale or a zero-width space.
//
// The census keys on the STRUCTURAL spelling, and three shapes near each other must NOT be unified,
// which is why the anchor is load-bearing:
//   · the DOOR body is `n >= 0 ? "+" + n : String(n)` — the true arm CONCATENATES the number and the
//     false arm is String(n). An INLINE caller is `>= 0 ? "+" : ""}` where the number is glued
//     OUTSIDE by the surrounding template. The census charges `"+" : ""` (empty false arm), never the
//     door's `"+" + n :`, so the door body reads 0 sites while real inline callers read 1.
//   · the PADDED sibling (career.ts's form cell, FilmRoom's trend cell) signs a PRE-FORMATTED string
//     `… >= 0 ? "+" : ""}${x.toFixed(2)}`. signed() coerces the RAW number and would drop the two
//     decimals ("+1.50" -> "+1.5"), so these are a SEPARATE string-format concern (as M354 left the
//     UI `${…}%` sites out of pct) and must not be routed through this door.
//   · the BOOLEAN sibling (DynamicWorld's delta) is `up ? "+" : ""` — the sign comes from a boolean
//     computed elsewhere, not a numeric comparison. The `>= 0` anchor deliberately reads 0 here.
// career.ts and the ManagerOS delta are declared raw residues: their writer lanes are dirty, so their
// inline sites are pinned by file identity, not converged.
// Run: node scripts/proof-signed.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { signed } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// Clean modules that now read the raw-number door (review dropped its private helper for it).
const CONSUMERS = ["domain/review.ts", "domain/filmInsights.ts", "features/review/ReviewPage.tsx"];
// Writer-lane raw residues (dirty bytes): inline sites pinned by file identity, not converged.
const RAW_RESIDUES = ["domain/career.ts", "features/manager/ManagerOS.tsx"];
// The padded sign+toFixed(2) family: FilmRoom is clean but deliberately NOT this door; career also
// carries a padded site. Charged separately so a future "just use signed" there reddens.
const PADDED = ["domain/career.ts", "features/film/FilmRoom.tsx"];

// Walk the shipped source roots. scripts/ is NOT walked, so the plants below are the reference the
// scans are armed against, never a second charge in the census population.
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "i18n"].flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const src = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const count = (text, re) => (text.match(re) || []).length;

// The inline numeric sign-prefix: a `>= 0` comparison whose true arm is "+" and false arm is "".
// The `>= 0` anchor excludes the boolean sibling; the `: ""` arm excludes the door body (`"+" + n`).
const INLINE_SIGN = />= *0 *\? *"\+" *: *""/g;
// The padded sub-shape: the same sign ternary glued in front of `${…toFixed(2)}`.
const PADDED_SIGN = />= *0 *\? *"\+" *: *""\} *\$\{[^}]*\.toFixed\(2\)/g;
const DECL_SIGNED = /\nexport const signed[ \t]*=/g;
const PRIVATE_SIGNED = /\nconst signed[ \t]*=/g;
const IMPORT_SIGNED = /import[^;]*\bsigned\b[^;]*from ["']@\/lib\/utils["']/g;

// --- Plants: arm every scan so a "0 found" or "appears once" verdict is a measurement. ---------
const plantInline = count(`  delta: \`\${x >= 0 ? "+" : ""}\${x}\`,`, INLINE_SIGN);
// The door body must NOT read as an inline site (its true arm concatenates, false arm is String).
const plantDoorBody = count(`export const signed = (n: number): string => (n >= 0 ? "+" + n : String(n));`, INLINE_SIGN);
// The boolean sibling must NOT read as an inline site (no `>= 0` numeric comparison).
const plantBoolean = count(`  <span>{up ? "+" : ""}{delta}</span>`, INLINE_SIGN);
// The padded sibling charges both the general inline scan AND the narrower padded scan.
const plantPadded = count(`  {v >= 0 ? "+" : ""}\${v.toFixed(2)}`, PADDED_SIGN);
const plantDecl = count(`\nexport const signed = (n: number): string => (n >= 0 ? "+" + n : String(n));\n`, DECL_SIGNED);
const plantPrivate = count(`\nconst signed = (n: number) => (n >= 0 ? "+" + n : String(n));\n`, PRIVATE_SIGNED);
const plantImport = count(`import { cn, signed } from "@/lib/utils";`, IMPORT_SIGNED);
ok(`the six scans are armed and the two exclusions bite (inline ${plantInline}, door-body ${plantDoorBody}, boolean ${plantBoolean}, padded ${plantPadded}, decl ${plantDecl}, private ${plantPrivate}, import ${plantImport})`,
  plantInline === 1 && plantDoorBody === 0 && plantBoolean === 0 && plantPadded === 1 && plantDecl === 1 && plantPrivate === 1 && plantImport === 1);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). --
const subjects = CONSUMERS.concat([HOME, ...RAW_RESIDUES, ...PADDED, "features/world/DynamicWorld.tsx"]);
const present = subjects.every((p) => Object.prototype.hasOwnProperty.call(src, p));
ok(`the census walks the real source tree and every subject is inside it (${carriers.length} .ts/.tsx)`,
  carriers.length >= 80 && present);

// --- Structural: the door is declared exactly once, in lib/utils, and nowhere else. ------------
const declByFile = carriers.filter((f) => count(src[f], DECL_SIGNED) > 0);
ok(`signed is declared exactly once, in the door (home ${count(src[HOME], DECL_SIGNED)}, tree ${declByFile.join(",")})`,
  count(src[HOME], DECL_SIGNED) === 1 && declByFile.length === 1 && declByFile[0] === HOME);

// --- The retired private helper is gone tree-wide (review's byte is now an import; planted = 1). --
const privateByFile = carriers.filter((f) => count(src[f], PRIVATE_SIGNED) > 0);
ok(`no module still declares a private \`const signed\` — review imports the door instead (${count(src["domain/review.ts"], PRIVATE_SIGNED)} in review, ${privateByFile.length} tree-wide, planted private reads ${plantPrivate})`,
  plantPrivate === 1 && count(src["domain/review.ts"], PRIVATE_SIGNED) === 0 && privateByFile.length === 0);

// --- Door body: concatenates the number, false arm is String(n) — NOT the inline `"+" : ""`. -----
const signedBody = (src[HOME].match(/export const signed[\s\S]*?;/) || [""])[0];
ok(`the door body is \`n >= 0 ? "+" + n : String(n)\`, structurally distinct from an inline site so the census never charges the door`,
  /\? *"\+" *\+ *n *: *String\(n\)/.test(signedBody) && !/\? *"\+" *: *""/.test(signedBody) && signedBody.length > 20);

// --- Every consumer imports the door. ----------------------------------------------------------
const importing = CONSUMERS.filter((f) => count(src[f], IMPORT_SIGNED) >= 1);
ok(`all three clean modules import signed from @/lib/utils (${importing.length}/${CONSUMERS.length}: ${importing.join(", ")})`,
  importing.length === CONSUMERS.length);

// --- No inline numeric sign survives in a converged consumer (planted inline = 1, so the 0 bites).
const consumerInline = CONSUMERS.map((f) => [f, count(src[f], INLINE_SIGN)]);
ok(`none of the three consumers still glues the numeric sign inline (read ${consumerInline.map(([, n]) => n).join(",")}; planted inline reads ${plantInline})`,
  plantInline === 1 && consumerInline.every(([, n]) => n === 0));

// --- The boolean sibling is NOT swept by this door's census (the `>= 0` anchor is load-bearing). --
ok(`the DynamicWorld boolean delta (up ? "+" : "") reads 0 under the numeric sign scan so it is not silently charged (${count(src["features/world/DynamicWorld.tsx"], INLINE_SIGN)}; planted boolean reads ${plantBoolean})`,
  plantBoolean === 0 && count(src["features/world/DynamicWorld.tsx"], INLINE_SIGN) === 0);

// --- Completeness: the ONLY files still carrying the numeric inline sign are the pinned residues
// and the clean padded sibling (career, ManagerOS raw writer lanes; FilmRoom padded). No site is a
// raw clean consumer — those all moved to signed().
const inlineByFile = carriers.filter((f) => count(src[f], INLINE_SIGN) > 0).sort();
const expectedInline = [...new Set(RAW_RESIDUES.concat(PADDED))].sort();
ok(`the files still spelling the numeric sign inline are exactly the pinned residues + the padded sibling (${inlineByFile.join(",")})`,
  inlineByFile.length === expectedInline.length && inlineByFile.every((f, i) => f === expectedInline[i]));

// --- Raw writer residues carry >= 1 inline sign each, charged by identity not line. --------------
const rawInline = RAW_RESIDUES.map((f) => [f, count(src[f], INLINE_SIGN)]);
ok(`each raw residue still carries at least one inline sign site, not converged (${rawInline.map(([, n]) => n).join(",")})`,
  rawInline.every(([, n]) => n >= 1));

// --- Padded family: career AND FilmRoom each carry the sign+toFixed(2) sub-shape the door must not
// absorb. The padded count charges ONLY the toFixed(2) sites, so a raw site (career's gd, ManagerOS)
// does not satisfy it — the padded clause proves the padded family survives on its own terms.
const paddedCount = PADDED.map((f) => [f, count(src[f], PADDED_SIGN)]);
ok(`the padded sign+toFixed(2) family still stands in career and FilmRoom, charged separately from the raw door (${paddedCount.map(([, n]) => n).join(",")})`,
  plantPadded === 1 && paddedCount.every(([, n]) => n >= 1));

// --- Must-not-unify, behavioural: signed() coerces the RAW number, so it cannot serve a padded site.
const paddedForm = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
ok(`signed() and the padded sibling disagree on a shared value so they cannot be silently unified (signed(1.5)="${signed(1.5)}" vs padded="${paddedForm(1.5)}")`,
  signed(1.5) === "+1.5" && paddedForm(1.5) === "+1.50" && signed(1.5) !== paddedForm(1.5));

// --- Behavioural: the shipped door reproduces the inline formula on the raw values the sites pass.
const VALUES = [0, 1, -1, 2.5, -2.5, 15, -8, -0, 0.75, 100, -0.001, 3];
const inlineOf = (n) => `${n >= 0 ? "+" : ""}${n}`;
const agrees = VALUES.every((n) => signed(n) === inlineOf(n));
ok(`signed(n) equals \`\${n >= 0 ? "+" : ""}\${n}\` for every raw value the sites pass (${VALUES.length} values), incl zero→"${signed(0)}", negative→"${signed(-2.5)}", float→"${signed(2.5)}"`,
  agrees && VALUES.length >= 8 && signed(0) === "+0" && signed(-2.5) === "-2.5" && signed(2.5) === "+2.5");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
