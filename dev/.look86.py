import io, re
s = io.open("scripts/proof-cache-parity.mjs", encoding="utf-8").read()
print("LINES:", len(s.split("\n")))
for pat in ["cache/league/stats", "tables", "CACHE_SERVICE_ROUTE", "probeService"]:
    hits = [m.start() for m in re.finditer(pat, s)]
    print(pat, "->", len(hits))
