import io
s = io.open("ui/primitives.tsx", encoding="utf-8").read()
i = s.find("export function StatTile")
print(s[i:i+700])
i2 = s.find("export const BAR_FILL")
print(s[i2:i2+300])
