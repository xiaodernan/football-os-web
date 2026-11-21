import io
s = io.open("features/command/CommandPalette.tsx", encoding="utf-8").read()
i = s.find('setMode')
print(s[max(0,i-800):i+600])
