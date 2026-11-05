// M943 diagnostic — remaining errors in the overview quarantine, by code and line shape.
import ts from "typescript";
import fs from "node:fs";

const root = process.cwd();
const cfg = ts.readConfigFile("tsconfig.json", ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(cfg, ts.sys, root);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(d + "/" + e.name) : (/\.(ts|tsx)$/.test(e.name) ? [d + "/" + e.name] : []));
const drafts = walk(".drafts");
const program = ts.createProgram([...parsed.fileNames, ...drafts], parsed.options);
const byCode = new Map();
const lines = new Map();
let overviewCount = 0;
for (const d of ts.getPreEmitDiagnostics(program)) {
  if (!d.file) continue;
  const norm = d.file.fileName.replace(/\\/g, "/");
  if (!norm.includes(".drafts/features/overview/")) continue;
  overviewCount++;
  byCode.set(d.code, (byCode.get(d.code) ?? 0) + 1);
  const { line } = d.file.getLineAndCharacterOfPosition(d.start);
  const text = (d.file.text.split(/\r?\n/)[line] ?? "").trim().slice(0, 80);
  const key = "TS" + d.code + " " + text.slice(0, 55);
  if (!lines.has(key)) lines.set(key, norm.split("/").pop() + ":" + (line + 1));
}
console.log("overview files with errors:", overviewCount);
console.log("by code:", [...byCode.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `TS${c}=${n}`).join(" "));
for (const [k, where] of [...lines.entries()].slice(0, 12)) console.log(`  ${k}  @ ${where}`);
