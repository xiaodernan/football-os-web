import io
p = "scripts/proof-teachhint.mjs"
s = io.open(p, encoding="utf-8").read()
s = s.replace('const D = dict.default ?? dict;\nconst locales = ["en", "zhCN", "zhTW"];',
              'const { DICTIONARIES: D } = dict;\nconst locales = ["en", "zh-CN", "zh-TW"];')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("fixed")
