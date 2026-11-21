import io
s = io.open("D:/xiaodernan.github.io/index.html", encoding="utf-8").read()
i = s.find('id="repos"', 100000)
j = s.find('data-repos-table', i)
k = s.find("</div>", s.find("repo-card", j + 3000))
print(s[s.find("specproof", j)+200 : s.find("</section", j)][:4000])
