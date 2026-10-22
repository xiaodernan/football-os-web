// Probe: same-file same-rule pairs, using proof-rules.mjs's own extraction + measure.
import { readFileSync, readdirSync } from "node:fs";
const KEYWORDS = new Set(["const","let","var","return","if","else","for","of","in","new","typeof","as","unknown","string","number","boolean","true","false","null","undefined","void","never","any","export","function","import","from","await","async","class","extends","implements","this","throw","try","catch","finally","switch","case","break","continue","default","do","while","instanceof","keyof","readonly","public","private","protected","static","type","interface","enum","declare","delete","infer","satisfies"]);
const tokenize = (s) => {
  const stripped = s.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  const out = [];
  for (const m of stripped.match(/[A-Za-z_$][\w$]*|[^\sA-Za-z_$]/g) || []) out.push(/^[A-Za-z_$]/.test(m) && !KEYWORDS.has(m) ? { id: m } : { lit: m });
  return out;
};
const sameRule = (a, b) => {
  if (a.length !== b.length || a.length < 8) return false;
  const fwd = new Map(), back = new Map();
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.lit !== undefined || y.lit !== undefined) { if (x.lit !== y.lit) return false; continue; }
    if (fwd.has(x.id)) { if (fwd.get(x.id) !== y.id) return false; } else if (back.has(y.id)) return false;
    fwd.set(x.id, y.id); back.set(y.id, x.id);
  }
  return true;
};
const bodyOf = (s, start, hadBrace) => {
  if (!hadBrace) {
    let depth = 0, inStr = null, i = start;
    while (i < s.length) {
      const c = s[i];
      if (inStr) { if (c === "\\") { i++; continue; } if (c === inStr) inStr = null; i++; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = c; i++; continue; }
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") { if (depth === 0) break; depth--; }
      else if ((c === ";" || c === ",") && depth === 0) break;
      i++;
    }
    return s.slice(start, i);
  }
  const nl = s.indexOf("\n", start);
  const head = s.slice(start, nl < 0 ? s.length : nl);
  if (!head.includes("{")) { const semi = s.indexOf(";", start); return s.slice(start, semi < 0 ? s.length : semi); }
  let depth = 1, i = start;
  while (i < s.length && depth > 0) { if (s[i] === "{") depth++; else if (s[i] === "}") depth--; i++; }
  return s.slice(start, i);
};
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const ROOTS = ["domain","data","lib","store","features","components","ui","src"];
const appFiles = ROOTS.filter((d)=>{try{readdirSync(d);return true}catch{return false}}).flatMap(walk).filter((f)=>/\.(ts|tsx)$/.test(f));
const NAMED = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)[^{;]*\{|(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\(([^)]*)\)|(\w+))\s*(?::[^=]*)?=>\s*\{?/g;
const units = [];
for (const f of appFiles) {
  const s = readFileSync(f, "utf8");
  NAMED.lastIndex = 0;
  let m;
  while ((m = NAMED.exec(s))) {
    const name = m[1] || m[3];
    const start = m.index + m[0].length;
    const body = bodyOf(s, start, m[0].endsWith("{"));
    const tk = tokenize(body);
    if (tk.length < 24) continue;
    units.push({ f, name, tk, body: body.replace(/\s+/g," ").trim().slice(0,70), line: s.slice(0, m.index).split("\n").length });
  }
}
const pairs = [];
for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) {
  if (units[i].f !== units[j].f) continue;
  if (sameRule(units[i].tk, units[j].tk)) pairs.push([units[i], units[j]]);
}
console.log(units.length + " units; " + pairs.length + " SAME-FILE same-rule pair(s):");
for (const [a, b] of pairs.slice(0, 15)) console.log(`  ${a.f}:${a.line}(${a.name}) ~ ${b.f}:${b.line}(${b.name})  :: ${a.body}`);
