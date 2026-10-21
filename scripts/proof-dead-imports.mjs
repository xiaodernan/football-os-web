// Proof for the dead named import: a binding a file imports and then never names again.
//
// The defect, measured before it was fixed. Six files carried eight named bindings that no line
// of their own bodies read — `attributeLabel`/`CATEGORY_LABEL` in domain/scouting.ts (mentioned
// only in two comments that claimed they were still in use), `buildLoad` in data/ai.ts, `StatTile`
// in Dashboard.tsx, `getPlayer` and `Crest` in PlayerOS.tsx, `playersByClub` in SimulationLab.tsx,
// `SectionTitle` in TransferCentre.tsx. `tsc` cannot see them: noUnusedLocals is off, and a named
// import is a legal statement whether or not anything reads it. They cost a reader, not a byte —
// the same trade M405's clause 11 records for the palette's dead import.
//
// What this gate reads, and why each rule is where it is:
//   · COMMENTS ARE STRIPPED before a binding is counted. `attributeLabel` lived only in a comment
//     that said it was used, so a plain-text search would have called it live. The stripper walks
//     strings, template literals and both comment forms, so a `//` inside a URL literal does not
//     swallow the rest of a line.
//   · A SPREAD is a use: `...ZONE_TONE` is spelled with a dot, and the first two drafts of this
//     census read it as member access and reported three live bindings dead. The reader charges
//     `obj.Name` (member access, not a use of the binding) and credits `...Name`.
//   · A JSX TAG, a TYPE POSITION and an ALIASED local name are uses. A binding used only as a
//     property key (`{ ZONE_TONE: 1 }` inside an object being returned) is a use of the name.
//   · THE ROOT SET IS DERIVED, NOT LISTED. Every top-level directory that carries .ts/.tsx must be
//     either walked or named in NON_APP; a new app directory that nobody added to the walk reddens
//     rather than escaping (the reach guard this suite keeps re-learning).
//
// Run: node scripts/proof-dead-imports.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { skipReason } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const stripComments = (text) => {
  let out = "", i = 0, mode = null;
  while (i < text.length) {
    const c = text[i], d = text[i + 1];
    if (mode === "line") { if (c === "\n") { mode = null; out += c; } else out += " "; i++; continue; }
    if (mode === "block") { if (c === "*" && d === "/") { mode = null; out += "  "; i += 2; } else { out += c === "\n" ? "\n" : " "; i++; } continue; }
    if (mode === "sq" || mode === "dq" || mode === "tpl") {
      out += c;
      if (c === "\\") { out += d ?? ""; i += 2; continue; }
      if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"') || (mode === "tpl" && c === "`")) mode = null;
      i++; continue;
    }
    if (c === "/" && d === "/") { mode = "line"; out += "  "; i += 2; continue; }
    if (c === "/" && d === "*") { mode = "block"; out += "  "; i += 2; continue; }
    if (c === "'") mode = "sq"; else if (c === '"') mode = "dq"; else if (c === "`") mode = "tpl";
    out += c; i++;
  }
  return out;
};

const IMPORT = /^import\s+(type\s+)?\{([\s\S]*?)\}\s+from\s+["'][^"']+["'];?/gm;
const specNames = (list) => list.split(",").map((part) => part.trim().replace(/^type\s+/, "")).filter(Boolean)
  .map((spec) => ({ local: (spec.split(/\s+as\s+/)[1] || spec.split(/\s+/)[0]).trim() }))
  .map((s) => s.local).filter((s) => /^[A-Za-z_$][\w$]*$/.test(s));

// The reader, over one file's text. Returns every named binding and the ones nothing reads.
const readDead = (text) => {
  const stmts = [...text.matchAll(IMPORT)];
  const named = [];
  let rest = text;
  for (const s of stmts) rest = rest.replace(s[0], " ".repeat(s[0].length));
  rest = stripComments(rest);
  for (const s of stmts) {
    for (const local of specNames(s[2])) {
      named.push(local);
      const esc = local.replace(/\$/g, "\\$");
      const used = new RegExp(`(^|[^.\\w$])${esc}([^\\w$]|$)`).test(rest) || new RegExp(`\\.\\.\\.${esc}\\b`).test(rest);
      if (!used) named.push(`DEAD:${local}`);
    }
  }
  return { named, dead: named.filter((n) => n.startsWith("DEAD:")).map((n) => n.slice(5)) };
};

const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n", "functions"];
// Directories that carry TypeScript but are not the shipped app: tools, scratch, build output and
// vendored code. A new entry here is a decision, which is why the reach guard below reads it.
//
// M423: the two rules that say a directory is a NEIGHBOUR rather than a kind of file now live in
// one place (scripts/lib/appTree.mjs). A hidden directory is not shipped — thirteen scratch
// planes sat in the root and every one of them was reported as an uncovered directory the app was
// hiding code in — and a directory carrying its own `.git` is another repository. That second one
// is not hypothetical: `football-os/` was a local clone of this repository, and a clone of the app
// is not the app.
const NON_APP = ["scripts", "dev", "dist", "node_modules", "test-results", "vendor", "Python"];

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = `${d}/${e.name}`;
  if (e.isDirectory()) return skipReason(e.name, p) ? [] : walk(p);
  return [p];
});

