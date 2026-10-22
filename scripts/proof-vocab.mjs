// M431. A set of words that means one thing is spelled in ONE place.
//
// The defect, measured before it was fixed. The app has nine small vocabularies — the words that
// mean one kind of thing — and each of them was written out in more than one place:
//
//   · the career's TONE, "good" | "mixed" | "bad" — five times: the zone table, the honour table
//     and the two interfaces that carry them, plus the interface the app's colours are keyed by;
//   · the comparison page's FAVOUR, "a" | "b" | "even" — four times in one file;
//   · the FOOT, "L" | "R" — the type was named in domain/types.ts, and the seed spelled it out
//     twice anyway;
//   · the FORM LETTER, "W" | "D" | "L" — named in analytics, spelled out twice in attributes;
//   · the SIDE, "home" | "away" — spelled out in the engine, the types and the seed;
//   · the TILE's direction, "up" | "down" | "neutral" — the tile's prop, the review's table and
//     the load page's own;
//   · the engine's EVENT SIDE, "H" | "A" — twice in the engine;
//   · the MODE, "FAN" | "PLAYER" | "MANAGER" — named in the types, spelled out in the shell;
//   · the MATCH STATUS, "SCHEDULED" | "LIVE" | "FINISHED" — named in the types, spelled out in
//     the world screen.
//
// A vocabulary spelled twice is a vocabulary that can drift: a new word added to one copy leaves
// the other copy out of it, and the compiler cannot see it because a union of literals is a type,
// not a value.
//
// What this gate reads. A UNION OF STRING LITERALS — two or more quoted words joined by `|` — and
// it must be spelled in exactly one place. Comments are prose about the code, not code, so the
// gate strips them first: the dictionary's own note about the foot's two words is not a second
// spelling. The nine vocabularies above are then named types, each declared once and exported, so
// that the words can be shared by name.
//
// Run: node scripts/proof-vocab.mjs
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? ` — ${detail}` : "")); }
};

// --- 1 · the reader -------------------------------------------------------------------------------
// Two or more quoted words joined by `|`, with whitespace (and a newline) allowed between them.
const UNION = /"[^"\n]+"(?:\s*\|\s*"[^"\n]+")+/g;
// A LIST of two or more quoted words: `["a", "b"]`. M435: a vocabulary is also written as a list
// (the app's modes, its match statuses, its line groups), and a list written twice is the same
// drift risk as a union written twice.
const LIST = /\[\s*"[^"\n]+"(?:\s*,\s*"[^"\n]+")+\s*\]/g;
// A NAME is a word the app uses as a code: letters, digits, underscore, dash. A colour ("#000000")
// is a value, not a name, so two clubs whose kits share a shade are not a vocabulary.
const isName = (s) => /^[A-Za-z][\w.-]*$/.test(s);
// Comments are prose about the code: a union quoted in a docstring is not a second spelling.
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");

/** Every union of string literals in a file, and where it sits. */
const readUnions = (text) => {
  const out = [];
  const stripped = stripComments(text);
  stripped.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(UNION)) {
      out.push({ line: i + 1, text: m[0].slice(0, 120) });
    }
  });
  return out;
};

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const ROOTS = ["domain", "data", "lib", "store", "features", "components", "ui", "src", "i18n", "functions"];
const appFiles = ROOTS.flatMap((r) => walk(join(root, r))).filter((f) => /\.(ts|tsx)$/.test(f));

const groups = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  for (const u of readUnions(readFileSync(f, "utf8"))) {
    const lits = (u.text.match(/"[^"\n]+"/g) || []).map((s) => s.slice(1, -1)).sort();
    const key = lits.join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...u, file: rel });
  }
}
const multi = [...groups.entries()].filter(([, rows]) => rows.length > 1);

