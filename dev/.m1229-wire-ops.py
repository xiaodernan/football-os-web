import io
p = "features/ops/Ops.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''          <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("ops.title")}</h1>'''
new = '''          <div className="flex flex-wrap items-center gap-2">
            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-5xl">{t("ops.title")}</h1>
            {/* M1229: the console wears its lesson too — what it watches, and the open password. */}
            <TeachHint id="ops" />
          </div>'''
assert old in s, "ops header anchor missing"
s = s.replace(old, new, 1)
old_imp = 'import { DemoBadge'
# find the ui primitives import line in Ops.tsx
import re
m = re.search(r'import \{[^}]*\} from "@/ui/primitives";', s)
assert m, "primitives import missing"
s = s[:m.end()] + '\nimport { TeachHint } from "@/ui/TeachHint";' + s[m.end():]
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("ops wired")
