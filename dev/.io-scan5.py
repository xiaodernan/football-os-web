import io
s = io.open("D:/xiaodernan.github.io/index.html", encoding="utf-8").read()
for name in ["linuxdo-scripts", "/docs"]:
    i = s.find(name)
    while i >= 0:
        print("=== " + name + " @ " + str(i) + " ===")
        print(s[max(0,i-350):i+150].replace("\n", " ")[:480])
        i = s.find(name, i+1)
        if i > 200000: break