// The same census over the LISTS: a vocabulary written as an array of names.
const listGroups = new Map();
for (const f of appFiles) {
  const rel = f.slice(root.length + 1).replace(/\\/g, "/");
  const src = stripComments(readFileSync(f, "utf8"));
  src.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(LIST)) {
      const lits = (m[0].match(/"[^"\n]+"/g) || []).map((s) => s.slice(1, -1));
      if (!lits.every(isName)) continue;
      const key = lits.slice().sort().join("|");
      if (!listGroups.has(key)) listGroups.set(key, []);
      listGroups.get(key).push({ line: i + 1, text: m[0].slice(0, 120), file: rel });
    }
  });
}
const multiLists = [...listGroups.entries()].filter(([, rows]) => rows.length > 1);

// The reader is armed: a planted union is charged, and the near shapes are not.
const pUnion = readUnions(`type Tone = "good" | "mixed" | "bad";`).length;
const pComment = readUnions(`// the record stores "L" | "R"`).length;
const pSingle = readUnions(`const k = "good";`).length;
const pNumbers = readUnions(`type N = 1 | 2 | 3;`).length;
ok(`the reader is armed (a planted union reads ${pUnion}, a union quoted in a comment reads ${pComment}, a single quoted word reads ${pSingle}, and a union of numbers reads ${pNumbers})`,
  pUnion === 1 && pComment === 0 && pSingle === 0 && pNumbers === 0);

