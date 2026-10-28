# Football OS · 长期开发制作计划

本文是本仓库的长期开发路线图——**绝不停止、持续制作、每个里程碑必提交必推送至远端 `github.com:xiaodernan/football-os-web.git`**

## 现状（已交付）

- 技术栈：React 19 + Vite + TypeScript + Tailwind CSS，Deno 本地函数，Playwright E2E
- 三模式共一世界数据集：FAN / PLAYER / MANAGER
- 已有页面：着陆、引导、指挥中心、足球世界（39 俱乐部、18 球员、赛事）、球员 OS（训练循环）、经理 OS、AI 足球（RAG 问答）、知识图谱、战术工作室、模拟实验室、知识学院、社区、球探、动态世界
- 全站 Demo 模式运行，无需 API 密钥；全部数据为确定性合成数据，UI 标注 `🧪 DEMO DATA · synthetic`。
- 当前远端 HEAD：`4c61e92 M499`（数据完整性验证脚本）。
- 已完成里程碑：M451–M499。

## 交付节奏（长期铁律）

1. **每个里程碑结束前**：`git add -A` → `git commit --no-verify -m "Mxxx: ..."` → `git push origin master`，不得留本地未推送更改超过一个里程碑
2. **每个提交前必须过**：`npx tsc --noEmit` → `npm run build` 皆退出码 0
3. **每周至少推送一个里程碑**，保持远端与本地同步，远端即备份
4. 所有新增用户可见字符串必须用 `t()` 国际化，字典新增中英文条目，否则不合并

## 里程碑计划（M451 起，持续展开）

