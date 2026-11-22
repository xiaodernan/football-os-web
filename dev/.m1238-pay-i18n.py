import io
p = "scripts/proof-i18n.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const APP_SRC_PIN = 244;", "const APP_SRC_PIN = 246; // M1238 The Transfer Broker: 244 -> 246 — domain/broker.ts and features/broker/TransferBroker.tsx join the reader."),
  ("const TSX_PIN = 125;", "const TSX_PIN = 126; // M1238 The Transfer Broker: +1 features/broker/TransferBroker.tsx."),
  ("const SRC_PIN = 247;", "const SRC_PIN = 249; // M1238 The Transfer Broker: 247 -> 249 — domain/broker.ts and features/broker/TransferBroker.tsx join the dictionary-table reader."),
  ("shapeCounts.literal === 3911 && shapeCounts.template === 198 && shapeCounts.expression === 77",
   "shapeCounts.literal === 3938 && shapeCounts.template === 201 && shapeCounts.expression === 77"),
  ("litVarSites === 612 && computedVarSites === 9", "litVarSites === 616 && computedVarSites === 9"),
]
for old, new in subs:
    assert old in s, old[:60]
    s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
