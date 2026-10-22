// M451: the sixth direction of the dead-code boundary -- an import nobody declared. M432 asks
// whether a declared package has a reader; this gate asks the reverse and asks it structurally.
// The reader is the TypeScript parser, not a text scan: a proof script that embeds `import x from
// "pkg"` in a sample string must not be charged, and a real import the bundler resolves only
// through a transitive package must be. CSS references are read the way M432 reads them, because
// a stylesheet's @import is also a package import. Deno's `npm:`/`jsr:`/URL specifiers are the
// Deno function's own dependency model, not this manifest's, and are counted out of scope.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const runtime = pkg.dependencies ?? {};
const dev = pkg.devDependencies ?? {};
const declared = new Set([...Object.keys(runtime), ...Object.keys(dev)]);
const builtins = new Set(builtinModules);

const SKIP = new Set(["node_modules", "dist", ".git", "football-os", "test-results", "vendor"]);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (SKIP.has(e.name) ? [] : walk(join(d, e.name))) : [join(d, e.name)]);
const files = walk(root).map((f) => f.slice(root.length + 1).split("\\").join("/"));
const JS_EXT = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const jsFiles = files.filter((f) => JS_EXT.has(extname(f).toLowerCase()));
const cssFiles = files.filter((f) => f.toLowerCase().endsWith(".css"));

const bare = (spec) => spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
const kindOf = (spec) => {
  if (spec.startsWith(".") || spec.startsWith("/")) return "relative";
  if (spec.startsWith("@/")) return "alias";
  if (/^https?:/.test(spec) || spec.startsWith("npm:") || spec.startsWith("jsr:") || spec.startsWith("data:")) return "remote";
  if (spec.startsWith("node:") || builtins.has(bare(spec))) return "builtin";
  return "bare";
};

