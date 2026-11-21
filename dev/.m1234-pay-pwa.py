import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 871;"
new = "const BUDGET_KB = 874; // M1234 The Cliff (the depth fold, the screen and 12 trilingual key sets): 871 -> 874. Measured on this tree after npm run build: 874 KB gzip / 121 assets (JS 858 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 874
b["build"]["jsGzipKB"] = 858
b["build"]["cssGzipKB"] = 15.4
b["build"]["fileCount"] = 121
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
