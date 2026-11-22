import io, re
p = "scripts/proof-storage.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_FILES_PIN = 240;"
new = "const APP_FILES_PIN = 242; // M1238 The Transfer Broker: 240 -> 242 — domain/broker.ts and features/broker/TransferBroker.tsx join the scope."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-coverage.mjs"
s = io.open(p, encoding="utf-8").read()
subs = [
  ("const POP_PIN = 248;", "const POP_PIN = 250; // M1238 The Transfer Broker: 248 -> 250 — domain/broker.ts and features/broker/TransferBroker.tsx join the population."),
  ("const BY_DIR_PIN = { components: 15, data: 11, domain: 100, features: 100, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 };",
   "const BY_DIR_PIN = { components: 15, data: 11, domain: 101, features: 101, functions: 2, i18n: 3, lib: 8, src: 3, store: 1, ui: 5 }; // M1238: domain 100 -> 101 (domain/broker.ts), features 100 -> 101 (features/broker/TransferBroker.tsx)."),
]
for old, new in subs:
    assert old in s, old[:50]
    s = s.replace(old, new, 1)
m = re.search(r"const DEEP_PIN = (\d+);", s)
s = s.replace(m.group(0), "const DEEP_PIN = %d; // M1238: features/broker/TransferBroker.tsx sits two levels down — %d -> 117." % (int(m.group(1)) + 1, int(m.group(1))), 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-app-tree.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const APP_MODULE_PIN = 247;"
new = "const APP_MODULE_PIN = 249; // M1238 The Transfer Broker: 247 -> 249 — domain/broker.ts and features/broker/TransferBroker.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)

p = "scripts/proof-router.mjs"
s = io.open(p, encoding="utf-8").read()
old = "const ROUTER_POP_PIN = 237;"
new = "const ROUTER_POP_PIN = 239; // M1238 The Transfer Broker: 237 -> 239 — domain/broker.ts and features/broker/TransferBroker.tsx ride the walk."
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("pins paid")
