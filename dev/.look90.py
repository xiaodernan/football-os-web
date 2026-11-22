import io
s = io.open("features/cache/CacheObservatory.tsx", encoding="utf-8").read()
i = s.find("live.stats")
print(s[max(0,i-1200):i+1800])
