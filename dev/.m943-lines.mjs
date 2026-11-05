// M943 diagnostic — print the exact source lines carrying a given diagnostic code.
import ts from "typescript";
import fs from "node:fs";

const root = process.cwd();
const cfg = ts.readConfigFile("tsconfig.json", ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(cfg, ts.sys, root);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(d + "/" + e.name) : (/\.(ts|tsx)$/.test(e.name) ? [d + "/" + e.name] : []));
const drafts = walk(".drafts");
const program = ts.createProgram([...parsed.fileNames, ...drafts], parsed.options);
const want = new Set(process.argv.slice(2).map(Number));
const seen = new Map();
for (const d of ts.getPreEmitDiagnostics(program)) {
  if (!d.file || !want.has(d.code)) continue;
  const norm = d.file.fileName.replace(/\\/g, "/");
  if (!norm.includes(".drafts/features/overview/")) continue;
  const { line } = d.file.getLineAndCharacterOfPosition(d.start);
  const text = d.file.text.split(/\r?\n/)[line]?.trim() ?? "";
  const key = norm.split("/").pop() + " " + (line + 1);
  if (!seen.has(text.slice(0, 60))) seen.set(text.slice(0, 60), []);
  seen.get(text.slice(0, 60)).push(key);
}
for (const [text, where] of [...seen.entries()].slice(0, 15)) {
  console.log(`x${where.length} | ${text}`);
  console.log(`      e.g. ${where[0]}`);
}