// The list reader is armed too: a planted list of names is charged, and a one-word array and a
// list of colours are not.
const listIn = (text) => {
  const out = [];
  for (const m of stripComments(text).matchAll(LIST)) {
    const lits = (m[0].match(/"[^"\n]+"/g) || []).map((s) => s.slice(1, -1));
    if (lits.length >= 2 && lits.every(isName)) out.push(m[0]);
  }
  return out;
};
const pList = listIn(`const MODES = ["FAN", "PLAYER", "MANAGER"];`).length;
const pOne = listIn(`const k = ["category"];`).length;
const pColours = listIn(`const kit = ["#000000", "#FFFFFF"];`).length;
ok(`the list reader is armed (a planted list of names reads ${pList}, a one-word array reads ${pOne}, and a list of colours reads ${pColours})`,
  pList === 1 && pOne === 0 && pColours === 0);

// --- 2 · the census: a vocabulary is spelled once ----------------------------------------------------
const total = [...groups.values()].reduce((s, rows) => s + rows.length, 0);
ok(`every union of string literals is spelled in ONE place (${groups.size} vocabularies, ${total} spellings, ${multi.length} spelled more than once${multi.length ? `: ${multi.map(([k, rows]) => `[${k}] × ${rows.length}`).join(", ")}` : ""})`,
  multi.length === 0,
  `duplicated: ${multi.map(([k, rows]) => `${k} (${rows.map((r) => `${r.file}:${r.line}`).join(", ")})`).join("; ")}`);

// The LISTS: a vocabulary written as an array of names. Two of them are written twice, and both
// times the second copy is a screen's own ORDER of the same words (the search page lists players
// before clubs; the matches strip lists LIVE first) — a documented split, not a drift.
const LIST_SPLITS = {
  "club|competition|match|news|player": "the search page's section ORDER is its own (players before clubs); which kinds exist is not",
  "FINISHED|LIVE|SCHEDULED": "the matches strip's button ORDER is its own (LIVE first); which statuses exist is not",
};
const undeclaredLists = multiLists.map(([k]) => k).filter((k) => !(k in LIST_SPLITS));
const staleLists = Object.keys(LIST_SPLITS).filter((k) => !listGroups.has(k) || (listGroups.get(k) ?? []).length < 2);
ok(`every list of names is written in one place, except the declared orders (${listGroups.size} lists, ${multiLists.length} written more than once, ${undeclaredLists.length} undeclared [${undeclaredLists.join(", ")}], ${staleLists.length} stale [${staleLists.join(", ")}])`,
  undeclaredLists.length === 0 && staleLists.length === 0,
  `undeclared: ${undeclaredLists.join(", ")}; stale: ${staleLists.join(", ")}`);

// A vocabulary written as BOTH a type and a list is the same drift risk twice over: the compiler
// checks one copy and the runtime walks the other. M436 closed the last three of them by deriving
// the type from the list, so the shape itself is now charged: a set of words that appears as a
// union AND as a list is a set that can drift, and there must be none.
const bothWaysIn = (g, l) => [...g.keys()].filter((k) => l.has(k));
const bothWays = bothWaysIn(groups, listGroups);
// The reader is armed: a planted vocabulary written both ways is seen.
const pBoth = bothWaysIn(
  new Map([["a|b", [{ file: "planted.ts", line: 1 }]]]),
  new Map([["a|b", [{ file: "planted.ts", line: 2 }]]]),
).length;
ok(`no vocabulary is written as both a type and a list (${bothWays.length} written both ways${bothWays.length ? `: ${bothWays.join(", ")}` : ""}; a planted one reads ${pBoth})`,
  bothWays.length === 0 && pBoth === 1,
  `both ways: ${bothWays.join(", ")}`);

// --- 3 · the nine vocabularies are named types ------------------------------------------------------
// Each entry names the type and the file that declares it. A vocabulary that is shared is a type
// with a NAME, so the words can be referred to rather than written out.
const NAMED = [
  ["Tone", "domain/types.ts"],
  ["Side", "domain/types.ts"],
  ["Foot", "domain/types.ts"],
  ["Mode", "domain/types.ts"],
  ["MatchStatus", "domain/types.ts"],
  ["FormLetter", "domain/attributes.ts"],
  ["Favor", "domain/compare.ts"],
  ["EventSide", "domain/matchEngine.ts"],
  ["TileTone", "ui/primitives.tsx"],
];
const src = Object.fromEntries(appFiles.map((f) => [f.slice(root.length + 1).replace(/\\/g, "/"), readFileSync(f, "utf8")]));
const namedBad = NAMED.filter(([name, file]) => {
  const text = src[file] ?? "";
  const decl = new RegExp(`(?:export\\s+)?type\\s+${name}\\b`);
  return !decl.test(text);
});
const notExported = NAMED.filter(([name, file]) => {
  const text = src[file] ?? "";
  return !new RegExp(`export\\s+type\\s+${name}\\b`).test(text);
});
ok(`the nine shared vocabularies are named types, each declared once and exported (${NAMED.length} named: ${NAMED.map(([n, f]) => `${n}@${f.split("/").pop()}`).join(", ")}; ${namedBad.length} not declared [${namedBad.map(([n]) => n).join(", ")}]; ${notExported.length} not exported [${notExported.map(([n]) => n).join(", ")}])`,
  namedBad.length === 0 && notExported.length === 0,
  `not declared: ${namedBad.map(([n]) => n).join(", ")}; not exported: ${notExported.map(([n]) => n).join(", ")}`);

// --- 4 · the places that spelled the words out now name them ---------------------------------------
// Each entry is a file and the type it must mention. A file that goes back to writing the words
// out loses the name, and the census above is what notices.
const USERS = [
  ["domain/career.ts", "Tone"],
  ["domain/compare.ts", "Favor"],
  ["domain/attributes.ts", "FormLetter"],
  ["domain/analytics.ts", "FormLetter"],
  ["domain/matchEngine.ts", "EventSide"],
  ["data/footballSeed.ts", "Foot"],
  ["data/footballSeed.ts", "Side"],
  ["features/shell/AppShell.tsx", "Mode"],
  ["features/football/FootballWorld.tsx", "MatchStatus"],
  ["features/load/LoadPage.tsx", "TileTone"],
  ["features/review/ReviewPage.tsx", "TileTone"],
  ["ui/primitives.tsx", "TileTone"],
  ["ui/primitives.tsx", "Tone"],
];
const usersMissing = USERS.filter(([file, name]) => !(src[file] ?? "").includes(name));
ok(`every place that used to spell a vocabulary out names it instead (${USERS.length} name uses, ${usersMissing.length} missing [${usersMissing.map(([f, n]) => `${f}:${n}`).join(", ")}])`,
  usersMissing.length === 0,
  `missing: ${usersMissing.map(([f, n]) => `${f}:${n}`).join(", ")}`);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