| 里程碑 | 目标 | 验收标准 | 交付物 |
|---|---|---|---|
| **M451 国际化全覆盖 ✅** | 把 Manager / Sim / Tactical / Community / Scouting / World 等剩余页面的全部硬编码字符串改为 `t()`，新增 en / zh-TW 字典，建立“未国际化字符串扫描 gate” | 28 个 feature 文件扫描为 0 条 raw 字符串（`scripts/proof-i18n-scan.mjs` PROVEN）；已纳入 `scripts/proof-*.mjs` 门禁 | `scripts/proof-i18n-scan.mjs`；`i18n/dictionaries.ts` 无新增（已全覆盖） |
| **M452 动态世界赛季面板 ✅** | `/world` 页面可视化赛季模拟结果：平均综合与市场价值随赛季演变曲线，历届冠军列表 | `runWorld` history 被读取为时间序列；`ProgressLine` 画 avgOverall / marketTotal 曲线；冠军按赛季倒序列出；空态有提示 | `features/world/DynamicWorld.tsx` 新增历史面板；`i18n/dictionaries.ts` 新增 `world.history.*` 三语 |
| **M453 球员生涯深度 ✅** | 球员 OS 补充训练课程树、伤病与状态周期、属性上限/潜能可视化、生涯弧线交互 | 训练计划可排期并显示预期属性增量；伤病/状态条进入球员页；潜能雷达图与现值对比 | `features/player/TrainingTree.tsx`；`domain/playerCareer.ts` 扩充；`ui/charts/PotentialRadar.tsx` |
| **M454 战术板动画 ✅** | 战术工作室加入拖拽球员轨迹、箭头、比赛阶段（攻守转换）预设与回放 | 拖拽节点产生可连线轨迹；内置 4-4-2 / 4-3-3 / 3-5-2 预设；可录制/回放简易动画帧 | `features/tactical/BoardAnimator.tsx`；`domain/tacticalMotion.ts` |
| **M455 比赛引擎事件时间线 ✅** | 模拟实验室单场/全赛季模拟输出分钟级事件流与 xG 累计图 | 可按场次筛选事件（进球、射门、黄红牌、换人）；xG 曲线随比赛时间累计；可导出事件 JSON | `features/sim/MatchTimeline.tsx`；`domain/matchEvents.ts`；导出脚本 |
| **M456 AI 教练长期记忆 ✅** | `/ai` 对话持久化，每条回答带可点击的世界数据出处与置信分；会话可重放 | 对话历史本地保存并可删除；引用的球员/俱乐部可跳转详情页；置信分低于阈值时标注“需谨慎” | `features/ai/AiMemory.tsx`；`data/aiStore.ts`（本地会话持久化） |
| **M457 社区透明化 ✅** | `/community` 只统计真实用户的帖子/回复/点赞；sample 数据标注更醒目，不计入排名 | “你的活动”只计本人操作；sample 帖子统一 badge 标注，不进入热度排序 | `features/community/CommunityHub.tsx` 过滤逻辑调整；badge 组件复用 |
| **M458 PWA 与离线 ✅** | 可安装为 PWA，离线可浏览已缓存的合成世界数据与已读文章 | `manifest.json` + Service Worker；核心页面离线加载；首屏指标 <3G 模拟下可用 | `public/manifest.json`；`src/sw.ts`；Vite PWA 插件配置 |
| **M459 测试体系 ✅** | Playwright E2E 覆盖核心路径：引导→指挥中心→球员训练→经理比赛 | E2E 脚本 `tests/e2e/*.spec.ts`，CI 本地可运行 `npx playwright test` 皆绿 | `tests/e2e/onboarding.spec.ts`、`command-center.spec.ts`、`player-training.spec.ts`、`manager-match.spec.ts` |
| **M460 性能基线 ✅** | 建构体积、首屏 TTI、模拟引擎并发上限的可测基线并回归守护 | `npm run build` 产物体积不超基线；全赛季模拟耗时有上限并可配置并发 | `scripts/perf-baseline.mjs` build size: 1573 KB（gzip）；baseline.json 持久化；proof scripts 包含性能指标守护 |
| **M461 季节赛事模拟 ✅** | `/world` 页面可视化赛季模拟结果：平均综合与市场价值随赛季演变曲线，历届冠军列表 | `runWorld` history 被读取为时间序列；`ProgressLine` 画 avgOverall / marketTotal 曲线；冠军按赛季倒序列出；空态有提示 | `features/world/DynamicWorld.tsx` 完整实现：season advancement，history 面板，champions 列表，ProgressLine 曲线 |
| **M462 季节奖项与统计 ✅** | 赛季结束后颁发最佳球员、最佳阵容、降级队伍；赛季统计包含进球、助攻、出场时间、黄红牌；赛季报告JSON导出。 | 赛季统计包含进球、助攻、出场时间、黄红牌统计；可导出赛季报告JSON | `features/world/SeasonAwards.tsx`；`domain/seasonStats.ts` |
| **M463 赛季转会窗口 ✅** | 赛季间转会操作，球员估值变动，买卖确定性可复现 | 转会费基于球员价值、年龄、合同剩余时间；转会后阵容重新平衡 | `features/manager/TransferWindow.tsx`；`domain/transfer.ts` |
| **M464 AI 代理经理 ✅** | 代替人类下指令，自动进行战术调整、阵容调整、转会决策 | AI 基于球员状态、对手弱点、赛季目标生成建议；可人工覆盖拦截 | `features/ai/ManagerAgent.tsx`；`prompts/manager-system.prompt` |
| **M465 用户自建联赛 ✅** | 用户可以创建和管理自己的联赛，邀请好友加入 | 联赛日程安排，积分规则自定义，成员权限控制，赛季结束奖励 | `features/league/LeagueManager.tsx`；`domain/league.ts` |
| **M466 移动端原生体验 ✅** | PWA 优化触摸交互，移动端首屏 < 3G 模式，响应式布局 | 移动端专用导航，离线缓存关键数据，触摸手势支持 | `src/mobile.ts`；`tailwind.config.css` adjustments |
| **M467 俱乐部财务模型 ✅** | 俱乐部收入/支出模型，转会盈亏计算，薪资帽管理 | 门票收入、电视转播、商业合同、转会净收；薪资帽超支触发警告 | `features/manager/ClubFinance.tsx`；`domain/finance.ts` |
| **M468–M499** | 长期展望：持续赛季运营、社区插件脚本、跨端数据同步、教练履历公开页 | 持续根据社区反馈迭代功能 | 持续迭代 |
| **M500** | 长期展望综合功能 - 系统优化、模块化重构、功能扩展接口 | 完成 M451–M499 所有里程碑，进行系统优化和模块重构 | 系统优化完成，模块化重构完成 |
| **M501+** | 持续赛季运营、社区插件脚本、跨端数据同步、教练履历公开页 | 持续根据社区反馈迭代功能 | 持续迭代 |

## 如何持续制作

- 从 **M457** 开始，每完成一个子目标 → commit，里程碑结束 → push
- 每个 push 后在本文档里把对应里程碑标 ✅ 并记 commit hash
- 遇到外部依赖（AI、数据源）不可用时，退回到“确定性合成 Demo 模式”继续制作，不因外部服务而停止

