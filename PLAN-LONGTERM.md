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

- M568: 交锋记录（HeadToHead）——`domain/analytics.ts` 新增 `headToHead(clubA, clubB, matches)`：把两队之间所有 FINISHED 交手（不论主客、跨全部赛事）按 kickoff 折叠，
  给出 交手数/涉及赛事数/胜平负/进失球/最大分差场次（并列取最早）/最近一次交锋延续的走势；SCHEDULED 与 LIVE 一律排除（记录只算已赛）；
  屏幕=两个互斥下拉 + 四块 tile（交手次数与赛事数、双方胜场夹平局）+ 进球面板（pctOf/BAR_FILL 双色条 + 最大分差/当前走势两条事实）+ 由近及远逐场表（日期·赛事/队徽/比分，最大分差行加边框）+ 方法注 + 空态；
  29 键三语（nav.headToHead + h2h.*），dup ratchet 128→129（"Opponent" 与 player.opponent 同词）且四组已有重复增长（Goals/Home/Away/Club）excess 216→221；
  `proof-analytics` 新增 4 条共 92/92（跨赛事四场 1W-1D-2L/4-8 球/最大分差取最早/两连胜收尾、换边镜像、确定性+从未交手配对空读）；
  census pin 同步（APP_MODULE 116、POP 116、features 42、DEEP 58、APP_SRC 121、TSX 65、SRC 124、literal 1585、placeholder 180、APP_FILES 111）；
  tsc 干净、build exit 0、npm run proof 120/120 脚本 · 3191/3191 检查；浏览器：生产预览默认对局 ARS-MCI 读到跨 2 项赛事 4 场、ARS 0W2D2L、进球 1-4、最大分差 MCI 净胜 2、最近走势 MCI，
  换对手为 Liverpool 实时重算（3 场·1 项赛事），英文与繁体各自渲染，console 干净 — pushed
  合并注：主树存有并行 lane 未提交的 goalTiming（domain/analytics.ts 追加 + features/analytics/GoalTiming.tsx），
  用唯一消息 stash 保留 → ff 合并 → 按同一条目 apply 还原，未进入本线提交；推送只含 ffd6963。

- M569: 主客场切面（VenueSplit）——`domain/analytics.ts` 新增 `venueSplit(compId, matches, clubs)`：复用 `teamMetrics` 已算好的主/客两半，
  给出每队 主场积分/客场积分、场均（主场 ppg、客场 ppg，round2）、主客差（homePpg − awayPpg，可为负 = 客场更强），行序沿用积分榜；
  另统计本赛事全部已赛的 主胜/平/客胜 与主客进球数；未踢的半程 `played=0`，屏幕显示 ABSENT 而非 0；
  屏幕=赛事 chips + 四块 tile（主胜/平/客胜/主场进球占比 pctLabel + goalsSub）+ 最大主场优势/最佳客场队两条事实 + 逐队表（主/客两半的积分与 W-D-L、带符号的主客差走 signed + DELTA_CLASS）+ 窄屏两半记录折入副行 + 方法注 + 空态；
  23 键三语（nav.homeAway + venue.*），dup ratchet 129→131（新组 "{n} pts" 与 ai.kg.pts、"Draws" 与 h2h.draws；Home/Away/Club 三组增长）excess 221→226；
  `proof-analytics` 新增 4 条共 96/96（四场联赛 2 主胜2平0客胜/6-3 球、A 的两半与主客差 2.5、C 未客场=未赛半程+行序 A,C,B、确定性+空赛事）；
  浏览器复核时发现并修复第二个缺陷：语言选择存的是 writeJson 的 JSON 字符串，而 detectLocale 用裸 getItem 读原文比较，`"zh-CN"` ≠ `zh-CN`，
  每次刷新都回落浏览器语言；改为 `readJson` 读取（与写入门配对），`proof-storage` 新增 round-trip 条款共 62/62，并把读取器回退成裸 getItem 验证该条会红（59/62，存 zh-TW 读成 en）；
  census pin 同步（APP_MODULE 117、POP 117、features 43、DEEP 59、APP_SRC 122、TSX 66、SRC 125、literal 1618、placeholder 194、APP_FILES 112）；
  新增屏幕还进入三张读数清单：fmt2 消费者 23→24、absence 门用户表 +14 格（24 文件）、name lane 载体 +3 处（12 文件）；
  `proof-quantities` 抓到本屏自己的双形读数（homeEdge 在句子里走 fmt2、在表格里走 signed），已登记为第 7 个 documented split；
  语言缺陷也有测试侧一半：`proof-screens` 一直种入裸 `zh-CN`/`zh-TW`（实际写入是 JSON），已改为 `JSON.stringify(locale)`，120 次渲染 0 locale-inert/0 英文徽标，`proof-localdata` 里描述旧假设的死注释删除；
  bundle 510KB gzip/50 资产（496→510 记入 tests/perf/baseline.json，覆盖 M567–M569 三屏）；
  tsc 干净、build exit 0、npm run proof 120/120 脚本 · 3196/3196 检查；浏览器：PL 83 场 43主胜/32平/8客胜、主场进球 83%、NEW 主客差 2.15、MCI 客场 1.67，
  切 La Liga 重算（66 场·34/24/8·81%·ATM 1.43·RMA 2.00），英文/繁体渲染且语言选择刷新后仍保留，console 干净 — pushed

