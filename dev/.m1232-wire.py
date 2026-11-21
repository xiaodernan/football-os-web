import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''// M1231: the keepers' union — the world's goalkeepers, named.
const KeepersUnion = lazy(() => import("@/features/keepers/KeepersUnion").then((m) => ({ default: m.KeepersUnion })));'''
new = old + '''
// M1232: the congested calendar — the fixture spacing board.
const CongestedCalendar = lazy(() => import("@/features/congestion/CongestedCalendar").then((m) => ({ default: m.CongestedCalendar })));'''
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/keepers") inner = <KeepersUnion />;'
new = old + '\n  else if (path === "/congestion") inner = <CongestedCalendar />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/keepers", label: t("nav.keepers"), icon: I.shield, match: ["/keepers"] },'''
new = old + '''
    { to: "/congestion", label: t("nav.congestion"), icon: I.calendar, match: ["/congestion"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")
