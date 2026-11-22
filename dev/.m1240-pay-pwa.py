import io, json
p = "scripts/proof-pwa.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const BUDGET_KB = 889;"
new = "const BUDGET_KB = 891; // M1240 The Manual Catches Up (the decide chapter and the eight new explore links): 889 -> 891. Measured on this tree after npm run build: 891 KB gzip / 125 assets (JS 875 KB, CSS 15.4 KB); baseline.json re-recorded in the same commit."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
p2 = "tests/perf/baseline.json"
b = json.load(io.open(p2, encoding="utf-8"))
b["build"]["recordedAt"] = "2026-11-22"
b["build"]["totalGzipKB"] = 891
b["build"]["jsGzipKB"] = 875
b["build"]["cssGzipKB"] = 15.4
io.open(p2, "w", encoding="utf-8", newline="\n").write(json.dumps(b, indent=2) + "\n")
print("pwa pin + baseline paid")
