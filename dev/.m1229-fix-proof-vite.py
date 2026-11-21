import io
p = "scripts/proof-teachhint.mjs"
s = io.open(p, encoding="utf-8").read()
old = 'const server = await createServer({ root: process.cwd(), cacheDir, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });'
new = '''// noDiscovery keeps the dep scanner out of this read-only census: a scan racing the load is the
// "server is being restarted" failure this witness hit on its first run.
const server = await createServer({
  root: process.cwd(),
  cacheDir,
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("patched")