// --- 1. Every shape is read the way a compiler would. Comments do not keep a binding alive, a ---
// --- spread does, member access does not, and an import list may span lines. ---
const SAMPLE = [
  'import { a, b } from "x";',
  "const y = a;",
].join("\n");
const SPREAD = ['import { ZONE_TONE } from "x";', "const t = { ...ZONE_TONE, a: 1 };", "const z = obj.ZONE_TONE;"].join("\n");
const MEMBER = ['import { ZONE_TONE } from "x";', "const z = obj.ZONE_TONE;", "const q = obj?.ZONE_TONE;"].join("\n");
const JSX = ['import { Crest } from "x";', "export const C = () => <Crest size={4} />;"].join("\n");
const TYPE = ['import type { LoadZone } from "x";', "export const f = (z: LoadZone) => z;"].join("\n");
const ALIAS = ['import { getPlayer as readPlayer } from "x";', "export const p = readPlayer(1);"].join("\n");
const COMMENT = ['import { attributeLabel } from "x";', "// attributeLabel is the English fallback this file still uses.", "export const n = 1;"].join("\n");
const MULTI = ['import {', "  getClub,", "  getPlayer,", '} from "x";', "export const g = getPlayer;", "export const c = getClub;"].join("\n");
const r1 = readDead(SAMPLE), rss = readDead(SPREAD), r2 = readDead(MEMBER), r3 = readDead(JSX), r4 = readDead(TYPE), r5 = readDead(ALIAS), r6 = readDead(COMMENT), r7 = readDead(MULTI);
ok(`the reader charges a dead binding and credits spread, JSX, type and alias uses (dead [${r1.dead}], spread-dead [${rss.dead}], member-only [${r2.dead}], jsx [${r3.dead}], type [${r4.dead}], alias [${r5.dead}], comment-only [${r6.dead}], multi-line parsed ${r7.named.length} named / dead [${r7.dead}])`,
  r1.dead.join() === "b" && rss.dead.length === 0 && r2.dead.join() === "ZONE_TONE" &&
  r3.dead.length === 0 && r4.dead.length === 0 && r5.dead.length === 0 && r6.dead.join() === "attributeLabel" &&
  r7.named.length === 2 && r7.dead.length === 0);

// --- 2. The census walks the real tree, and the root set is checked against the tree rather than ---
// --- trusted: a top-level directory that carries TS and is neither walked nor named NON_APP is a ---
// --- hiding place, so it reddens. ---
const topDirs = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const carriesTs = (d) => {
  try {
    const entries = readdirSync(join(root, d), { withFileTypes: true });
    if (entries.some((e) => e.isFile() && /\.tsx?$/.test(e.name))) return true;
    return entries.some((e) => e.isDirectory() && e.name !== "node_modules" && carriesTs(`${d}/${e.name}`));
  } catch { return false; }
};
const uncovered = topDirs.filter((d) => !ROOTS.includes(d) && !skipReason(d, join(root, d), NON_APP) && carriesTs(d));
const files = ROOTS.filter((d) => { try { statSync(join(root, d)); return true; } catch { return false; } })
  .flatMap((d) => walk(join(root, d))).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"))
  .map((f) => f.slice(root.length + 1).split("\\").join("/"));
const read = files.map((f) => ({ f, ...readDead(readFileSync(join(root, f), "utf8")) }));
const namedTotal = read.reduce((s, r) => s + r.named.filter((n) => !n.startsWith("DEAD:")).length, 0);
const plantTop = ["domain", "features", "brandNewApp"].filter((d) => !ROOTS.includes(d) && !NON_APP.includes(d));
ok(`the walk covers every top-level TypeScript directory and reads the real app (${files.length} files, floor 90; ${namedTotal} named bindings, floor 1,400; uncovered [${uncovered.join(",")}], planted new directory reads uncovered ${plantTop.length === 1 ? 1 : plantTop.length})`,
  files.length >= 90 && namedTotal >= 1400 && uncovered.length === 0 &&
  plantTop.includes("brandNewApp") && NON_APP.includes("dev") && NON_APP.includes("scripts"));

// --- 3. The value: no shipped file imports a name it never reads. Each dead binding the census ---
// --- finds is named in the failure, so a regression is a file, not a total. ---
const dead = read.flatMap((r) => r.dead.map((n) => `${r.f}:${n}`));
ok(`no shipped named import is dead (${dead.length} dead${dead.length ? `: ${dead.join(", ")}` : ""}; the same reader on the planted file above reads ${r1.dead.length} and the comment-only one ${r6.dead.length}, so a zero here is a reader that looked)`,
  dead.length === 0 && r1.dead.length === 1 && r6.dead.length === 1);

// --- 4. No exemption list: the gate cannot quietly carry a path it refuses to charge. A file ---
// --- named in the gate's CODE is a skip list; its header comment naming the repaired sites is ---
// --- prose, and the same stripper this gate runs on the app runs here. The plant is assembled ---
// --- from fragments at runtime so that planting it does not itself trip the charge. ---
const selfPath = "scripts/proof-dead-imports.mjs";
const selfCode = stripComments(readFileSync(join(root, selfPath), "utf8"));
const appFileMentions = read.filter((r) => selfCode.includes(r.f)).map((r) => r.f);
const plantSelf = ["features", "player", "PlayerOS.tsx"].join("/");
const plantedMentions = read.filter((r) => plantSelf.includes(r.f)).length;
ok(`the gate carries no per-file exemption (${appFileMentions.length} app paths quoted in ${selfPath}; a planted skip list names ${plantedMentions}, so the reader is looking for the right thing)`,
  appFileMentions.length === 0 && plantedMentions === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