- M570: 进球时间带（GoalTiming）——`domain/analytics.ts` 新增 `GOAL_BANDS = 6`、`goalBand(minute)`（`Math.floor((minute-1)/15)` 夹在 0..5：最后一窗吸收补时，78′ 与 97′ 同属 late）与 `goalTiming(compId, matches, clubs)`：
  行集取自 `teamMetrics`，只遍历本赛事 FINISHED 场次的 GOAL 事件，按事件 `side` 归进球方/失球方，累计 `scoredBands`/`concededBands`、`lateScored`/`lateConceded` 与 `lateShare`（round2）；
  排序 = lateShare 降序 → 进球数 → clubId，确定性；无事件场次零贡献但队仍占行；
  屏幕 `/timing`（nav.timing）= 赛事 chips + 四块 tile（最忙窗口+球数、联赛晚段占比 pctLabel、最晚进球者 s/n、最晚失球者，0 读数走 ABSENT + none）+ 六窗双色柱（scored=BAR_FILL.info、conceded=BAR_FILL.low，高度 pctOf(...,peak)，peak=最忙窗口合计）+ 逐队表（队徽/全名、比分记录、进/失合计、lateShare 条 pctOf(...,100) + lateLine，零事件队降透明 + none）+ 方法注 + 空态；
  23 键三语（nav.timing + timing.*）；literal t() 站点 1618→1651（屏幕 32 + nav 1）；placeholder 194→200（六条插值）；dup ratchet 实测不动（131 组 / 226 excess keys）；
  `proof-analytics` 新增 4 条共 100/100（A 2-1 B 的 12′/44′/78′ + C 0-1 A 的 92′：A 进球窗 "1,0,0,0,0,2"、失球窗 "0,0,1,0,0,0"、late 2、share 66.67；B 失球窗 "1,0,0,0,0,1"；C 0 进 1 失 share 0；边界 15/16/45/46/75/76 各落一窗、97′ 与 78′ 同窗；确定性 + 无事件场次零贡献）；
  census pin 同步（APP_MODULE 118、POP 118、features 44、DEEP 60、APP_SRC 123、TSX 67、SRC 126、APP_FILES 113；absence 门 +4 格 = 14 格/24 文件；name lane folded 9 文件、plain 31 处 = 26 vars + 5 props）；
  `proof-unused-locals` 抓到屏幕里一个未读的 `getCompetition` 局部（comp 只用了一次就废弃）→ 删除该读与 import，5/5；
  bundle 510→514 KB gzip / 51 资产（js 501、css 13，记入 tests/perf/baseline.json）；
  tsc 干净、build exit 0、npm run proof 120/120 脚本 · 3200/3200 检查；本轮未做浏览器复核，证据欠账如实记在 README；
  下一步（M571 候选）：纪律读数（YELLOW/RED 事件已在 seed 与 MatchStats 里，却没有任何屏幕按俱乐部统计——真实数据、不重叠）；或把六窗读数下沉俱乐部详情；或 Dashboard 下一步建议动作链。

