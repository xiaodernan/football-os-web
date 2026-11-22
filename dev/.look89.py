import io
s = io.open("features/cache/CacheObservatory.tsx", encoding="utf-8").read()
i = s.find("liveWire")
if i < 0: i = s.find("cache.liveTitle")
j = s.find("CACHE_SERVICE_URL", 3000)
print(s[max(0,j-1500):j+2500])
