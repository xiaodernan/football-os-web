import io
s = io.open("features/learn/LearnHub.tsx", encoding="utf-8").read()
i = s.find("tutorPreflight")
print(s[max(0,i-2500):i+2500])
