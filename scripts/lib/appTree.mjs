// The tree the app is made of, and the two ways a neighbour is not the app.
//
// Every proof that walks the tree prints numbers about the tree it walked, so the tree has to be
// named in ONE place. Five proofs kept five private skip lists and they disagreed, which is how
// two neighbours came to be read as if they were the app:
//
//   · `football-os/` — a local clone of this very repository, committed at M419 as a submodule
//     pointer with no `.gitmodules` file. It carries 79 modules of the same code, so the coverage
//     census read 197 modules where the app has 98, and the i18n, id, dead-import and dead-export
//     gates went red with numbers nobody could act on: 59 of 376 i18n checks, 2 of 15 id checks.
//   · thirteen scratch planes (`.m225-plane` … `.m326-plane`) — full copies of the tree left behind
//     by experiments, untracked, and read by the two proofs that walk from the root. They carried a
//     clock-derived id in `data/ai.ts` that the id gate charged against the app.
//
// The reason is the same for both, and it is the only reason this file needs: **a neighbour is a
// neighbour**. A hidden name is not shipped (the build would not find it, and git would not show
// it), and a directory carrying its own `.git` is another repository, with its own package.json,
// its own tests and its own history.
//
// The rule is charged both ways by proof-app-tree: a hidden directory and a nested repository are
// skipped, and an ordinary directory is NOT skipped — otherwise "skip the neighbours" would be a
// name for "skip whatever you did not expect".
import { existsSync, readdirSync } from "node:fs";
import { join, posix } from "node:path";

/** A name that starts with a dot: the convention the machine and git share. */
export const isHiddenName = (name) => name.startsWith(".");

/**
 * The ten directories the app is made of.
 *
 * The rule above decides what a directory *is* — hidden, another repository, or the app's. This
 * says which ones the app *has*, and it lives here because three gates need the same answer and
 * three copies of the list are three lists that can disagree: the app-tree census (which pins
 * the module count), the chips census, and the export index the drafts are measured against.
 */
export const APP_DIRS = ["components", "data", "domain", "features", "functions", "i18n", "lib", "src", "store", "ui"];

/**
 * A directory that carries its own `.git` — a file (a worktree/submodule pointer) or a directory
 * (a clone) — is another repository, not a directory of this one.
 */
export const carriesOwnRepo = (dir) => existsSync(join(dir, ".git"));

/**
 * Why a directory is not the app, or `null` when it is.
 *
 * `notApp` is the caller's own list of names that are not the app (build output, tooling). The two
 * rules here are the ones no caller should have to remember, and they are checked before the
 * caller's list so a hidden directory is reported as hidden rather than as an ordinary name.
 */
export const skipReason = (name, dir, notApp = []) => {
  if (isHiddenName(name)) return "hidden";
  if (notApp.includes(name)) return "not the app";
  if (carriesOwnRepo(dir)) return "another repository";
  return null;
};

/**
 * The top-level directories that are the app: visible, not on the caller's not-app list, and not
 * another repository. A neighbour is reported by name, so the caller can print it.
 */
export const appDirsIn = (root, { notApp = [] } = {}) =>
  readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !skipReason(e.name, join(root, e.name), notApp))
    .map((e) => e.name);

/**
 * The root's FILES that are the app's. A file is the app's when the app NAMES it (the list is
 * in proof-app-tree, which pins it), and a file the app does not name is a neighbour's — the
 * ledger's own scratch notes, mostly, which are hidden and are skipped the way a hidden
 * directory is.
 */
export const appFilesIn = (root, { notApp = [] } = {}) =>
  readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isFile() && !isHiddenName(e.name) && !notApp.includes(e.name))
    .map((e) => e.name);

/**
 * Every file under the app, recursively, as absolute paths.
 *
 * `dirs` names the directories to walk; leave it unset to walk the whole root (which is what the
 * two whole-tree gates do). `notApp` names the directories to leave alone. `exts` names the file
 * kinds to keep.
 */
export const walkApp = (root, { dirs = null, notApp = [], exts = [".ts", ".tsx"] } = {}) => {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (!skipReason(e.name, p, notApp)) walk(p);
        continue;
      }
      if (exts.some((x) => e.name.endsWith(x))) out.push(p);
    }
  };
  for (const d of dirs ?? [root]) walk(dirs === null ? root : join(root, d));
  return out;
};

// ---------------------------------------------------------------------------
// M776 · the tree the READER can walk, not the tree the repository contains.
//
// The gates above answer "what is the app?" by the directory a file sits in. That answer is
// honest about neighbours, and it is still too broad: a file under `features/` that nothing
// imports is not a screen a reader can open. The component farm proved it — three sweeps
// (M598, M710, M772) deleted 23 + 47 + 45 unreached components, and every sweep was forced
// because a census pin counted them the moment they landed. A pin that reddens on a quarantine
// is a pin that measures the repository, not the product.
//
// So the second question is asked by the same function every gate calls: starting from the entries
// the app DECLARES, which modules does a reader actually reach? The answer is a closure over VALUE
// imports — `import ... from "x"`, `export ... from "x"`, a bare `import "x"` (it runs the
// module), and `import("x")` (the route table's lazy screens). A `import type` is deliberately
// NOT an edge: it is erased before the bundle exists, so no reader ever executes it (the
// type-only side is still returned, because a proof may want to ask).
//
// The resolver is a pure function over an `exists` oracle, so a proof can run it on a made-up
// graph. `@/` is the repository's one alias (tsconfig `paths`), relative specifiers normalise
// against the importing file, and a bare package name is not app code. A directory is never a
// module: `@/i18n` resolves to `i18n/index.tsx`, and resolving to the folder was a real EISDIR
// mid-proof at M239.
//
// Who reads this: proof-coverage (which asked the question first, privately, and whose
// planted graphs now exercise this copy), proof-i18n (the population the dictionary census
// counts), proof-app-tree (the module pin) and proof-orphans (which wrote the first version of
// this reader at M428 and now reads this one). One question, one answer.
//
// M777: the answer used to be two answers. proof-orphans kept its own reader — one that strips
// comments, matches a `from` clause wherever its statement starts, classifies a specifier as a
// module, a package, an asset or a miss, and DERIVES the entries from `index.html`'s module script
// and from any `Deno.serve` module under `functions/`. The M776 copy answered three of those four
// questions differently: it matched unstripped source, it anchored on a line start (so one line
// carrying three imports contributed one edge and dropped two), and it was handed a remembered
// `["src/main.tsx"]` — which made the Edge Function's two modules read as a quarantine nobody
// imports, when a reader reaches them by URL. The reader here is now the one proof-orphans proved,
// and every gate starts its closure where the app says the app starts.
// ---------------------------------------------------------------------------

