import io, re
s = io.open("scripts/llm-proxy.mjs", encoding="utf-8").read()
i = s.find("cacheServiceHandler")
if i < 0:
    i = s.find("CACHE_SERVICE")
print(s[max(0,i-200):i+2800])
