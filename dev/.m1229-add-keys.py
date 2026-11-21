import io
p = "i18n/dictionaries.ts"
s = io.open(p, encoding="utf-8").read()

en_block = '''  "teach.open": "What is this?",
  "teach.close": "Close the lesson",
  "teach.newUnread": "Unread lesson",
  "teach.player": "Your player OS: train, complete sessions and watch your attributes grow week by week.",
  "teach.manager": "The manager seat: pick the mentality, set tactics and run matchdays for your club.",
  "teach.profile": "Your profile: identity, career arc, goals and the résumé you choose to show.",
  "teach.review": "The weekly review: what the fold noticed about your week, one honest line at a time.",
  "teach.load": "Your load board: fitness, fatigue and recovery zones across the training week.",
  "teach.achievements": "Badges you earn by playing — each one names the exact behaviour that unlocked it.",
  "teach.settings": "Preferences, the stored-data inventory, export/import and the language switch.",
  "teach.history": "Every match you have watched or played, newest first, with the tape kept.",
  "teach.scouting": "The watchlist: shortlist players, compare their numbers and follow their season.",
  "teach.world": "The dynamic world: fifteen leagues simulate forward season by season.",
  "teach.film": "The film room: clip moments from matches and build a library of what mattered.",
  "teach.data": "The data room: every table the world is built from, filterable and exportable.",
  "teach.transfers": "The transfer centre: rumours, moves and market values across the world.",
  "teach.compare": "Put two players (or clubs) side by side, attribute by attribute.",
  "teach.watchlist": "The players you are following, with their latest movement in one list.",
  "teach.tactical": "The tactical studio: drag a shape, set the mentality and send it to the simulator.",
  "teach.simulation": "The simulation lab: replay a fixture or a whole season with the world's engine.",
  "teach.ai": "Ask the world's coach: answers are grounded in the dossier and cite their numbers.",
  "teach.knowledge": "The knowledge graph: how clubs, players, competitions and rivals connect.",
  "teach.learn": "The learning hall: lessons, quizzes and a tutor that teaches only from this page.",
  "teach.community": "The community hub: polls, threads and the season's fan voice.",
  "teach.football": "The football world itself: tables, fixtures, clubs, players and every competition.",
  "teach.palette": "The command palette: press the button (or Ctrl+K) to jump anywhere or run any action.",
  "teach.ops": "The operator console: behaviour analytics, cache and service health. Password 123.",
  "teach.manual": "The operating manual: every screen explained, printable, in your language.",
  "teach.settingsTitle": "Teaching hints",
  "teach.settingsHint": "Every module on the dashboard carries a one-line lesson. Read ones stay quiet; unread ones pulse.",
  "teach.unreadCount": "{n} lessons unread",
  "teach.allRead": "Every lesson read",
  "teach.reset": "Mark all unread",
  "teach.resetDone": "All lessons marked unread",
'''

zh_block = '''  "teach.open": "这是什么？",
  "teach.close": "关闭教学",
  "teach.newUnread": "未读教学",
  "teach.player": "你的球员 OS：安排训练、完成课程，看着属性一周周长大。",
  "teach.manager": "经理席：选定心态、排布战术，为你的俱乐部指挥比赛日。",
  "teach.profile": "你的档案：身份、生涯弧线、目标，以及你选择展示的履历。",
  "teach.review": "每周回顾：折叠引擎注意到的这一周，每次一条诚实的线。",
  "teach.load": "负荷板：整个训练周的体能、疲劳与恢复区间。",
  "teach.achievements": "游玩赚得的徽章——每一枚都点名解锁它的具体行为。",
  "teach.settings": "偏好设置、本机数据清单、导出/导入与语言切换。",
  "teach.history": "你看过或踢过的每一场比赛，最新的在前，录像保留。",
  "teach.scouting": "观察名单：短名单球员、对比他们的数据、跟踪他们的赛季。",
  "teach.world": "动态世界：十五个联赛一个赛季一个赛季地向前模拟。",
  "teach.film": "录像室：剪辑比赛瞬间，建一座「重要时刻」图书馆。",
  "teach.data": "数据室：构建这个世界的每一张表，可筛选、可导出。",
  "teach.transfers": "转会中心：全世界的传闻、转会和市场身价。",
  "teach.compare": "把两名球员（或两家俱乐部）并排放，逐项属性对比。",
  "teach.watchlist": "你关注的球员，最新动向汇成一个名单。",
  "teach.tactical": "战术工作室：拖动阵型、设定心态，把它送进模拟器。",
  "teach.simulation": "模拟实验室：用世界引擎重放一场比赛或整个赛季。",
  "teach.ai": "问世界教练：答案只引用卷宗内的事实并给出数字出处。",
  "teach.knowledge": "知识图谱：俱乐部、球员、赛事与对手之间如何相连。",
  "teach.learn": "学习大厅：课程、测验，以及只教这一页内容的导师。",
  "teach.community": "社区中心：投票、帖子和这个赛季的球迷声音。",
  "teach.football": "足球世界本身：积分榜、赛程、俱乐部、球员和每项赛事。",
  "teach.palette": "指令面板：点按钮（或按 Ctrl+K）跳到任何页面或执行任何操作。",
  "teach.ops": "运营台：行为分析、缓存与服务健康。密码 123。",
  "teach.manual": "使用说明书：每个界面都讲清楚，可打印，用你的语言。",
  "teach.settingsTitle": "按键教学",
  "teach.settingsHint": "主界面每个模块都附带一条一句话教学。已读的保持安静，未读的会轻轻闪烁。",
  "teach.unreadCount": "{n} 条教学未读",
  "teach.allRead": "全部教学已读",
  "teach.reset": "全部标为未读",
  "teach.resetDone": "全部教学已标为未读",
'''