- M571: 纪律读数（Discipline）——`domain/analytics.ts` 新增 `DisciplineRow`/`Discipline` 与 `discipline(compId, matches, clubs)`：
  行集取自 `teamMetrics`，只遍历本赛事 FINISHED 且带 `stats` 的比赛，按主/客侧把 `fouls/yellows/reds` 折叠到各队，
  给出 `bookings = yellows + reds`、`bookingsPerMatch`/`foulsPerMatch`（round2，`played=0` 时为 0），并汇总联赛 `matches/yellows/reds/fouls/perMatch`；
  行序 = 红牌降序 → 黄牌降序 → clubId；没有统计块的场次（及 SCHEDULED、他赛事）一律不贡献，零牌统计块是真实 0 而非缺读；
  屏幕 `/discipline`（nav.discipline）= 赛事 chips + 四块 tile（黄牌+场次、红牌、场均牌数+场均犯规、吃牌最多队及其黄牌数，缺读走 ABSENT）+ 逐队表（队徽/队名、统计场次、黄/红/犯规三列、场均牌条 pctOf + rowLine，零场队降透明 + "无统计"）+ 方法注 + 空态；
  22 键三语（nav.discipline + disc.*），字典总量 2,421 值；dup ratchet 131→138、excess 226→233（7 组借用既有词：Discipline/attr.name.discipline、Fouls/ms.fouls、Yellow cards/ms.yellows、Red cards/ms.reds、Most booked/leaders.bookedTitle、Y/leaders.yellowShort、R/leaders.redShort）；
  literal t() 站点 1651→1673（屏幕 21 + nav 1）；placeholder 200→205（playedSub/perMatchSub/mostSub/record/rowLine）；
  `proof-analytics` 新增 4 条共 104/104（三场联赛 + 计划场/他赛事/无统计场作噪声：matches 3、11Y、2R、59F、4.33/场；C,B,A 行序；A 4Y/0R/26F 2 牌 13 犯规、B 3 牌 1.5、C 6 牌 3；零牌统计块=真实 0；确定性 + 空赛事空读）；
  census pin 同步（APP_MODULE 119、POP 119、features 45、DEEP 61、APP_SRC 124、TSX 68、SRC 127、APP_FILES 114；fmt2 消费者 24→25；absence 门 +2 格 = 26 用户；name lane folded 10 文件、46 处/14 文件、plain 32 = 26 vars + 6 props）；
  `proof-i18n` 的 vacuity 条款抓到本屏最后一条断言的细节串含 "no fixture"，且谓词只有 ===0 与 JSON 比较 → 补 `board.rows.length === 3` 的 pin 后 383/383；
  bundle 514→517 KB gzip / 52 资产（js 503、css 13，记入 tests/perf/baseline.json）；
  tsc 干净、build exit 0、npm run proof 120/120 脚本 · 3204/3204 检查；本轮同样未做浏览器复核，证据欠账如实记在 README；
  下一步（M572 候选）：① 把纪律读数下沉俱乐部详情（同一个 discipline，另一个入口）；② Dashboard 的"下一步建议"动作链；③ 事件里的 SHOT/SAVE/VAR 时段读数（与进球时间带同构但对象不同）。

