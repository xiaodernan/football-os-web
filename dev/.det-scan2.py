import io, re
s = io.open("features/football/Details.tsx", encoding="utf-8").read()
i = s.find("det.arc.title")
print(s[max(0,i-1500):i+1200])