tw_block = '''  "teach.open": "這是什麼？",
  "teach.close": "關閉教學",
  "teach.newUnread": "未讀教學",
  "teach.player": "你的球員 OS：安排訓練、完成課程，看著屬性一週週長大。",
  "teach.manager": "經理席：選定心態、排佈戰術，為你的俱樂部指揮比賽日。",
  "teach.profile": "你的檔案：身份、生涯弧線、目標，以及你選擇展示的履歷。",
  "teach.review": "每週回顧：摺疊引擎注意到的這一週，每次一條誠實的線。",
  "teach.load": "負荷板：整個訓練週的體能、疲勞與恢復區間。",
  "teach.achievements": "遊玩賺得的徽章——每一枚都點名解鎖它的具體行為。",
  "teach.settings": "偏好設定、本機資料清單、匯出/匯入與語言切換。",
  "teach.history": "你看過或踢過的每一場比賽，最新的在前，錄影保留。",
  "teach.scouting": "觀察名單：短名單球員、對比他們的數據、跟蹤他們的賽季。",
  "teach.world": "動態世界：十五個聯賽一個賽季一個賽季地向前模擬。",
  "teach.film": "錄影室：剪輯比賽瞬間，建一座「重要時刻」圖書館。",
  "teach.data": "資料室：建構這個世界的每一張表，可篩選、可匯出。",
  "teach.transfers": "轉會中心：全世界的傳聞、轉會和市場身價。",
  "teach.compare": "把兩名球員（或兩家俱樂部）並排放，逐項屬性對比。",
  "teach.watchlist": "你關注的球員，最新動向匯成一個名單。",
  "teach.tactical": "戰術工作室：拖動陣型、設定心態，把它送進模擬器。",
  "teach.simulation": "模擬實驗室：用世界引擎重放一場比賽或整個賽季。",
  "teach.ai": "問世界教練：答案只引用卷宗內的事實並給出數字出處。",
  "teach.knowledge": "知識圖譜：俱樂部、球員、賽事與對手之間如何相連。",
  "teach.learn": "學習大廳：課程、測驗，以及只教這一頁內容的導師。",
  "teach.community": "社區中心：投票、貼文和這個賽季的球迷聲音。",
  "teach.football": "足球世界本身：積分榜、賽程、俱樂部、球員和每項賽事。",
  "teach.palette": "指令面板：按按鈕（或按 Ctrl+K）跳到任何頁面或執行任何操作。",
  "teach.ops": "營運台：行為分析、快取與服務健康。密碼 123。",
  "teach.manual": "使用說明書：每個界面都講清楚，可列印，用你的語言。",
  "teach.settingsTitle": "按鍵教學",
  "teach.settingsHint": "主介面每個模組都附帶一條一句話教學。已讀的保持安靜，未讀的會輕輕閃爍。",
  "teach.unreadCount": "{n} 條教學未讀",
  "teach.allRead": "全部教學已讀",
  "teach.reset": "全部標為未讀",
  "teach.resetDone": "全部教學已標為未讀",
'''

# Insert after the LAST tac.* line inside each locale block.
# The tac group ends right before the next namespace; anchor on each locale's own tac.toastLoaded
# (en) / last tac key in zh blocks.
anchors = [
    ('  "tac.toSim": "Take to Simulation Lab →",\n', None),  # placeholder, replaced below
]
# Simpler: find each locale's block boundaries by the const declarations, then insert before the
# first key that sorts after "teach." — use the existing "time." group as the anchor per block.
import re
lines = s.split("\n")
# locate the three blocks
en_at = next(i for i, l in enumerate(lines) if l.startswith("const en: Dict"))
zh_at = next(i for i, l in enumerate(lines) if l.startswith("const zhCN: Dict"))
tw_at = next(i for i, l in enumerate(lines) if l.startswith("const zhTW: Dict"))
blocks = [(en_at, zh_at, en_block), (zh_at, tw_at, zh_block), (tw_at, len(lines), tw_block)]

def insert_before_time(lo, hi, block_text):
    # first line index in [lo, hi) whose key sorts after "teach." — the "time." namespace
    for i in range(lo, hi):
        m = re.match(r'  "([^"]+)":', lines[i])
        if m and m.group(1) > "teach." and m.group(1).startswith("t"):
            return i
    raise AssertionError("no anchor in block")

# insert from the bottom up so indices stay valid
for lo, hi, block_text in sorted(blocks, key=lambda b: -b[0]):
    idx = insert_before_time(lo, hi, block_text)
    lines[idx:idx] = block_text.rstrip("\n").split("\n")

io.open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
print("dictionaries updated")