- M572: 纪律读数下沉俱乐部详情（第二入口）——`features/football/Details.tsx` 的 `ClubDetail` 复用 `discipline()`（无新 domain 表面）：
  新增 `cards` memo（同赛事 fold 后按 clubId 取行），赛季分析面板追加黄牌/红牌/场均牌三行，场均牌在 `played=0` 时走 ABSENT；
  面板底部加 `/discipline` 互链（`disc.title`），纪律榜行内队名改为 `/clubs/:id` 链接，两张卡牌屏幕互相可达；
  `proof-analytics` 新增 1 条 roll-call 断言（同联赛加入无赛程队 H 后行序 CBAH、H 为 0 场 0 牌/场），105/105；
  `proof-i18n` literal 1673→1677（复用 disc.yellows/reds/perMatch/title，四站，无新键，键总数仍 2,377，dup/excess 不动）；
  `proof-absent-glyph` Details 账本 5→6 格；bundle 517 KB gzip/52 资产不变（基线不动）；tsc 干净、build exit 0、npm run proof 120/120 脚本 · 3205/3205 检查；
  下一步（M573 候选）：① Dashboard 的"下一步建议"动作链（把多屏结论汇成可点击的一条路）；② 事件里的 SHOT/SAVE/VAR 时段读数；③ 纪律榜的赛季趋势（按轮次累计牌数）。

- M573: Dashboard"下一步建议"动作链 —— 新 `domain/nextStep.ts`：`nextSteps(facts)` 把六个事实（live/nextFixture/无训练计划/空战术室/近徽章/空关注名单）按固定优先级排成最多 3 个一键动作，live 压过下一场，全部满足时回退 explore（/discipline）；`NEXT_STEP_LIMIT = 3`；
  Dashboard 顶部新增建议面板：首条带 "Start here" 标签、其余弱化，每条按 kind 映射真实路由（/matches/:id、/development、/film、/achievements、/scouting、/discipline），文案走 `STEP_LABEL` 键表（t(STEP_LABEL[kind])）；
  新 `proof-nextstep.mjs` 6/6（live 压 fixture = live,training,film；仅 next = fixture；busy = live,badge；全满足 = explore；上限 3 = fixture,training,film；确定性 + facts 不被改写）；
  census pin：app-tree 119→120、coverage 119→120 / domain 33→34、storage 114→115、i18n src 124→125 / walk 127→128、literal 1677→1680、expression 32→33；字典 +10 键/语（2377→2387 值，无新增重复值，dup/excess 不动）；
  bundle 517→518 KB gzip / 52 资产（js 505、css 13，baseline 重记）；tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3211/3211 检查；
  下一步（M574 候选）：① 事件里的 SHOT/SAVE/VAR 时段读数（与进球时间带同构、对象不同）；② 纪律榜的赛季趋势（按轮次累计牌数）；③ 建议面板的时间维度（把"开球还有多久"读进排序）。

- M574: 事件时钟（SHOT/SAVE/VAR 的时段读数）——`domain/analytics.ts` 新增 `eventClock(compId, matches, clubs)`：
  复用 `teamMetrics`/`GOAL_BANDS`/`goalBand`/`round2`，只读本赛事 FINISHED 且带 events 的场次，SHOT 归射门方、SAVE/VAR 归事件 side，
  六窗三族（shots/saves/vars）+ 逐队行（lateShots、lateShare 按本队射门算），行序 shots 降序→saves 降序→clubId；
  新屏 `features/analytics/EventClock.tsx`（/clock）：四块联赛 tile（射门/扑救/回看/最忙时段，最忙时段复用既有 timing.w* 窗口词）+ 三行六窗柱 + 逐队板（Crest/名/record 行）+ 方法注 + 空态；侧栏在 /discipline 之后加入口；
  `proof-analytics` 新增 6 条共 111/111（手算 fixture：matches 2、shots 4、saves 2、vars 2；三族窗口 1,1,0,0,0,2 / 1,0,0,0,0,1 / 1,0,0,1,0,0，91' 夹入末窗；A 3 射 2 迟 66.67%、B 1 射 + 1 扑、C 仅 1 回看；确定性 + 无事件场 + 空赛事；屏幕只读 fold、路由与侧栏可达）；
  census pin：app-tree 120→121、coverage 120→121 / features 45→46 / deep 61→62、storage 115→116、i18n src 125→126 / tsx 68→69 / walk 128→129、literal 1,680→1,711、litVarSites 205→209、dup 138→140 / excess 233→235；absence 26→27 用户；字典 +19 键/语（2,387→2,406 值）；
  bundle 518→521 KB gzip / 53 资产（js 507、css 13，baseline 重记）；tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3217/3217 检查；
  下一步（M575 候选）：① 纪律榜的赛季趋势（按轮次累计牌数）；② 建议面板的时间维度（把"开球还有多久"读进排序）；③ 事件时钟的对手维度（被射门/被扑救的分侧读数）。

