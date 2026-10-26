// M500: the twelfth direction of the dead-code boundary -- an optional parameter no caller ever
// reaches. M461 charged a component prop no JSX call site passes; this is the positional sibling:
// a function may declare `top = 5` or `rev?`, read it, and still be called by every shipped caller
// with fewer arguments, so the default runs forever and the option is dead configurability.
//
// The population is every top-level function with an optional or defaulted parameter. A parameter
// is reached when any resolved call site passes an argument at that index. Both planes are read:
// the typed tree (import aliases, `.call`, `.apply`, namespace-qualified calls) and the proof
// scripts, which are plain JS loaded through `vite.ssrLoadModule` -- their syntactic arity is real
// evidence even though their values are `any`. A script's destructured and namespace bindings are
// mapped back to the exported name; a spread makes arity unknown; a binding used anywhere outside
// a call (a callback argument, an array of functions) makes the function's arity unattributable
// and reads all of its options. The same clamps apply in the typed tree, plus a function with no
// call sites at all. A green must never rest on an unattributable call.
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const relOf = (fileName) => relative(root, resolve(fileName)).split(sep).join("/");

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

const census = (program, scripts) => {
  const checker = program.getTypeChecker();
  const files = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && !/[\\/]node_modules[\\/]/.test(sf.fileName));
  const resolveAlias = (s) => { try { return s && (s.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(s) : s; } catch { return s; } };

  const fns = [];
  for (const sf of files) {
    for (const st of sf.statements) {
      const collect = (nameNode, fn) => {
        const opts = [];
        fn.parameters.forEach((p, i) => {
          if (p.dotDotDotToken) return;
          if (p.questionToken || p.initializer) opts.push({ name: ts.isIdentifier(p.name) ? p.name.text : `#${i}`, index: i });
        });
        if (!opts.length) return;
        fns.push({
          name: nameNode.text, file: sf.fileName,
          line: sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1,
          sym: checker.getSymbolAtLocation(nameNode), opts,
          tsMax: -1, tsCalls: 0, jsMax: -1, jsCalls: 0,
          valueRef: false, spread: false, jsClamp: false, noExport: !(st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)),
        });
      };
      if (ts.isFunctionDeclaration(st) && st.name) collect(st.name, st);
      else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) collect(d.name, d.initializer);
      }
    }
  }
  fns.sort((a, b) => relOf(a.file).localeCompare(relOf(b.file)) || a.name.localeCompare(b.name));
  const bySym = new Map(fns.map((f) => [f.sym, f]));
  const byName = new Map(fns.map((f) => [f.name, f]));

  const count = (f, args, kind) => {
    if (kind === "ts") { f.tsCalls++; } else { f.jsCalls++; }
    if (args.some((a) => ts.isSpreadElement(a))) { f.spread = true; if (kind === "ts") f.tsMax = Infinity; else f.jsMax = Infinity; return; }
    const n = args.length;
    if (kind === "ts") f.tsMax = Math.max(f.tsMax, n); else f.jsMax = Math.max(f.jsMax, n);
  };

  // --- The typed plane -------------------------------------------------------------------------
  for (const sf of files) {
    const visit = (node) => {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const callee = node.expression;
        const eff = ts.isPropertyAccessExpression(callee) && (callee.name.text === "call" || callee.name.text === "apply")
          ? (callee.name.text === "apply" ? "apply" : "call") : "plain";
        let target = null;
        if (ts.isIdentifier(callee)) target = bySym.get(resolveAlias(checker.getSymbolAtLocation(callee)));
        else if (ts.isPropertyAccessExpression(callee)) {
          target = bySym.get(resolveAlias(checker.getSymbolAtLocation(callee.name))) ??
            bySym.get(resolveAlias(checker.getSymbolAtLocation(callee.expression)));
        }
        if (target) {
          if (eff === "apply") { target.tsCalls++; target.tsMax = Infinity; }
          else if (eff === "call") count(target, node.arguments.slice(1), "ts");
          else count(target, node.arguments, "ts");
        }
      } else if (ts.isIdentifier(node)) {
        const parent = node.parent;
        const isCallee = (ts.isCallExpression(parent) || ts.isNewExpression(parent)) && parent.expression === node;
        const isDecl = (ts.isFunctionDeclaration(parent) && parent.name === node) || (ts.isVariableDeclaration(parent) && parent.name === node);
        const isImport = ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent);
        const isExport = ts.isExportSpecifier(parent);
        const isPropertyName = ts.isPropertyAccessExpression(parent) && parent.name === node;
        const isCallHelper = isPropertyName && ts.isCallExpression(parent.parent) && parent.parent.expression === parent;
        // The receiver of a method call (`FxCall.call(...)`) is a call site, not a value reference.
        const isReceiver = ts.isPropertyAccessExpression(parent) && parent.expression === node &&
          ts.isCallExpression(parent.parent) && parent.parent.expression === parent;
        // A function picked out through an object (`{ Fx }`, `holder.Fx`) binds a property symbol,
        // so follow the property's declaration back to the function it carries.
        const fnForPropertyName = (nameNode, expr) => {
          const prop = checker.getPropertyOfType(checker.getTypeAtLocation(expr), nameNode.text);
          for (const d of prop?.getDeclarations() ?? []) {
            if (ts.isShorthandPropertyAssignment(d)) {
              const vs = checker.getShorthandAssignmentValueSymbol(d);
              const f = vs && bySym.get(resolveAlias(vs));
              if (f) return f;
            } else if (ts.isPropertyAssignment(d) && ts.isIdentifier(d.initializer)) {
              const f = bySym.get(resolveAlias(checker.getSymbolAtLocation(d.initializer)));
              if (f) return f;
            }
          }
          return prop ? bySym.get(resolveAlias(prop)) ?? null : null;
        };
        const shorthand = ts.isShorthandPropertyAssignment(parent) && parent.name === node;
        if (shorthand) {
          const vs = checker.getShorthandAssignmentValueSymbol(parent);
          const f = vs && bySym.get(resolveAlias(vs));
          if (f) f.valueRef = true;
        } else if (!isCallee && !isDecl && !isImport && !isExport && !isPropertyName && !isReceiver) {
          const f = bySym.get(resolveAlias(checker.getSymbolAtLocation(node)));
          if (f) f.valueRef = true;
        } else if (isPropertyName && !isCallHelper) {
          const f = bySym.get(resolveAlias(checker.getSymbolAtLocation(node))) ?? fnForPropertyName(node, parent.expression);
          if (f) f.valueRef = true;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  // --- The untyped plane: proof scripts --------------------------------------------------------
  let scriptBindings = 0, scriptCalls = 0;
  for (const { text, name } of scripts) {
    const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const localToExport = new Map();
    const namespaces = new Set();
    const bind = (node) => {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        const init = node.initializer;
        const ssrCall = ts.isCallExpression(init) && ts.isPropertyAccessExpression(init.expression) && init.expression.name.text === "ssrLoadModule"
          ? init
          : ts.isAwaitExpression(init) && ts.isCallExpression(init.expression) && ts.isPropertyAccessExpression(init.expression.expression) && init.expression.expression.name.text === "ssrLoadModule"
            ? init.expression : null;
        const fromNamespace = !ssrCall && ts.isIdentifier(init) && namespaces.has(init.text);
        if (ssrCall || fromNamespace) {
          if (ts.isObjectBindingPattern(node.name)) {
            for (const el of node.name.elements) {
              if (!ts.isIdentifier(el.name)) continue;
              const exp = el.propertyName ? (ts.isIdentifier(el.propertyName) ? el.propertyName.text : null) : el.name.text;
              if (exp) { localToExport.set(el.name.text, exp); scriptBindings++; }
            }
          } else if (ts.isIdentifier(node.name)) namespaces.add(node.name.text);
        }
      }
      ts.forEachChild(node, bind);
    };
    bind(sf);

    const visit = (node) => {
      if (ts.isCallExpression(node)) {
        let exported = null;
        if (ts.isIdentifier(node.expression)) exported = localToExport.get(node.expression.text) ?? null;
        else if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && namespaces.has(node.expression.expression.text)) exported = node.expression.name.text;
        const f = exported ? byName.get(exported) : null;
        if (f) { count(f, node.arguments, "js"); scriptCalls++; }
      } else if (ts.isIdentifier(node)) {
        const parent = node.parent;
        const isCallCallee = ts.isCallExpression(parent) && parent.expression === node;
        const isBinding = ts.isBindingElement(parent) && (parent.name === node || parent.propertyName === node);
        const isVarName = ts.isVariableDeclaration(parent) && parent.name === node;
        const isProperty = ts.isPropertyAccessExpression(parent) && (parent.name === node || parent.expression === node);
        const isImport = ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent);
        if (isCallCallee || isBinding || isVarName || isProperty || isImport) return;
        const mapped = localToExport.get(node.text) ?? (byName.has(node.text) ? node.text : null);
        if (mapped) { const f = byName.get(mapped); if (f) f.jsClamp = true; }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const fields = [];
  const unread = [];
  const clamped = { noCall: [], valueRef: [], spread: [], script: [] };
  for (const f of fns) {
    const noCall = f.tsCalls + f.jsCalls === 0;
    const isClamped = noCall || f.valueRef || f.spread || f.jsClamp;
    if (noCall) clamped.noCall.push(f.name);
    if (f.valueRef) clamped.valueRef.push(f.name);
    if (f.spread) clamped.spread.push(f.name);
    if (f.jsClamp) clamped.script.push(f.name);
    const max = Math.max(f.tsMax, f.jsMax);
    for (const o of f.opts) {
      fields.push(`${f.name}.${o.name}`);
      if (!isClamped && max <= o.index) unread.push(`${f.name}.${o.name}`);
    }
  }
  unread.sort();
  return {
    fns, fields, unread, clamped, scriptBindings, scriptCalls, projectFiles: files.length,
    tsCalls: fns.reduce((n, f) => n + f.tsCalls, 0),
    localFns: fns.filter((f) => f.noExport).map((f) => f.name),
  };
};

// --- Fixture: options passed by name (typed and script planes), an option charged, and every -----
// --- unattributable shape read whole: a callback value, a namespace property value, a spread call, ---
// --- a function with no call sites, and a script binding used outside a call. --------------------
const FX = root.split(sep).join("/") + "/__fixture__";
const FIXTURE = {
  [`${FX}/opts.ts`]: [
    "export function FxDead(a: string, opt?: number, def = 3) { return a + (opt ?? def); }",
    'export const fxDeadCall = FxDead("x");',
    "export function FxUsed(a: string, opt?: number) { return a + (opt ?? 0); }",
    'export const fxUsedCall = FxUsed("x", 2);',
    "export function FxCallback(a: string, opt?: number) { return a; }",
    'export const fxCallback = ["x"].map(FxCallback);',
    'export const fxCallbackCalled = FxCallback("y");',
    "export function FxSpreadCall(a: string, opt?: number) { return a; }",
    "declare const fxArgs: [string, number];",
    "export const fxSpreadCall = FxSpreadCall(...fxArgs);",
    "export function FxCall(a: string, opt?: number) { return a; }",
    'export const fxCall = FxCall.call(null, "x", 2);',
    "export function FxNoCaller(a: string, opt?: number) { return a; }",
    "export function FxScriptedAlive(a: string, opt?: number) { return a; }",
    "export function FxScriptedDead(a: string, opt?: number) { return a; }",
    "export function FxScriptedArg(a: string, opt?: number) { return a; }",
    "export function FxScriptedSpread(a: string, opt?: number) { return a; }",
    "export function FxPropertyRef(a: string, opt?: number) { return a; }",
    "export const fxHolder = { FxPropertyRef };",
    "export const fxPicked = fxHolder.FxPropertyRef;",
  ].join("\n"),
};
const FX_SCRIPTS = [{
  name: "fx-proof.mjs",
  text: [
    'const { FxScriptedAlive, FxScriptedDead, FxScriptedArg, FxScriptedSpread } = await server.ssrLoadModule("/opts.ts");',
    "FxScriptedAlive(1, 2);",
    "FxScriptedDead(1);",
    "const keep = [FxScriptedDead];",
    "FxScriptedArg(1);",
    "FxScriptedSpread(...args);",
  ].join("\n"),
}];

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("tsconfig.json not found");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, " "));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
const options = { ...parsed.options, noEmit: true };

