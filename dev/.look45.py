import io
s = io.open("domain/rowText.ts", encoding="utf-8").read()
i = s.find("positionLabel")
print(s[max(0,i-100):i+600])
