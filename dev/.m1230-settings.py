import io
p = "features/settings/SettingsPage.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm">{unreadLessons > 0 ? t("teach.unreadCount", { n: unreadLessons }) : t("teach.allRead")}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={unreadLessons === 0}
            onClick={() => { setTeachSeen(resetSeen()); toast(t("teach.resetDone")); }}
          >
            {t("teach.reset")}
          </Button>
        </div>'''
new = '''        <div className="mt-2 flex items-center justify-between gap-2">
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
        {/* M1230: the quick tour's replay lives beside the lessons — both are the front door's
            teaching furniture, and a visitor who skipped it once can ask for it again. */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm">{t("guide.replayHint")}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setTour(tourRestart()); toast(t("guide.replay")); }}
          >
            {t("guide.replay")}
          </Button>
        </div>'''
assert old in s, "settings teaching panel"
s = s.replace(old, new, 1)
old = 'import { TEACH_SEEN_KEY, resetSeen } from "@/domain/teachHint";'
new = 'import { TEACH_SEEN_KEY, resetSeen } from "@/domain/teachHint";\nimport { TOUR_KEY, initialTour, tourRestart } from "@/domain/firstRunGuide";'
assert old in s
s = s.replace(old, new, 1)
old = '''  const [teachSeen, setTeachSeen] = useLocalStorage<string[]>(TEACH_SEEN_KEY, []);
  const unreadLessons = unreadTeachCount(teachSeen);'''
new = '''  const [teachSeen, setTeachSeen] = useLocalStorage<string[]>(TEACH_SEEN_KEY, []);
  const [tour, setTour] = useLocalStorage<TourState>(TOUR_KEY, initialTour);
  const unreadLessons = unreadTeachCount(teachSeen);'''
assert old in s
s = s.replace(old, new, 1)
old = 'import { TEACH_SEEN_KEY, resetSeen } from "@/domain/teachHint";'
s = s.replace(old, new, 1)
# TourState type import
old = 'import { TOUR_KEY, initialTour, tourRestart } from "@/domain/firstRunGuide";'
new = 'import { TOUR_KEY, initialTour, tourRestart, type TourState } from "@/domain/firstRunGuide";'
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("settings replay wired")
