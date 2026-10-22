// Probe: duplicated UNNAMED inline blocks — statements >= 24 tokens, imports excluded.
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
// Split a body into top-level statements (depth-aware, quote-aware). A block {…} stays whole.
const statements = (s) => {
  const out = [];
  let depth = 0, inStr = null, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { if (c === "\\") { i++; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if ((c === ";" || c === "\n") && depth === 0) {
      const t = s.slice(start, i).trim();
      if (t) out.push(t);
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail) out.push(tail);
  return out;
};
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const ROOTS = ["domain","data","lib","store","features","components","ui","src","functions"];
const appFiles = ROOTS.filter((d)=>{try{readdirSync(d);return true}catch{return false}}).flatMap(walk).filter((f)=>/\.(ts|tsx)$/.test(f));
const blocks = [];
for (const f of appFiles) {
  const s = readFileSync(f, "utf8").replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const st of statements(s)) {
    if (/^\s*(import|export)\b/.test(st)) continue;           // import blocks are not rules
    if (/^\s*</.test(st)) continue;                            // JSX fragments
    if (/^\s*(const|let|var|function|class|interface|type|async)\b/.test(st)) continue; // named units — the rule census's class
    if (!/[A-Za-z_$][\w$]*\s*\(/.test(st)) continue;         // no call: a data table, not a rule
    const tk = tokenize(st);
    if (tk.length < 24) continue;
    blocks.push({ f, tk, body: st.replace(/\s+/g," ").trim().slice(0,64) });
  }
}
const pairs = [];
for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
  if (sameRule(blocks[i].tk, blocks[j].tk)) pairs.push([blocks[i], blocks[j]]);
}
console.log(blocks.length + " substantial unnamed blocks; " + pairs.length + " same-rule pair(s):");
for (const b of blocks) console.log(`  BLOCK ${b.f} [${b.tk.length} tok] :: ${b.body}`);
