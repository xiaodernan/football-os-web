import io, re
s = io.open("src/App.tsx", encoding="utf-8").read()
# find the football route handling (isFootballRoute)
i = s.find("isFootballRoute")
print(s[max(0,i-200):i+900])