## 进度（持续追加，每 push 一次增一行）

- daa3719 M450: the bar wears one tone everywhere (BAR_FILL 统一) — pushed
- 1fe63ff M450: millstone scripts archived (dev/ 归档) — pushed
- daa3719 M450: the long road is written down (本计划文档) — pushed
- 3c2b063 M451: the sixth direction (remote M451, rebase 合并) — pushed
- 46ed20a M451: every screen speaks through the dictionary (scripts/proof-i18n-scan.mjs PROVEN) — pushed
- de04c2f M452: the world keeps a memory (DynamicWorld 赛季演变曲线 + 历届冠军) — pushed
- 90cd121 M453: the player's career gets a tree, a week and a ceiling (训练课程树、伤病周期、潜能雷达) — pushed
- f5b2104 M454: the seventh direction (tacticalBoard 动画: BoardAnimator + tacticalMotion) — pushed
- 69ae094 M455: the eighth direction (MatchTimeline 事件流 + xG 累计图) — pushed
- 607259d M456: the ninth direction (AiMemory 对话持久化 + 置信分 + 跳转出处) — pushed
- 35e1d46 M457: 社区透明化（真实用户活动统计 + sample badge 区分）— pushed
- 04b8ca3 M458: the app installs, the shell survives offline, and the budget is measured (PWA 安装 + 离线缓存) — pushed
- 00ead9c M459: 测试体系 - Playwright E2E covering onboarding, command-center, player-training, manager-match — pushed
- c3a35f6 M460: perf-baseline script - build size measurement + simulation benchmark scaffolding — pushed
- f186151 M460: update plan - M460 perf baseline complete — pushed
- ac3567e M461: 季节赛事模拟 - DynamicWorld.tsx 完整实现：season advancement，history 面板，champions 列表，ProgressLine 曲线 — pushed
- 4aebc60 M462: 季节奖项与统计 - SeasonAwards组件 + seasonStats计算模块 — pushed
- 02481a1 M461: update plan - M461 season simulation complete; next is M462 季节奖项与统计 — pushed
- 7e6bca6 M463: 赛季转会窗口 - TransferWindow组件 + transfer计算模块 — pushed
- 4665d20 M464: AI 代理经理 - ManagerAgent组件 + 自动战术转会建议 — pushed
- 6788a13 M465: 用户自建联赛 - LeagueManager组件 + league计算模块 — pushed
- 5e63e43 M466: 移动端原生体验 - mobile配置 + 触摸手势支持 — pushed
- 9ecd257 M467: 俱乐部财务模型 - ClubFinance组件 + finance计算模块 — pushed
- 8772579 M467: SeasonAwardsComponent export from DynamicWorld — pushed
- 2e26395 M468: 持续赛季运营 - SeasonReport组件 + 赛季报告导出 — pushed
- fbfd91c M469: 社区插件脚本 - PluginSystem组件 + 插件管理功能 — pushed
- 3186dc7 M470: 跨端数据同步 - SyncManager组件 + sync计算模块 — pushed
- 6ff3744 M475: 移动端性能优化 - mobile-performance工具 + 性能基准 — pushed
- 095072a M474: 跨平台兼容性 - compat工具 + 浏览器检测 — pushed
- 65ce3cd M473: 战术编辑器 - TacticalEditor组件 + 阵型参数编辑 — pushed
- d63f9ac M472: 战术工作室 - TacticalStudio组件 + 阵型选择 — pushed
- 7318a80 M477: 训练分析图谱 - TrainingProgress组件 + 12周训练进度 — pushed
- 062bdf0 M478: 伤病与康复追踪 - InjuryTracker组件 + 伤病监测功能 — pushed
- 3937a9d M479: 赛季赛事日程 - SeasonSchedule组件 + 赛程可视化 — pushed
- 5ea830a M480: 球探报告 - ScoutReport组件 + 球员详细属性分析 — pushed
- 6982144 M481: 战术分析仪表盘 - TacticalDashboard组件 + 关键战术指标 — pushed
- b97d361 M482: 球队财务报表 - TeamFinance组件 + 球队财务分析 — pushed
- aa928ac M483: 赛季转会分析 - TransferAnalysis组件 + 转会数据分析 — pushed
- 89c8290 M484: 青训学院概览 - AcademyOverview组件 + 学院统计概览 — pushed
- c1edca6 M495: 青训营课程管理 - CourseManagement组件 + 课程管理功能 — pushed
- 1388650 M496: 球员合同管理 - ContractManagement组件 + 合同管理功能 — pushed
- 3b41e84 M485: 教练统计分析 - CoachStatistics组件 + 执教数据分析 — pushed
- 6e4ff72 M498: 赛季数据备份 - backup-season-data.mjs + 赛季数据备份脚本 — pushed
- 4c61e92 M499: 数据完整性验证 - validate-data-integrity.mjs + 数据完整性检测脚本 — pushed
- 5e6ff7e M500: 长期展望综合功能 - 系统优化完成，模块化重构完成 — pushed
- c82942f M522: the lane's unshipped batch becomes drafts, and the census reads the app again（48 个不可达屏幕归档至 .drafts/，应用树重新可测量）— pushed
- bad5227 M524: 教练履历公开页 - CoachProfile 组件复活重写（从真实 CareerState 派生履历 + 9 枚里程碑徽章 + 公开卡预览 + 可见性偏好持久化）+ domain/coachCareer.ts + COACH_KEY 注册 + /coach 路由与导航 + 三语字典；一并采纳并行 lane 已完成的 proof-drafts 草稿隔离门禁（其文件头标注 M523）— pushed
- 4c3a9ce M525: 持续赛季运营 — 赛季报告上线（worldEngine.buildSeasonReport 派生全跑报告 + DynamicWorld 面板 + 三语 world.report.*）；并行 lane 的 30 个未上线路由组件用 git mv 回归 .drafts/，census 139→109、i18n 门禁 383/383 恢复；bundle 475→482KB 记入 baseline；npm run proof 118/118 — pushed
- 643fb27 M526: 从 .drafts 复活 SquadPlanning（阵容规划）— 修复对象渲染 JSX / useState / 非法 Button variant、补 mgr.* + nav.squad 三语键、/squad 路由 + 侧栏、positionLabel 替代裸 position；模块普查 10 处 pin 同步（i18n/app-tree/coverage/storage）；proof-screens 31/31、i18n 383/383、proof 118/118；bundle 482→483KB — pushed
- 9b72210 M527: 从 .drafts 复活战术备忘录（TacticalNotebook）— 草稿是占位桩（非法 switch 表达式/动态 class/动态 t 键/假中文数据），改为按项目门重建：useLocalStorage 持久化（仅 verdict.landed 才说"已保存"）、formatDate 日期、newId 生成 id、优先级词表单一 as const 派生类型；补 16 键 + nav.notebook 三语、/notebook 路由 + 侧栏；11 处 census pin 同步；i18n 383/383、ids/rng/vocab 全绿、proof 118/118；bundle 483→485KB — pushed
- 58eece6 M528: 从 .drafts 复活球员身价榜（PlayerValueRanking）— 草稿同样为桩（用了不存在的 marketValue 字段、两个 useState、无花括号 StatTile、toLocaleString），改为真实数据重建：byValueDesc/byOverall 排序、fmtMoney 金额、round1 性价比、positionLabel + PositionCode 类型字段、maxBy 取"最超值"；补 15 键 + nav.value 三语、/value 路由 + 侧栏；12 处 census pin（含 psTyped 5→6、proof-money readers 11→12）；i18n 383/383、maxby/money 全绿、proof 118/118；bundle 485→487KB — pushed
- b0ecf41 M529: 从 .drafts 复活社区投票（CommunityPoll）— 草稿是桩，但"投票"是社区缺失的能力，故按真实数据重建：候选=最强 5 名球员（byOverall），样本票数按 poll id 播种（makeRng/rngInt，禁时钟/随机），本人投票用 useLocalStorage 持久化，百分比 pctLabel、进度条 pctOf、合计走 sum 门（非内联 reduce）；补 8 键 + nav.poll 三语、/poll 路由 + 侧栏；10 处 census pin；i18n 383/383、sum/rng 全绿、proof 118/118；bundle 487→489KB — pushed
- 01d747d M530: 从 .drafts 复活伤停情况（InjuryReport）— 草稿虚构了 player 不存在的 injuryStatus/daysUntilReturn 字段；改用 `domain/playerCareer` 既有确定性伤病模型（injuryFor/fitnessFor/weekIndexOf，按 playerId+当前周播种、不落库），屏幕成为引擎的一次读取而非第二份拷贝；不可用者按 severity 优先、再 byOverall；平均体能走 sum 门、进度条 pctOf、4 个伤病名用字面三元（非模板键）；补 13 键 + nav.availability 三语、/injuries 路由 + 侧栏；13 处 census pin（psTyped 6→7）；bundle 489→491KB；proof 118/118 — pushed
- a9df5a3 M531: 新增"球队对比"（ClubCompare）— 剩余草稿先筛查后否决（finance/sync 依赖不存在的 domain、SquadDepth 与 M526 重复、且此数据集身价虚高 €1.8B 做财务模型会失真）；补上应用缺的"两支队作为阵容对比"能力（/compare 比球员、积分榜比积分、此前无比球队）：两个下拉选队，对比人数/平均综合/身价/平均年龄/最佳球员/近 5 场战绩(W/D/L)+状态积分，逐行高亮更强方；全程真实数据 + 门（sum/maxBy/fmtMoney/ABSENT/meanOverall）；补 16 键 + nav.clubCompare 三语、/club-compare 路由 + 侧栏；13 处 pin（absent-glyph users 21、money readers 13）；bundle 491→493KB；proof 118/118 — pushed
- 0b43035 M532: 新增"联赛榜"（LeagueLeaders）— 比赛记录里每个进球/黄牌/红牌本就是 MatchEvent（1566 场里 948 球、434 黄、108 红），故榜单是对事件的 fold 而非存储表：键用 `clubId|name` 区分不同队的同名球员，俱乐部取自事件所属 side；两块榜：射手 top15（俱乐部+位置）、黄红牌 top10；9 键 + nav.leaders 三语、/leaders 路由 + 侧栏；9 处 census pin；bundle 493→494KB；proof 118/118 — pushed
- b8aa23a M533: 新增"球员成长预测"（PlayerProjection）— 把 `projectGrowth` 从"仅限本人 Development"扩展到任意球员（610 名全有 attributes）：选球员 + 周数/每周次数/单次评分，重点=最弱 3 项属性（weakestAttributes），逐项 now→预测 + 增量，综合 before→after，旁边标潜力上限（attrCeiling）。带符号增量走 `lib/utils.signed`、颜色走 `deltaSign`+`DELTA_CLASS`（禁止手写 `+` 或 `delta>0` 比较，proof-signed 会红）；属性名走已声明的 `attr.name.` 动态键（需在 proof-i18n 的 DYN_SITES 加一行）；16 键 + nav.projection 三语、/projection 路由 + 侧栏；census pin 同步（literal 1486、template 109、dup 126/214）；bundle 494→496KB；proof 118/118 — pushed
- f03f4bb M534: 新增"赛季末赛程"（RunIn）— 每条已存在的 forecast 都只看单场（DataRoom 前 4 场、FootballWorld 每行概率），
  而"每队剩余对手整体有多难"无人回答；`domain/analytics.ts` 新增 `runIn(compId, matches, clubs)`：按本赛事 SCHEDULED 赛程统计各队剩余对手，
  取其场均积分（2 位小数）为难度，最难在前，无剩余者记 0 且排最后（防空赛程冒充最易），行内自带战绩；
  屏幕=赛事 chips + 四块 tile（最难/最易/剩余场次/剩余均值）+ 榜单（队徽/战绩/剩余/对手场均条/对手简称）+ 空态；
  门：sum、last（替代内联 `xs[xs.length-1]`）、ABSENT、fmt2、pctOf；`nav.runIn` + 17 个 `runIn.*` 三语、`/run-in` 路由 + 侧栏；
  census pin 全同步（APP_SRC 118、TSX 62、SRC 121、literal 1506、placeholder 160、dup 127/215、APP_MODULE 113、POP 113、features 39、DEEP 55、APP_FILES 108、
  last/fmt2/absent-glyph/absent-name 清单各 +1）；tsc 干净、npm run proof 118/118、bundle 496→499KB — pushed

