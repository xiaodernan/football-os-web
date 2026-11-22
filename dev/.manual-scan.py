import io, re
s = io.open("features/manual/Manual.tsx", encoding="utf-8").read()
i = s.find("chapterLinks")
seg = s[i:i+2200]
print(seg)
