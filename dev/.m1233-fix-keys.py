import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()
subs = [
  ('  "chair.subtitle": "The model names your starting XI — from this squad, and from nothing else.",',
   '  "chair.subtitle": "The model names a World XI — from the world\'s strongest sixty, and from nothing else.",'),
  ('  "chair.subtitle": "模型来点名你的首发十一人——只能从这支阵容里选，别无其他。",',
   '  "chair.subtitle": "模型来点名一支世界十一人——只能从世界最强的六十人里选，别无其他。",'),
  ('  "chair.subtitle": "模型來點名你的首发十一人——只能從這支陣容裡選，別無其他。",',
   '  "chair.subtitle": "模型來點名一支世界十一人——只能從世界最強的六十人手裡選，別無其他。",'),
  ('  "chair.squadTitle": "{club} · the squad in the chair\'s hands",',
   '  "chair.squadTitle": "The pool in the chair\'s hands",'),
  ('  "chair.squadTitle": "{club} · 交到选人席手里的阵容",',
   '  "chair.squadTitle": "交到选人席手里的池子",'),
  ('  "chair.squadTitle": "{club} · 交到選人手裡面的陣容",',
   '  "chair.squadTitle": "交到選人手裡面面的池子",'),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("keys updated")
