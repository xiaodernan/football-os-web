import io
p = "features/command/CommandPalette.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''      { id: "ask", label: t("cmd.ask"), hint: t("cmd.from", { path }), group: "actions", run: nav("/ai") },
    );'''
new = '''      { id: "ask", label: t("cmd.ask"), hint: t("cmd.from", { path }), group: "actions", run: nav("/ai") },
      // M1230: replay the quick tour — restarts the first-run guide and lands on the board it
      // walks, so the action works from any screen the palette is opened on.
      { id: "tour", label: t("guide.replay"), hint: t("guide.replayHint"), group: "actions", run: () => { setTour(tourRestart()); nav("/")(); } },
    );'''
assert old in s, "palette actions anchor"
s = s.replace(old, new, 1)
old = 'import { useOs } from "@/store/useFootballOS";'
new = 'import { useOs } from "@/store/useFootballOS";\nimport { useLocalStorage } from "@/lib/hooks";\nimport { TOUR_KEY, initialTour, tourRestart, type TourState } from "@/domain/firstRunGuide";'
assert old in s
s = s.replace(old, new, 1)
old = '''  const { state, setMode } = useOs();
  const [query, setQuery] = useState("");'''
new = '''  const { state, setMode } = useOs();
  const [, setTour] = useLocalStorage<TourState>(TOUR_KEY, initialTour);
  const [query, setQuery] = useState("");'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("palette replay wired")
