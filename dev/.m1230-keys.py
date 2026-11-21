import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()

en = '''  "guide.kicker": "Quick tour · step {n} of {of}",
  "guide.skip": "Skip",
  "guide.back": "Back",
  "guide.next": "Next",
  "guide.finish": "Start exploring",
  "guide.replay": "Replay the quick tour",
  "guide.welcome.title": "Welcome to Football OS",
  "guide.welcome.body": "Six quick stops and you know the board. Every screen also carries a \\"?\\" that teaches it — this tour only shows you where things are.",
  "guide.next.title": "Your next moves, ranked",
  "guide.next.body": "The fold reads your state and ranks what is worth doing now — a live match first, then training, film and the rest. One tap each.",
  "guide.modules.title": "Twenty-two doors into the world",
  "guide.modules.body": "Every module is a different way into the same world: play it, manage it, study it, simulate it. Start anywhere; nothing is locked.",
  "guide.palette.title": "Jump anywhere",
  "guide.palette.body": "The command palette (or Ctrl+K) reaches every screen and action without hunting through menus.",
  "guide.modes.title": "Three ways to be in the world",
  "guide.modes.body": "Fan, Player or Manager — the same world seen from three seats. Switch whenever you like; your progress travels with you.",
  "guide.manual.title": "When you want the whole story",
  "guide.manual.body": "The operating manual explains every screen in your language, and the world tour shows you the leagues themselves. Enjoy the world.",
'''
zh = '''  "guide.kicker": "快速上手 · 第 {n} 步，共 {of} 步",
  "guide.skip": "跳过",
  "guide.back": "上一步",
  "guide.next": "下一步",
  "guide.finish": "开始探索",
  "guide.replay": "重播快速之旅",
  "guide.welcome.title": "欢迎来到 Football OS",
  "guide.welcome.body": "六站走完你就认识了这块主界面。每个界面还都有一个「?」点开就是教学——这趟快速之旅只告诉你东西都在哪。",
  "guide.next.title": "你的下一步，已排好序",
  "guide.next.body": "折叠引擎读取你的状态，把此刻最值得做的事排好序——直播的比赛优先，然后是训练、录像等等。各点一下即可。",
  "guide.modules.title": "二十二扇通往世界的门",
  "guide.modules.body": "每个模块都是进入同一个世界的不同方式：踢它、经营它、研究它、模拟它。从任何一处开始，没有什么会上锁。",
  "guide.palette.title": "跳到任何地方",
  "guide.palette.body": "指令面板（或按 Ctrl+K）够得着每个界面和操作，不用在菜单里翻找。",
  "guide.modes.title": "身处世界的三种方式",
  "guide.modes.body": "球迷、球员或经理——同一个世界的三个座位。随时切换，你的进度跟着你走。",
  "guide.manual.title": "想看全部故事时",
  "guide.manual.body": "使用说明书用你的语言讲清每个界面，世界巡礼带你亲历各联赛。享受这个世界吧。",
'''
tw = '''  "guide.kicker": "快速上手 · 第 {n} 步，共 {of} 步",
  "guide.skip": "跳過",
  "guide.back": "上一步",
  "guide.next": "下一步",
  "guide.finish": "開始探索",
  "guide.replay": "重播快速之旅",
  "guide.welcome.title": "歡迎來到 Football OS",
  "guide.welcome.body": "六站走完你就認識了這塊主介面。每個介面還都有一個「?」點開就是教學——這趟快速之旅只告訴你東西都在哪。",
  "guide.next.title": "你的下一步，已排好序",
  "guide.next.body": "摺疊引擎讀取你的狀態，把此刻最值得做的事排好序——直播的比賽優先，然後是訓練、錄影等等。各點一下即可。",
  "guide.modules.title": "二十二扇通往世界的門",
  "guide.modules.body": "每個模組都是進入同一個世界的不同方式：踢它、經營它、研究它、模擬它。從任何一處開始，沒有什麼會上鎖。",
  "guide.palette.title": "跳到任何地方",
  "guide.palette.body": "指令面板（或按 Ctrl+K）夠得著每個介面和操作，不用在選單裡翻找。",
  "guide.modes.title": "身處世界的三種方式",
  "guide.modes.body": "球迷、球員或經理——同一個世界的三個座位。隨時切換，你的進度跟著你走。",
  "guide.manual.title": "想看全部故事時",
  "guide.manual.body": "使用說明書用你的語言講清每個介面，世界巡禮帶你親歷各聯賽。享受這個世界吧。",
'''
for anchor, block in [
    ('  "teach.resetDone": "All lessons marked unread",', en),
    ('  "teach.resetDone": "全部教学已标为未读",', zh),
    ('  "teach.resetDone": "全部教學已標為未讀",', tw),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + block.rstrip("\n"), 1)

for anchor, val in [
    ('  "set.key.teach": "Lessons you have read",', '  "set.key.tour": "Quick tour progress",'),
    ('  "set.key.teach": "已读的教学",', '  "set.key.tour": "快速之旅进度",'),
    ('  "set.key.teach": "已讀的教學",', '  "set.key.tour": "快速之旅進度",'),
]:
    assert anchor in s, anchor
    s = s.replace(anchor, anchor + "\n" + val, 1)

io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("guide keys added")
