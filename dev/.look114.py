import io
s = io.open("features/chair/SelectionChair.tsx", encoding="utf-8").read()
i = s.find("GROUP_KEY[g]")
print(s[max(0,i-400):i+500])
