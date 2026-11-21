import io

# 1. Dashboard anchors
p = "features/dashboard/Dashboard.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''      <Panel className="fo-lift p-4">
        <SectionTitle title={t("dash.nextTitle")} hint={t("dash.nextHint")} />'''
new = '''      <Panel className="fo-lift p-4" data-tour="next-steps">
        <SectionTitle title={t("dash.nextTitle")} hint={t("dash.nextHint")} />'''
assert old in s, "next-steps anchor"
s = s.replace(old, new, 1)
old = '''          <Panel className="p-4">
            <SectionTitle title={t("dash.modules")} hint={t("dash.modulesHint")} />'''
new = '''          <Panel className="p-4" data-tour="modules">
            <SectionTitle title={t("dash.modules")} hint={t("dash.modulesHint")} />'''
assert old in s, "modules anchor"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("dashboard anchors")

# 2. AppShell: mount + palette/modes anchors
p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''          {/* M1229: the palette trigger carries its own one-line lesson, the way every module
              tile on the dashboard does. */}
          <div className="ml-auto flex items-center gap-1.5">'''
new = '''          {/* M1229: the palette trigger carries its own one-line lesson, the way every module
              tile on the dashboard does. M1230: it is also the first-run guide's anchor. */}
          <div className="ml-auto flex items-center gap-1.5" data-tour="palette">'''
assert old in s, "palette anchor"
s = s.replace(old, new, 1)
old = '''      <div className="mt-2 flex items-center justify-between border-t border-sidebar-border pt-3">
        <ModeSwitch />
        <Controls />
      </div>'''
new = '''      <div className="mt-2 flex items-center justify-between border-t border-sidebar-border pt-3" data-tour="modes">
        <ModeSwitch />
        <Controls />
      </div>'''
assert old in s, "modes anchor"
s = s.replace(old, new, 1)
old = '''    <div className="min-h-dvh">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />'''
new = '''    <div className="min-h-dvh">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      {/* M1230: the first-run guide — six coach-marks over the board, once per device. */}
      <FirstRunGuide />'''
assert old in s, "guide mount"
s = s.replace(old, new, 1)
old = 'import { TeachHint } from "@/ui/TeachHint";'
new = 'import { TeachHint } from "@/ui/TeachHint";\nimport { FirstRunGuide } from "@/ui/FirstRunGuide";'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("appshell wired")

# 3. localData registration
p = "domain/localData.ts"
s = io.open(p, encoding="utf-8").read()
old = 'import { TEACH_SEEN_KEY } from "./teachHint";'
new = 'import { TEACH_SEEN_KEY } from "./teachHint";\n// M1230: the first-run guide\'s progress — a preference (a finished tour stays finished).\nimport { TOUR_KEY } from "./firstRunGuide";'
assert old in s
s = s.replace(old, new, 1)
old = '  { key: TEACH_SEEN_KEY, labelKey: "set.key.teach", kind: "preference" },'
new = '  { key: TEACH_SEEN_KEY, labelKey: "set.key.teach", kind: "preference" },\n  { key: TOUR_KEY, labelKey: "set.key.tour", kind: "preference" },'
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("localData wired")