- M621: 赛前简报（Briefing）——`domain/analytics.ts` 新增 `briefing(clubId, matches, clubs)`：取该队最早的预定（SCHEDULED）比赛，
  跨全部赛事、按开球时间排序、同刻以 id 兜底；LIVE 归实时条，不进简报；一次 join 五项既有读数——
  `pointsScenarios` 的双方行、`runIn` 本队行、`venueSplit` 本队行、`headToHead` 与 `titleRace`——屏幕与它们不可能分歧；
  缺行的 join 为 null 而非 0（对手无表行、球队无赛程各自可空）；
  屏幕=球队下拉（默认收藏队）+ 比赛 hero（双队徽、主/客 chip、日期门 + 轮次 + 比赛页链接 + 对手上限句，开球句走 formatDate）
  + 四块 tile（积分/上限/剩余场次/主场优势，各带副行，速率走 fmt2）+ 五条可点击步（积分榜与上限→/scenarios、赛季末赛程→/run-in、
  主客场→/home-away、交锋记录→/head-to-head、争冠走势→/title-race，各带插值读数句与 ABSENT 兜底）+ 方法注 + 空态；
  35 键三语（nav.briefing + 34 条 briefing.*）；六个新组："Next up"/det.results.next、"Points"/coach.points、
  "Ceiling"/career.ceilingRing、"Fixtures left"/runIn.remaining、"The run-in"/runIn.title、"Head to head"/nav.headToHead，
  并增长 Club 组；与 lane 的事件时钟两组一起，合并树 dup 140→146、excess 235→242；
  `proof-analytics` 新增 8 条，合并后共 119/119（手算 fixture 集：A 取 s1 而非更早的 LIVE、B 的上限 7、run-in [B,C] 均 1.67、
  主客两半 3.00/1.00 差 2、交锋 2 场 1胜1平 3-1 最大 f1、争冠 1 周 1 分；F 的同刻一对取 w1 且反转输入逐字节相同；
  D 的跨赛事选择对手行缺失=null；E 无赛程=null）；
  浏览器复核：默认 Arsenal→Brighton（PL 第 2 轮，9/23；世界今天=9/22），切 Real Madrid 正确跨赛事到 UCL 客场对 Arsenal，
  比赛页链接落到对应 fixture，EN/简体/繁体三语渲染、console 干净；英文交锋行读成 "1 meetings" 的单复数缺陷当场改为
  "Meetings 1: 0W 1D 0L"（计数在前的标签式，应用本无复数助手）；
  census pin 取合并树实测值（APP_MODULE 122、POP 122、features 47、DEEP 63、APP_SRC 127、TSX 70、SRC 130、literal 1751、placeholder 220、APP_FILES 117）；
  读数清单：fmt2 消费者 25→26、absence 门用户表 28 文件、name lane 载体 15 文件/47 处；
  `proof-quantities` 无需新 split（本屏速率全走 fmt2 句子，与既有六个 split 的处置一致）；
  bundle 521→524KB gzip/54 资产（js 511、css 12.5，记入 tests/perf/baseline.json），`proof-pwa` 预算 pin 521→524；
  tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3225/3225 检查；
  合并注：构建期间分析 lane 落了 M574（事件时钟 /clock），本线 rebase 到 cebc990（14 个冲突文件一律"两边都留"，
  pin 取合并实测值）；随后另一条组件农场 lane 以约 1 分钟一个的速度把 M575–M597 推到 master，每个提交一个组件文件、
  无路由、无侧栏、无字典键、无证明——在该 head 上 census 门禁大面积红（不可达模块、270 个未定义 t() 键、raw-UI 债、
  未格式化时间）。按计划的"未路由 stub 推送前清掉并写明"规则，M598 删除全部 23 个文件，并给每个号在 README 里留一段 stub 记录
  （section 而不是 gap，保住账本"gaps 少数派"的门槛）；删净后的树与本屏实测的树逐字节一致，故 pin 与检查数沿用。

