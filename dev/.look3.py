import io
s = io.open("src/App.tsx", encoding="utf-8").read()
i = s.find("onboarding")
print(s[max(0,i-600):i+400])
