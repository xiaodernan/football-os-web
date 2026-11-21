import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 860;"
new = "const BUDGET_KB = 863; // M1230 The First-Run Guide (the coach-marks component, the guide keys and their wiring): 860 -> 863. Measured on this tree after npm run build: 863 KB gzip / 117 assets (JS 847 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 863
b["build"]["jsGzipKB"] = 847
b["build"]["cssGzipKB"] = 15.4
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
