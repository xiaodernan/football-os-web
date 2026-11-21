import io
p = "src/App.tsx"
s = io.open(p, encoding="utf-8").read()
old = 'const Streaks = lazy(() => import("@/features/analytics/Streaks").then((m) => ({ default: m.Streaks })));'
new = 'const Streaks = lazy(() => import("@/features/analytics/Streaks").then((m) => ({ default: m.Streaks })));\n// M1231: the keepers\' union — the world\'s goalkeepers, named.\nconst KeepersUnion = lazy(() => import("@/features/keepers/KeepersUnion").then((m) => ({ default: m.KeepersUnion })));'
assert old in s
s = s.replace(old, new, 1)
old = '  else if (path === "/streaks") inner = <Streaks />;'
new = '  else if (path === "/streaks") inner = <Streaks />;\n  else if (path === "/keepers") inner = <KeepersUnion />;'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("route wired")

p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''    { to: "/streaks", label: t("nav.streaks"), icon: I.bolt, match: ["/streaks"] },'''
new = '''    { to: "/streaks", label: t("nav.streaks"), icon: I.bolt, match: ["/streaks"] },
    { to: "/keepers", label: t("nav.keepers"), icon: I.shield, match: ["/keepers"] },'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("nav wired")
