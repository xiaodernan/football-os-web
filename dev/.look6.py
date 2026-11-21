import io
s = io.open("features/command/CommandPalette.tsx", encoding="utf-8").read()
i = s.find('id: "grand-tour"')
print(s[max(0,i-900):i+400])
