import io
s = io.open("domain/load.ts", encoding="utf-8").read()
i = s.find("LoadZone")
print(s[max(0,i-300):i+500])
