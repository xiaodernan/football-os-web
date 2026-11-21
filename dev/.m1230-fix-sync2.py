import io
p = "ui/FirstRunGuide.tsx"
s = io.open(p, encoding="utf-8").read()
old = '''  const { t } = useI18n();
  const [state, setState] = useLocalStorage<TourState>(TOUR_KEY, initialTour());'''
new = '''  const { t } = useI18n();
  const { path } = useRouter();
  const [state, setState] = useLocalStorage<TourState>(TOUR_KEY, initialTour());'''
assert old in s
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("router wired")
