import io
s = io.open("src/App.tsx", encoding="utf-8").read()
i = s.find('const Streaks')
print(s[max(0,i-100):i+200])
i2 = s.find('path === "/streaks"')
print(s[max(0,i2-200):i2+120])
