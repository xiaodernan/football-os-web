# Football OS 项目持续开发状态报告

## 📊 当前项目状态

**当前HEAD**: `e2787f7 M1000: the xG family walked end to end - table, margins, closing time, venue clock, save quality`
**总提交数**: 1283
**开发状态**: 持续进行中，无阻塞问题（并发 lane 活跃，本周经历两次 origin/master 重写，均以 fetch + rebase 合入）
**远端分支**: `github.com:xiaodernan/football-os-web.git` master 已同步

## 🚀 近期里程碑

- **M962 /streaks 连胜与不败纪录**：`streaks` 折叠按开球时间逐队走一遍赛果，得到最长连胜、最长不败、当前连胜与当前不败，联赛最佳与持有者；无事件记录也能读全部已结束比赛。独立证词 `proof-streaks`。
- **M963 连胜的主客分侧**：抽出共享 `runsOf()`，整季 / 主场 / 客场三遍走同一段算术；每行加「主场 x胜/y不败 · 客场 …」。
- **M964 最长不胜**：`runsOf` 同时跟踪 winless（平局延续、取胜终止）；/streaks 第四块牌与每行第三行。
- **M965 全路由冒烟网**：`tests/e2e/all-routes.spec.ts` 遍历 20 个路由，断言壳挂载且页面是屏幕本身而非构建队列回退。
- **M966 教练简历端到端**：`tests/e2e/coach-cv.spec.ts` 真的在浏览器里踢一场比赛，任期、赛季记录、首秀徽章与公开名片全部由这次点击长出来。
- **M967 世界与设置端到端**：`tests/e2e/state.spec.ts` 走两季模拟并读赛季报告与冠军榜，再走设置页的 JSON 导出、重置确认与活动存储清空，并断言语言偏好行仍在。
- **M968 纪录的断点**：`streaks` 的同一次走读记下最长不败在哪一场结束——`runsOf` 记最佳不败终点下标，终点后的那场按构造必是失利，`StreakBreak` 随行返回，仍在延续时为 null；/streaks 新面板「纪录的断点」按榜单原有不败序读折叠，2 场以上的纪录才上板，活着印「仍在延续」，被终结则印对手、比分与日期。
- **M969 冒烟网从路由表派生**：tests/e2e/all-routes.spec.ts 的路由列表直接读 `src/App.tsx` 的 `path ===` 分支与 `FOOTBALL_PREFIXES`（43 + 7 = 50 条），多一条覆盖度断言防静默漏测；E2E 65/65。
- **M970 近五轮，重排**：`formTable` 折叠（每队最近五场按开球时间，复用 `recentResults`/`creditResult`/`byTableStanding` 门）；新屏 features/analytics/FormTable.tsx（/form + nav.form）：四块牌（已读场次/涨得最多/跌得最多/窗口内最高）+ 近五轮表；proof-formtable 7/7；126/126 全套证词、E2E 66/66（派生网自动覆盖 /form）。
- **M971 近五轮，两端分读**：`formTable` 的每条行按半场拆窗口（FormRow 加 homePlayed/homePoints/awayPlayed/awayPoints，与窗口同源、同遍推导，两端相加恒等于 played 与 points）；/form 每行加「H · n / A · n」列；proof-formtable 9/9；与别线 cardSeverity/venueSeverity（ba16121 M971、afca431 M972）同树合入并重跑全套。
- **M973 按结果看烈度**：`resultSeverity` 折叠（联结 clubResultClock 与 clubDisciplineResultClock，不重走赛程）——只留赢/负两头都有牌的队上板，`tilt` = lostShare − wonShare，按 |tilt| 降序；Discipline 屏新面板「哪种赛果更容易把同一支队罚红」（联赛句 + 单边队计数 + W/D/L 两轴分母句 + 倾斜列）；proof-result-severity 7/7（含 15 个种子赛事 seeded arm）；6 键×3；全套 127/127 · 3,424 检查、E2E 66/66。
- **M974 新面板走读**：tests/e2e/screens.spec.ts 两条补充——/discipline 的 M973 面板与 /form 表与 chip 切换都有端到端锚；E2E 68/68。
- **M975 扑救质量**：`saveSeverity` 折叠（组合自 eventClock 的已有行，不重走赛程）——只留 faced > 0 的队上板，按 stopShare 降序；EventClock 屏新面板「扑救质量」；proof-save-severity 6/6（含 15 个种子赛事 seeded arm）；4 键×3；PWA 554（JS 541）重录；全套 128/128 · 3,430 检查、E2E 68/68。
- **M976 钢墙**：`leagueWall` 折叠（复用 isFinished 与 creditRecord 门，零封数与表折叠同源）——/leaders 新增「钢墙」面板，按零封占比（分母 = 踢过的比赛）排俱乐部；联赛数 = 全部 CS 数 / 球队-场次数；proof-leaders-wall 6/6（15 联赛全世界 seeded arm 与 independent recount 对账）；6 键×3；PWA 555；全套 129/129 · 3,436 检查、E2E 68/68。
- **M977 致命一击**：`finishingRate` 折叠（联合 eventClock 的 shots 与 goalTiming 的 scored，两条事件流互斥）——/timing 新增「致命一击」面板，按转化率排各队（分母 = 全部尝试）；联赛数 = 全部 GOAL / 全部尝试；proof-finishing 6/6（15 联赛 seeded arm）；5 键×3；PWA 555（JS 543）；全套 130/130 · 3,442 检查、E2E 68/68。
- **M978 两块新榜走读**：/leaders（The wall）与 /timing（The lethal read）E2E 走读；E2E 70/70。
- **M979 诚实报告**：`predictionAudit` 折叠——SimulationLab 新面板：对每个比赛重放一遍（当时刻只算此前的 teamMetrics + outcomeOdds），打 Brier 分与 favorite 命中率；SimulationLab 新增竞赛 chip + 三块牌 + 模型看好分布句；proof-prediction-audit 6/6（含 15 联赛 seeded arm，门禁指出的两次红都在本提交前修复：根目录 scratch cork、sum 门手撸 reduce→sum 门、compare→byKickoff 门）；8 键×3；PWA 557；全套 131/131 · 3,448 检查、E2E 70/70。
- **M980 xG 榜**：`xgTable` 折叠——GoalTiming 新增 xG 表（每粒 GOAL 的 xG 汇总到球队，按 xGD 降序）+ outshine（GF − xGF）列；proof-xgtable 6/6（15 联赛 seeded arm：outshine 对 metrics gf、xgDiff、ordering、2dp）；7 键×3；PWA 557（JS 545）；全套 132/132 · 3,454 检查、E2E 70/70。
- **M981 本场 xG**：`matchXg(m)` 折叠（复用同一 parser）——Details 各侧加 xG 大号数 + xG 面板（含 missing 句）；E2E /matches/M0991 走读；proof-match-xg 6/6（world-scope seeded arm 严格对账 408.17 == 联赛 leagueXg）；4 键×3；PWA 558；全套 133/133 · 3,460 检查、E2E 71/71。
- **M982 xG 分端钟**：`xgVenueClock` 折叠——VenueSplit 新增「各时间段的 xG 分布」面板（主客分侧 × 六窗 xG 抗柱共享标签）；proof-xg-venue-clock 5/5（15 联赛 seeded arm、空窗遵循 ABSENT 门）；4 键×3；PWA 558（JS 546）；全套 134/134 · 3,465 检查、E2E 71/71。
- **M983 亏欠的分差**：`xgRobberies` 折叠——GoalTiming 新面板：比分盘白白赢的比赛，按 loser-xG − winner-xG 降序排列（margin ≥ 1.5 上板，最宽 8 场）；proof-xg-robberies 5/5（15 联赛 seeded arm）；5 键×3；PWA 559（JS 547）；全套 135/135 · 3,470 检查、E2E 71/71。
- **M984 最严的联赛**：`strictness` 折叠——Discipline 新增「哪家联赛更放得开」面板：把所有赛事按每场已结束的比赛算几张牌排序（世界均值作对照）；proof-strictness 5/5（15 联赛 seeded arm）；6 键×3；PWA 560（JS 547）；全套 136/136 · 3,475 检查、E2E 71/71。
- **M985 最夸张的赛果**：`records` 折叠——/leaders 新增「The wildest results」面板：Biggest rout、Most goals 与 Biggest draw 三张 banner（并列以最早 kickoff 定）；数据遍布全世界；proof-leaders-records 6/6（15 联赛 world seeded arm）；9 键×3；PWA 561（JS 549）；全套 137/137 · 3,481 检查、E2E 71/71。
- **M986 两块新榜走读**：/discipline（strictness）与 /leaders（wildest results）E2E 走读；E2E 73/73。
- **M987 输球之后**：`bounceBack` 折叠——GoalTiming 新增「After a defeat」面板：输球后紧挨着的下一场拿分，按 rate 降序排（world 均值作对照）；proof-bounceback 6/6（15 联赛 seeded arm）；6 键×3；PWA 562（JS 549）；全套 138/138 · 3,487 检查、E2E 73/73。
- **M988 走读**：/timing「After a defeat」端到端断言；E2E 74/74。
- **M989 还有 15 分钟**：`lateXg` 折叠——GoalTiming 新增「Closing time」面板：每支球队已记录 xG 中有多少发生在最后 15 分钟，按降序排；league-world 均值作对照；proof-late-xg 6/6（15 联赛 seeded arm）；6 键×3；PWA 563（JS 550）；全套 139/139 · 3,493 检查、E2E 74/74。
- **M990 最开放的联赛**：`leagueOpenness` 折叠——/world 新增「Which league plays the most open games」面板：按每场已结束比赛算几个进球排所有赛事（world 行作对照）；proof-league-openness 6/6（15 联赛 seeded arm）；5 键×3；PWA 563（JS 551）；全套 140/140 · 3,499 检查、E2E 74/74。
- **M991 客场最夸张胜利**：`worldUpsets` 折叠——/world 新增「最夸张的客场胜利」横幅：rating-gap upset + widest away win，按实力缺口+进球数排序（ties on earliest kickoff）；proof-world-upsets 6/6（15 联赛 seeded arm 70/70 全部对账）；10 键×3；PWA 564（JS 552）；全套 141/141 · 3,505 检查、E2E 74/74。
- **M992 连续哑火**：`scorelessStreaks` 折叠——/leaders 新增「The blank runs」面板：按最长连续未进球（walked in order）排名；rows 只列有 blank 的 club；proof-scoreless-streaks 6/6（15 联赛 seeded arm）；8 键×3；PWA 565（JS 553）；全套 142/142 · 3,511 检查、E2E 74/74。
- **M993 连续哑火走读**：/leaders E2E 走读，「The blank runs」标题锚定位；E2E 75/75。
- **M994 联赛之首**：`worldLeaders` 折叠——/world 新增「联赛之首」（15 个 league top tiles, grid 显示）；proof-world-leaders 6/6（15 联赛 seeded arm）；3 键×3；PWA 565（JS 553）；全套 143/143 · 3,517 检查、E2E 75/75。
- **M995 /world 三块新榜走读**：/world E2E 模拟赛季后断言「最开放的联赛」「The wildest of away wins」「联赛之首」都可见；E2E 76/76。
- **M996 /projection 走读**：/projection 页面断言「Player growth projection」与副句；E2E 77/77。
- **M997 /streaks 走读**：/streaks 页面断言 heading 与最长不胜 tile；E2E 78/78。
- **M998 传球手**：`passingAccuracy` 折叠——/leaders 新增「The passers」面板：按每场 finished fixture 的 stats 块算各 club 的传球成功率平均（rankly sorted，world 均值作对照）；proof-passing 7/7（T40 fixture solver；15 联赛 seeded arm 全部对账）；7 键×3；PWA 566（JS 554）；全套 144/144 · 3,524 检查、E2E 78/78。
- **M999 伤病最严重的球队**：`squadAvailability` 折叠——/injuries 新增「伤病最严重的球队」阶梯面板：本周按 club 走完世世界场均出场队伍，按 injuries 降序排（fitness 低优先；ID 做最后的 tiebreak）；proof-squad-availability 7/7（T41 fixture 手算 + world arm 对全部 73 clubs 的 independent 复核）；5 键×3；PWA 567（JS 555）；全套 145/145 · 3,531 检查、E2E 81/81。
- **M1000 xG 家族走读**：tests/e2e/screens.spec.ts 三条补充锚住 M980 xG 表、M983 亏欠分差、M989 后 15 分钟、M982 分端 xG 钟与 M975 扑救质量在真实浏览器里渲染；E2E 84/84。

## ✅ 质量门禁（每次提交）

- `npx tsc --noEmit` 退出码 0
- `npm run build` 退出码 0
- 全套证词：**145/145 脚本、3,531/3,531 检查**
- E2E：**84/84**（onboarding、command-center、player-training、manager-match、coach CV、leads、timing、home-away、discipline、clock、state、all-routes 派生覆盖全部 50 条路由、screens 走读：wall、lethal read、match xG、sevResult、form、blank runs、world page three boards、projection、streaks、injuries M999 ladder、xG family M1000）
- 国际化：en / zh-CN / zh-TW 三语字典完整；census literal 2,184、litVarSites 345

## 🧭 下一步方向

- 连胜家族继续读真实数据：纪录断点的主客分侧、最长不败的对手强度、纪录与积分的交叉。
- 新的一线：把已折叠但屏幕未读的量逐条接上可见面（以 `proof-unused-locals` / `proof-dead-exports` 的程序普查为准）。
- E2E 层继续扩到尚未走读的屏幕，保持每次运行都是真实点击。