const fixtureOptions = { ...options, types: [], skipLibCheck: true };
const host = ts.createCompilerHost(fixtureOptions);
const norm = (p) => p.split("\\").join("/").toLowerCase();
const virtual = new Map(Object.entries(FIXTURE).map(([k, v]) => [norm(k), { name: k, text: v }]));
const baseGetSourceFile = host.getSourceFile.bind(host);
const sources = new Map();
host.getSourceFile = (fileName, languageVersion, onError, fresh) => {
  const v = virtual.get(norm(fileName));
  if (!v) return baseGetSourceFile(fileName, languageVersion, onError, fresh);
  if (!sources.has(norm(fileName))) sources.set(norm(fileName), ts.createSourceFile(v.name, v.text, languageVersion, true));
  return sources.get(norm(fileName));
};
host.fileExists = (f) => virtual.has(norm(f)) || ts.sys.fileExists(f);
host.readFile = (f) => virtual.get(norm(f))?.text ?? ts.sys.readFile(f);
const baseDirectoryExists = host.directoryExists?.bind(host);
host.directoryExists = (d) => norm(d).startsWith(norm(FX)) || (baseDirectoryExists ? baseDirectoryExists(d) : false);
const baseRealpath = host.realpath?.bind(host);
host.realpath = (p) => virtual.get(norm(p))?.name ?? (baseRealpath ? baseRealpath(p) : p);
const fx = census(ts.createProgram(Object.keys(FIXTURE), fixtureOptions, host), FX_SCRIPTS);