const isString = (n) => n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));
const parseJs = (rel, text) => {
  const kind = rel.endsWith(".tsx") ? ts.ScriptKind.TSX : rel.endsWith(".jsx") ? ts.ScriptKind.JSX
    : /\.[mc]?ts$/.test(rel) ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, kind);
  const specs = [];
  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) {
      if (n.moduleSpecifier && isString(n.moduleSpecifier)) specs.push(n.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(n) && ts.isExternalModuleReference(n.moduleReference)) {
      if (isString(n.moduleReference.expression)) specs.push(n.moduleReference.expression.text);
    } else if (ts.isCallExpression(n)) {
      const dynamic = n.expression.kind === ts.SyntaxKind.ImportKeyword;
      const req = ts.isIdentifier(n.expression) && n.expression.text === "require";
      if ((dynamic || req) && n.arguments.length === 1 && isString(n.arguments[0])) specs.push(n.arguments[0].text);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { specs, diagnostics: sf.parseDiagnostics ?? [] };
};

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

const chargeJs = (entries, allowed) => {
  const phantom = new Map();
  const kinds = { relative: 0, alias: 0, builtin: 0, remote: 0, bare: 0 };
  let specs = 0, diagnostics = 0;
  for (const { rel, text } of entries) {
    const parsed = parseJs(rel, text);
    diagnostics += parsed.diagnostics.length;
    for (const spec of parsed.specs) {
      specs++;
      const kind = kindOf(spec);
      kinds[kind]++;
      if (kind !== "bare" || allowed.has(bare(spec))) continue;
      if (!phantom.has(bare(spec))) phantom.set(bare(spec), []);
      phantom.get(bare(spec)).push(`${rel}: ${spec}`);
    }
  }
  return { phantom, specs, kinds, diagnostics };
};

const chargeCss = (entries, allowed) => {
  const phantom = new Map();
  let refs = 0, relative = 0;
  for (const { rel, text } of entries) {
    for (const m of stripComments(text).matchAll(/@(?:import|plugin|reference)\s+["']([^"']+)["']/g)) {
      const spec = m[1];
      if (spec.startsWith(".") || spec.startsWith("/")) { relative++; continue; }
      refs++;
      if (allowed.has(bare(spec))) continue;
      if (!phantom.has(bare(spec))) phantom.set(bare(spec), []);
      phantom.get(bare(spec)).push(`${rel}: ${spec}`);
    }
  }
  return { phantom, refs, relative };
};

// --- 1. The parser reads statements, not samples: a real import is charged, a commented import ---
// --- and an import-shaped string are not, and relative/alias/builtin/Deno specifiers are not. -----
const FIXTURE = [
  { rel: "fixture/known.ts", text: 'import x from "pkg-known";\nexport default x;\n' },
  { rel: "fixture/ghost.ts", text: 'import g from "pkg-ghost";\nexport default g;\n' },
  { rel: "fixture/sample.mjs", text: '// import z from "pkg-commented";\nconst sample = \'import z from "pkg-sampled";\';\nexport const run = () => import("./local.ts");\nexport const dyn = () => import("pkg-dyn-ghost");\n' },
  { rel: "fixture/scope.ts", text: 'import "./local";\nimport x from "@/domain/x";\nimport fs from "node:fs";\nimport again from "fs";\nexport default [x, fs, again];\n' },
  { rel: "fixture/remote.ts", text: 'import "npm:left-pad";\nimport "jsr:@scope/pkg";\nimport "https://example.com/x.ts";\n' },
  { rel: "fixture/installed.ts", text: 'import { chromium } from "pkg-installed-ghost";\nexport default chromium;\n' },
];
const FIXTURE_CSS = [{ rel: "fixture/tokens.css", text: '@import "pkg-known-css";\n@import "pkg-ghost-css";\n@import "../vendor/x.css";\n' }];
const FIXTURE_ALLOWED = new Set(["pkg-known", "pkg-known-css"]);
const fixtureJs = chargeJs(FIXTURE, FIXTURE_ALLOWED);
const fixtureCss = chargeCss(FIXTURE_CSS, FIXTURE_ALLOWED);
const fixturePhantom = [...fixtureJs.phantom.keys(), ...fixtureCss.phantom.keys()].sort();
const wantedPhantom = ["pkg-dyn-ghost", "pkg-ghost", "pkg-ghost-css", "pkg-installed-ghost"];
ok(`the reader charges real imports and not samples (phantom [${fixturePhantom.join(",")}]; sample and comment silent; kinds ${JSON.stringify(fixtureJs.kinds)})`,
  JSON.stringify(fixturePhantom) === JSON.stringify(wantedPhantom)
  && fixtureJs.phantom.get("pkg-ghost").length === 1
  && fixtureJs.kinds.relative === 2 && fixtureJs.kinds.alias === 1 && fixtureJs.kinds.builtin === 2 && fixtureJs.kinds.remote === 3
  && fixtureCss.relative === 1 && fixtureCss.refs === 2);

// --- 2. Every bare specifier a shipped JS/TS file imports is declared in package.json. ----------
const jsEntries = jsFiles.map((rel) => ({ rel, text: readFileSync(join(root, rel), "utf8") }));
const js = chargeJs(jsEntries, declared);
const jsPhantom = [...js.phantom.keys()].sort();
ok(`every imported package is declared (${jsFiles.length} files parsed, ${js.specs} specifiers, ${declared.size} declared; ${jsPhantom.length} phantom: ${jsPhantom.join(", ") || "none"})`,
  jsPhantom.length === 0 && jsFiles.length >= 200 && js.specs >= 1000 && declared.size >= 18);

// --- 3. Every package a stylesheet names is declared too. --------------------------------------
const cssEntries = cssFiles.map((rel) => ({ rel, text: readFileSync(join(root, rel), "utf8") }));
const css = chargeCss(cssEntries, declared);
const cssPhantom = [...css.phantom.keys()].sort();
ok(`every stylesheet package reference is declared (${cssFiles.length} sheets, ${css.refs} package refs, ${css.relative} relative; ${cssPhantom.length} phantom: ${cssPhantom.join(", ") || "none"})`,
  cssPhantom.length === 0 && css.refs >= 2);

// --- 4. Coverage and parse health: the parser saw every file, including this gate, and a syntax --
// --- error is not silently a file with no imports. ----------------------------------------------
const CARRIERS = ["src/main.tsx", "vite.config.ts", "postcss.config.mjs", "scripts/browser-walk.spec.ts", "functions/index.ts", "src/globals.css"];
const missingCarriers = CARRIERS.filter((rel) => !files.includes(rel));
const broken = parseJs("fixture/broken.ts", "const = ;\n");
const selfSource = readFileSync(fileURLToPath(import.meta.url), "utf8");
const selfParsed = parseJs("scripts/proof-phantom-imports.mjs", selfSource);
ok(`the parser reads every shipped file and a syntax error is charged (${jsFiles.length} files, ${js.diagnostics} parse diagnostics; missing carriers ${missingCarriers.join(", ") || "none"}; broken fixture ${broken.diagnostics.length} diagnostic(s); self-read ${selfParsed.specs.length} specifier(s))`,
  js.diagnostics === 0 && missingCarriers.length === 0 && broken.diagnostics.length > 0
  && selfParsed.specs.includes("typescript") && selfParsed.specs.includes("node:fs") && jsFiles.length >= 200);

// --- 5. No per-package exemption: the gate names no declared package in an allow/skip set. ------
const declaredNames = [...declared];
const exemptionHits = (text) => {
  const hits = new Set();
  for (const m of stripComments(text).matchAll(/new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) if (declared.has(q[1])) hits.add(q[1]);
  }
  return [...hits];
};
const selfHits = exemptionHits(selfSource);
const planted = `const SKIP_PACKAGES = new Set(["${declaredNames[0]}"]);`;
ok(`the gate carries no per-package exemption (${selfHits.length} declared name(s) in an allow/skip set; a planted skip list names ${exemptionHits(planted).length})`,
  selfHits.length === 0 && exemptionHits(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
