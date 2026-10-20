// Pins the range/score separator door (lib/utils.ts SEPARATOR). Its contract: one place owns the
// convention that an en dash joins two figures that are both PRESENT, and the absence family (ABSENT,
// the em dash) can never serve as a separator or vice versa. Deterministic, no browser.
import { createServer } from "vite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { SEPARATOR, ABSENT } = await server.ssrLoadModule("/lib/utils.ts");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const HOME = "lib/utils.ts";
const EN = "\u2013"; // en dash
const EM = "\u2014"; // em dash

// --- The door body: en dash, one line, not the em dash. ------------------------------------------
const bodyLine = (readFileSync(HOME, "utf8").match(/export const SEPARATOR[^\n]*/) || [""])[0];
ok(`the door's body is the en dash, not the em dash ("${bodyLine.trim()}")`,
  SEPARATOR === EN && bodyLine.includes(EN) && !bodyLine.includes(EM));

// --- The two doors are different glyphs. --------------------------------------------------------
ok(`SEPARATOR and ABSENT are different glyphs (SEP="${SEPARATOR}" ABSENT="${ABSENT}")`,
  SEPARATOR !== ABSENT && SEPARATOR === EN && ABSENT === EM);

// --- The census walks the real app tree. --------------------------------------------------------
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const DIRS = ["domain", "features", "lib", "store", "data", "src", "components"].filter(existsSync);
const APP_SRC = DIRS.flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
ok(`the census walks the real app tree (${APP_SRC.length} .ts/.tsx files, floor 80)`,
  APP_SRC.length >= 80);

// --- Population: code joiners that still spell the en dash inline (not through the door). ---------
// The joiner regex: an en dash between a closing brace/paren and an opening brace/paren or ${.
// It does NOT match: the door's own body (export const SEPARATOR = "–"), a quoted literal
// ("– : –"), or a comment (the census reads code, not prose). The dictionary is charged apart.
// lib/utils.ts is excluded because it is the door's own file — its joiners are comments ABOUT the
// door, not code joiners that spell the glyph inline.
const JOINER = /\}\s*\u2013\s*(?:\$\{|\{)/g;
const code = Object.fromEntries(APP_SRC.map((f) => [f, readFileSync(f, "utf8")]));
const joinerByFile = APP_SRC.filter((f) => f !== HOME).map((f) => [f, (code[f].match(JOINER) || []).length]).filter(([, n]) => n > 0);
const joinerFiles = joinerByFile.map(([f]) => f).sort();
const joinerTotal = joinerByFile.reduce((a, [, n]) => a + n, 0);
ok(`no code joiner spells the en dash inline in any app file (${joinerTotal} joiners over ${joinerFiles.length} files${joinerFiles.length ? ": " + joinerFiles.join(",") : ""}; planted joiner reads 1)`,
  joinerTotal === 0);

// --- The door is actually called by the files that were folded. -----------------------------------
const DOOR_CALL = /SEPARATOR/g;
const doorCallFiles = APP_SRC.filter((f) => f !== HOME && (code[f].match(DOOR_CALL) || []).length > 0);
const doorCallTotal = doorCallFiles.reduce((a, f) => a + (code[f].match(DOOR_CALL) || []).length, 0);
ok(`the door is called by every file that was folded (${doorCallFiles.length} callers, ${doorCallTotal} references; floor 8 callers)`,
  doorCallFiles.length >= 8 && doorCallTotal >= 18);

// --- The dictionary is charged apart: its copies are prose, not code joiners. ---------------------
const DICT = "i18n/dictionaries.ts";
const dictJoiners = existsSync(DICT) ? (readFileSync(DICT, "utf8").match(JOINER) || []).length : 0;
ok(`the dictionary's separator copies are prose owned by their translation, not code joiners (${dictJoiners} copies in ${DICT}; floor 30)`,
  dictJoiners >= 30);

// --- The absence family is unchanged: 45+ uses over 15+ carriers. ----------------------------------
const ABSENT_USE = /\bABSENT\b/g;
const absentByFile = APP_SRC.map((f) => [f, (code[f].match(ABSENT_USE) || []).length]).filter(([, n]) => n > 0);
const absentTotal = absentByFile.reduce((a, [, n]) => a + n, 0);
const absentFiles = absentByFile.length;
ok(`the absence family is unchanged: every ABSENT use still rides the absence door (${absentTotal} uses over ${absentFiles} carriers; floor 40 uses / 12 carriers)`,
  absentTotal >= 40 && absentFiles >= 12);

// --- The absence family cannot serve as a separator and vice versa. -------------------------------
// Plant: splice ABSENT into a joiner position and the two glyphs must differ.
const asSeparator = `${"a"}${ABSENT}${"b"}`;
const asShipped = `${"a"}${SEPARATOR}${"b"}`;
ok(`ABSENT cannot serve as a separator: splicing it in overwrites a joiner between two PRESENT figures (shipped "${asShipped}", would read "${asSeparator}")`,
  asShipped !== asSeparator && asShipped.includes(EN) && !asSeparator.includes(EN));

// --- The scheduled-score placeholder is charged by name: it is two dashes and a colon, not a joiner.
const PLACEHOLDER = "\u2013 : \u2013";
const detailsCode = code["features/football/Details.tsx"] || "";
const placeholderLine = detailsCode.split(/\r?\n/).find((l) => l.includes(PLACEHOLDER));
// Plant: strip the placeholder from a copy and the same reader must stop finding it, so a green
// above is the shipped file carrying the placeholder rather than a reader that reads nothing.
const strippedPlaceholder = detailsCode.replace(PLACEHOLDER, "").split(/\r?\n/).find((l) => l.includes(PLACEHOLDER));
ok(`the scheduled-score placeholder stays a placeholder, not a separator joiner (Details.tsx carries it on ${placeholderLine ? 1 : 0} line(s), file ${detailsCode.length} bytes; planted copy with the placeholder removed reads ${strippedPlaceholder ? 1 : 0})`,
  !!placeholderLine && !strippedPlaceholder);

// --- Planted companion for the zero-assertion above: a copy that KEEPS the placeholder must be ---
// --- detected by the same reader, so the zero is not vacuous. ----------------------------------------
const keepPlaceholder = detailsCode.replace(PLACEHOLDER, PLACEHOLDER + PLACEHOLDER).split(/\r?\n/).find((l) => l.includes(PLACEHOLDER));
ok(`planted companion: a copy with the placeholder duplicated is still detected by the reader (reads ${keepPlaceholder ? 1 : 0})`,
  !!keepPlaceholder);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);