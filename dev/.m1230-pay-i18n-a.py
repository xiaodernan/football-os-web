import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()

# 1. KEY_ROW_CONSUMERS entries
anchor = '''  // M1150 The Journey: the nine chapter registry hands its titleKey/hintKey rows out; the Journey screen renders them through t().
  { path: "domain/journey.ts", prop: "titleKey", consumer: "features/journey/Journey.tsx" },
  { path: "domain/journey.ts", prop: "hintKey", consumer: "features/journey/Journey.tsx" },
];'''
new = '''  // M1150 The Journey: the nine chapter registry hands its titleKey/hintKey rows out; the Journey screen renders them through t().
  { path: "domain/journey.ts", prop: "titleKey", consumer: "features/journey/Journey.tsx" },
  { path: "domain/journey.ts", prop: "hintKey", consumer: "features/journey/Journey.tsx" },
  // M1230 The First-Run Guide: the step table's titleKey/bodyKey rows are rendered by the guide itself.
  { path: "domain/firstRunGuide.ts", prop: "titleKey", consumer: "ui/FirstRunGuide.tsx" },
  { path: "domain/firstRunGuide.ts", prop: "bodyKey", consumer: "ui/FirstRunGuide.tsx" },
];'''
assert anchor in s, "KEY_ROW_CONSUMERS"
s = s.replace(anchor, new, 1)

# 2. POOL_FIELDS_PIN gains bodyKey
old = 'const POOL_FIELDS_PIN = ["bodyKeys", "hintKey", "keywordKey", "labelKey", "optionKeys", "qKey", "summaryKey", "titleKey"];'
new = 'const POOL_FIELDS_PIN = ["bodyKey", "bodyKeys", "hintKey", "keywordKey", "labelKey", "optionKeys", "qKey", "summaryKey", "titleKey"];'
assert old in s, "POOL_FIELDS_PIN"
s = s.replace(old, new, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("key consumers + pool pin done")
