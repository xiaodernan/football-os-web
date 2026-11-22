import io
p = "features/reporter/MatchReporter.tsx"
s = io.open(p, encoding="utf-8").read()
s = s.replace('import { Panel, SectionTitle, DemoBadge, CHIP_CLASS } from "@/ui/primitives";',
              'import { Panel, SectionTitle, DemoBadge } from "@/ui/primitives";\nimport { cn } from "@/lib/utils";')
s = s.replace('className={cn2("rounded-md border px-2 py-1 text-xs")}', 'className="rounded-md border px-2 py-1 text-xs"')
s = s.replace('''
// A local alias so the goal chips keep the shared border idiom without a second import line.
const cn2 = (...parts: string[]) => parts.filter(Boolean).join(" ");
''', '')
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("screen cleaned")
