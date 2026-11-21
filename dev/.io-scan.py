import io, re
s = io.open("D:/xiaodernan.github.io/index.html", encoding="utf-8").read()
i = s.find("全部仓库")
print(s[max(0,i-300):i+400])
print("=====")
links = re.findall(r'href="https://github\.com/xiaodernan/([^"]+)"', s)
from collections import Counter
for name, n in sorted(Counter(links).items()):
    print(name, n)
