// M461: the eleventh direction of the dead-code boundary -- a prop an exported component declares
// that no JSX call site passes. M457 charged a record field no reader accesses; a component prop is
// a different join: the prop is usually read *inside* the component (a default, a branch), so the
// question is not "is it referenced" but "does any caller hand it a value". The population is every
// exported PascalCase function (declaration or arrow const) whose first parameter has at least one
// named property; `key`/`ref` are not props a caller writes.
//
// A prop is passed when a JSX opening tag whose tag resolves to that component's symbol carries the
// attribute (through an import alias or a namespace qualifier), or when the element has meaningful
// children and the prop is `children`. Three shapes cannot be attributed from a call site and are
// therefore read whole, conservatively: a spread attribute on the element, a component referenced
// outside JSX at all (a registry, a lazy wrapper's `m.Name`, an HOC argument), and a component with
// no JSX use (rendered dynamically). `cloneElement` gives its second argument without a JSX call
// site, so any occurrence clamps every component; the real-tree clause pins that count at zero,
// because a green under an unattributable call would mean nothing.
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

const isExported = (st) => st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
const isFn = (n) => ts.isArrowFunction(n) || ts.isFunctionExpression(n);

// Pure function of a program, so the fixture and the shipped tree run the same reader.
const census = (program) => {
  const checker = program.getTypeChecker();
  const files = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && !/[\\/]node_modules[\\/]/.test(sf.fileName));
  const resolveAlias = (s) => { try { return s && (s.flags & ts.SymbolFlags.Alias) ? checker.getAliasedSymbol(s) : s; } catch { return s; } };

  const comps = [];
  const skipped = [];
  for (const sf of files) {
    for (const st of sf.statements) {
      if (!isExported(st)) continue;
      let nameNode = null, fn = null;
      if (ts.isFunctionDeclaration(st) && st.name) { nameNode = st.name; fn = st; }
      else if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.initializer && isFn(d.initializer)) { nameNode = d.name; fn = d.initializer; }
        }
      }
      if (!nameNode || !fn || !/^[A-Z]/.test(nameNode.text) || !fn.parameters?.length) continue;
      const line = sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1;
      const propsType = checker.getTypeAtLocation(fn.parameters[0]);
      const props = propsType.getProperties().map((p) => p.name).filter((n) => n !== "key" && n !== "ref");
      if (!props.length) { skipped.push(`${relOf(sf.fileName)}:${line} ${nameNode.text}`); continue; }
      comps.push({ name: nameNode.text, file: sf.fileName, line, sym: checker.getSymbolAtLocation(nameNode), props });
    }
  }
  comps.sort((a, b) => relOf(a.file).localeCompare(relOf(b.file)) || a.name.localeCompare(b.name));
  const bySym = new Map(comps.map((c) => [c.sym, c]));

  const tagSymbol = (tag) => {
    if (ts.isIdentifier(tag)) return resolveAlias(checker.getSymbolAtLocation(tag));
    if (ts.isPropertyAccessExpression(tag)) return resolveAlias(checker.getSymbolAtLocation(tag.name));
    return null;
  };

  const passed = new Map(); // name -> Set(prop)
  const uses = new Map(); // name -> JSX call sites
  const spreadRead = new Set();
  const valueReferenced = new Set();
  let tagUses = 0, cloneCalls = 0;

  for (const sf of files) {
    const visit = (node) => {
      const element = ts.isJsxElement(node) ? node : ts.isJsxSelfClosingElement(node) ? node : null;
      if (element) {
        const attrs = ts.isJsxElement(element) ? element.openingElement.attributes : element.attributes;
        const tag = ts.isJsxElement(element) ? element.openingElement.tagName : element.tagName;
        const c = bySym.get(tagSymbol(tag));
        if (c) {
          tagUses++;
          uses.set(c.name, (uses.get(c.name) ?? 0) + 1);
          if (!passed.has(c.name)) passed.set(c.name, new Set());
          for (const a of attrs.properties) {
            if (ts.isJsxAttribute(a) && (ts.isIdentifier(a.name) || ts.isStringLiteral(a.name))) passed.get(c.name).add(a.name.text);
            else if (ts.isJsxSpreadAttribute(a)) spreadRead.add(c.name);
          }
          const kids = ts.isJsxElement(element) ? element.children : [];
          if (kids.some((ch) => !(ts.isJsxText(ch) && !ch.text.trim()))) passed.get(c.name).add("children");
        }
      } else if (ts.isCallExpression(node)) {
        const callee = node.expression;
        if ((ts.isIdentifier(callee) && callee.text === "cloneElement") ||
            (ts.isPropertyAccessExpression(callee) && callee.name.text === "cloneElement")) cloneCalls++;
      } else if (ts.isIdentifier(node)) {
        const parent = node.parent;
        const isJsxTag = (ts.isJsxOpeningElement(parent) || ts.isJsxSelfClosingElement(parent) || ts.isJsxClosingElement(parent)) && parent.tagName === node;
        const isDeclName = (ts.isFunctionDeclaration(parent) && parent.name === node) || (ts.isVariableDeclaration(parent) && parent.name === node);
        const isImport = ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent);
        const isExport = ts.isExportSpecifier(parent);
        const isPropertyName = ts.isPropertyAccessExpression(parent) && parent.name === node;
        const isJsxTagName = isPropertyName &&
          (ts.isJsxOpeningElement(parent.parent) || ts.isJsxSelfClosingElement(parent.parent) || ts.isJsxClosingElement(parent.parent)) &&
          parent.parent.tagName === parent;
        if (isPropertyName && !isJsxTagName) {
          // A lazy wrapper reads the export through the module object: `m.AiStudio`.
          const c = bySym.get(resolveAlias(checker.getSymbolAtLocation(node)));
          if (c) valueReferenced.add(c.name);
        } else if (!isJsxTag && !isDeclName && !isImport && !isExport && !isPropertyName) {
          const c = bySym.get(resolveAlias(checker.getSymbolAtLocation(node)));
          if (c) valueReferenced.add(c.name);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const fields = [];
  const unread = [];
  const noJsxUse = [];
  for (const c of comps) {
    const got = passed.get(c.name) ?? new Set();
    const n = uses.get(c.name) ?? 0;
    if (!n) noJsxUse.push(`${c.name} (${relOf(c.file)}:${c.line})`);
    const dynamic = !n || valueReferenced.has(c.name) || spreadRead.has(c.name) || cloneCalls > 0;
    for (const p of c.props) {
      fields.push(`${c.name}.${p}`);
      if (!dynamic && !got.has(p)) unread.push(`${c.name}.${p}`);
    }
  }
  unread.sort();
  return {
    comps, fields, unread, skipped, cloneCalls, tagUses,
    noJsxUse: noJsxUse.sort(),
    valueReferenced: [...valueReferenced].sort(),
    spreadRead: [...spreadRead].sort(),
    projectFiles: files.length,
  };
};

// --- Fixture: an exported component whose four ordinary props are read in every shipped spelling ---
// --- (attribute, optional attribute, implicit children, import alias), one prop no caller passes;  ---
// --- a spread element, a value reference and an unused component that must all read whole; and a   ---
// --- second program where `cloneElement` makes every prop unattributable. ------------------------
const FX = root.split(sep).join("/") + "/__fixture__";
const UI_SRC = [
  "export function FxBadge({ fxLabel, fxTone, fxGhost, children }: { fxLabel: string; fxTone?: string; fxGhost: string; children?: unknown; key?: string }) { return null; }",
  "export function FxRenamed({ fxAliasLive, fxAliasDead }: { fxAliasLive: string; fxAliasDead: string }) { return null; }",
  "export function FxSpread({ fxSpreadA, fxSpreadB }: { fxSpreadA: string; fxSpreadB: string }) { return null; }",
  "export function FxDynamic({ fxDyn }: { fxDyn: string }) { return null; }",
  "export function FxCloned({ fxCloned }: { fxCloned: string }) { return null; }",
  "export function FxNever({ fxNever }: { fxNever: string }) { return null; }",
  "export function FxQualified({ fxQualifiedLive, fxQualifiedDead }: { fxQualifiedLive: string; fxQualifiedDead: string }) { return null; }",
  "export const FxArrow = ({ fxArrow }: { fxArrow: string }) => null;",
].join("\n");
const CONSUMER = [
  'import * as UI from "./ui";',
  'import { FxBadge, FxRenamed as FxAlias, FxSpread, FxDynamic, FxArrow } from "./ui";',
  "declare const spread: { fxSpreadA: string; fxSpreadB: string };",
  'export const a = <FxBadge fxLabel="l" fxTone="t">kid</FxBadge>;',
  'export const b = <FxAlias fxAliasLive="x" />;',
  "export const c = <FxSpread {...spread} />;",
  'export const d = <FxArrow fxArrow="y" />;',
  'export const e = <UI.FxQualified fxQualifiedLive="q" />;',
  "export const f = { render: FxDynamic };",
  "export const g = UI.FxCloned;",
].join("\n");
const CLONE_CONSUMER = [
  'import { FxCloned } from "./ui";',
  "declare function cloneElement(node: unknown, props: Record<string, unknown>): unknown;",
  "declare const node: unknown;",
  'export const g = cloneElement(node, { fxCloned: "z" });',
].join("\n");

const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
if (!configPath) throw new Error("tsconfig.json not found");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, " "));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
const options = { ...parsed.options, noEmit: true };

