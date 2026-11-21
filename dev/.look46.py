import io
s = io.open("domain/types.ts", encoding="utf-8").read()
i = s.find("PositionGroup")
print(s[max(0,i-200):i+700])
