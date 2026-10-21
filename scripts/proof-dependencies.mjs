// M432: the fifth direction of the dead-code boundary -- a package a manifest declares that
// nothing in the tree reads. The build never looks at package.json; this gate derives every
// reader carrier from the files themselves (imports, CSS/HTML references, config names, the
// tsconfig's own type list) and charges a declaration with no reader. @types/* are read through
// their base package; a comment is not a reader.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

// Assembled so the gate does not quote a declared package name and trip its own exemption scan.
const NODE_TYPES = "@types/" + "node";

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const runtime = pkg.dependencies ?? {};
const dev = pkg.devDependencies ?? {};
const declaredNames = [...Object.keys(runtime), ...Object.keys(dev)];

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

const SKIP = new Set(["node_modules", "dist", ".git", "football-os", "test-results", "vendor"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".css", ".html", ".json"]);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (SKIP.has(e.name) ? [] : walk(join(d, e.name))) : [join(d, e.name)]);
const files = walk(root)
  .filter((f) => CODE_EXT.has(extname(f).toLowerCase()))
  .map((f) => f.slice(root.length + 1).split("\\").join("/"))
  .filter((f) => !/(^|\/)package(-lock)?\.json$/.test(f) && !/(^|\/)tsconfig\.tsbuildinfo$/.test(f));

const isConfig = (rel) => /(^|\/)(vite|postcss|playwright)\.config\.(m?[jt]s)$/.test(rel);
const isTsconfig = (rel) => /(^|\/)tsconfig[^/]*\.json$/.test(rel);
const bare = (spec) => spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
const IMPORT_PATTERNS = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
];

const census = (entries, declared) => {
  const claimed = new Set();
  const tsTypes = new Set();
  const claimSpec = (spec) => {
    if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/")) return;
    if (spec.startsWith("node:")) { claimed.add(NODE_TYPES); return; }
    claimed.add(bare(spec));
  };
  for (const { rel, text } of entries) {
    const code = stripComments(text);
    if (isTsconfig(rel)) {
      for (const m of code.matchAll(/"types"\s*:\s*\[([^\]]*)\]/g)) {
        for (const t of m[1].matchAll(/"([^"]+)"/g)) {
          tsTypes.add(t[1].startsWith("@types/") ? t[1].slice(7) : t[1]);
          if (t[1].startsWith("@types/")) claimed.add(t[1]);
        }
      }
      continue;
    }
    if (rel.toLowerCase().endsWith(".json")) continue;
    if (rel.toLowerCase().endsWith(".css")) {
      for (const m of code.matchAll(/@(?:import|plugin|reference)\s+["']([^"']+)["']/g)) claimSpec(m[1]);
      continue;
    }
    if (rel.toLowerCase().endsWith(".html")) {
      for (const m of code.matchAll(/<(?:script|link)[^>]+(?:src|href)="([^"]+)"/g)) claimSpec(m[1]);
      continue;
    }
    for (const re of IMPORT_PATTERNS) for (const m of code.matchAll(re)) claimSpec(m[1]);
    if (isConfig(rel)) {
      for (const name of declared) if (new RegExp(`["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(code)) claimed.add(name);
    }
  }
  for (const name of declared) {
    if (!name.startsWith("@types/")) continue;
    if (claimed.has(name.slice(7)) || tsTypes.has(name.slice(7))) claimed.add(name);
  }
  return claimed;
};

// --- 1. The classifier, on a fixture: an import and a CSS import claim; a comment and a bare ---
// --- string do not; a config's quoted plugin name claims; node: imports claim @types/node. ------
const FIXTURE = [
  { rel: "src/a.ts", text: 'import x from "pkg-a";\nexport default x;\n' },
  { rel: "src/b.ts", text: '// import y from "pkg-b";\nconst s = "pkg-b";\nexport default s;\n' },
  { rel: "src/c.css", text: '@import "pkg-c";\n' },
  { rel: "postcss.config.mjs", text: 'export default { plugins: { "pkg-d": {} } };\n' },
  { rel: "src/e.ts", text: 'import "node:fs";\n' },
];
const FIXTURE_DECLARED = ["pkg-a", "pkg-b", "pkg-c", "pkg-d"];
const fixtureClaimed = census(FIXTURE, FIXTURE_DECLARED);
const wanted = [NODE_TYPES, "pkg-a", "pkg-c", "pkg-d"];
ok(`the census reads carriers and not mentions (claimed [${[...fixtureClaimed].sort().join(",")}]; pkg-b is a comment and a bare string)`,
  wanted.every((n) => fixtureClaimed.has(n)) && !fixtureClaimed.has("pkg-b") && fixtureClaimed.size === wanted.length);

// --- 2. Every declared runtime dependency has a reader. ---------------------------------------
const entries = files.map((rel) => ({ rel, text: readFileSync(join(root, rel), "utf8") }));
const claimed = census(entries, declaredNames);
const unreadRuntime = Object.keys(runtime).filter((n) => !claimed.has(n));
ok(`every runtime dependency has a reader (${Object.keys(runtime).length} declared, ${unreadRuntime.length} unread: ${unreadRuntime.join(", ") || "none"})`,
  unreadRuntime.length === 0 && Object.keys(runtime).length >= 8 && claimed.size >= 15);

// --- 3. Every declared dev dependency has a reader; @types/* through the base package. --------
const unreadDev = Object.keys(dev).filter((n) => !claimed.has(n));
ok(`every dev dependency has a reader (${Object.keys(dev).length} declared, ${unreadDev.length} unread: ${unreadDev.join(", ") || "none"}; @types derived, node: builtins read @types/node)`,
  unreadDev.length === 0 && Object.keys(dev).length >= 8 && declaredNames.length >= 18);

// --- 4. The census reads every carrier kind the tree actually uses, and the population is ----
// --- large enough that a green is not a scan of nothing. --------------------------------------
const CARRIERS = ["vite.config.ts", "postcss.config.mjs", "index.html", "scripts/browser-walk.spec.ts", "functions/index.ts", "src/globals.css"];
const missingCarriers = CARRIERS.filter((rel) => !files.includes(rel));
ok(`the census reads every carrier kind (${files.length} files, floor 150; missing carriers ${missingCarriers.join(", ") || "none"})`,
  files.length >= 150 && missingCarriers.length === 0);

// --- 5. The declaration and the lock are one fact: both maps agree in both directions. --------
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const lockRoot = lock.packages?.[""] ?? {};
const mapOf = (o) => Object.keys(o ?? {}).sort().map((k) => `${k}@${o[k]}`).join("\n");
const runtimeDiff = mapOf(runtime) === mapOf(lockRoot.dependencies);
const devDiff = mapOf(dev) === mapOf(lockRoot.devDependencies);
ok(`package-lock's root maps match package.json (runtime ${runtimeDiff ? "same" : "differs"}, dev ${devDiff ? "same" : "differs"})`,
  runtimeDiff && devDiff);

// --- 6. No per-package exemption. The gate quotes no declared name; a planted one is charged. --
const self = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const quotedDeclared = (text) => declaredNames.filter((n) => text.includes(`"${n}"`) || text.includes(`'${n}'`) || text.includes("`" + n + "`"));
const selfHits = quotedDeclared(self);
const planted = 'const SKIP_LIST = ["' + declaredNames[0] + '"];';
ok(`the gate carries no per-package exemption (${selfHits.length} declared name(s) quoted in code; a planted skip list names ${quotedDeclared(planted).length})`,
  selfHits.length === 0 && quotedDeclared(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