const fixtureProgram = (files) => {
  const fixtureOptions = { ...options, types: [], skipLibCheck: true };
  const host = ts.createCompilerHost(fixtureOptions);
  const norm = (p) => p.split("\\").join("/").toLowerCase();
  const virtual = new Map(Object.entries(files).map(([k, v]) => [norm(k), { name: k, text: v }]));
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
  return ts.createProgram(Object.keys(files), fixtureOptions, host);
};

const fx = census(fixtureProgram({ [`${FX}/ui.tsx`]: UI_SRC, [`${FX}/consumer.tsx`]: CONSUMER }));
ok(`the reader joins JSX passes to props in every spelling (unread [${fx.unread.join(",")}]; ${fx.fields.length} props over ${fx.comps.length} components, ${fx.tagUses} call site(s))`,
  fx.unread.join(",") === "FxBadge.fxGhost,FxQualified.fxQualifiedDead,FxRenamed.fxAliasDead" && fx.fields.length === 14 && fx.comps.length === 8 && fx.tagUses === 5);

ok(`the census discloses the shapes it cannot charge and does not let them hide a dead prop (${fx.noJsxUse.length} with no JSX call site: ${fx.noJsxUse.join("; ")}; value-referenced [${fx.valueReferenced.join(",")}]; spread [${fx.spreadRead.join(",")}]; ${fx.cloneCalls} cloneElement call(s))`,
  fx.noJsxUse.length === 3 && ["FxCloned", "FxDynamic", "FxNever"].every((n) => fx.noJsxUse.some((z) => z.startsWith(n + " "))) &&
  fx.valueReferenced.join(",") === "FxCloned,FxDynamic" && fx.spreadRead.join(",") === "FxSpread" && fx.cloneCalls === 0);

