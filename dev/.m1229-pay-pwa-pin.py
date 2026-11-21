import io
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 855;"
new = "const BUDGET_KB = 860; // M1229 The Teaching Hints (the TeachHint component, 25 trilingual lessons and their wiring): 855 -> 860. Measured on this tree after npm run build: 860 KB gzip / 117 assets (JS 844 KB, CSS 15.3 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

import json
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 860
b["build"]["jsGzipKB"] = 844
b["build"]["cssGzipKB"] = 15.3
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
