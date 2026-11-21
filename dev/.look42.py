import io
s = io.open("features/learn/LearnHub.tsx", encoding="utf-8").read()
i = s.find("callLlmStream")
print(s[max(0,i-2000):i+3000])