const fxClone = census(fixtureProgram({ [`${FX}/ui.tsx`]: UI_SRC, [`${FX}/consumer.tsx`]: CONSUMER, [`${FX}/clone.tsx`]: CLONE_CONSUMER }));
ok(`cloneElement makes its second argument unattributable, so every prop reads (${fxClone.cloneCalls} call(s), ${fxClone.unread.length} charged of ${fxClone.fields.length})`,
  fxClone.cloneCalls === 1 && fxClone.unread.length === 0 && fxClone.fields.length === 14);

// --- The real tree: every prop every exported component declares is passed by a JSX call site. ----
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "dev", "football-os", "test-results", "vendor"]);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : walk(p);
  return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
});
const walked = ROOTS.filter((d) => { try { statSync(join(root, d)); return true; } catch { return false; } }).flatMap((d) => walk(join(root, d)));
const program = ts.createProgram([...new Set([...parsed.fileNames, ...walked])], options);
const tree = census(program);
ok(`every prop an exported component declares is passed by a call site (${tree.comps.length} components, ${tree.fields.length} props, ${tree.fields.length - tree.unread.length} passed; ${tree.unread.length} unpassed: ${tree.unread.join(", ") || "none"})`,
  tree.unread.length === 0 && tree.comps.length >= 25 && tree.fields.length >= 55);

// --- Coverage and parse health: the walk admits the shipped tree, finds call sites, and exercises ---
// --- at least one conservative clamp. A green over zero tags would mean the join found nothing. -----
ok(`the census reads the shipped tree and its dynamic shapes (${tree.projectFiles} project files, ${tree.tagUses} JSX call sites; ${tree.noJsxUse.length} with no JSX call site: ${tree.noJsxUse.join("; ") || "none"}; ${tree.valueReferenced.length} value-referenced, ${tree.spreadRead.length} spread; ${tree.skipped.length} prop-less; ${tree.cloneCalls} cloneElement)`,
  tree.projectFiles >= 90 && tree.tagUses >= 150 && tree.noJsxUse.length + tree.valueReferenced.length + tree.spreadRead.length >= 1 && tree.cloneCalls === 0);

// --- No per-name exemption. The gate quotes no component or prop name in a skip set; a planted ---
// --- skip list is charged. -----------------------------------------------------------------------
const selfSource = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const declared = new Set([...tree.fields, ...tree.comps.map((c) => c.name)]);
const exemptionHits = (text) => {
  const hits = new Set();
  for (const m of text.matchAll(/new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) if (declared.has(q[1])) hits.add(q[1]);
  }
  return [...hits];
};
const selfHits = exemptionHits(selfSource);
const planted = `const SKIP_PROPS = new Set(["${tree.fields[0]}"]);`;
ok(`the gate carries no per-name exemption (${selfHits.length} declared name(s) in a skip set; a planted skip list names ${exemptionHits(planted).length})`,
  selfHits.length === 0 && exemptionHits(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
