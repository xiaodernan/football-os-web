import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const ROOT = "D:/站点功能/features";
const PATTERNS = [
  { name: "wash-primary-word", re: /bg-primary\/15\s+text-primary/g },
  { name: "wash-primary-word-sm", re: /bg-primary\/15\s+text-sm\s+text-primary/g },
  { name: "border-wash-success", re: /border-success\s+bg-success\/10/g },
  { name: "border-wash-destructive", re: /border-destructive\s+bg-destructive\/10/g },
  { name: "wash-success-word", re: /bg-success\/\d+\s+text-success/g },
  { name: "wash-destructive-word", re: /bg-destructive\/\d+\s+text-destructive/g },
  { name: "wash-muted-word", re: /bg-muted\s+text-muted-foreground/g },
  { name: "wash-primary-word-foreground", re: /bg-primary\/\d+\s+text-foreground/g },
  { name: "wash-primary-word-20", re: /bg-primary\/20\s+text-primary/g },
  { name: "wash-info-word", re: /bg-info\/\d+\s+text-info/g },
];

function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const stat = statSync(p);
    if (stat.isDirectory()) out.push(...walk(p));
    else if (f.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const hits = [];
for (const f of files) {
  const code = readFileSync(f, "utf8");
  for (const { name, re } of PATTERNS) {
    for (const m of code.matchAll(re)) {
      const line = code.slice(0, m.index).split("\n").length;
      const ctx = code.slice(Math.max(0, m.index - 60), m.index + 80).replace(/\n/g, " ");
      hits.push({ file: f.replace(ROOT + "/", ""), line, pattern: name, context: ctx.trim() });
    }
  }
}

console.log(`Total hits: ${hits.length}`);
for (const h of hits) {
  console.log(`${h.file}:${h.line} [${h.pattern}] ${h.context}`);
}

const byPattern = {};
for (const h of hits) byPattern[h.pattern] = (byPattern[h.pattern] || 0) + 1;
console.log("\nBy pattern:");
for (const [p, c] of Object.entries(byPattern).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${p}: ${c}`);
}