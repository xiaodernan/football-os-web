import io
s = io.open("D:/xiaodernan.github.io/index.html", encoding="utf-8").read()
i = s.find('id="repos"', 100000)
j = s.find("<section", i)
# print from the section start a good chunk
k = s.rfind("<section", 0, i)
print(s[k:k+4200])