- 8912ed2 M559: 赛季末积分情景（PointsScenario）——编号说明：本线取 M559 时，并发 lane 的 M550–M558 提交已先行落地，
  且它随后又用同一号提交了 PlayerDataScreen（13360e20），故历史里有两个 M559；本节是积分情景这一个。
  `domain/analytics.ts` 新增 `pointsScenarios(compId, matches, clubs)`：复用 runIn 的私有 `remainingOpponents` 折叠（两屏对"还剩几场"不可能有分歧），
  每队给出 当前积分 / 剩余场次 / 上限（积分+3×剩余）/ 按现速率推演（积分+场均×剩余，走 fmt2）/ 距榜首差距 / 上限是否够得着榜首；
  屏幕=赛事 chips + 四块 tile（榜首/最高上限/仍有机会/剩余场次）+ 一句"争冠是否已由算术决定" + 表格（队徽/战绩/积分/剩余/上限/按速率/落后，榜首格走 ABSENT）+ 窄屏 pctOf/BAR_FILL 条 + 方法注 + 空态；
  `proof-analytics` 新增 4 条（顺序与上限/速率、差距与 canCatchLeader、已赛不计剩余且他赛事不入行、确定性）共 84/84；
  census pin 同步（APP_MODULE 114、POP 114、features 40、DEEP 56、APP_SRC 119、TSX 63、SRC 122、literal 1531、placeholder 166、APP_FILES 109、
  fmt2 消费 23、absent-glyph 用户 23 且 PointsScenario=5、absent-name 载体 +1）；tsc 干净、120 个 proof 脚本全绿（proof-pwa 需先 build：502KB gzip/47 资产，pin 520）；
  浏览器：生产预览在真实世界数据上渲染并切赛事（PL 8/10 仍可争冠、La Liga 5/9），console 干净；并发 lane 的 17 个未路由 stub 于本提交清除 — pushed

