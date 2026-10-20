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
//   · the PADDED sibling signs a PRE-FORMATTED string `… >= 0 ? "+" : ""}${x.toFixed(2)}`. signed()
//     coerces the RAW number and would drop the two decimals ("+1.50" -> "+1.5"), so these are a
//     SEPARATE string-format concern (as M354 left the UI `${…}%` sites out of pct). M393 gave them
//     their OWN `signed2` door and folded FilmRoom's trend cell onto it; M399 folded the last hand-
//     spelled cell (career.ts's form var), so the padded spelling now survives in exactly ONE place —
//     signed2's own body line — which this census charges as a door, never as a stray.
//   · the BOOLEAN sibling (DynamicWorld's delta) is `up ? "+" : ""` — the sign comes from a boolean
//     computed elsewhere, not a numeric comparison. The `>= 0` anchor deliberately reads 0 here.
// M364 converged the last two raw residues (career.ts's goal-difference cell and the ManagerOS delta
// readout), so no raw inline site survives anywhere; a clause charges both former lanes zero-and-imports.
// Run: node scripts/proof-signed.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { signed, signed2 } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
// Clean modules that now read the raw-number door (review dropped its private helper for it).
const CONSUMERS = ["domain/review.ts", "domain/filmInsights.ts", "features/review/ReviewPage.tsx"];
// Former raw writer residues, now converged: both read the door, so a re-inline reddens.
const FORMER_RAW = ["domain/career.ts", "features/manager/ManagerOS.tsx"];
// The padded-family cells, both sent to the SIBLING `signed2` door (FilmRoom at M393, career at M399).
// Both must read ZERO padded spellings under this door's scans — a future "just use signed" at either
// site reddens this census, because signed() would drop the two-decimal pad the reader is shown.
const PADDED_SITES = ["domain/career.ts", "features/film/FilmRoom.tsx"];

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
// The SIBLING door must not be charged as this one: `signed2` declares a different name, so neither
// the public nor the private declaration scan may read it, and an import list that names only the
// sibling must not satisfy this door's import scan either.
const plantSiblingDecl = count(`\nexport const signed2 = (v: number): string => \`\${v}\`;\n`, DECL_SIGNED);
const plantSiblingPrivate = count(`\nconst signed2 = (v: number) => \`\${v}\`;\n`, PRIVATE_SIGNED);
const plantSiblingImport = count(`import { cn, signed2 } from "@/lib/utils";`, IMPORT_SIGNED);
ok(`the seven scans are armed and the three exclusions bite (inline ${plantInline}, door-body ${plantDoorBody}, boolean ${plantBoolean}, padded ${plantPadded}, decl ${plantDecl}, private ${plantPrivate}, import ${plantImport}) while the sibling door reads nothing (decl ${plantSiblingDecl}, private ${plantSiblingPrivate}, import ${plantSiblingImport})`,
  plantInline === 1 && plantDoorBody === 0 && plantBoolean === 0 && plantPadded === 1 && plantDecl === 1 && plantPrivate === 1 && plantImport === 1 &&
  plantSiblingDecl === 0 && plantSiblingPrivate === 0 && plantSiblingImport === 0);

// --- Population floor + subject presence (a blind walk reads 0 and would pass a negative claim). --
const subjects = CONSUMERS.concat([HOME, ...FORMER_RAW, ...PADDED_SITES, "features/world/DynamicWorld.tsx"]);
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
// The extraction anchors on `signed` FOLLOWED BY ITS ASSIGNMENT, so the `signed2` sibling declared
// under the same prefix can never be the line this clause reads (a prefix-only match would grab the
// sibling first if it were ever reordered above this door, and the pad it glues would read as a
// `"+" : ""` arm — a false red this proof must not be able to produce).
const bodyOf = (t) => (t.match(/export const signed[ \t]*=[\s\S]*?;/) || [""])[0];
const signedBody = bodyOf(src[HOME]);
const pBodyBoth = bodyOf(['export const signed2 = (v: number): string => `${v >= 0 ? "+" : ""}${v}`;', 'export const signed = (n: number): string => (n >= 0 ? "+" + n : String(n));'].join("\n"));
ok(`the door body is \`n >= 0 ? "+" + n : String(n)\`, structurally distinct from an inline site, and the sibling declared above it is not the body read (sibling-first extraction grabbed ${/signed2/.test(pBodyBoth) ? "signed2" : "signed"}; planted body "${pBodyBoth.trim().slice(0, 46)}…")`,
  /\? *"\+" *\+ *n *: *String\(n\)/.test(signedBody) && !/\? *"\+" *: *""/.test(signedBody) && signedBody.length > 20 &&
  !/signed2/.test(pBodyBoth) && /\? *"\+" *\+ *n/.test(pBodyBoth));

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

