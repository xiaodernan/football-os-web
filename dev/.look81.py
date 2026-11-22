import io, re
s = io.open("features/cache/CacheObservatory.tsx", encoding="utf-8").read()
for pat in ["CACHE_SERVICE_BASE", "fetch", "live"]:
    for m in list(re.finditer(pat, s))[:3]:
        ln = s[:m.start()].count("\n") + 1
        print(pat, "@", ln, "|", s.split("\n")[ln-1].strip()[:130])
