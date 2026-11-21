import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 865;"
new = "const BUDGET_KB = 867; // M1232 The Congested Calendar (the spacing fold, the screen and 12 trilingual key sets): 865 -> 867. Measured on this tree after npm run build: 867 KB gzip / 119 assets (JS 852 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 867
b["build"]["jsGzipKB"] = 852
b["build"]["cssGzipKB"] = 15.4
b["build"]["fileCount"] = 119
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
