import io
p = "features/dashboard/Dashboard.tsx"
s = io.open(p, encoding="utf-8").read()

# 1. import the component
old_imp = 'import { Button } from "@/components/ui/button";'
new_imp = 'import { Button } from "@/components/ui/button";\nimport { TeachHint } from "@/ui/TeachHint";'
assert old_imp in s
s = s.replace(old_imp, new_imp, 1)

# 2. teach ids on the module grid
teach = {
  '"/player"': "player", '"/manager"': "manager", '"/profile"': "profile", '"/review"': "review",
  '"/load"': "load", '"/achievements"': "achievements", '"/settings"': "settings", '"/history"': "history",
  '"/scouting"': "scouting", '"/world"': "world", '"/film"': "film", '"/data"': "data",
  '"/transfers"': "transfers", '"/compare"': "compare", '"/watchlist"': "watchlist",
  '"/tactical-studio"': "tactical", '"/simulation"': "simulation", '"/ai"': "ai", '"/knowledge"': "knowledge",
  '"/learn"': "learn", '"/community"': "community", '"/football"': "football",
}
import re
def add_teach(m):
    path = m.group(1)
    return '{ to: %s, labelKey: %s, icon: %s, teach: "%s" },' % (path, m.group(2), m.group(3), teach[path])
s2, n = re.subn(r'\{ to: ("/[a-z-]+"), labelKey: ("[^"]+"), icon: ("[^"]*") \},', add_teach, s)
assert n == 22, n
s = s2

# 3. the tile itself: a relative wrapper, the anchor shrinks its padding, the "?" sits outside it
old_tile = '''              {MODULE_LINKS.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50", PANEL_CLASS.panelGhost)}
                >
                  <span className="grid w-5 place-items-center text-base leading-none text-primary">{m.icon}</span>
                  <span className="truncate">{t(m.labelKey)}</span>
                </Link>
              ))}'''
new_tile = '''              {MODULE_LINKS.map((m) => (
                <div key={m.to} className="relative">
                  <Link
                    to={m.to}
                    className={cn("flex items-center gap-2 rounded-lg border px-2.5 py-2 pr-7 text-sm transition-colors hover:border-primary/40 hover:bg-secondary/50", PANEL_CLASS.panelGhost)}
                  >
                    <span className="grid w-5 place-items-center text-base leading-none text-primary">{m.icon}</span>
                    <span className="truncate">{t(m.labelKey)}</span>
                  </Link>
                  {/* M1229: the one-line lesson behind the "?" — outside the anchor, so reading a
                      lesson never navigates away from the board it explains. */}
                  <TeachHint id={m.teach} className="absolute right-1.5 top-1/2 -translate-y-1/2" />
                </div>
              ))}'''
assert old_tile in s
s = s.replace(old_tile, new_tile, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("dashboard wired")
