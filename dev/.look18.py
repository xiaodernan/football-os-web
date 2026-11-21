import io
s = io.open("domain/types.ts", encoding="utf-8").read()
i = s.find("export interface MatchEvent")
print(s[i:i+900])
