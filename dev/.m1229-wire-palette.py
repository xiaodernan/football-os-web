import io
p = "features/shell/AppShell.tsx"
s = io.open(p, encoding="utf-8").read()

old = '''          <Button
            variant="outline"
            size="sm"
            className="ml-auto flex h-9 w-full max-w-xs items-center justify-start gap-2 text-muted-foreground sm:w-64"
            onClick={() => setPaletteOpen(true)}
          >
            <span>{I.search}</span>
            <span className="text-xs">{t("nav.searchCta")}</span>
            <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
          </Button>'''
new = '''          {/* M1229: the palette trigger carries its own one-line lesson, the way every module
              tile on the dashboard does. */}
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex h-9 w-full max-w-xs items-center justify-start gap-2 text-muted-foreground sm:w-64"
              onClick={() => setPaletteOpen(true)}
            >
              <span>{I.search}</span>
              <span className="text-xs">{t("nav.searchCta")}</span>
              <kbd className="ml-auto hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">⌘K</kbd>
            </Button>
            <TeachHint id="palette" />
          </div>'''
assert old in s, "palette button anchor missing"
s = s.replace(old, new, 1)

old_imp = 'import { CommandPalette } from "@/features/command/CommandPalette";'
new_imp = 'import { CommandPalette } from "@/features/command/CommandPalette";\nimport { TeachHint } from "@/ui/TeachHint";'
assert old_imp in s
s = s.replace(old_imp, new_imp, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("palette wired")
