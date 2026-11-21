import io
s = io.open("domain/training.ts", encoding="utf-8").read()
i = s.find("export interface BuildSessionInput")
print(s[i:i+1400])
