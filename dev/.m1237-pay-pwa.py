import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 882;"
new = "const BUDGET_KB = 884; // M1237 The Talent Map (the nation fold, the screen and 13 trilingual key sets): 882 -> 884. Measured on this tree after npm run build: 884 KB gzip / 124 assets (JS 869 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 884
b["build"]["jsGzipKB"] = 869
b["build"]["cssGzipKB"] = 15.4
b["build"]["fileCount"] = 124
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
