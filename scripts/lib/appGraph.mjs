// M776: the import graph, in one place, so every census that asks "does the reader reach this
// file?" walks the same edges and gets the same answer.
//
// The question used to be owned by proof-orphans alone. That was fine while only it asked. When a
// second census measures a *debt ceiling over a file set* — proof-i18n's population pins — the two
// gates have to agree on which files are the app, or a file that exists but is reached by nobody
// is charged twice under two different shapes: once as one named orphan, once as a drift in a
// whole-tree aggregate that nobody can read back into a cause.
//
// The entries are DERIVED, never named here: index.html's `type="module"` script and any module
// under `functions/` that calls `Deno.serve`. So this file carries no app path of its own, and a
// gate built on it can still claim (proof-orphans clause 5) that it hides no per-file exemption.
//
// What a neighbour is — a hidden directory, a directory carrying its own `.git` — is appTree's
// rule, and this file defers to it rather than keeping a second list.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_DIRS, skipReason } from "./appTree.mjs";

const THIS = dirname(fileURLToPath(import.meta.url));

/**
 * Blank out comments and preserve string literals, so a specifier quoted in prose is not read as
 * an edge and a path inside a real string is. Line-for-line: offsets stay meaningful.
 */
export const stripComments = (text) => {
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

// A specifier is whatever a compiler would follow: any `from "x"` (imports, `import type`,
// re-export lists and stars), a side-effect import, and a dynamic import's literal.
const SPEC_RES = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

/** Every distinct specifier a source mentions, comments excluded. */
export const readSpecs = (text) => {
  const code = stripComments(text);
  const out = new Set();
  for (const re of SPEC_RES) for (const m of code.matchAll(re)) out.add(m[1]);
  return [...out];
};

const ASSET = /\.(css|json|svg|png|jpe?g|webp|gif|woff2?|ttf|otf|ico|md|txt|wasm|mp3|wav)$/i;

/**
 * Where a compiler would land: `file` (a module the shipped set holds), `asset` (a non-module the
 * walk does not measure), `package` (an installed name, out of this census), or `unresolved` —
 * which a local specifier should never be, because an edge that silently drops makes the graph lie.
 */
export const resolveSpec = (fromFile, spec, has) => {
  let base;
  if (spec.startsWith("@/")) base = spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) base = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  else return { kind: "package", spec };
  if (ASSET.test(base)) return { kind: "asset", spec };
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (has(cand)) return { kind: "file", target: cand };
  }
  return { kind: "unresolved", spec };
};

/** The html's module scripts, as repo-relative paths. `type="module"` is the whole test — a
 *  classic script is not an entry the bundler follows. */
export const htmlEntries = (html) => {
  const out = [];
  for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/\btype=["']module["']/i.test(tag)) continue;
    const src = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (src) out.push(src[1].replace(/^\.?\//, ""));
  }
  return out;
};

/** A serverless module is an entry the browser graph never sees; it is an entry because the
 *  platform runs it. Detected by calling `Deno.serve`, not by directory name alone. */
export const denoEntries = (files, raw, dir = "functions") => files.filter((f) => new RegExp(`^${dir}/.*\\.(ts|tsx)$`).test(f) && /\bDeno\.serve\s*\(/.test(raw[f]));

/** The transitive closure over `edges`, cycle-safe. */
export const reachableFrom = (entries, edges) => {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const t of edges.get(f) ?? []) if (!seen.has(t)) queue.push(t);
  }
  return seen;
};

/** Every `.ts`/`.tsx` under the app's directories, as repo-relative posix paths. */
const shippedModules = (dir) => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = `${d}/${e.name}`;
    if (e.isDirectory()) return skipReason(e.name, p) ? [] : walk(p);
    return [p];
  });
  return APP_DIRS
    .map((name) => join(dir, name))
    .filter((p) => { try { statSync(p); return true; } catch { return false; } })
    .flatMap(walk)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"))
    .map((f) => f.slice(dir.length + 1).split("\\").join("/"));
};

/**
 * The graph of one repository: its shipped modules, the entries derived from `index.html` and
 * `functions/`, the edges, and the files no entry reaches.
 *
 * `unreached` is the quarantine — shipped code the reader cannot get to. It is returned rather
 * than asserted here, because which gate charges it, and in what shape, is that gate's business.
 */
export const moduleGraph = (dir = resolve(THIS, "..", "..")) => {
  const files = shippedModules(dir);
  const fileSet = new Set(files);
  const raw = Object.fromEntries(files.map((f) => [f, readFileSync(join(dir, f), "utf8")]));
  const entries = [...htmlEntries(readFileSync(join(dir, "index.html"), "utf8")), ...denoEntries(files, raw)];
  const edges = new Map(files.map((f) => [f, new Set()]));
  const unresolved = [];
  const assets = [];
  const packageSpecs = new Set();
  for (const f of files) {
    for (const spec of readSpecs(raw[f])) {
      const r = resolveSpec(f, spec, (p) => fileSet.has(p));
      if (r.kind === "file") edges.get(f).add(r.target);
      else if (r.kind === "unresolved") unresolved.push(`${f}: ${spec}`);
      else if (r.kind === "asset") assets.push(`${f}: ${spec}`);
      else packageSpecs.add(spec);
    }
  }
  const reachable = reachableFrom(entries, edges);
  return {
    dir,
    files,
    fileSet,
    raw,
    entries,
    edges,
    unresolved,
    assets,
    packageSpecs,
    edgeCount: [...edges.values()].reduce((s, x) => s + x.size, 0),
    reachable,
    unreached: files.filter((f) => !reachable.has(f)),
  };
};
