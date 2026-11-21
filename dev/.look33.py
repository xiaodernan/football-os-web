import io
s = io.open("lib/utils.ts", encoding="utf-8").read()
i = s.find("export function epochMs")
print(s[i:i+400])
i2 = s.find("export const round2")
print(s[i2:i2+300])