ok(`the reader charges an option no caller reaches, on both planes (unread [${fx.unread.join(",")}]; ${fx.fields.length} options over ${fx.fns.length} functions, ${fx.tsCalls} typed + ${fx.scriptCalls} script calls)`,
  fx.unread.join(",") === "FxDead.def,FxDead.opt,FxScriptedArg.opt" && fx.fields.length === 12 && fx.fns.length === 11 &&
  fx.tsCalls === 5 && fx.scriptCalls === 4 && fx.scriptBindings === 4);

ok(`the census reads every unattributable shape whole (clamped: no-call [${fx.clamped.noCall.join(",")}], value [${fx.clamped.valueRef.join(",")}], spread [${fx.clamped.spread.join(",")}], script [${fx.clamped.script.join(",")}])`,
  fx.clamped.noCall.join(",") === "FxNoCaller,FxPropertyRef" && fx.clamped.valueRef.join(",") === "FxCallback,FxPropertyRef" &&
  fx.clamped.spread.join(",") === "FxScriptedSpread,FxSpreadCall" && fx.clamped.script.join(",") === "FxScriptedDead");

// --- The real tree: every option every top-level function declares is reached by some caller. ----
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "dev", "football-os", "test-results", "vendor"]);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : walk(p);
  return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
});
const walked = ROOTS.filter((d) => { try { statSync(join(root, d)); return true; } catch { return false; } }).flatMap((d) => walk(join(root, d)));
const program = ts.createProgram([...new Set([...parsed.fileNames, ...walked])], options);
const shippedScripts = readdirSync(join(root, "scripts"), { withFileTypes: true })
  .filter((e) => e.isFile() && /\.(mjs|js|cjs)$/.test(e.name))
  .map((e) => ({ name: e.name, text: readFileSync(join(root, "scripts", e.name), "utf8") }));
