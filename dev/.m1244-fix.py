import io
# 1 · the tide forecast: the window phrase is pluralised by the screen, not by the sentence
p = "features/ops/Ops.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''{t("ops.tide.forecast", { d: tide.dayCount, d1: tide.forecast[0], d2: tide.forecast[1], d3: tide.forecast[2] })}'''
new = '''{t("ops.tide.forecast", { window: `${tide.dayCount} ${tide.dayCount === 1 ? "day" : "days"}`, d1: tide.forecast[0], d2: tide.forecast[1], d3: tide.forecast[2] })}'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ops forecast window pluralised")

p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
subs = [
    ('"ops.tide.forecast": "after {d} days: next three readings forecast {d1} · {d2} · {d3} visits — the seed will not guess beyond.",',
     '"ops.tide.forecast": "measured over {window}: the next three readings forecast {d1} · {d2} · {d3} visits — the seed will not guess beyond.",'),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
# the zh/tw variants keep the same placeholder name
import re
s = re.sub(r'("ops\.tide\.forecast": "[^"]*?)\{d\}( days)', r'\1{window}', s)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("key reworded")

# 2 · the chair's fold panel: the group label box was 32px wide and the words overflowed it,
# touching the player names beside them. A wider fixed box keeps the two columns apart.
p = "features/chair/SelectionChair.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''                <span className="w-8 shrink-0 text-muted-foreground">{t(GROUP_KEY[g])}</span>'''
new = '''                <span className="w-20 shrink-0 text-muted-foreground">{t(GROUP_KEY[g])}</span>'''
assert old in s, "chair label"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("chair label widened")
