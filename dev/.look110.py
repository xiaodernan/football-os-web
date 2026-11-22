import io, re
s = io.open("features/football/FootballWorld.tsx", encoding="utf-8").read()
i = s.find("/matches/")
print(s[max(0,i-300):i+600] if i >= 0 else "no /matches/ handling")
