// M457: the tenth direction of the dead-code boundary -- a field an exported model record declares
// that no shipped file reads. The population is every exported interface (and exported type-literal
// alias) with at least one property signature: `Split extends ResultTally` inherits its base's
// fields, and the base is itself exported and counted there, so a field is judged where it is
// declared.
//
// A field is read when any access of that name lands on a value whose type is structurally related
// to the record. Identity is not the right join here: the engine's shape is mirrored into
// domain/types.ts and the screens read the mirror (SimTeamStats is read through MatchStats), so a
// declaration-identity census over-charges every mirrored record. Both assignment directions count,
// which stays conservative -- a wider type can read a narrower one's field.
//
// The shipped proofs are plain JS loaded through `vite.ssrLoadModule`, so every value there is
// `any` and the only sound join is a name-level mention: a field any other proof script names is
// not charged. This gate's own source is excluded from that scan, because the counter reading its
// own fixture is not a consumer and counting it would make the population depend on the gate.
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const selfName = basename(fileURLToPath(import.meta.url));
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
const named = (m) => ts.isPropertySignature(m) && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name));

// The census is a pure function of a program (plus the untyped script texts), so the fixture and
// the real tree go through the same code.
const census = (program, scripts) => {
  const checker = program.getTypeChecker();
  const files = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && !/[\\/]node_modules[\\/]/.test(sf.fileName));
  const decls = [];
  const fieldless = [];
  const unresolved = [];

  for (const sf of files) {
    for (const st of sf.statements) {
      if (!isExported(st)) continue;
      const line = sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1;
      const members =
        ts.isInterfaceDeclaration(st) ? st.members
          : ts.isTypeAliasDeclaration(st) && ts.isTypeLiteralNode(st.type) ? st.type.members
            : null;
      if (!members) continue;
      const fields = members.filter(named);
      if (!fields.length) { fieldless.push(`${relOf(sf.fileName)}:${line} ${st.name.text}`); continue; }
      const sym = checker.getSymbolAtLocation(st.name);
      const type = sym ? checker.getDeclaredTypeOfSymbol(sym) : null;
      if (!type) { unresolved.push(`${relOf(sf.fileName)}:${line} ${st.name.text}`); continue; }
      decls.push({
        name: st.name.text,
        file: sf.fileName,
        line,
        type,
        fields: fields.map((m) => m.name.text),
      });
    }
  }
  decls.sort((a, b) => relOf(a.file).localeCompare(relOf(b.file)) || a.name.localeCompare(b.name));

  // Every access site of a name, with the receiver's type. A destructuring binding has no receiver
  // expression, so the type comes from the declaration it binds against -- a variable initializer, a
  // parameter, or a for-of element.
  const accesses = new Map();
  const add = (name, type) => {
    if (!type) return;
    if (!accesses.has(name)) accesses.set(name, []);
    accesses.get(name).push(type);
  };
  for (const sf of files) {
    const visit = (node) => {
      if (ts.isPropertyAccessExpression(node)) add(node.name.text, checker.getTypeAtLocation(node.expression));
      else if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) add(node.argumentExpression.text, checker.getTypeAtLocation(node.expression));
      else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
        const key = node.propertyName
          ? (ts.isIdentifier(node.propertyName) || ts.isStringLiteral(node.propertyName) ? node.propertyName.text : null)
          : (ts.isIdentifier(node.name) ? node.name.text : null);
        const owner = node.parent.parent;
        if (key && ts.isVariableDeclaration(owner)) {
          // A for-of binding has no initializer; the declaration itself already carries the
          // element type, and its parent chain names the loop.
          if (owner.initializer) add(key, checker.getTypeAtLocation(owner.initializer));
          else if (ts.isVariableDeclarationList(owner.parent) && ts.isForOfStatement(owner.parent.parent)) add(key, checker.getTypeAtLocation(owner));
        } else if (key && ts.isParameter(owner)) add(key, checker.getTypeAtLocation(owner));
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }

  const scriptNames = new Set();
  for (const s of scripts) {
    for (const m of s.text.matchAll(/\.([A-Za-z_$][\w$]*)\b/g)) scriptNames.add(m[1]);
    for (const m of s.text.matchAll(/\{([^{}]*)\}\s*=/g)) {
      for (const n of m[1].split(",")) {
        const id = n.trim().split(":")[0].trim();
        if (/^[A-Za-z_$][\w$]*$/.test(id)) scriptNames.add(id);
      }
    }
  }

  const related = (recordType, exprType) => {
    try {
      return checker.isTypeAssignableTo(recordType, exprType) || checker.isTypeAssignableTo(exprType, recordType);
    } catch { return false; }
  };

  const fields = [];
  const unread = [];
  for (const d of decls) {
    for (const name of d.fields) {
      const key = `${d.name}.${name}`;
      fields.push(key);
      if (scriptNames.has(name)) continue;
      const sites = accesses.get(name) ?? [];
      if (!sites.some((t) => related(d.type, t))) unread.push(key);
    }
  }
  unread.sort();
  const sites = [...accesses.values()].reduce((n, v) => n + v.length, 0);
  return {
    decls,
    fields,
    unread,
    fieldless,
    unresolved,
    projectFiles: files.length,
    accessNames: accesses.size,
    sites,
    scriptFiles: scripts.length,
    scriptNames: scriptNames.size,
  };
};

