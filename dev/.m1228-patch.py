import io
p = "scripts/proof-storm.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''import { readFileSync } from "node:fs";
import { createServer } from "vite";'''
new = '''import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";'''
assert old in s, "import block not found"
s = s.replace(old, new)
old2 = '''const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });'''
new2 = '''// A private cacheDir keeps this read-only census off the shared node_modules/.vite lock - a
// concurrent build elsewhere must not be able to time this witness out (the M1228 lesson).
const cacheDir = join(tmpdir(), `football-os-proof-storm-${process.pid}`);
const server = await createServer({ root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });'''
assert old2 in s, "createServer line not found"
s = s.replace(old2, new2)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
