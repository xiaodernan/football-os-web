import io
s = io.open("domain/selectionChair.ts", encoding="utf-8").read()
i = s.find("export function foldXi")
print(s[i:i+1200])
