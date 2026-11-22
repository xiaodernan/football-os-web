import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 891;"
new = "const BUDGET_KB = 893; // M1241 The Ops Trend (the forecast fold, the deepened panel and 16 trilingual key sets): 891 -> 893. Measured on this tree after npm run build: 893 KB gzip / 125 assets (JS 877 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 893
b["build"]["jsGzipKB"] = 877
b["build"]["cssGzipKB"] = 15.4
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
