import io
s = io.open("store/useFootballOS.tsx", encoding="utf-8").read()
i = s.find("plan:")
print(s[max(0,i-700):i+300])
