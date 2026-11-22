import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
for old, new in [
    ('"ops.tide.forecast": "前{d}日：接下来三天读数 {d1} · {d2} · {d3} ——种子不敢乱猜。",',
     '"ops.tide.forecast": "已测量 {window}：接下来三天读数 {d1} · {d2} · {d3} ——种子不敢乱猜。",'),
    ('"ops.tide.forecast": "前{d}日：接下來三天讀數 {d1} · {d2} · {d3} ——種子不敢亂猜。",',
     '"ops.tide.forecast": "已測量 {window}：接下來三天讀數 {d1} · {d2} · {d3} ——種子不敢亂猜。",'),
]:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("zh/tw forecast keys fixed")
