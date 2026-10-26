import { readFileSync } from "node:fs";
const src = readFileSync("i18n/dictionaries.ts", "utf8");
const file = process.argv[2];
const keys = [...new Set([...readFileSync(file, "utf8").matchAll(/t\("([^"]+)"/g)].map((m) => m[1]))];
let missing = 0;
for (const k of keys) {
  const needle = `"${k}":`;
  const n = src.split(needle).length - 1;
  if (n < 3) {
    console.log(n, k);
    missing++;
  }
}
console.log(`checked ${keys.length} keys, ${missing} with fewer than three locale rows`);
