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
// So the second question is asked by the same function every gate calls: starting from the
// SPA's entry, which modules does a reader actually reach? The answer is a closure over VALUE
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
// counts), and proof-app-tree (the module pin). One question, one answer.
// ---------------------------------------------------------------------------
const IMPORTED_SPEC = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?[^;]*?from\s*["']([^"']+)["']/g;
const BARE_IMPORT = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

/** The specifiers one module's source names, split into value edges and type-only edges. */
export const importEdgesIn = (src) => {
  const value = new Set();
  const typeOnly = new Set();
  for (const m of src.matchAll(IMPORTED_SPEC)) {
    if (m[1]) typeOnly.add(m[2]);
    else value.add(m[2]);
  }
  for (const m of src.matchAll(BARE_IMPORT)) value.add(m[1]);
  for (const m of src.matchAll(DYNAMIC_IMPORT)) value.add(m[1]);
  return { value, typeOnly };
};

/**
 * The module a specifier names, or `null` for a package or a path the tree does not hold.
 *
 * `exists` answers "is a module at this path?" — a stat, not `existsSync`, because a folder
 * would otherwise accept `@/i18n` before its index does.
 */
export const resolveModuleSpec = (spec, fromPath, exists) => {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) {
    base = posix.normalize(posix.join(posix.dirname(fromPath), spec));
  } else return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((c) => exists(c)) ?? null;
};

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