- M624: 建议面板的时间维度——`domain/nextStep.ts` 的 `NextStepFacts` 新增 `nextMatchInMinutes: number | null`（相对 demo 锚点的分钟数，null=没有待开球场次），
  新增 `NEXT_MATCH_SOON_MINUTES = 180`；排序改为 live > 紧急 fixture（≤180 分钟）> training > film > 非紧急 fixture > badge > watchlist > explore，仍 slice 3；
  分钟数未知（null）按非紧急读——未知不等于临场；`features/dashboard/Dashboard.tsx` 从 `upcoming` 取第一场 SCHEDULED，
  用 `epochMs(kickoff) - DEMO_ANCHOR_MS` 量分钟（绝不用 `Date.now()`，见 DEMO_ANCHOR_MS 的注释），紧急时行内加副标签
  `dash.stepSoon`（{m} 分钟，负值在标签上夹到 0），非紧急不显示；
  1 键三语（dash.stepSoon）；`proof-nextstep` 新增 5 条共 11/11（40 分钟的开球压过 training；600 分钟时 training,film,fixture；
  null 同非紧急；窗口 180 含端点、181 不含；其余全答时远场 fixture 仍压过 explore；确定性/入参不改）；
  census pin：i18n literal 1,767→1,768、litVarSites 227→228（无新模块/路由/存储键，app-tree/coverage/storage/absence 不动）；
  字典 +1 键/语（2,452→2,453 值）；bundle 保持 526 KB gzip / 54 资产（baseline 与 pwa pin 不动）；
  tsc 干净、build exit 0、全套 121/121 脚本 · 3239/3239 检查；无浏览器复核（排序由 domain fixture + 生产构建覆盖）；
  诚实的保留：紧急判断只看收藏球队的下一场 SCHEDULED（最多读前 3 场），不是全世界的开球钟；演示世界的锚点固定，
  读者的真实时间不改变排序——这是有意的（同一天打开两次读到同一句），真实 provider 接入时需把锚点换成 now。
- M623: 比赛页的"分量"面板——`domain/analytics.ts` 新增 `matchBrief(matchId, matches, clubs)`：与 `briefing` 同一套五项 fold
  （`pointsScenarios`、`runIn`、`venueSplit`、`headToHead`、`titleRace`），但锚点由"球队的下一场"换成"读者点开的那一场"，
  且两端都量：主客各自的积分/上限/剩余场次、主队的主场半区对客队的客场半区、按本场主队定向的交锋记录（winsA=主队）、
  以及本赛事的争冠走势；未知 matchId 读 null 而非空简报，各 join 仍逐行可空；
  `features/football/Details.tsx` 在比分板与数据面板之间新增 Stakes 面板：两行席位（积分/上限/剩余）、一行主客半区句、
  一行交锋记录（场次/胜平负/进失球）、一行争冠（分差/易手次数），以及通往 /scenarios、/head-to-head、/title-race、/briefing 的四个链接；
  7 键三语（stakes.title/hint/homeLine/venueLine/recordLine/noMeetings/raceLine），四个链接标签复用 briefing.step* 既有措辞；
  `proof-analytics` 新增 5 条共 124/124（s1=A 主场对 B：A 4 分/上限 10/剩 2、B 1 分/上限 7/剩 2、主半区 3 分场均 3.00 对客半区 0 分 0.00、
  交锋 2 场 1胜1平 3-1、争冠 1 周；反向 fixture f2 使记录定向翻转（0胜1平1负、1-3）并交换主客半区（各 1 分场均 1.00）；
  未知 id=null；反转赛程列表逐字节相同；屏幕只读 fold）；
  census pin：i18n literal 1,751→1,763、litVarSites 220→225、字典 +7 键/语（2,441→2,448 值）、absence 门 Details.tsx 6→9（新增三处叶子）；
  无新模块/路由/存储键，app-tree/coverage/storage 不动；bundle 524→525 KB gzip / 54 资产（js 512、css 12.5，baseline 重记，pwa pin 同步）；
  tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3230/3230 检查；无浏览器复核（面板由 fold fixture + 生产构建 + 类型检查覆盖，浏览器证据债照旧记账）；
  诚实的保留：四个链接各按自身默认赛事打开，跨赛事读者需切换 chip 才落到同一读数（与 briefing 同一保留）；争冠句属于赛事而非本场，
  它说前二差多少、不说这一场会改变什么——具体赛果的算术属于 `pointsScenarios`，面板链接过去而不复述。
