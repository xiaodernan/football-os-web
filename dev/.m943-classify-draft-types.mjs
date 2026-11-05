// M943 diagnostic — classify the type errors the draft census sees in the overview quarantine.
import ts from "typescript";
import fs from "node:fs";

const root = process.cwd();
const cfg = ts.readConfigFile("tsconfig.json", ts.sys.readFile).config;
const parsed = ts.parseJsonConfigFileContent(cfg, ts.sys, root);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(d + "/" + e.name) : (/\.(ts|tsx)$/.test(e.name) ? [d + "/" + e.name] : []));
const drafts = walk(".drafts");
const program = ts.createProgram([...parsed.fileNames, ...drafts], parsed.options);
const counts = new Map();
const sample = new Map();
for (const d of ts.getPreEmitDiagnostics(program)) {
  if (!d.file) continue;
  const norm = d.file.fileName.replace(/\\/g, "/");
  if (!norm.includes(".drafts/")) continue;
  const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
  const key = "TS" + d.code + " " + msg.slice(0, 70);
  counts.set(key, (counts.get(key) ?? 0) + 1);
  if (!sample.has(key)) sample.set(key, norm + " :: " + msg.slice(0, 140));
}
[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => {
  console.log(v, "|", k);
  console.log("      e.g.", sample.get(k));
});
console.log("total:", [...counts.values()].reduce((a, b) => a + b, 0));
