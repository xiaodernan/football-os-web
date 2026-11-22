import io, re
s = io.open("features/football/FootballWorld.tsx", encoding="utf-8").read()
i = s.find("function MatchDetail")
print(s[i:i+2400])
