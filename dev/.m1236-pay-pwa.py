import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 878;"
new = "const BUDGET_KB = 882; // M1236 The Match Reporter (door 18's domain, screen and 25 trilingual key sets): 878 -> 882. Measured on this tree after npm run build: 882 KB gzip / 123 assets (JS 867 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 882
b["build"]["jsGzipKB"] = 867
b["build"]["cssGzipKB"] = 15.4
b["build"]["fileCount"] = 123
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