// --- Completeness: the numeric sign ternary now survives in EXACTLY ONE file — the door. Before ---
// --- M399 it survived in two: the door plus career.ts's hand-spelled padded cell, which was charged ---
// --- by identity because its carrier was mid-flight in another lane. That excuse is spent: the cell ---
// --- reads the door, so the set is pinned to lib/utils alone. A third spelling anywhere, OR a ---
// --- re-inline of career's cell, reddens this set. ---
const inlineByFile = carriers.filter((f) => count(src[f], INLINE_SIGN) > 0).sort();
const expectedInline = [HOME];
const plantRawSurvivor = count(`  delta: \`\${x >= 0 ? "+" : ""}\${x}\`,`, INLINE_SIGN);
ok(`the numeric sign ternary survives only in the door — no consumer spells it by hand (carriers ${inlineByFile.join(",")}; expected ${expectedInline.join(",")}; planted raw reads ${plantRawSurvivor})`,
  plantRawSurvivor === 1 && inlineByFile.length === expectedInline.length && inlineByFile.every((f, i) => f === expectedInline[i]));

// --- The former raw residues carry ZERO raw (non-padded) inline sign sites — both read the door.
// After M399 they carry ZERO inline sites at all; rawOnly staying 0 with the padded count also 0 is
// what keeps this clause a raw-sign claim rather than a restatement of the padded census below.
const rawOnly = (f) => count(src[f], INLINE_SIGN) - count(src[f], PADDED_SIGN);
const formerRawInline = FORMER_RAW.map((f) => [f, rawOnly(f)]);
const formerRawImports = FORMER_RAW.filter((f) => count(src[f], IMPORT_SIGNED) >= 1);
ok(`both former raw residues re-inlined nothing raw and import signed instead (raw ${formerRawInline.map(([, n]) => n).join(",")}; importers ${formerRawImports.length}/${FORMER_RAW.length}: ${formerRawImports.join(", ")})`,
  formerRawInline.every(([, n]) => n === 0) && formerRawImports.length === FORMER_RAW.length);

// --- Padded family, site by site: BOTH cells read the door, so both spell the pad ZERO times. HOME ---
// --- carries the idiom twice — signed2's body and the docstring that quotes the shape it replaced — ---
// --- so the door is read BY LINE, not by file: the door cannot be charged as its own stray. The exact ---
// --- body line is pinned too, so renaming the pad or dropping it here reddens this census, and the ---
// --- derived padded-carrier set makes "only the door spells it" a measurement rather than a hope. ---
const signed2Line = (src[HOME].match(/export const signed2[^\n]*/) || [""])[0];
const docQuote = count(src[HOME].split("\n").filter((l) => /^\s*\/\//.test(l)).join("\n"), PADDED_SIGN);
const paddedSites = PADDED_SITES.map((f) => [f, count(src[f], PADDED_SIGN)]);
const paddedByFile = carriers.filter((f) => (f === HOME ? count(signed2Line, PADDED_SIGN) : count(src[f], PADDED_SIGN)) > 0).sort();
ok(`signed2's body IS the padded idiom and both cells left it (body line reads ${count(signed2Line, PADDED_SIGN)}; ${paddedSites.map(([f, n]) => `${f.split("/").pop()} ${n}`).join(", ")}; padded carriers ${paddedByFile.join(",")}; door docstring quotes it ${docQuote} and is excluded; planted padded reads ${plantPadded})`,
  plantPadded === 1 && count(signed2Line, PADDED_SIGN) === 1 && docQuote === 1 &&
  signed2Line.trim() === 'export const signed2 = (v: number): string => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;' &&
  paddedSites.every(([, n]) => n === 0) && paddedSites.length === 2 &&
  paddedByFile.length === 1 && paddedByFile[0] === HOME);

// --- Must-not-unify, behavioural: signed() coerces the RAW number, so it cannot serve a padded cell.
// Both doors are the SHIPPED ones here, not a re-spelling of mine. -0 is measured, not assumed:
// toFixed drops a negative zero's minus, so signed2 pads where signed already agrees on the sign.
ok(`signed() and signed2() disagree on the value both sites pass, so neither can silently replace the other (signed(1.5)="` + signed(1.5) + `" vs signed2(1.5)="` + signed2(1.5) + `"; -0 → signed="` + signed(-0) + `", signed2="` + signed2(-0) + `")`,
  signed(1.5) === "+1.5" && signed2(1.5) === "+1.50" && signed(1.5) !== signed2(1.5) && signed(-0) === "+0" && signed2(-0) === "+0.00");

// --- Behavioural: the shipped door reproduces the inline formula on the raw values the sites pass.
const VALUES = [0, 1, -1, 2.5, -2.5, 15, -8, -0, 0.75, 100, -0.001, 3];
const inlineOf = (n) => `${n >= 0 ? "+" : ""}${n}`;
const agrees = VALUES.every((n) => signed(n) === inlineOf(n));
ok(`signed(n) equals \`\${n >= 0 ? "+" : ""}\${n}\` for every raw value the sites pass (${VALUES.length} values), incl zero→"${signed(0)}", negative→"${signed(-2.5)}", float→"${signed(2.5)}"`,
  agrees && VALUES.length >= 8 && signed(0) === "+0" && signed(-2.5) === "-2.5" && signed(2.5) === "+2.5");

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
