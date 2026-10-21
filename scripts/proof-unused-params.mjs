// M430: the fourth direction's other half -- a parameter a function never reads. tsc finds these
// under noUnusedParameters, which the build never arms. This gate asks through the compiler API,
// arms the setting on a fixture (a read parameter and an underscore-prefixed one stay uncharged),
// and reads the real tree.
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { skipReason } from "./lib/appTree.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const UNUSED = new Set([6133, 6192, 6196]);
const unusedOf = (program) => ts.getPreEmitDiagnostics(program).filter((d) => UNUSED.has(d.code));
const describe = (d) => {
  const file = d.file ? d.file.fileName.replace(root + "\\", "").replace(root + "/", "") : "(no file)";
  const pos = d.file && d.start != null ? d.file.getLineAndCharacterOfPosition(d.start) : null;
  return `${file}${pos ? `:${pos.line + 1}:${pos.character + 1}` : ""} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
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

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("tsconfig.json not found");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, " "));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
const realOptions = { ...parsed.options, noEmit: true, noUnusedParameters: true };

// --- 1. The setting is armed, on the same options the real tree uses. A virtual module holds ---
// --- one unread parameter, one read parameter and one underscore-prefixed parameter: the flag ---
// --- must charge exactly the first, and leave the underscore convention alone. ----------------
const FIXTURE = {
  "unused-param.ts": "export const f = (unused: number) => 1;\n",
  "read-param.ts": "export const g = (read: number) => read;\n",
  "underscore-param.ts": "export const h = (_ignored: number) => 1;\n",
};
const fixtureOptions = { ...realOptions, noLib: true, types: [], noUnusedLocals: false };
const fixtureHost = ts.createCompilerHost(fixtureOptions);
const baseGetSourceFile = fixtureHost.getSourceFile.bind(fixtureHost);
fixtureHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
  Object.hasOwn(FIXTURE, fileName)
    ? ts.createSourceFile(fileName, FIXTURE[fileName], languageVersion, true)
    : baseGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
fixtureHost.fileExists = (f) => Object.hasOwn(FIXTURE, f) || ts.sys.fileExists(f);
fixtureHost.readFile = (f) => Object.hasOwn(FIXTURE, f) ? FIXTURE[f] : ts.sys.readFile(f);
const fixture = ts.createProgram(Object.keys(FIXTURE), fixtureOptions, fixtureHost);
const fixtureDiags = unusedOf(fixture);
const unreadHits = fixtureDiags.filter((d) => d.file?.fileName === "unused-param.ts");
const readHits = fixtureDiags.filter((d) => d.file?.fileName === "read-param.ts");
const underscoreHits = fixtureDiags.filter((d) => d.file?.fileName === "underscore-param.ts");
ok(`the compiler is armed for parameters: an unread parameter is charged, a read one and an underscore-prefixed one are not (unread ${unreadHits.length}${unreadHits.length ? ` [${unreadHits.map(describe).join("; ")}]` : ""}, read ${readHits.length}, underscore ${underscoreHits.length})`,
  unreadHits.length === 1 && unreadHits[0].code === 6133 && readHits.length === 0 && underscoreHits.length === 0);

// --- 2. The real tree under the same flag. Any TS6133/6192/6196 diagnostic is a parameter no ---
// --- one reads. ---------------------------------------------------------------------------------
const program = ts.createProgram(parsed.fileNames, realOptions);
const realDiags = unusedOf(program);
ok(`the real tree has no unread parameter (${realDiags.length} diagnostic(s)${realDiags.length ? `: ${realDiags.slice(0, 8).map(describe).join("; ")}` : ""})`,
  realDiags.length === 0);

// --- 3. The program reads every module the walk names. A file tsc never sees cannot be charged, ---
// --- so coverage is part of the claim. functions/ is Deno code, outside the app's tsconfig. ----
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"];
const NON_APP = ["functions", "scripts", "dev", "dist", "node_modules", "test-results", "vendor"];
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = `${d}/${e.name}`;
  if (e.isDirectory()) return skipReason(e.name, p) ? [] : walk(p);
  return [p];
});
const files = ROOTS.filter((d) => { try { statSync(join(root, d)); return true; } catch { return false; } })
  .flatMap((d) => walk(join(root, d))).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts"))
  .map((f) => f.slice(root.length + 1).split("\\").join("/"));
const topDirs = readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const carriesTs = (d) => {
  try {
    const entries = readdirSync(join(root, d), { withFileTypes: true });
    if (entries.some((e) => e.isFile() && /\.tsx?$/.test(e.name))) return true;
    return entries.some((e) => e.isDirectory() && e.name !== "node_modules" && carriesTs(`${d}/${e.name}`));
  } catch { return false; }
};
const uncovered = topDirs.filter((d) => !ROOTS.includes(d) && !skipReason(d, join(root, d), NON_APP) && carriesTs(d));
const lower = (p) => resolve(p).toLowerCase();
const inProgram = new Set(program.getSourceFiles().filter((f) => !f.isDeclarationFile).map((f) => lower(f.fileName)));
const missing = files.filter((rel) => !inProgram.has(lower(join(root, rel))));
ok(`the program reads every shipped module the walk names (${files.length} walked, floor 90; ${missing.length} missing${missing.length ? `: ${missing.slice(0, 4).join(", ")}` : ""}; ${uncovered.length} uncovered director${uncovered.length === 1 ? "y" : "ies"})`,
  files.length >= 90 && missing.length === 0 && uncovered.length === 0);

// --- 4. No file can silence the compiler. A suppression on the line above an unread parameter ---
// --- would hide it from the program the gate reads, so the directives are charged structurally. --
const SUPPRESS = /\/\/[ \t]*@ts-(nocheck|ignore|expect-error)\b/;
const suppressed = files.filter((rel) => SUPPRESS.test(readFileSync(join(root, rel), "utf8")));
ok(`no app file suppresses the compiler (${suppressed.length} file(s)${suppressed.length ? `: ${suppressed.join(", ")}` : ""})`,
  suppressed.length === 0);

// --- 5. No per-file exemption. The gate names no shipped path in code; a planted skip list is -----
// --- charged, proving the scan reads the right thing. ---------------------------------------------
const self = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const quoted = (text) => [...text.matchAll(/["']((?:domain|data|lib|features|components|ui|src|store|i18n)\/[^"']+)["']/g)].map((m) => m[1]);
const selfPaths = quoted(self);
const planted = 'const SKIP_LIST = ["' + ["domain", "legacy.ts"].join("/") + '"];';
ok(`the gate carries no per-file exemption (${selfPaths.length} shipped path(s) quoted in code [${selfPaths.join(",")}]; a planted skip list names ${quoted(planted).length})`,
  selfPaths.length === 0 && quoted(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
