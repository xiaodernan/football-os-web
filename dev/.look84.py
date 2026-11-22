import io, re
s = io.open("scripts/llm-proxy.mjs", encoding="utf-8").read()
i = s.find("cacheServiceHandler")
print(s[max(0,i-100):i+2600])