// --- The fixture program: an exported record whose four ordinary fields are read in every way a ---
// --- shipped file can read one (destructured variable, destructured parameter, destructured for-of, ---
// --- a structural twin, and a proof script's name); one field reached only through a same-shaped ---
// --- but unrelated record, which must stay charged; one field no one reads; and an exported type ---
// --- alias, whose dead field must be charged too. A method-only interface must be disclosed, not ---
// --- crash the walk. -----------------------------------------------------------------------------
const FX = root.split(sep).join("/") + "/__fixture__";
const FIXTURE = {
  [`${FX}/model.ts`]: [
    'export interface FxRecord { fxLive: number; fxParam: number; fxLoop: number; fxTwin: number; fxKind: "record"; fxScripted: number; fxGhost: number; }',
    "export type FxAlias = { fxAliasRead: number; fxAliasDead: number };",
    "export interface FxMethods { run(): void; }",
    "export declare const record: FxRecord;",
    "export declare const list: FxRecord[];",
    "export declare const alias: FxAlias;",
  ].join("\n"),
  [`${FX}/consumer.ts`]: [
    'import { record, list, alias } from "./model";',
    "export const { fxLive } = record;",
    "export const pick = ({ fxParam }: typeof record) => fxParam;",
    "export let looped = 0;",
    "for (const { fxLoop } of list) { looped += fxLoop; }",
    "export const aliasRead = alias.fxAliasRead;",
  ].join("\n"),
  [`${FX}/twin.ts`]: [
    "interface FxMirror { fxLive: number; fxParam: number; fxLoop: number; fxTwin: number; fxKind: \"record\"; fxScripted: number; fxGhost: number; }",
    "declare const mirror: FxMirror;",
    "export const twinRead = mirror.fxTwin;",
    "export const kindRead = mirror.fxKind;",
  ].join("\n"),
  [`${FX}/stranger.ts`]: [
    "interface FxStranger { fxKind: \"stranger\"; fxGhost: number; }",
    "declare const stranger: FxStranger;",
    "export const strangerGhost = stranger.fxGhost;",
  ].join("\n"),
};
const FX_SCRIPTS = [{ name: "fx-proof.mjs", text: "const row = JSON.parse(raw);\nexport const seen = row.fxScripted;\n" }];

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
const virtualSources = new Map();
host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
  const v = virtual.get(norm(fileName));
  if (!v) return baseGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  if (!virtualSources.has(norm(fileName))) virtualSources.set(norm(fileName), ts.createSourceFile(v.name, v.text, languageVersion, true));
  return virtualSources.get(norm(fileName));
};
host.fileExists = (f) => virtual.has(norm(f)) || ts.sys.fileExists(f);
host.readFile = (f) => virtual.get(norm(f))?.text ?? ts.sys.readFile(f);
// Bundler resolution stats the fixture directory before it probes the file, so the virtual
// directory and the canonical spelling have to answer too, or the import silently becomes `any`.
const baseDirectoryExists = host.directoryExists?.bind(host);
host.directoryExists = (d) => norm(d).startsWith(norm(FX)) || (baseDirectoryExists ? baseDirectoryExists(d) : false);
const baseRealpath = host.realpath?.bind(host);
host.realpath = (p) => virtual.get(norm(p))?.name ?? (baseRealpath ? baseRealpath(p) : p);
const fixture = ts.createProgram(Object.keys(FIXTURE), fixtureOptions, host);
const fx = census(fixture, FX_SCRIPTS);

