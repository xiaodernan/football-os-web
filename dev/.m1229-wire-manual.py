import io
p = "features/manual/Manual.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl print:text-black">
              {t("manual.title")}
            </h1>
            <DemoBadge />'''
new = '''            <h1 className="fo-spectrum bg-gradient-to-r from-primary via-info to-chart-3 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl print:text-black">
              {t("manual.title")}
            </h1>
            <DemoBadge />
            {/* M1229: even the manual wears a "?" — this one says what the manual is for. */}
            <TeachHint id="manual" />'''
assert old in s, "manual header anchor missing"
s = s.replace(old, new, 1)
old_imp = 'import { DemoBadge, SectionTitle, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";'
new_imp = 'import { DemoBadge, SectionTitle, PANEL_CLASS, CHIP_CLASS } from "@/ui/primitives";\nimport { TeachHint } from "@/ui/TeachHint";'
assert old_imp in s
s = s.replace(old_imp, new_imp, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("manual wired")
