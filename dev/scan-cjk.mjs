// Dev-only audit: flag CJK characters that leaked into source files which are
// not supposed to hold translated copy. i18n dictionaries legitimately store
// Chinese, so they are skipped. Run: node dev/scan-cjk.mjs
import fs from "fs";
import path from "path";

const ROOT = path.resolve(process.cwd());
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".workbuddy-ai"]);
const SKIP_FILES = new Set([
  path.join("i18n", "dictionaries.ts"),
  path.join("i18n", "dictionaries.tsx"),
]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|css|html|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
let hits = 0;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  if (SKIP_FILES.has(rel)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (CJK.test(line)) {
      hits += 1;
      console.log(rel + ":" + (idx + 1) + ": " + line.trim().slice(0, 160));
    }
  });
}
console.log("TOTAL " + hits);
