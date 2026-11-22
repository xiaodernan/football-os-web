import io, re
s = io.open("domain/attributes.ts", encoding="utf-8").read()
i = s.find("export const FORM_WINDOW")
print(s[i:i+300])
# how do screens build a club's finished matches sorted by kickoff?
s2 = io.open("features/dashboard/Dashboard.tsx", encoding="utf-8").read()
m = re.search(r"upcomingMatchesForClub", s2)
i2 = s2.find("const upcoming")
print(s2[i2:i2+400])
