import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 884;"
new = "const BUDGET_KB = 889; // M1238 The Transfer Broker (door 19's domain, screen and 27 trilingual key sets): 884 -> 889. Measured on this tree after npm run build: 889 KB gzip / 125 assets (JS 873 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 889
b["build"]["jsGzipKB"] = 873
b["build"]["cssGzipKB"] = 15.4
b["build"]["fileCount"] = 125
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
