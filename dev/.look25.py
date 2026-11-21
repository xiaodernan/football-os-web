import io
s = io.open("features/leaders/LeagueLeaders.tsx", encoding="utf-8").read()
i = s.find("wall.")
print(s[max(0,i-1500):i+1200])
