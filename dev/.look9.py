import io
s = io.open("features/command/CommandPalette.tsx", encoding="utf-8").read()
i = s.find('"actions"')
# find the first ActionCmd with group "actions"
j = s.find('group: "actions"')
print(s[max(0,j-700):j+300])