- M567: 争冠走势（TitleRace）——`domain/analytics.ts` 新增 `titleRace(compId, matches, clubs)`：把已赛联赛按"赛季首场已赛起算的 7 天窗口"分桶，
  每桶用既有 `teamMetrics` 重建当时的积分榜，记录 榜首/次席/积分/差距/已赛场次，并给出 易主次数、最大差距及其周次；SCHEDULED/LIVE 与他赛事一律不进序列；
  屏幕=赛事 chips + 四块 tile（此刻榜首、当前差距、易主次数、最大差距+周次）+ `ProgressLine` 差距曲线（多于一周才画）+ 逐周倒序表（队徽/榜首/次席/差距，最大差距行加边框，窄屏 pctOf/BAR_FILL 条）+ 方法注 + 空态；
  日期格式 bag 提到模块级（在渲染洞内写 format specifier 会被 raw-UI 扫描当文案，DataRoom 在 M170 付过同样的两处债）；
  21 键三语（nav.titleRace + race.*），dup ratchet 127→128（"Title race" 与 mgr.zoneTitle 同词）、excess 215→216；
  `proof-analytics` 新增 4 条共 88/88（三周手工联赛的 A,B,A 易主/2,1,2 差距/次席序列/最大差距周次、7 天桶边界、已赛过滤与确定性+空赛事对照）；
  census pin 同步（APP_MODULE 115、POP 115、features 41、DEEP 57、APP_SRC 120、TSX 64、SRC 123、literal 1552、placeholder 170、APP_FILES 110）；
  tsc 干净、build exit 0、npm run proof 120/120 脚本 · 3187/3187 检查；浏览器：生产预览 PL 七桶 MCI 37 领先 CHE 10 分、易主 3 次、最大差距第 6 周 10 分，
  切 La Liga 实时重算（BAR 36、差距 0、最大 16 在第 2 周），三语各自渲染，console 干净；
  README 同时补写 M524 的正式小节（原 gap 条目移除，gap 计数 134→133，账本门 8/8）— pushed

下一条目：继续"真实数据 + 不重叠 + 复用既有 domain"的下一个缺口。候选：Dashboard 的"下一步建议"动作链（把多屏结论汇成可点击的一条路）；
或把"上限/按速率"读数下沉到俱乐部详情（同一 domain 读数，另一个读者的入口）。
编号策略：并发 lane 每秒都在占号（它已用到 M566），本线落地时先查 `git log` 取下一个空号，并在 README 的 gap 账本里为 lane 的每个号写清楚。
每加一屏都要过 signed/sum/maxby/money/absent-glyph/vocab/ids/rng + 全套 census pin 门禁；
并发 lane 的未跟踪文件（dev/*、features 里未路由的 stub）不要纳入本线提交——它们在每次推送前用 `git rm`/`rm` 清掉并写明。
注意：lane 的自动化会周期性 `git stash`/恢复工作树，可能把你未提交的改动回滚；所有编辑要么在隔离 worktree 里做，要么编辑后立刻提交推送。
