import io
s = io.open("store/useFootballOS.tsx", encoding="utf-8").read()
i = s.find("const requestPlan")
print(s[i:i+1600])