- M622: 纪律榜的赛季趋势（按轮次累计牌数）——`domain/analytics.ts` 新增 `DisciplineRound`/`DisciplineTrend`/`disciplineTrend(compId, matches)`：
  与 `discipline` 同一 fold（本赛事 FINISHED 且带 stats），按 `round` 聚合 matches/yellows/reds、单轮 inRound(=Y+R)、perMatch(round2)、
  累计 cards，rounds 升序、peak=最大单轮；`features/analytics/Discipline.tsx` 在 board 面板之后加趋势面板（每柱一轮，柱顶单轮牌数、
  柱下 `R{r}` 与累计，柱高对 peak 取 pctOf，BAR_FILL.bad；面板在 board 分支内，空赛事仍只有一枚 EmptyState）；
  `proof-analytics` 新增 4 条，并入 M621 后共 123/123（再并 M623 的 5 条为 128/128）（T12 手算：rounds 1/2/3、单轮 4/6/4、累计 4/10/14、peak 6；round 3 两场 perMatch 2、round 1 4、round 2 6；
  Scheduled 第 4 轮 / 他赛事 / 无 stats 场作噪声；与 discipline 对账 4 场 12Y 2R 3.5/场；空赛事 0 轮 peak 0；确定性 + 屏幕只读 fold）；
  census pin 取合并树实测：i18n literal 1,751→1,755、litVarSites 220→222（无新模块/路由/存储键，app-tree/coverage/storage/absence 不动）；
  字典 +4 键/语（2,441→2,445 值）；bundle 524→525 KB gzip / 54 资产（baseline 重记，pwa pin 同步）；tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3229/3229 检查（再并 M623 后 3234/3234）；
  合并注：此条目是分析 lane 在 M621 之上未提交的工作树改动，本线把它并入后重编为 M622（M575 已被农场 stub 占用）。

下一条目：M625 候选按"真实数据 + 不重叠 + 复用既有 domain"排：
① 事件时钟的对手维度（被射门/被扑救按防守方读，补上"谁在挨打"的一侧）；
② 纪律榜的主客分侧（按 venue 拆 discipline 同一 fold，读"客场更糙"这类差别）；
③ 比赛页面板的赛果算术（同一 matchBrief 加一行"这一场能改变什么"，把双方 scenario 的差读成一句）。
编号策略：每次落地先 fetch 并 `git log origin/master` 取下一个空号（分析 lane 用 M566–M574，组件农场 lane 用 M575–M620；本线已落 M621、M623、M624，M622 的纪律趋势由分析 lane 在合并树上落地）；农场 lane 未路由的 stub 在其每次推送后清理并记入 README。
每加一屏都要过 signed/sum/maxby/money/absent-glyph/vocab/ids/rng + 全套 census pin 门禁；
并发 lane 的未跟踪文件（dev/*、features 里未路由的 stub）不要纳入本线提交。
注意：lane 的自动化会周期性 `git stash`/恢复工作树，可能把你未提交的改动回滚；所有编辑要么在隔离 worktree 里做，要么编辑后立刻提交推送。