// --- 1. The reader joins reads to fields structurally, in every shipped spelling. ------------------
// --- Destructuring (variable, parameter, for-of), a structural twin and a proof-script name all ---
// --- read; the same-named access through an unrelated record does not, and the alias's dead field ---
// --- is charged beside the interface's. -----------------------------------------------------------
ok(`the reader joins structurally in every spelling (unread [${fx.unread.join(",")}]; ${fx.fields.length} fields, ${fx.fields.length - fx.unread.length} read)`,
  fx.unread.join(",") === "FxAlias.fxAliasDead,FxRecord.fxGhost" && fx.fields.length === 9);

// --- 2. Coverage: a method-only exported interface is disclosed rather than silently dropped, and ---
// --- every declaration the walk admits resolves a declared type. ----------------------------------
ok(`the walk discloses the declarations it cannot charge (${fx.fieldless.length} fieldless: ${fx.fieldless.join("; ")}; ${fx.unresolved.length} unresolved)`,
  fx.fieldless.length === 1 && fx.fieldless[0].includes("FxMethods") && fx.unresolved.length === 0);

// --- 3. The real tree: every field every exported model record declares has a reader. --------------
// --- Floors keep a green from being a census that found no declarations at all. The root set is ---
// --- walked and merged into the tsconfig program, so a module the include list omits is parsed. ---
const ROOTS = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "dev", "football-os", "test-results", "vendor"]);
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = join(d, e.name);
  if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : walk(p);
  return /\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
});
const walked = ROOTS.filter((d) => { try { statSync(join(root, d)); return true; } catch { return false; } }).flatMap((d) => walk(join(root, d)));
const program = ts.createProgram([...new Set([...parsed.fileNames, ...walked])], options);
// The gate is not a consumer of the records it charges: counting its own fixture names would let the
// gate's presence change the population it measures.
const shippedScripts = readdirSync(join(root, "scripts"), { withFileTypes: true })
  .filter((e) => e.isFile() && /\.(mjs|js|cjs)$/.test(e.name) && e.name !== selfName)
  .map((e) => ({ name: e.name, text: readFileSync(join(root, "scripts", e.name), "utf8") }));
const tree = census(program, shippedScripts);
ok(`every field an exported model record declares is read (${tree.decls.length} records, ${tree.fields.length} fields, ${tree.fields.length - tree.unread.length} read; ${tree.unread.length} unread: ${tree.unread.join(", ") || "none"})`,
  tree.unread.length === 0 && tree.decls.length >= 130 && tree.fields.length >= 850 && tree.fields.length - tree.unread.length >= 850);

// --- 4. Coverage and parse health: the walk admits the shipped tree, resolves every record, and ---
// --- reads real access sites and script names (a reader that indexes nothing charges everything ---
// --- only if it also charged nothing on the fixture -- the fixture clause above would go red). ------
ok(`the census reads the shipped tree and indexes its readers (${tree.projectFiles} project files, floor 90; ${tree.accessNames} access names / ${tree.sites} sites; ${tree.scriptFiles} proof scripts / ${tree.scriptNames} names; ${tree.fieldless.length} fieldless, ${tree.unresolved.length} unresolved)`,
  tree.projectFiles >= 90 && tree.accessNames >= 700 && tree.sites >= 6000 && tree.scriptFiles >= 100 && tree.scriptNames >= 1000 && tree.unresolved.length === 0 && tree.fieldless.length <= 4);

// --- 5. No per-name exemption. The gate quotes no declared field or record name in a skip set; a ---
// --- planted skip list is charged. ----------------------------------------------------------------
const selfSource = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const declared = new Set([...tree.decls.flatMap((d) => d.fields), ...tree.decls.map((d) => d.name)]);
const exemptionHits = (text) => {
  const hits = new Set();
  for (const m of text.matchAll(/new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) if (declared.has(q[1])) hits.add(q[1]);
  }
  return [...hits];
};
const selfHits = exemptionHits(selfSource);
const planted = `const SKIP_FIELDS = new Set(["${tree.decls[0].fields[0]}"]);`;
ok(`the gate carries no per-name exemption (${selfHits.length} declared name(s) in a skip set; a planted skip list names ${exemptionHits(planted).length})`,
  selfHits.length === 0 && exemptionHits(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