const tree = census(program, shippedScripts);
ok(`every option a top-level function declares is reached by a caller (${tree.fns.length} functions, ${tree.fields.length} options, ${tree.fields.length - tree.unread.length} reached; ${tree.unread.length} unreached: ${tree.unread.join(", ") || "none"}; read whole: no-call [${tree.clamped.noCall.join(",") || "none"}], value [${tree.clamped.valueRef.join(",") || "none"}], spread [${tree.clamped.spread.join(",") || "none"}], script [${tree.clamped.script.join(",") || "none"}])`,
  tree.unread.length === 0 && tree.fns.length >= 30 && tree.fields.length >= 30);

// --- Coverage and parse health: both planes are populated, so a green is not a scan of nothing. ---
ok(`the census reads both planes and maps the scripts' bindings (${tree.projectFiles} project files, ${tree.tsCalls} typed calls; ${shippedScripts.length} scripts, ${tree.scriptBindings} mapped bindings / ${tree.scriptCalls} script calls; ${tree.localFns.length} local: ${tree.localFns.join(",") || "none"})`,
  tree.projectFiles >= 90 && tree.tsCalls >= 80 && shippedScripts.length >= 100 && tree.scriptBindings >= 200 && tree.scriptCalls >= 200);

// --- No per-name exemption. The gate quotes no function or option name in a skip set; a planted ---
// --- skip list is charged. -----------------------------------------------------------------------
const selfSource = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const declared = new Set(tree.fields);
for (const f of tree.fns) declared.add(f.name);
const exemptionHits = (text) => {
  const hits = new Set();
  for (const m of text.matchAll(/new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) if (declared.has(q[1])) hits.add(q[1]);
  }
  return [...hits];
};
const selfHits = exemptionHits(selfSource);
const planted = `const SKIP_OPTIONS = new Set(["${tree.fields[0]}"]);`;
ok(`the gate carries no per-name exemption (${selfHits.length} declared name(s) in a skip set; a planted skip list names ${exemptionHits(planted).length})`,
  selfHits.length === 0 && exemptionHits(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
