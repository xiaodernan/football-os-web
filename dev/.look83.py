import io
s = io.open("features/cache/CacheObservatory.tsx", encoding="utf-8").read()
i = s.find("CACHE_SERVICE_BASE", 100000)
if i < 0: i = s.find("CACHE_SERVICE_BASE", 40000)
print(s[max(0,i-200):i+3000])
