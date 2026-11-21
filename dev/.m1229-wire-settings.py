import io
p = "features/settings/SettingsPage.tsx"
s = io.open(p, encoding="utf-8").read()

old_imp = 'import { MODES } from "@/domain/types";'
new_imp = 'import { MODES } from "@/domain/types";\nimport { useLocalStorage } from "@/lib/hooks";\nimport { TEACH_SEEN_KEY, resetSeen } from "@/domain/teachHint";\nimport { unreadTeachCount } from "@/ui/TeachHint";'
assert old_imp in s
s = s.replace(old_imp, new_imp, 1)

old_state = '  const [imported, setImported] = useState<{ keys: number } | null>(null);'
new_state = '''  const [imported, setImported] = useState<{ keys: number } | null>(null);
  // M1229: the teaching-hint ledger — how many dashboard lessons are still unread, and the
  // control that puts every "?" back to its unread pulse.
  const [teachSeen, setTeachSeen] = useLocalStorage<string[]>(TEACH_SEEN_KEY, []);
  const unreadLessons = unreadTeachCount(teachSeen);'''
assert old_state in s
s = s.replace(old_state, new_state, 1)

old_panel = '''      <Panel className="p-4">
        <SectionTitle title={t("set.about")} />'''
new_panel = '''      <Panel className="p-4">
        <SectionTitle title={t("teach.settingsTitle")} hint={t("teach.settingsHint")} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm">{unreadLessons > 0 ? t("teach.unreadCount", { n: unreadLessons }) : t("teach.allRead")}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={unreadLessons === 0}
            onClick={() => { setTeachSeen(resetSeen()); toast(t("teach.resetDone")); }}
          >
            {t("teach.reset")}
          </Button>
        </div>
      </Panel>

      <Panel className="p-4">
        <SectionTitle title={t("set.about")} />'''
assert old_panel in s
s = s.replace(old_panel, new_panel, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("settings wired")