/**
 * Comments struck out of the way are not code. A reader never executes a commented import, so a
 * gate that walked unstripped source would call a struck-out module reachable forever.
 */
export const stripCommentsIn = (text) => {
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

// A statement boundary is the anchor, not a line start: `features/manager/ManagerOS.tsx` carries
// three imports on one line, and an anchored matcher read one of them and dropped two real edges.
// The keyword is required before the `from`, so a string or a caption that merely says "from"
// cannot invent an edge — and if one ever did, the resolver would call it unresolved and
// proof-orphans would charge it, which is the loud half of this design.
const IMPORTED_SPEC = /(?:^|[\s;}])(import|export)\b([^;]*?)\bfrom\s*["']([^"']+)["']/g;
const BARE_IMPORT = /(?:^|[\s;}])import\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

/**
 * The specifiers one module's source names, split into value edges and type-only edges.
 *
 * The source is stripped first. A block comment can put `import` at the start of a line — the
 * shape a dead-code sweep leaves when it wraps an import in a comment block — and a reader that
 * matched the commented line would keep calling a struck-out module alive forever.
 */
export const importEdgesIn = (src) => {
  const code = stripCommentsIn(src);
  const value = new Set();
  const typeOnly = new Set();
  for (const m of code.matchAll(IMPORTED_SPEC)) {
    // The clause keeps the space the keyword left behind, so the test is `^\s*type`, not `^type`.
    if (/^\s*type\b/.test(m[2])) typeOnly.add(m[3]);
    else value.add(m[3]);
  }
  for (const m of code.matchAll(BARE_IMPORT)) value.add(m[1]);
  for (const m of code.matchAll(DYNAMIC_IMPORT)) value.add(m[1]);
  return { value, typeOnly };
};

/** An import of something that is not a module: a stylesheet, a font, a JSON document. */
const ASSET = /\.(css|json|svg|png|jpe?g|webp|gif|woff2?|ttf|otf|ico|md|txt|wasm|mp3|wav)$/i;

/**
 * What a specifier is, four ways: a module the tree holds, a package, an asset, or a miss.
 *
 * The four-way answer is the one proof-orphans needs, because "a bare name" and "a path the tree
 * does not hold" are different debts — the first is npm's business, the second is a broken edge
 * that would make the reachability graph lie. `resolveModuleSpec` below is the same resolver read
 * as a yes/no.
 */
export const classifySpecIn = (spec, fromPath, exists) => {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) {
    base = posix.normalize(posix.join(posix.dirname(fromPath), spec));
  } else return { kind: "package", spec };
  if (ASSET.test(base)) return { kind: "asset", spec };
  const target = resolveModuleSpec(spec, fromPath, exists);
  return target ? { kind: "file", target } : { kind: "unresolved", spec };
};

/**
 * The module a specifier names, or `null` for a package, an asset or a path the tree does not hold.
 *
 * `exists` answers "is a module at this path?" — a stat, not `existsSync`, because a folder
 * would otherwise accept `@/i18n` before its index does.
 */
export function resolveModuleSpec(spec, fromPath, exists) {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) {
    base = posix.normalize(posix.join(posix.dirname(fromPath), spec));
  } else return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((c) => exists(c)) ?? null;
}

/** The module scripts `index.html` loads — the SPA's own entries, named by the document, not by a gate. */
export const htmlEntriesIn = (html) => {
  const out = [];
  for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/\btype=["']module["']/i.test(tag)) continue;
    const src = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (src) out.push(src[1].replace(/^\.?\//, ""));
  }
  return out;
};

/**
 * A module under `dir` that calls `Deno.serve` is its own entry: the reader reaches it by URL, so
 * no import line names it and an import graph alone would call it an orphan.
 */
export const denoEntriesIn = (files, readSource, dir = "functions") =>
  files.filter((f) => new RegExp(`^${dir}/.*\\.(ts|tsx)$`).test(f) && /\bDeno\.serve\s*\(/.test(readSource(f)));

/** Every entry the app declares: the html's module scripts, then the Deno servers. */
export const appEntriesIn = (files, readSource, html) => [...htmlEntriesIn(html), ...denoEntriesIn(files, readSource)];

/** Every module reachable from `roots` over value imports, `roots` included when they exist. */
export const reachableModulesIn = (roots, readSource, exists) => {
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const p = stack.pop();
    if (!p || seen.has(p)) continue;
    seen.add(p);
    for (const spec of importEdgesIn(readSource(p)).value) {
      const next = resolveModuleSpec(spec, p, exists);
      if (next && !seen.has(next)) stack.push(next);
    }
  }
  return seen;
};
