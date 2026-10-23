// M456: the ninth direction of the dead-code boundary -- a field a provider offers that no reader
// can see. Four contexts are declared with `createContext<T | null>`; T is an interface in the
// declaring file, and each of its members is a value every consumer can reach. A member is read
// when another file destructures it from a hook call, or reaches it through a property/element
// access whose symbol resolves -- by declaration identity, not by name -- to that member. Reads
// inside the declaring file are the provider wiring itself, not a consumer. A member no other file
// reads is charged, and a context whose type is not a same-file interface is charged as unreadable
// rather than silently skipped.
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

// The census is a pure function of a program, so the fixture and the real tree go through the
// same code. Declaration identity is what joins a read to a field: two structurally equal
// interfaces in different files are different members, and a same-named field on an unrelated
// value does not read anything.
const census = (program) => {
  const checker = program.getTypeChecker();
  const files = program.getSourceFiles().filter((sf) => !sf.isDeclarationFile && !/[\\/]node_modules[\\/]/.test(sf.fileName));
  const contexts = [];
  const broken = [];

  for (const sf of files) {
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "createContext") {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        const arg = node.typeArguments?.[0];
        if (!arg) {
          broken.push(`${relOf(sf.fileName)}:${line} createContext without a type argument`);
        } else {
          let pick = arg;
          if (ts.isUnionTypeNode(pick)) {
            const refs = pick.types.filter((t) => ts.isTypeReferenceNode(t));
            pick = refs.length === 1 ? refs[0] : null;
          }
          const name = pick && ts.isTypeReferenceNode(pick) && ts.isIdentifier(pick.typeName) ? pick.typeName.text : null;
          const iface = name ? sf.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === name) : null;
          if (!iface) {
            broken.push(`${relOf(sf.fileName)}:${line} createContext type \`${arg.getText(sf)}\` is not a same-file interface`);
          } else {
            const fields = [];
            for (const m of iface.members) {
              if (!ts.isPropertySignature(m) && !ts.isMethodSignature(m)) continue;
              if (!ts.isIdentifier(m.name) && !ts.isStringLiteral(m.name)) continue;
              const sym = checker.getSymbolAtLocation(m.name);
              fields.push({ name: m.name.text, decls: new Set(sym?.getDeclarations?.() ?? []) });
            }
            contexts.push({ name, file: sf.fileName, fields });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  // Stable order for the message: file, then interface name.
  contexts.sort((a, b) => relOf(a.file).localeCompare(relOf(b.file)) || a.name.localeCompare(b.name));

  const reads = new Set();
  for (const sf of files) {
    for (const ctx of contexts) {
      if (sf.fileName === ctx.file) continue;
      const visit = (node) => {
        const hit = (sym) => {
          if (!sym) return;
          const decls = sym.getDeclarations?.() ?? [];
          for (const f of ctx.fields) {
            if (decls.some((d) => f.decls.has(d))) { reads.add(`${ctx.name}.${f.name}`); return; }
          }
        };
        if (ts.isPropertyAccessExpression(node)) {
          hit(checker.getSymbolAtLocation(node.name));
        } else if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) {
          hit(checker.getPropertyOfType(checker.getTypeAtLocation(node.expression), node.argumentExpression.text));
        } else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) {
          const vd = node.parent.parent;
          if (ts.isVariableDeclaration(vd) && vd.initializer) {
            const key = node.propertyName
              ? (ts.isIdentifier(node.propertyName) || ts.isStringLiteral(node.propertyName) ? node.propertyName.text : null)
              : (ts.isIdentifier(node.name) ? node.name.text : null);
            if (key) hit(checker.getPropertyOfType(checker.getTypeAtLocation(vd.initializer), key));
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
  }

  const fields = contexts.flatMap((c) => c.fields.map((f) => `${c.name}.${f.name}`));
  const unread = fields.filter((k) => !reads.has(k)).sort();
  return { contexts, fields, unread, broken, read: fields.length - unread.length, projectFiles: files.length };
};

// --- The fixture program: a context whose type is a same-file interface, four fields with one ---
// --- read by destructuring, one by member access, one by no other file, one only by the provider ---
// --- itself; a structurally equal but unrelated local interface reading a same-named field; and ---
// --- a context whose type is a type literal (no same-file interface), which must be charged. ----
const FX = root.split(sep).join("/") + "/__fixture__";
const FIXTURE = {
  [`${FX}/theme.ts`]: [
    "export interface ThingValue { live: number; member: number; ghost: number; seen: number; }",
    "declare function createContext<T>(v: T): { __type: T };",
    "declare function useContext<T>(c: { __type: T }): T;",
    "const ThingContext = createContext<ThingValue | null>(null);",
    "export function useThing(): ThingValue { return useContext(ThingContext) as ThingValue; }",
    "export function peek(): number { return useContext(ThingContext)?.seen ?? 0; }",
  ].join("\n"),
  [`${FX}/consumer.ts`]: [
    'import { useThing } from "./theme";',
    "const { live } = useThing();",
    "export const a = live;",
    "export const b = useThing().member;",
  ].join("\n"),
  [`${FX}/twin.ts`]: [
    "interface Twin { live: number; member: number; ghost: number; seen: number; }",
    "declare const twin: Twin;",
    "export const c = twin.ghost;",
  ].join("\n"),
  [`${FX}/broken.ts`]: [
    "declare function createContext<T>(v: T): { __type: T };",
    "const BrokenContext = createContext<{ a: number } | null>(null);",
    "export { BrokenContext };",
  ].join("\n"),
};

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
const fx = census(fixture);
const fxUnread = fx.unread.join(",");

// --- 1. The reader, planted both ways: destructuring and member access read a field from another ---
// --- file; the provider's own read reads nothing; an unrelated structurally equal interface reads ---
// --- nothing. The unread field and the provider-only field are both charged. ---------------------
ok(`the reader joins reads to fields by declaration identity (unread [${fxUnread}]; ${fx.fields.length} fields, ${fx.read} read)`,
  fxUnread === "ThingValue.ghost,ThingValue.seen" && fx.fields.length === 4 && fx.read === 2);

// --- 2. A context whose type is not a same-file interface is charged as unreadable, never skipped. --
ok(`a context the census cannot resolve is charged, not skipped (${fx.broken.length} broken: ${fx.broken.join("; ")})`,
  fx.broken.length === 1 && fx.broken[0].includes("broken.ts"));

// --- 3. The real tree: every field every provider offers has a consumer outside its declaring file. --
// --- Floors keep a green from being a program that found no contexts at all. The root set is walked -
// --- and merged into the tsconfig program, so a module the include list omits is still parsed. -----
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
ok(`every field a provider offers is read outside its declaring file (${tree.contexts.length} contexts, ${tree.fields.length} fields, ${tree.read} read; ${tree.unread.length} unread: ${tree.unread.join(", ") || "none"})`,
  tree.unread.length === 0 && tree.contexts.length >= 4 && tree.fields.length >= 20 && tree.read >= 20);

// --- 4. Coverage and parse health: every context the app declares is resolved to a same-file ------
// --- interface, and the program reads the shipped modules (a file tsc never sees cannot be charged). --
ok(`the census resolves every context it finds and reads the shipped tree (${tree.projectFiles} project files, floor 90; ${tree.broken.length} unresolved: ${tree.broken.join("; ") || "none"})`,
  tree.broken.length === 0 && tree.projectFiles >= 90);

// --- 5. No per-name exemption. The gate quotes no declared field name in a skip set; a planted ---
// --- skip list is charged. -----------------------------------------------------------------------
const selfSource = stripComments(readFileSync(fileURLToPath(import.meta.url), "utf8"));
const fieldNames = [...new Set(tree.contexts.flatMap((c) => c.fields.map((f) => f.name)))];
const exemptionHits = (text) => {
  const hits = new Set();
  for (const m of text.matchAll(/new\s+Set\s*\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    for (const q of m[1].matchAll(/["'`]([^"'`]+)["'`]/g)) if (fieldNames.includes(q[1])) hits.add(q[1]);
  }
  return [...hits];
};
const selfHits = exemptionHits(selfSource);
const planted = `const SKIP_FIELDS = new Set(["${fieldNames[0]}"]);`;
ok(`the gate carries no per-name exemption (${selfHits.length} declared field(s) in a skip set; a planted skip list names ${exemptionHits(planted).length})`,
  selfHits.length === 0 && exemptionHits(planted).length === 1);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
