import io, re
s = io.open("D:/xiaodernan.github.io/index.html", encoding="utf-8").read()
# locate the repos section by id
for m in re.finditer(r'id="(repos|all-repos|仓库[^"]*)"', s):
    print("anchor:", m.group(0), m.start())
i = s.find("全部仓库")
# find the section containing it
j = s.rfind("<section", 0, i)
print(s[j:j+2500])
