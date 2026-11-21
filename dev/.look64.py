import io
s = io.open("store/useFootballOS.tsx", encoding="utf-8").read()
i = s.find("requestPlan")
print(s[max(0,i-200):i+1800])
