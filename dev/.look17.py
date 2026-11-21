import io
s = io.open("domain/types.ts", encoding="utf-8").read()
i = s.find("export interface Player")
print(s[i:i+2200])
