import io
s = io.open("features/command/CommandPalette.tsx", encoding="utf-8").read()
i = s.find('group: "action"')
if i < 0:
    i = s.find('const actions')
print(s[max(0,i-200):i+1500])
