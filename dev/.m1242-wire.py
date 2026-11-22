import io
# wire the route + nav + keys
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1238: the transfer broker — the nineteenth imprisoned door, the one that prices a man.
const TransferBroker = lazy(() => import("@/features/broker/TransferBroker").then((m) => ({ default: m.TransferBroker })));'''
new = old + '''
// M1242: the dressing room — the twentieth imprisoned door, the one that briefs the next match.
const DressingRoom = lazy(() => import("@/features/dressing/DressingRoom").then((m) => ({ default: m.DressingRoom })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/broker") inner = <TransferBroker />;'
new = old + '\n  else if (path === "/dressing") inner = <DressingRoom />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/broker", label: t("nav.broker"), icon: I.curtains, match: ["/broker"] },'''
new = old + '''
    { to: "/dressing", label: t("nav.dressing"), icon: I.curtains, match: ["/dressing"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")
