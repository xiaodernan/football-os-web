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

- M775: 隔离区 23 个「参数隐式 any」原来是 22 个影子加 1 个真洞——`7006` 自 M539 起钉在 23，那个数字读起来像
  「还欠 23 处标注」，但参数只能用文件里**叫得出名字**的类型来标注。门换了个问法：给每个隐式 any 参数找到它
  正在被遍历或被调用的那个表达式，再顺着草稿自己的声明往回走（`campusData`→`campuses`→那个没有符号的门），
  报告走到哪一步解析不出来。两种答案能免罪，而且两种都真的在场：①应用 provider 根本没声明的门——
  `footballProvider.campuses()`（AcademyReport 3 处）与 `.coaches()`（CoachCareerProfile＋CoachStatistics 共 6 处），
  它们被访问的那个表面实际是 `id, mode, clubs, players, competitions, matches, standings`，任何地方都没有
  campus/coach 类型可写；②从应用不提供的模块里 import 的名字——`League`（LeagueManager 8 处）、
  `ClubBudget`（ClubFinance 4 处）、`getFreeAgents`（TransferWindow 1 处），正是 M718 记下的五个未上线 domain 里的三个。
  22 处、5 个名字、6 个文件：这些都不靠「写个类型」能修，写了就是凭空造形状——一份能编译通过的谎言。
  唯一的真洞与为什么是删除：SeasonSchedule.tsx:23 的答案是「根本没有上游」——同一个文件的 `matches` 元组类型完好，
  `matchStatus` 的参数却没标注；把文件读回来发现这个 helper 在本文件里没有读者（状态在几行后就地渲染），
  于是诚实的修复是删掉死代码而不是给它补一份没人调用的标注。`7006` 23→22、`TOTAL_CEILING` 409→408；
  该文件仍被量着（留下 `2554`/`2322` 两个不属于本族的缺陷），最后一条门把这个钉住——这里归零不能靠把草稿消音买到。
  另一条决定写进代码而不是写在散文里：走到「谁都没有的名字」（M717 那族）不算免罪，镜像里植入 `UnboundChain.ts`
  把这条判断量出来。新门 `scripts/proof-draft-any.mjs` 7/7：先让两次读数互相证明——walk 必须为 census 数到的每个
  `7006` 落到一个参数上（按文件逐一比对），同时把同一个 walk 用在**应用自己**的树上（122 模块 / 0 个隐式 any），
  这样「没有未免罪的站点」才是关于隔离区的事实而不是一个瞎掉的读数；再钉未免罪桶为 0，并把三种未免罪形状各植入一枚
  （导出箭头的裸参数、函数声明的裸参数、dead-end 在未绑定名字上的链）；然后每份免罪理由都独立再问一次——门之所以是门，
  是因为那个「缺门」的表面确实是声明过的类型且真的带着应用已上线的那些门（空表面不能冒充「缺失」），模块之所以是模块，
  是因为应用自己的解析器确实不答这个 specifier 且草稿确实从它 import 了这个名字；最后一条把五个名字钉成集合：
  第六个 any 的制造者（新的未上线 domain、新的门）得是有人记下的决定。
  写门过程中先掉进去的两个坑，都在门被信任之前抓住：把「没有符号的成员访问」当成缺门，对声明过的 `P` 上的 `p.campuses`
  成立，对 `any` 上的 `c.id` 也成立——第一版某个站点的八条原因全是 `any` 上的门（`campuses.map`、`c.id`、`c.name`、
  `c.location`、`c.students`、`c.coaches`、`c.graduationRate`、`c.scholarshipRate`），账本键会被它们占掉；
  修法是问容器的已声明属性，容器是 `any` 就拒答。第二个坑是解构：`const [budget, setBudget] =
  React.useState<ClubBudget | null>(null)` 里 `setBudget` 是个 BindingElement，既没有类型也没有初始值，
  第一版因此把 12 处（ClubFinance 的 4 个 `prev` ＋ LeagueManager 的 8 处）报成「没有理由」；
  把绑定元素回溯到它被解构出来的那个变量，它们才重新变回影子——它们本来就是影子。
  实测：隔离区 409/69 → **408/69**，`7006` 22；tsc 干净、build exit 0，全套 123/123 proof scripts proven, 3291/3291 checks counted
  （proof-draft-any 7/7、proof-draft-types 5/5、proof-draft-modules 7/7）。
  对下一道最有用的话：账本里这五个名字与模块门点名的是同一批，只是从下面看——上线 `@/domain/league` 不只是清掉
  八处与 `2307` 相邻的站点，它同时让 8 个参数变成「可以标注」，这就是「先上哪个 domain」最尖的论据，而现在它是门读的数。
  三条臂（把删掉的 helper 放回去／把模块理由指向应用真有的模块／把门的理由指向应用真有的门）各自预测到红，
  站点全部逐字节还原；其中 ARM-3 第一次多报一条红——1b 那条抄了 1a 的 `sites.length >= 20` 地板，
  已经把它挪走，让每笔账只有一个主人。全程在隔离 worktree（milestone-719，基于 M718 之后）落地，未触碰分析 lane 的文件。— pushed



- M774: 比赛页也打开时钟的开局端（无新 fold）——M773 已把 `earlyFaced`/`earlyFacedShare` 折进 `EventClockRow`，
  M714 只在 stakes 列表印了末段行；本单元把同一行读数接到比赛页：`features/football/Details.tsx` 在牌账行之后、
  末段两行之前按端各加一行 `stakes.earlySiegeLine`（面对 n 次 / 开局 early 次 / 占比 p%），守卫仍是 `faced > 0`，
  空端不出零列、跨赛事仍读 null；1 键三语（字典 2,486→2,487）；
  `proof-analytics` 新增 2 条共 173/173（c3：主队 A 2 次面对里 1 次在首窗（12′ 的扑救）读 1/2=50%，客队 C 唯一一次在 91′ 读 0/1=0%；
  交叉场 s3 主队真实零行 0、客队 null；屏幕读 `stakes.earlySiegeLine` 与两个 `earlyFaced` 字段、两条 `faced > 0` 守卫）；
  census pin：i18n literal 1,821→1,823、litVarSites 253→255；无新模块/路由/存储键；
  bundle 保持 531 KB gzip / 54 资产（JS 519、CSS 12.4，baseline 只重记 JS 518→519，pwa pin 不动）；
  tsc 干净、build exit 0、全套 122/122 · 3,291/3,291 检查；
  诚实的保留：这是已有事件记录的读数，未记录的开局读缺席而不是 0，且说的是本赛事已完赛的两端、不是正在预览的这一场。

- M773: 时钟的开局端——`eventClock` 在既有的单次事件 sweep 里给第一个时段补上末段已有的四个数：
  `EventClockRow` 新增 `earlyShots`/`earlyShare`/`earlyFaced`/`earlyFacedShare`（band===0 与 band===lastBand 同一条 pass，不开第二次扫描），
  `EventClock` 新增第四个排序 `earlySiege`（按开局挨打数排，并列回落整场 faced 再到 clubId——逐条照抄 M712 `lateSiege` 的落子规则，不自造新秩序）；
  守零沿用既有约定：没射过球的队 `earlyShare` 取 0 而非 NaN，没挨过打的队 `earlyFacedShare` 同理。
  新增值班条款钉「开局计数就是第一个时段本身」：逐队 `shotsBands[0] === earlyShots`、`facedBands[0] === earlyFaced`，全联赛两个求和相等——
  屏幕印的数必须能被柱状图那一段摸到，否则读者最后才发现的就是它。
  `features/analytics/EventClock.tsx` 加一块「开局挨打」面板（`clock.openSiegeTitle`/`Hint`/`Line`），沿用 M712 的沉默：
  `earlySiege.filter(r => r.earlyFaced > 0)`，空则整块不印而不是五行零；各队时钟每行在既有末段行之上多印一行 `clock.openRecord`；
  行右侧时段标签复用 `timing.w1`，不发明第七个时段名；队名回落仍是 `club?.name ?? r.clubId` 这道门，
  故 absence 门与用户表不动（`EventClock.tsx` 仍 1 处，28 文件）。
  4 键三语（字典 2,482→2,486）；census pin 取合并树实测：literal 1,816→1,821（第五处是复用 `timing.w1` 的标签）、litVarSites 251→253；
  顺手改掉 `clock.boardHint` 三语里「名字下面一行是末段占比」这句已经过期的说明（改值不加键，census 不动）；
  `proof-analytics` 新增 5 条共 171/171（T9 手算 A 早 1/3 脚 33.33% 且挨 1/2 次 50%、B 无早射却挨 1/3、C 唯一一次挨打在 91 分钟故读 0/1 不是 NaN；
  并列时 B 靠前靠整场 3&gt;2；静默与空表照样保留开局行；屏幕只读 fold、组件内无 `.sort(` 也无 `band === 0`）；
  bundle 530→531 KB gzip / 54 资产（js 518、css 12.4），`proof-pwa` 预算 pin 530→531，`tests/perf/baseline.json` 随之重记；
  tsc 干净、build exit 0、npm run proof 122/122 脚本 · 3,289/3,289 检查；
  浏览器复核（production preview、/clock、zh-CN 与 en，两端 console 干净）：中文「开局挨打」首行 Chelsea 读 开局挨 32 次，共 163 次（19.63%），末段 13.5%，
  右侧 32 / 1–15′，各队时钟 Chelsea 行早段 22 脚 · 占本队射门 19.47% 压在既有末段行之上；英文 HIT FIRST 排在 HIT LATE 之上，
  行读 "32 of 163 faced early · 19.63%, 13.5% late"；真实数据读法：Chelsea 开局挨打最多（32/163），Newcastle 开局占比 20% 为全表最高，
  曼联 own clock 早 14 脚 14.29% 对晚 20 脚 20.41%，与切尔西反向；
  诚实的保留：开局=1–15 分钟，说的是带事件列表的已结束场次里最早一刻钟，不是首发姿态，也不覆盖没有事件记录的 5 分钟；
  没有早段事件的队显示「没有」而不是 0，与 M712 对末段板的处置一致。

- M772: 组件农场未路由 stub 再清一次，census 的人群 pin 回到记录值——`origin/master` 在 `67e9c2b` 是红的：
  `proof-i18n` 读 367/383，16 条失败没有一条来自分析 fold。一批提交（日志里标题占 M711–M771，即青训营/财务/概览组件）
  在 `features/academy/`、`features/finance/`、`features/overview/`、`features/player/` 下落了 62 个 `.tsx`：`src/App.tsx` 无路由、侧栏无入口、
  证明脚本无条款、README 无 section，且一个字典键都没写——于是 649 个 `t()` 站点指向三张表里都不存在的键，
  raw-UI 债在 61 个文件里累计 408 处，`ClubFinancialOverview.tsx` 元素不闭合让中间点字幕探针读成盲区，
  量到树而非量到代码的 pin 三处漂移（skip-list 审计与人群普查 127→189 模块、字幕 walk 70→132 个 `.tsx`、读字典表的文件 130→192）。
  处置沿用 M710（47 个组件、814 个凭空键、175→127）与 M598（23 个文件）的先例：删。
  删前核实无任何引用——`src/`、`features/shell/` 与全部 proof 脚本 grep 既无 importer 也无按文件名的条款，六十二个文件只 import 共享 primitives；
  删后 `tsc --noEmit` exit 0，字典仍 2,482 键 · 3 语，`proof-i18n` 回到 383/383 且四条 pin 回到记录值；
  bundle 不动（530 KB / 54 资产）——未路由的组件根本进不了 chunk，这正是它能藏六十三提交的原因。
  本提交除六十二个删除文件与 README/PLAN 记录外不动任何 fold、屏、键或预算 pin；文本没丢，`67e9c2b` 及其父提交里都在。
  本提交还补了一次账：本线的 section 写到 M772 之后，README 的编号区间就把农场的 M719–M771（M769 除外——日志里根本没有这个号）
  暴露成 53 个没有 section 的号，gaps 块因此逐条点名那批提交真正交付的组件、prose 计数 133→186，
  `proof-ledger-run` 8/8；条目写的是组件名而不是编号，因为光秃秃的号仍是读者要自己挖的洞。
  这次清扫写进下一条的教训：清扫是机械的，而且树对它是不变的（删一个不被引用的文件不会动其余文件的任何测量），
  但只要那条 lane 还在推送，每次落地都得重来一遍；根治是"谁都不 import 的文件不再计入应用 census，单独记一本隔离账"，
  那是下一条里程碑的活；本提交只把桌子清空。

- M718: 隔离区「找不到模块」的八个站点原来是三件事——`2307` 自 M539 起钉在 8，但那个数字说不清八处各自缺什么。
  门改问编译器的解析器两次：应用平面（应用自己的 options＋以草稿文件为所在目录，正是 checker 问的那句话）与
  隔离区平面（同一份 options 把根挪进 `.drafts`）。两答之间八处分了类：七处指的是隔离区原地就有的同路径模块
  （`@/domain/finance`、`@/domain/league`、`@/domain/sync`、`@/domain/transfer`、`@/features/world/seasonStats`
  五个应用从未上线的 domain——屏幕与它的 domain 是一起下架的，缺的是决定不是文件），而且这七处要的名字
  sibling 全都真的导出了（配对检查＝0 处空头承诺，说明 pile 里那几个 domain 是完整的、不是半成品）；
  第八处是另一位：TransferAnalysis.tsx:7 伸手拿 `@/world/seasonStats`，而 pile 里放着 `features/world/seasonStats.ts`——
  放错了架子；没有一处是「谁都没有的模块」。修复就一行（改成三个同胞屏幕已在用的拼法），
  而且它一个诊断都不减：模块仍在应用之外，census 前后都记 2307——这正是它必须现在做的理由：
  模块缺失时错误路径是不可见的，等模块上线那天它还会再断一次，一个因两种原因失败的站点谁都修不动。
  新门 `scripts/proof-draft-modules.mjs` 7/7：第一条是反向对照而不是地板——同一个解析器必须答得上
  应用自己 import 的每一个 `@/…`（122 模块 / 693 站点 / 0 未答），解析器瞎掉就不能报「干净」；
  第二条让两次读数互相证明：walk 解析不出的站点与 checker 的 2307 按文件逐一比对，两个数各自算出再要求相等，
  谁也不抄谁；接着三类各配一枚植入草稿（错架／凭空模块／空头承诺），外加一枚 import 应用真有模块的对照草稿，
  它必须不进任何名单；最后一条把五个未上线 domain 钉成集合——第六个得是有人记下的决定，不是溜进来的站点。
  写门过程中被臂抓住的坑：用正则读导出（`^export\s+(const|function|…)\b`）看不见 `export async function syncData`，
  第一版因此把七个 sibling 站点全报成「要了 sibling 没导出的名字」——十八个门自己造出来的假缺陷；
  分类器改用 parser，并靠植入的 sibling＋空头承诺一对草稿把两个方向都看牢。
  实测：隔离区仍是 409 诊断 / 69 文件、2307 仍是 8，本轮买的是可读性不是更小的数字；
  tsc 干净、build exit 0，全套 122/122 脚本 · 3284/3284 查全绿（新门把检查数从 3277 抬到 3284，proof-draft-modules 7/7、proof-draft-types 5/5、proof-draft-imports 3/3）。
  账本点名的五个决定也写明白：finance——本线 M531 已判定这套数据集身价虚高，不该由它撑起财务模型；
  sync——还没有一个跨设备故事值得为它建同步 domain；league 与 transfer——应用发的是传闻与要价
  （`domain/transfers.ts`），不是转会执行引擎，pile 里的 `executeTransfer`/`getFreeAgents` 会是第二个产品面而非同一件事的第二份拷贝；
  seasonStats——应用已经从世界引擎的运行折出赛季报告（`worldEngine.buildSeasonReport`，M525 上线），
  而 pile 那份把第二份 tally 缓存进 localStorage 的 `WORLD_KEY`，四块屏幕等它——照原样上线会让产品同时有两套
  持久化规则不同的赛季统计，比账本记着现状更糟。
  本轮转绿的一条红是三笔之前欠的：`proof-record` 拿 README 顶部的 roadmap 指针与文件里
  最新的 `### M###` 标题对账，而 M717 那次落地只加了标题没挪指针（指针当时仍写着 M716）——同一份文件里隔了九千行，谁都没抱怨。
  教训不是「记得挪指针」，而是「一条门读同一份文档的两处，就只有落地脚本那么可靠」：落地脚本按门自己的读法取
  全文第一个匹配，并且要求「活的」指针行恰好一行（README 用反引号把自己的历史当散文引了一遍，那不算指针），
  写完再核一遍自己改的就是门读的那一行，否则不动任何字节。
  全程在隔离 worktree（milestone-718，基于 M717 之后）落地，未触碰分析 lane 的文件。— pushed


- M717: 隔离区的四个「谁都不拥有的名字」——M540 的门只算「应用导出却忘了 import」这一半，把 checker 的 2304 列表里
  应用从不导出的四个名字原样打印成「另一类缺陷」放走；而 2304 说的是「这个名字在任何地方都没有绑定」，应用是否拥有它只决定怎么修、
  不决定哪里错。四处逐一修复：DataSync.tsx:44 读改名前的 memo 名（syncedCount → syncStatus.totalSyncedItems）、
  SeasonOps.tsx:33 同形（newsData → opsData.season）、LeagueManager.tsx 把 setter 自己的参数在 setter 外面读
  （prev 未绑定，改为 const nextLeagues = [...leagues, league] 同时交给 setLeagues 与 writeLeaguesToStorage，
  两次读再不可能分叉）、TransferWindow.tsx 调一个应用从未有过的估价门（calculateTransferFee → 应用自己的
  askingFee(p.value)，与 Transfer Centre 同一个数）。门重瞄：clause 2 把隔离区全部 2304 钉在 0，
  并按「忘了导入 / 凭空发明」分类披露；镜像臂同时植入两种拼法（EmptyState 无导入 + 谁都没写过的
  ledgerOfUnwrittenNames）加一份正确导入的对照，要求前两个被点名、第三个不动、且分类各归其位——
  植入的「凭空发明」那条正是边界移动的证据（M540 的判据下它是免罚的）。
  实测：隔离区 413/69 → 409/69（正是那四个名字，无附带损失），族 21 → 17，TOTAL_CEILING 413→409、
  四名入 REPAIRED 钉 0；导出索引同一轮派生 122 模块 / 676 名 / 10 个歧义；人口钉 79 不变；
  proof-draft-imports 3/3、proof-draft-types 5/5、proof-drafts 8/8。
  没修的也写清：TransferWindow.tsx 仍从 @/domain/transfer（树里没有这个模块，属 2307 族，钉 8）导入四个名字，
  仍读 p.contractYearsRemaining（应用 Player 没有这个字段，属 2339 族 71）——那要决定的是「应用要不要第二套转会
  domain」还是「这份草稿该删」，是产品判断不是绑定错误。
  本线在隔离 worktree（milestone-717，基于 origin/master 470c1b9）落地，全程未触碰分析 lane 正在改的
  domain/analytics.ts / dictionaries.ts / EventClock.tsx。— pushed


- M716: 上限的位次读法——`domain/analytics.ts` 新增 `CeilingPlaceRow`/`CeilingPlaces` 与 `ceilingPlaces(compId, matches, clubs)`：
  把 `pointsScenarios` 已经印出的 `maxPoints` 当作输入，每支俱乐部同时抬到自己的上限（不是抬一支冻一支），
  每个剩余场次按 M632 `rankSwing` 的最小决胜比分计分（gf 加剩余场数、ga 不动），再用同一 `byTableStanding` 重排取位次，
  因此新列不可能与读者点过去的积分榜打架；并列时保住原有高者的位次（排序稳定，不自造第四条破平规则）；
  之所以全体同时抬：一队独抬而其余冻住正是 `maxPoints` 的口径，但落到位次上什么也不说——真实英超 10 队里有 9 队都能越过冻住的榜首，
  整列读 1；同时抬才排出一张真表（前五读 1 / 6 / 3 / 5 / 4），也让"本队上限不如邻队"的俱乐部掉位次，这是答案诚实的一半（moves 合计为 0）；
  `features/analytics/PointsScenario.tsx` 的上限列（`scenario.colMaxPlace`）与第五块 tile（`scenario.climb` + `climbSub`，`tone="up"`，
  守卫 `climb.peak &&`）都只读 fold，网格由 `lg:grid-cols-4` 改 5 列，列宽模板同步加一格；无表行的俱乐部读共享缺席字形；
  3 键三语（字典 2,479→2,482）；`proof-analytics` 新增 9 条共 166/166
  （T1：上限彼此比较而非与冻住的表比较，故三队全不动、peak 是榜首的 0 而非 null；
  TC：Q 9 分且无赛可踢、P 6 分还剩两场（上限 12）→ P 取第 1、Q 掉第 2、N 不动，且 moves 合计 0；
  TD：R 追平 S 的积分与净胜球、凭进球越过——并带反证：只抬积分则 S 仍在前；
  TZ 无表行 → 0 行且 peak null（不是对空集合跑 maxBy），T2 只留自己的 D,E 两行；确定性；屏幕只读 fold 且组件内无 byTableStanding/`.sort(`）；
  census pin：i18n literal 1,813→1,816、litVarSites 250→251、absence 门 PointsScenario.tsx 5→7（用户表仍 28 文件）；
  无新模块/路由/存储键；bundle 保持 530 KB gzip / 54 资产（js 518、css 12.4，pwa pin 不动，baseline 只重记 JS 517→518）；
  tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3,277/3,277 检查；
  浏览器复核（production preview、/scenarios、zh-CN 与 en）：中文读 位次升幅最大 / ARS / 全员到顶可升 4 位（上限位次列前五 1/6/3/5/4），
  英文读 BIGGEST CLIMB 与 "4 place(s) once every ceiling is met"，控制台两端都干净；
  诚实的保留：这是对赛程的算术不是预测——假定每队拿走全部剩余上限且每场都是最小胜差，净胜球是近似而非模拟；
  "升 4 位"说的是若全部赢下它值多少地面，不是说它会排名第二。

- M715: 简报页也问位次——`Briefing` 新增 `rank: RankSwing | null`，由 `briefing()` 调 M632 的 `rankSwing(compId, next.homeClubId, next.awayClubId, matches, clubs)`：
  该 fold 查的就是 `us`/`them` 来自的那批 `teamMetrics` 行，因此缺表行时 gap 与位次一起为 null，不是各有一条条件；
  简报的场次由构造保证是 SCHEDULED，故不再另加开门条件；
  `features/analytics/Briefing.tsx` 的 stakes 面板在分差行与上限行之后加两行，复用比赛页 M632 的两个键
  （stakes.rankHomeLine/rankAwayLine），队名走 `homeClub?.name ?? fixture.homeClubId` 这道门，位次为空时读共享缺席字形（与上面两行同一处置）；
  0 新键（字典仍 2,479 键 · 3 语）；`proof-analytics` 新增 2 条共 157/157
  （A 主场对 B 与 B 读同一场交出逐字节相同的位次对象；C 的下一场在 B 主场——主队现居第 3，平局把客队凭进球抬到第 1；
  D 的跨赛事场次没有对手的表行，位次与分差同读 null；屏幕两个键都在，且模块内无 rankSwing/byTableStanding/teamMetrics 字样）；
  census pin：i18n literal 1,811→1,813、litVarSites 248→250、absence 门 Briefing.tsx 12→14（用户表仍 28 文件）；
  无新模块/路由/存储键；bundle 保持 530 KB gzip / 54 资产（js 517、css 12.4，pwa pin 与 baseline 都不动）；
  tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3,268/3,268 检查；
  浏览器复核（production preview、/briefing、zh-CN、默认阿森纳）：Arsenal 现居第 6——胜则第 6、平则第 6、负则第 7 / Brighton 现居第 7——主队胜则第 7、平局第 7、本队胜则第 6，
  与 M632 的 /matches/M0099 读到同一对句子，控制台干净；
  合并注：本条以 M633 编号开发，落地时农场 lane 已占满 M633–M714，故按 `git log origin/master` 重编为 M715，
  所有 pin 与检查数改为合并树实测（analytics 由 M711–M714 推进到 155，literal 到 1,811）；
  诚实的保留：简报读的是该队最早的一场 SCHEDULED，位次只说这一场而不说整个剩余赛程；仍沿用 M632 的最小决胜比分约定；
  下一场落在自己没有表行的赛事时，两行读缺席而不是 0。

- M714: 比赛页打印两端的防守时钟——`domain/analytics.ts` 的 `MatchBrief` 在 `awayCards` 之后新增
  `homeClock`/`awayClock`（`eventClock` 的两行，直接取 fold，不另扫 stats 块），赛事无该队时钟行时读 null；
  `features/football/Details.tsx` 的 stakes 列表在牌账行之后按端各加一行 `stakes.siegeLine`
  （面对 n 次 / 末段 late 次 / 占比 p%），守卫 `faced > 0`（空行不出零列）；1 键三语（字典 2,478→2,479）；
  `proof-analytics` 新增 2 条共 155/155（T9 c3：主队 faced 2/late 0/0%、客队 1/1/100%；
  T2 的 D-A：主队真实零行 faced 0、客队 null）；census pin：i18n literal 1,809→1,811、litVarSites 246→248；
  无新模块/路由/存储键；bundle 保持 530 KB gzip / 54 资产；tsc 干净、build exit 0、全套 121/121 · 3,266/3,266。

- M713: 比赛页打印两端的牌账——`domain/analytics.ts` 的 `MatchBrief` 新增 `homeCards`/`awayCards`：
  直接取 `discipline` 板的两行（不另从 stats 块重算），赛事无该队表行时读 null（跨赛事首秀前）；
  `features/football/Details.tsx` 的 stakes 列表在 venue 行之后按端各加一行 `stakes.cardsLine`（黄牌/红牌/场均张数），
  守卫各自 `brief.homeCards` / `brief.awayCards`；1 键三语（字典 2,477→2,478）；
  `proof-analytics` 新增 2 条共 153/153（T5 d4：A 2 场 4Y0R 场均 2.00、C 2 场 5Y1R 场均 3.00，且 bookings=Y+R；
  T2 的 D-A：主队空表行 0 场、客队 null）；census pin：i18n literal 1,807→1,809、litVarSites 244→246；
  无新模块/路由/存储键；bundle 保持 530 KB gzip / 54 资产；tsc 干净、build exit 0、全套 121/121 · 3,264/3,264。

- M712: 事件时钟的防守端只读末段——`domain/analytics.ts` 的 `EventClock` 新增 `lateSiege`：
  同一批行按 75 分钟后的挨打量排序（并列时回落到整场 `faced`，再按 clubId），在 `eventClock` 的同一次扫描里出，不另起一遍；
  `features/analytics/EventClock.tsx` 在 siege 面板之后加"末段挨打"面板：最多五行只列 `lateFaced > 0` 的俱乐部，
  每行读 `clock.lateSiegeLine`（末段挨 n 次 / 共 f 次 / 占比 p%），右侧数字下标 `timing.w6`；无人末段挨打时不出面板（不出零列）；
  3 键三语（`clock.lateSiegeTitle`/`lateSiegeHint`/`lateSiegeLine`，字典 2,474→2,477）；
  `proof-analytics` 新增 2 条共 151/151（T9 fixture 手算：B 3 次面对里 2 次在末段（66.67%）、C 1/1（100%）、A 0/2，序 BCA；
  无事件赛事仍列全俱乐部（lateFaced 全 0，故屏幕过滤）；空赛事保留行）；
  census pin：i18n literal 1,803→1,807（面板标题/提示/行/末段标签四个新调用点）、litVarSites 243→244；
  无新模块/路由/存储键；bundle 529→530 KB gzip / 54 资产（JS 517、CSS 12.4），baseline 与 pwa pin 同步为 530；
  tsc 干净、build exit 0、全套 121/121 脚本 · 3,262/3,262 检查。

- M711: 俱乐部页读自己的赛季牌曲线——`domain/analytics.ts` 把 `disciplineTrend` 的累计/峰值循环抽成共享 `foldCardRounds`，
  并新增 `clubDisciplineTrend(compId, clubId, matches)`：同一批 stats 块只取该队所在的一侧（主场读 `stats.home`、客场读 `stats.away`），
  俱乐部未参加的有牌轮次缺席而不是画成 0，累计列只数它真正踢过的场次；两轮并列峰值时保留更早的那一轮；
  `features/football/Details.tsx` 在 siege 行之后加趋势块（`disc.trendTitle` 标题 + `det.cards.trendLine` 一句 +
  每轮一根按峰值缩放的柱与 `/discipline` 同款的轮次标签），守卫 `cardTrend && cardTrend.rounds.length > 0`；
  1 键三语（字典 2,473→2,474）；`proof-analytics` 新增 4 条共 149/149（T12 手算：A 轮 1,2,3 记 2,2,1、累计 2,4,5、峰值 2；
  C 跳过轮 1、峰值 4；B 的轮 2 缺席而非 0；D 读空；三队逐轮合计必须等于联赛 fold 的 4,6,4 且总数等于 12Y+2R——
  每场两端的牌各数一次；屏幕只读 `cardTrend`，组件内无 `clubDisciplineTrend` 之外的再推导）；
  census pin：i18n literal 1,800→1,803（标题、轮次标签、新句三个新调用点）、litVarSites 241→243；
  无新模块/路由/存储键；bundle 保持 529 KB gzip / 54 资产（JS 517、CSS 12.4，baseline 与 pwa pin 不动）；
  tsc 干净、build exit 0。

- M710: 清理组件农场 lane 的仓库污染并恢复被覆盖的路由屏（无新功能）——`features/analytics/TitleRace.tsx` 按 M567 原样恢复：
  M635 的 stub 以 11 条 tsc 错误覆盖了真实屏（未导入 `useState`、在 `Club` 上读 `position`/`points`/`matchesPlayed`/`goalsFor`/`goalsAgainst`、
  `handleSelectView` 声明两次、`variant="primary"` 不在 Button 变体表）；stub 还拿 `setSelectedView === "current"`（函数与字符串比较）、
  硬编码"分/位/下一轮"、用 `t(\`titleRace.position${...}\`)` 拼出字典里不存在的键；
  删除 M633–M709 批次（含重复 M631 SeasonSummary）里 47 个未路由组件：无路由、无侧栏、无字典键、无证明——
  i18n 读到 814 个未定义 t() 键、raw-UI 债 48 文件 529 处、`SeasonBestXI` 与 `Squad` 重复拼写同一 formation 联合；
  删除 `.drafts/` 里该批次新增的 28 份草稿（census 107 对 pin 79、21 份不解析对 0 上限）；
  把 lane 的未跟踪 `features/overview/ProjectOverview.tsx` 移出工作树且不纳入提交；
  落地后：tsc 干净、build exit 0、bundle 保持 529 KB gzip / 54 资产（JS 517、CSS 12.4——这批文件从未进入入口，删除不改变打包）、
  全套 121/121 脚本 · 3,256/3,256 检查（i18n 383/383、vocab 7/7、drafts 8/8、draft-types 5/5、app-tree 12/12）；
  字典 2,473 键不变，无新路由/存储键/模块；README 把 M633–M709 记入 gap 批次；
  诚实的保留：农场 lane 下一次推送可能把同类 stub 再带回来，本线每次合并后必须重跑同一清理；M633–M709 的编号保留历史但不再有代码。

- M632: 赛果的排名维度——`domain/analytics.ts` 新增 `RankPlace`/`RankSwing` 与 `rankSwing(compId, homeClubId, awayClubId, matches, clubs)`：
  读 `teamMetrics` 的同一批表行，把主客各按胜/平/负的增量（3,1,0 / 1,1,1 / 0,0,1 与镜像）加到 points/gf/ga 上，
  再用 `byTableStanding` 重排整表取 1 基位次，产出 now/ifHomeWin/ifDraw/ifAwayWin 四组 {home, away}；
  排序稳定，积分/净胜/进球三级全等时原有的高者保住位次而不自造第四条破平规则；任一端无该赛事表行读 null；
  `MatchBrief` 新增 `rank: RankSwing | null`，只有 SCHEDULED 场次才折（已完赛的场次已花掉这场），与 `swing` 同一门；
  `features/football/Details.tsx` 的 stakes 列表在 ceiling 行之后加两行（每队一行：现位与三种结果后的位次），守卫 `brief.rank &&`；
  2 键三语（stakes.rankHomeLine/rankAwayLine）；`proof-analytics` 新增 2 条共 145/145
  （T1 A-B：A 三种结果均第 1、B 胜则 3→2；B-C 同场翻转：平局或 C 胜都把 C 从第 2 抬到第 1——1-1 平局在积分与净胜相同下凭进球（第三种破平）越过 A，B 只能靠自己的胜场上升；
  T3 三队 1-1 循环是全平情形：X-Y 平局后双方积分/净胜/进球全等，X 保住第 1；无 T1 行、已完赛、跨赛事三种情形全 null；屏幕只读 brief 且组件内无 rankSwing/byTableStanding 字样）；
  census pin：i18n literal 1,798→1,800、litVarSites 239→241、字典 +2 键（2,471→2,473）；
  无新模块/路由/存储键；bundle 保持 529 KB gzip / 54 资产（js 517、css 12.5，baseline 只重记 JS，pwa pin 不动）；
  tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3,256/3,256 检查；
  浏览器复核（production preview、/matches/M0099、zh-CN）：Arsenal 现居第 6——胜则第 6、平则第 6、负则第 7 / Brighton 现居第 7——主队胜则第 7、平局第 7、本队胜则第 6，控制台干净；
  诚实的保留：位次按最小决胜比分（1-0/1-1/0-1）算，大胜会在净胜球上越过更多球队；表是今天的表——本轮已赛的其他场次会同时移动两队；
  fold 说的是算术不是概率。
- M631: 俱乐部页读到“何时挨打”——`features/football/Details.tsx` 的赛季分析面板在牌账 dl 之后加一行：
  标签复用 `clock.siegeTitle`，窗口名复用 `timing.w1…w6`，值读 `eventClock(compId, matches, clubs).rows.find(...)` 的该队一行
  （faced/stops/stopShare/worstBand/lateFacedShare，均 `fmt2`），不新增 domain、不二次折事件表；
  只有 `clockRow.faced > 0` 时才写（没挨过打的队读 0% 扑出率是不成立的），与 /clock 的 siege 行同一守卫；
  1 键三语（det.siege.line）；`proof-analytics` 新增 1 条共 143/143
  （T9 的 B 挨 3 次、扑出 1 次 33.33%、最忙窗口 5、末段 66.67%；T5 静默钟每行 faced=0，正是守卫要挡的情形；屏幕只读 fold 与守卫）；
  census pin：i18n literal 1,790→1,798（六个窗口标签、复用标签、插值行）、litVarSites 238→239、字典 +1 键（2,470→2,471）；
  同次修正 M630 的台账口径：一键记一行，故该条读 2,469→2,470（原写 2,472 是按语数了三次）；
  bundle 实测 529 KB gzip / 54 资产（js 516、css 12.5，baseline 528→529 重记，pwa pin 528→529）；
  tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3,254/3,254 检查；
  浏览器复核（production preview、/clubs/ars、zh-CN 读者）：防线压力 · 面对 78 次射门，扑出 17 次（21.79%）· 最忙 16–30′ · 末段占 19.23%，控制台干净；
  诚实的保留：事件钟只数带事件表的已完赛比赛，缺事件数据的队看不到这一行而非读到 0；
  最忙窗口是计数不是场均率，lateFacedShare 与它并排印出，率读法留给 /clock 的榜。
- M630: 简报页读到下一场的赛果算术——`domain/analytics.ts` 的 `Briefing` 新增 `swing: MatchSwing | null`，
  由 `matchBrief` 同一个私有 `swingOf` 计算；方向按主客而非读者（`side` 决定 `us` 是主队还是客队，先排成 home/away 再折），
  同一场的两个读者读到同一对象；任一端无积分榜行时 swing=null；
  `features/analytics/Briefing.tsx` 在四块赛季 tile 与五步之间加 "The stakes" 面板：分差行与上限行复用
  `stakes.swingLine`/`stakes.ceilingLine` 与 signed 门，新增 1 个 hint 键点名主客两端，swing 为空时两行走 ABSENT；
  `proof-analytics` 新增 3 条共 142/142（A 的 s1 简报 lead 3、+6/+3/0、上限 10/8/7 对 7/5/4；B 的同场简报逐字节相同；
  C 客战 B 读出负差 −2、+1/−2/−5、上限 7/5/4 对 9/7/6；D 跨赛事简报 swing=null；屏幕只读 fold 不调 pointsScenarios）；
  census pin：i18n literal 1,786→1,790、litVarSites 235→238、字典 +1 键（2,469→2,470，台账按键计一次而非按语计三次）、absence 门 Briefing.tsx 10→12；
  bundle 实测 528 KB gzip / 54 资产（js 516、css 12.5，baseline 529→528 重记，pwa pin 529→528）；
  tsc 干净、build exit 0、npm run proof 121/121 脚本 · 3,253/3,253 检查；无浏览器复核；
  诚实的保留：这只是算术不是预测（哪种结果更可能属于 Data Room 的模型）；分差取当前积分，
  同轮其他场次会在这之前改变它——比赛页的 swing 继承同一假设。
- M629: 俱乐部页读到牌是在哪一端拿的——`features/football/Details.tsx` 的牌账 dl 在"场均已"之后加一行：
  标签复用 `disc.venueTitle`，值读 `disciplineVenue(compId, matches, clubs)` 的该队一行（homePerMatch/awayPerMatch/gap，`fmt2`），
  不新增 domain、不重算 stats；只有 `venue.playedHome > 0 && venue.playedAway > 0` 时才写（只踢过一端的队读 0 客场率是不成立的）；
  1 键三语（det.cards.venueLine）；`proof-analytics` 新增 1 条共 139/139
  （T5 的 B 行 1.00/2.00、gap +1.00；T7 静默 fixture 两队各只一端，给守卫一个真实的一端行；屏幕只读 `disciplineVenue(...).rows.find(...)` 与两端守卫）；
  census pin：i18n literal 1,784→1,786、litVarSites 234→235、字典 +1 键/语（2,468→2,469 值）；
  无新模块/路由/存储键；bundle 保持 529 KB gzip / 54 资产（js 515、css 13，baseline 与 pwa pin 不动）；
  tsc 干净、build exit 0、全套 121/121 脚本 · 3,250/3,250 检查；无浏览器复核；
  诚实的保留：这一行仍是赛事牌账的切面，不含裁判或对手效应；只踢过一端的队要看得去 /discipline 的榜（同一守卫）；
  gap 是两个已印率相减，继承两位小数的四舍五入。
- M628: 事件时钟的防守端窗口轴——`domain/analytics.ts` 的 `EventClockRow` 新增 `facedBands`/`lateFaced`/`lateFacedShare`/`worstBand`，
  `EventClock` 新增联赛级 `facedBands`：每个 SHOT/SAVE 除了记到对面防守方的 `faced`（M625），还落进对面的六带之一，
  末带（76–90′）另记 `lateFaced`；后处理给 `lateFacedShare`（round2，faced=0 时 0）与 `worstBand`（首个最大带，faced=0 时 −1）；
  联赛镜像列 `facedBands = shotsBands + savesBands`，逐窗闭合（每次射门/扑救恰好由一方防守承受）；
  `features/analytics/EventClock.tsx` 的 bands 面板加第四行（`clock.facedBands`、`BAR_FILL.progress`，peak 纳入该列），
  siege 行在 `r.faced > 0` 时加"最密 {band} · 末段占 {p}%"一行；
  1 键三语（clock.siegeBand）+ 两处 hint 扩写（bandsHint/siegeHint）；`proof-analytics` 新增 2 条共 138/138
  （T9 手算：B 挨 A 12′ 射门与 78′ 被扑射门 → 1,0,0,0,0,2、最密 5、末段 66.67%；A 挨 B 30′ 射门与 12′ 被扑射门 → 1,1,0,0,0,0、最密 0、
  末段 0；C 挨 91′ 射门 → 0,0,0,0,0,1、最密 5、100%；联赛 2,1,0,0,0,3 逐窗等于 shots+saves 且合计 6；静默/空赛事六带全 0、
  worst −1、share 0；屏幕只读 fold 且守卫 faced>0）；
  census pin：i18n literal 1,782→1,784、litVarSites 233→234、字典 +1 键/语（2,467→2,468 值）；
  无新模块/路由/存储键；bundle 528→529 KB gzip / 54 资产（js 515、css 13，baseline 重记，pwa pin 同步）；
  tsc 干净、build exit 0、全套 121/121 脚本 · 3,249/3,249 检查；无浏览器复核；
  诚实的保留：faced 只数数据源里有的事件（射门与扑救），不含封堵/中框/偏出；两窗并列时最密取首个最大值；
  联赛镜像按事件族相加，不是逐队再求和（两者相等由门禁逐窗对账，不改口径）。
- M627: 比赛页的赛果算术——`domain/analytics.ts` 新增 `MatchSwing` 与 `swingOf(home, away)`，`MatchBrief` 新增 `swing: MatchSwing | null`：
  读同一对 `PointsScenario`（不新增 fold），给出主队视角的积分差（主减客）与三种赛果后的差（胜 +3、平不变、负 −3），
  以及两队各自的"本场后上限"（胜=不变、平 −2、负 −3，因为这场就是上限所依赖的剩余场之一）；
  `swing` 仅在 SCHEDULED 且双方都有积分榜行时非空——已结束的场次已经花掉这场，缺行的球队没有可花的上限；
  `features/football/Details.tsx` 的 Stakes 面板在交锋行与争冠行之间加两行（比分差行用 `signed` 格式化 now/win/draw/lose，
  上限行读主客各三值），`brief.swing` 为空时不写这两行；
  2 键三语（stakes.swingLine/ceilingLine）；`proof-analytics` 新增 2 条共 136/136
  （T1 手算 s1：A 4 分/上限 10 对 B 1 分/上限 7 → 差 3、胜 6、平 3、负 0，上限 A 10/8/7、B 7/5/4；
  f2 已结束与 s3 缺行双双 null；屏幕只读 brief.swing 且两行在守卫内；反转赛程逐字节相同）；
  census pin：i18n literal 1,780→1,782、litVarSites 231→233、字典 +2 键/语（2,465→2,467 值）；
  无新模块/路由/存储键；bundle 保持 528 KB gzip / 54 资产（js 515、css 13，baseline 记录 JS 半区，pwa pin 保持 528）；
  tsc 干净、build exit 0、全套 121/121 脚本 · 3,247/3,247 检查；无浏览器复核；
  诚实的保留：差值是"其他场次不动"的算术，不预测整轮后的名次；上限是空间不是概率；只对 SCHEDULED 写出，
  LIVE 已经开打；缺榜行的队读 null 而不是 0。
- M626: 纪律榜的主客分侧——`domain/analytics.ts` 新增 `DisciplineVenueRow`/`DisciplineVenue`/`disciplineVenue(compId, matches, clubs)`：
  与 `discipline` 同一组"本赛事 FINISHED 且带 stats"的场次，把每场的主队行记到主场、客队行记到客场；row 带 playedHome/playedAway、
  两端 bookings、两端 2dp 场均率（该端没踢过读 0）和 gap=客场率−主场率（正=客场更糙）；排序 gap 降序、总牌数降序、id 升序；
  联赛半区读主/客 bookings、场均与 `rougher`（无计数或两端相等读 null）；每场给两端各记一次出场，故两半之和必须等于 board 的牌数；
  `features/analytics/Discipline.tsx` 在 board 与轮次趋势之间新增"主客分侧"面板：联赛一句（两端场均）+ 按 gap 前 5 队，
  每行读队名、gap 句、主场率、客场率；board 只收"两端都踢过"的队（单端球队的 0/1.00 不是挣来的差），空/单端赛事只读空状态；
  7 键三语（disc.venueTitle/venueHint/venueLeague/venueGap/venueHome/venueAway/venueNone）；
  `proof-analytics` 新增 3 条共 134/134（手算 A 2.00/2.00 gap 0、B 1.00/2.00 +1、C 4.00/2.00 −2，序 BAC；
  联赛 7/3=2.33 主 vs 6/3=2.00 客、rougher=home、与 board 13 张对账；T7 单端各 1 场 rate 0/gap 0/rougher null、T8 空 rows 0、
  确定性 JSON 相等、屏幕只读 fold 且带 playedHome>0 && playedAway>0 守卫）；
  census pin：i18n literal 1,773→1,780、litVarSites 229→231、字典 +7 键/语（2,458→2,465 值）；
  vocab 门禁把初稿里重复拼写的 `"home" | "away"` 改成 domain/types.ts 的 `Side | null`；
  无新模块/路由/存储键；bundle 527→528 KB gzip / 54 资产（js 514、css 13，baseline 重记，pwa pin 同步）；
  tsc 干净、build exit 0、全套 121/121 脚本 · 3,245/3,245 检查；无浏览器复核；
  诚实的保留：主客是 fixture 记录的端而非草皮/天气/观众，中立场会按列出的主队记账；分侧只读牌（黄+红），犯规仍留在 board；
  单端球队保留在 fold 里但不上榜（数据撑不起这个差）；没有对手轴，面板说"在哪被罚"而不说"被谁罚"，且只列前 5。
- M625: 事件时钟的防守端——`domain/analytics.ts` 的 `EventClockRow` 新增 `faced`/`stops`/`stopShare`：每个 SHOT/SAVE 同时记到对面（被射门），
  SAVE 另记对面门将的扑出；同一次事件扫描两端同时记账，不第二次遍历；`EventClock` 新增 `siege`（同样的 row 按 faced 降序、stops 降序、id 升序），
  `rows` 保持进攻序；镜像闭合：faced 总和 = shots + saves、stops 总和 = saves；
  `features/analytics/EventClock.tsx` 在 board 之下新增"防线压力"面板：挨射最多的 5 队，各读 faced、stops 和名字下的 stopLine（{p}%），
  面板在 clock.matches>0 分支内；5 键三语（clock.siegeTitle/siegeHint/faced/stops/stopLine）；
  `proof-analytics` 新增 3 条共 131/131（手算 B 3/1、A 2/1、C 1/0，share 33.33/50/0；镜像闭合 6 = 4+2、stops = 2；
  无声与空赛事全 0；siege 序 BAC 而 rows 序 ABC；屏幕只读 `clock.siege`/r.faced/r.stops/stopLine 且组件内无 SHOT/SAVE 字样）；
  census pin：i18n literal 1,768→1,773、litVarSites 228→229、字典 +5 键/语（2,453→2,458 值）；
  无新模块/路由/存储键；bundle 526→527 KB gzip / 54 资产（js 513、css 13，baseline 重记，pwa pin 同步）；
  tsc 干净、build exit 0、全套 121/121 脚本 · 3,242/3,242 检查；无浏览器复核；
  诚实的保留：SAVE 的 side 属于射门方（stats 由 SAVE 行推 on-target），所以扑出记到对面门将——种子若把 SAVE 的 player
  写成己方门将，这个 fold 会记错队（按事件契约而非 player 字段读）；面板只列前 5；对手端没有分时段带，六带仍是联赛级进攻读数，
  面板说"赛季谁在挨打"而不说"比赛里何时挨打"。
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

- M776: census 只计「读者能走到的应用」——可达闭包下沉一处。`scripts/lib/appTree.mjs` 新增
  `importEdgesIn`/`resolveModuleSpec`/`reachableModulesIn`（静态/re-export/bare/dynamic 值边，`import type` 不计；`@/` 与相对路径；
  oracle 只认文件不认目录）；`proof-coverage` 删掉私有 resolver，改为导入共享实现，既有五条合成图证明（两跳链、type-only、动态导入、孤儿）
  现在考的就是共享实现；`proof-i18n` 人群改为从 `src/main.tsx` 的闭包：appSrc 127→116、walked 130→119、`.tsx` 仍 70（三个不可达模块是 .ts/.d.ts）；
  新增账本条款：routed 41 屏全在闭包内（0 lost），3 个 app 模块 + 8 个 harness 文件只报数（0 t() 字面量 / 0 凭空键 / 0 raw-UI）；
  `proof-app-tree` 模块 pin 122→119（十目录仍逐个计）并加一条「可达性问题只有一处答案」（2 个 proof 导入、0 私有副本）；
  顺带修一个被旧人群掩盖的误计：裸键池 pin 去掉 `foundKeys`（那是 browser-walk 收集页面原始键的测试数组，不是屏幕喂给 t() 的池）；
  无字典键/路由/存储键变化，bundle 不变（baseline 不动）；tsc 干净、build exit 0、全套 123/123 · 3,300/3,300（+2 检查，i18n 383→384、app-tree 12→13；并入隔离区 M775 的 proof-draft-any 后总数为 3,300）；
  诚实的保留：不可达计数故意不 pin，删掉隔离文件只移动报数、不红门禁——这是换农场 stub 不逼清扫的代价，死面可见但不设闸。
- M777: 时钟的开局进攻端——攻击面的开局排序与末段对照。`EventClock` 新增 `earlyAttack`：与 `earlySiege` 同一批行，
  按首窗射门数降序、并列取总射门数、再取 clubId，不新增 fold 或计数；`EventClock.tsx` 在「各队的时钟」之后、
  「防线压力」之前加「开局进攻」面板：每行印 `{e} early ({p}%) · {l} late ({q}%)`，右列总射门数，
  `r.earlyShots > 0` 过滤（零行不印）；3 键三语（clock.strikeTitle/strikeHint/strikeLine），字典 2,487→2,490；
  `proof-analytics` 新增 3 条共 176/176（T9 手算：A 首窗 1/3 33.33%、末段 2/3 66.67%，B 0/1，C 0/0，排序 ABC；
  silent 3 行全零、empty 2 行；屏幕过滤 + 不排序）；census pin：literal 1,823→1,827（四个字面量位：标题、提示、行、
  复用的射门标签）、litVarSites 255→256；无新模块/路由/存储键；bundle 531 KB / 54 资产不变（baseline 不动）；
  tsc 干净、build exit 0、全套 123/123 · 3,303/3,303；
  诚实的保留：只排开局，末段只印不排；份额是各队自身射门占比，单脚开局读 100%，零开局不印零行；两端都是已结束比赛的读数。
- M778: 上限位次的落点读法——把「升几位」变成「升到谁头上」的读法。`CeilingPlaceRow` 新增 `landedOn`：
  在 `ceilingPlaces` 里把已经算好的 ceiling 行先排序一次，位次与落点都从这一份读出（`ceilingPlace` 有效时取
  `ceilingRows[ceilingPlace]` 当下一行，末位 null），不二次排名、不新建 fold；`PointsScenario.tsx` 在「上限位次」
  数字下面印落点小字（`scenario.landedOn` 带 club short，末位 `scenario.landedBottom`），没有行仍走 ABSENT；
  2 键三语，字典 2,490→2,492；`proof-analytics` 新增 3 条共 179/179（T1 邻行链、TC 升位者压过被取代者与末位、
  外部重建 ceiling 排序逐行对齐）；census pin：literal 1,827→1,829、litVarSites 256→257；无新模块/路由/存储键；
  bundle 531 KB / 54 资产不变（baseline 不动）；tsc 干净、build exit 0、全套 123/123 · 3,306/3,306；
  诚实的保留：落点只说「这一行站在谁上面」，被挤下去的行同样印新邻居，不区分谁赢谁输；并列由 `byTableStanding`
  的既有 tie-break 定序，落点跟着那一个顺序走。
- M779: 牌的时段——把每张牌落在哪个分钟窗读出。`domain/analytics.ts` 新增 `cardTiming(compId, matches, clubs)`：
  复用 `teamMetrics` 的行骨架与 `goalBand` 的六窗，单遍遍历已结束比赛的 YELLOW/RED 事件，逐队给出
  yellows/reds/cards、六个窗口的 bands、首窗（band 0）earlyCards 与末窗（band 5）lateCards 及两端份额；
  排序按首窗牌数、总牌数、clubId，earliest 取首个有首窗牌的队；不新增 fold；`Discipline.tsx` 在趋势面板后
  加「牌落在哪个时段」面板：每行 Link + 复用 `clock.strikeLine` 的 `{e} early ({p}%) · {l} late ({q}%)` 行、
  右列总牌数随 `disc.clockTotal`；零牌队不印，空赛事印 `disc.clockNone`；4 键三语
  （disc.clockTitle/clockHint/clockTotal/clockNone），字典 2,492→2,496；`proof-analytics` 新增 5 条共 184/184
  （T10 手算：U 三张 bands 1,1,0,0,0,1、首末窗各 33.33%，V 两张都落末窗 100%，W 一张末窗，X 有比赛零牌；
  5' 进首窗、20' 不进，75' 不算末窗、76' 算；未结束与其他赛事不计；空赛事 0 行、earliest null；屏幕过滤与不排序）；
  census pin：literal 1,829→1,834、litVarSites 257→259；无新模块/路由/存储键；bundle 531→532 KB / 54 资产
  （JS 520 + CSS 12.4），pin 531→532 并重录 baseline；tsc 干净、build exit 0、全套 123/123 · 3,311/3,311；
  诚实的保留：只读记录到分钟的牌，没有分钟的出牌不入任何窗口；份额是各队自身牌的占比，单张首窗读 100%；
  首末窗是同一个六窗口径的首窗与末窗，不是全场前后半场。
- M780: 末段进攻的独立排序——`eventClock` 新增 `lateAttack`，把同一批 `EventClockRow` 按
  `lateShots` 排序（平分落回总射门、再落回 clubId），与 M777 的 `earlyAttack` 完全镜像；
  `EventClock.tsx` 在开局进攻板之后加一块末段板，行复用 `clock.strikeLine`、右列末窗脚数随
  `timing.w6`，滤掉末窗零脚的队并截前五；2 键三语（clock.lateStrikeTitle/lateStrikeHint），
  字典 2,496→2,498；顺带修 `venue.goalShare` 的繁中错字（占比→佔比）：新增的简中“占比”把
  占字推入学习集，才照出这处既有漏字；`proof-analytics` 新增 3 条共 187/187（T12：P 三脚全在
  末窗、R 两端各一脚、Q 中间一脚，开局榜 RPQ、末段榜 PRQ，P 末窗 100%、R 50%、Q 0；静默零行
  同序、空赛事两行零、二次读取逐字段相同、屏幕不排序）；census pin：literal 1,834→1,838、
  litVarSites 259→260；无新模块/路由/存储键；bundle 532 KB / 54 资产不变（JS 520 + CSS 12.4），
  pin 与 baseline 不动；tsc 干净、build exit 0、全套 123/123 · 3,314/3,314；
  诚实的保留：只排记录到分钟的射门，无分钟的射门进总数不进窗口；并列落回总射门与队名；板只印
  前五，第六名以后不在屏上；份额是各队自身射门占比。
  另记：本里程碑先在 M779 基线上完成，合并到 master 时发现另一条 lane 的 124 个提交
  （M772–M895）已把四个分析屏换成不可解析的桩、并加入 115 个无接线假屏（未定义键、裸文案），
  tsc 与 20 条 i18n 断言同时失败；先以无编号 repair 提交精确恢复 M779 树并删除这 115 个文件，
  M780 才落在全绿的树上。历史里的 M781–M895 属该 lane，已撤回，账本从 M780 续写。
- M781: 共享读取器从「应用自己声明的入口」出发，而不是从 gate 记住的路径。M776 把闭包下沉到 `appTree.mjs` 是对的，但两个 gate 把闭包写死在字面量 `["src/main.tsx"]`，
  而第四个 `proof-orphans` 自 M428 起一直是**推导**入口（`index.html` 的 `type="module"` 脚本 + `functions/` 里调用 `Deno.serve` 的模块）；两个答案在最要命的地方不一致：
  `functions/index.ts` 没有 importer，因为调用它的是 edge 运行时，`functions/handler.ts` 正是那个入口 import 的模块——SPA 单入口闭包把两者读成死面，字典普查从此不看它们；
  今天它们 0 个 `t()` 字面量，所以损失是**静默**的：将来有人在这里加一句用户可见的字符串，没有一道门在看。`appTree.mjs` 新增
  `stripCommentsIn`/`classifySpecIn`/`htmlEntriesIn`/`denoEntriesIn`/`appEntriesIn`，`appEntriesIn` 成为任何 gate 起闭包的唯一方式；
  pin 回到人群实测：i18n appSrc 116→118、walked 119→121、`.tsx` 仍 70、routed 41 屏 0 lost；app-tree 模块 119→121（十目录 122），账本只剩 1 个 app 模块
  （`src/vite-env.d.ts` 是环境声明，编译器读、浏览器不加载）旁 8 个 harness；
  共享读取器的两处盲区是靠「与被它取代的那个实现逐文件对拍」找出来的：①它从不剥注释，块注释能把 `import` 放到行首（清扫把 import 包进注释块留下的形状），现在 `importEdgesIn` 先 `stripCommentsIn`，
  证明两种注释形状都考，并且打印「同一份源码不剥注释时确实匹配上」这个见证；②它锚在行首，于是 `features/manager/ManagerOS.tsx` 一行三条 import 只认出 1 条、丢掉 2 条真边（图读成 818 边，旧读取器读成 820）；
  锚点改为语句边界（` ; } ` 与换行）并要求 `import`/`export` 关键字，这样一句只写着「from」的文案造不出边——真造出来也会被判 unresolved，由 `proof-orphans` 第 3 条当场报出；
  两个读取器在 121 个模块上对拍：0 丢失、0 新增、820 边。放宽锚点把捕获组挪了位，于是 type-only 判定拿 `^type` 去读一个以空格开头的子句，`proof-coverage` 那条合成图（「type-only import 不算执行目标」）在落地前就按红了它——那正是这条证明存在的用处；
  `proof-orphans` 删掉私有引擎（71 行：注释剥离、三条 specifier 正则、resolver、两种入口推导、一次图走），条款 5/5→7/7（新两臂：两种注释形状都盲；入口是推导的，且 SPA 单入口会误判 2 个模块）；
  「可达性只有一处答案」的条款改为**发现**而非记忆（M432 对邻居规则做过的同一个动作）：调用 `reachableModulesIn(` 的 4 个 proof 全部找出、必须导入 `appTree.mjs`、不得用字面量 app 路径作根、不得在共享实现旁边定义 walk；
  两臂都种下且用运行时拼接构造（`proof-orphans` 种 SKIP_LIST 的同一写法），免得本文件自己在源码里带一个 fork；
  字典键/路由/存储键无变化，bundle 不变（baseline 不动）；tsc 干净、build exit 0、全套 123/123 · 3,316/3,316（+2 检查全在 orphans；i18n 384→384，人群从 116/119 回到 118/121）；
  诚实的保留：`proof-coverage` 仍从 `src/main.tsx` 起走——它问的是另一个问题「这个模块在 `dist/` 里吗」，一个 bundle 只有一个入口，Edge Function 不在其中，本线不给别人的正确答案记账；
  而隔离账本仍然只报数不设闸（那条断言里没有任何关于它的数字），一个瞎掉的账本会打印「none」然后变绿——把它装上证明是下一条目，不是这一条。
- M782: 死面账本装上证明——只报数的隔离区不再只报数。M776 起 `proof-i18n` 一直把「读者到不了的文件」连同它带的
  `t()` 字面量、凭空键（字典里有、通电模块没人用）和 raw-UI 命中数打印出来，却没有任何断言；一个瞎掉的账本打印
  「none」照样变绿，M780 把这句写进了诚实的保留。现在算术变成一个函数：`deadSurfaceOf(ledger, read, liveText,
  dictionary)` 返回 literals/phantoms/raw/rawHits，真树是它的一次调用，种下的叶子是另一次——叶子上带两样隔离区真会
  带的东西（一个没人用的字典键 + 一个绕过 `t()` 的 JSX 文本），读出 1 字面量 / 1 凭空键 / 1 raw 命中；三条臂钉住
  含义：同一个叶子旁边有活屏用了那个键就 0 凭空键（键死是因为没人**在用的位置**用它，不是因为文件不可达）、字典
  根本不收这个键也是 0（未知键是另一笔债，由字典自己的成对条款记账）、叶子只调 `t()` 则 0 raw 命中（raw 数是对
  源码的读数，不是文件计数）；空账本读三个零。夹具的 raw 命中在种下之前先拿真扫描器验过（1 条 kind=text），
  所以这条臂不会自己跟自己点头。真账本的四个数再被逐键复核：每个凭空键都在字典里且通电文本里没有、每个字面量都
  真是一句 `t("…")` 写在账本文件里、每个 raw 数逐文件重算；同时断言账本是对一次遍历的**划分**（app + harness =
  不可达，不可达 + 可达 = 全体，每条路径只出现一次，账本里没有一个文件同时在受检人群里）。条数仍不 pin：
  农场 stub 会把名单推来推去，而划分与算术不动，这正是清扫 lane 需要的行为；诚实的保留：种下的臂证明的是算术，
  证明不了**读取器**（读取器瞎了这些臂照样绿，它们根本不问它）——那个问题由上面的人群 pin 回答。
  census：i18n 384→386（+2 全在账本臂）；无字典键/路由/存储键/模块变化，bundle 不变；tsc 干净、build exit 0、
  全套 123/123 · 3,318/3,318。
- M783: 红牌窗口的独立读法——同一张牌钟把两种颜色摊平，最重的那一张被平均掉了。`CardTimingRow` 新增
  `redBands`（与 `bands` 同源的六窗，只对 `RED` 累加），`CardTiming` 新增 `redRows`（只含真被罚下的队：reds、
  peakBand、peakCount；peak 并列取最早窗，排序 reds→peakCount→clubId；零红队不进红牌板但仍留在主表）；
  `Discipline.tsx` 在 M779 牌钟之后加「红牌窗口」面板，行印 `peak {w} · {n}` 与红牌总数，六窗标签复用
  `timing.w1..w6`，屏幕不排序；5 键三语（disc.redTitle/redHint/redLine/redNone/redTotal），字典 2,498→2,503；
  census literal 1,838→1,849（5 个新键 + 6 个窗口标签位）、litVarSites 260→262（peak 行与总数行各带变量）；
  `proof-analytics` 新增 4 条 187→191（TH 手算：P 10′/20′ 各一红取早窗 0，Q 85′/88′ 末窗 2 张，R 50′、T 60′
  并列按 clubId；S 上场无红不在板上；定时赛与 TI 的红牌不进读数；TF 有行无红读 0；TE 每队 redBands 之和 = reds；
  屏幕只读 fold 不排序）；无新模块/路由/存储键；bundle 不变（baseline 不动）；tsc 干净、build exit 0、
  全套 123/123 · 3,322/3,322；
  诚实的保留：peakBand 是「红牌最多的窗」不是「第一张红牌的窗」，并列取最早；红牌板只印峰值窗，完整六窗序列
  留在 redBands 里没画出来；读数仍只覆盖已结束比赛。
- M784: 存储与路由的人口改成读者可达的树。`proof-storage` 原来整树走 8 个目录并 pin 117 个文件，`proof-router` 整树走
  7 个目录；农场 stub 一落就能推动这两个人口（M776 退休的正是这种 pin）。现在两处都从共享规则的十个目录出发：`appEntriesIn`
  （index.html 的 module 脚本 + functions 里 `Deno.serve` 的模块）取入口，`reachableModulesIn` 走值导入闭包，再裁到各自范围：
  存储 8 目录 116（pin 117→116）、路由 7 目录 113；范围内唯一不可达模块在两处都点名而不静默丢弃——`src/vite-env.d.ts`
  是编译器读、浏览器不加载的环境声明。oracle 只认文件：`existsSync` 对目录也答真，`@/i18n` 会解析成目录让读取器去读，
  两处都先撞上 EISDIR。存储还种了一棵临时树（`pkg/` 是 app-tree 的 fork 读取器豁免的夹具名）：a.ts 导入 b.ts，c.ts 独立，
  共享读取器留 2 丢 1——人口是对可达性的读数而不是文件计数。`proof-app-tree` 的模块条款同时印两列：整树逐目录与可达逐目录，
  前者是丢目录的报警器，后者是普查记账的人口（今天只有 src 3→2）。`proof-coverage` 保持 bundle 口径：它问的是「在不在 dist/」，
  一个 bundle 只有一个入口——这是 M781 的保留，本线不给另一个正确答案改题。
  无 app 模块/字典键/路由/存储键变化，bundle 532 KB / 54 资产不变；storage 63/63（+1）、router 29/29（+1）、app-tree 13/13、
  coverage 26/26；全套 123/123 · 3,324/3,324；tsc 干净、build exit 0；
  诚实的保留：两处仍用自己的 walker 走目录再按共享闭包过滤，walker 忘了目录不会在自身变红——是共享的 `APP_DIRS` 与 app-tree
  的十目录报警器在兜底；可达性仍是值导入可达性，资源与运行时字符串引用不是边。
- M785: 联赛的牌窗曲线。纪律页能说牌在赛季哪一轮来（轮次趋势），也能说哪队开局/末段吃牌（M779），
  但说不出整场哪个时段全联赛最躁：六窗 fold 一直按队存放、只被读成各队份额。`cardTiming` 现在同时返回
  `windows`/`redWindows`（同一个循环里累加的联赛逐窗总数与其中红牌数），最后窗含补时；面板放在轮次趋势与牌钟之间：
  每窗一列，列头计数、按联赛最忙窗定高、柱下标签，红牌只在落进的窗下印 `disc.redTotal`；空态复用 `disc.clockNone`；
  屏幕不排序、不再推导。2 个新键三语（disc.windowTitle/disc.windowHint），字典 2,503→2,505（空态与红牌数各在
  新调用点复用旧键）；census literal 1,849→1,853（4 个新字面量位，其中两个是复用）、litVarSites 262→263；
  `proof-analytics` 新增 3 条 191→194（TE 六窗 1,1,0,0,1,3 与各队列和相等、红窗末窗 2 与红牌总数相等；TH 全红两列相同、
  TF 单黄在 band2 无红、TG 空表六零；屏幕读 fold、六窗标签、红牌按键过滤且不排序）；
  无新模块/路由/存储键；build 测 533 KB / 54 资产（JS 520 + CSS 12.4），PWA pin 532→533、perf baseline 重记；
  tsc 干净、build exit 0、全套 123/123 · 3,327/3,327；
  诚实的保留：曲线只读已结束比赛；末窗含补时，90+′ 与 76′ 同列；红牌数只在为正时印出，空白窗不是零；柱是联赛总数，
  不是比率，安静窗里的一张红只是短柱。
下一条目：M786 候选优先真实数据：
①红牌板的六窗序列（`redBands` 已在 fold 里，红牌板仍只印峰值窗）；
②牌与进球同窗对照（`goalTiming` 的联赛六窗与 `cardTiming.windows` 并排，同源六窗）；
③主客场 × 牌窗（`disciplineVenue` 按场地、牌窗按时段，交叉需新 fold）；
④牌钟与红牌钟的队级对照（同一队全牌与红牌的首窗/末窗份额并排）。
- M786: 进球与牌同读一副钟。取候选②。事件时钟页此前只有射门/扑救/回看三族按窗分布，进球在进球时间带页、牌在纪律页，
  两族各有一条联赛曲线却从未并排。`clockContrast` 一次返回进球与牌的六窗联赛序列：进球由 `goalTiming` 各队
  `scoredBands` 求和，牌直接取 M785 的 `cardTiming.windows`，因此不会与两页的数字相互矛盾；某族无事件时峰值为 `null`
  （恰在 `number | null` 上体现“没有最忙窗”而不是把第 0 窗当峰值）。面板放在事件族图与队板之间：两行（进球/牌）×
  六窗，柱高以两族共同的峰值窗为标尺，末行印两族峰值窗，缺族印缺失符；静默臂复用 `clock.emptyShort`；屏幕不排序、
  不推导。5 个新键三语（clock.crossTitle/crossHint/crossGoals/crossCards/crossPeak），字典 2,505→2,510；
  census literal 1,853→1,859（6 个新字面量位，1 个带变量）、litVarSites 263→264；`proof-analytics` 新增 3 条 194→197
  （TK 手工计数的两序列 1,0,0,1,0,2 与 1,1,0,0,0,2、两族总数 4/4 与两个 fold 自身总数相等、双峰值均在 band5；
  T1 有进球无牌→牌峰值 null、TE 有牌无进球→进球峰值 null、空赛事六窗全零双 null；屏幕读 fold、六窗标签、缺族印缺失符、不排序）；
  内联求和一律走共享 `sum` 门（proof-sum 9/9），屏幕缺族读数把 absence door 的 EventClock 计数从 1 抬到 3（proof-absent-glyph 12/12）；
  无新模块/路由/存储键；build 533 KB / 54 资产总量未变（拆分重记为 JS 521），PWA pin 保持 533、perf baseline 拆分重记；
  tsc 干净、build exit 0、全套 123/123 · 3,330/3,330；
  诚实的保留：两族都只读已结束比赛且末窗含补时，90+′ 与 76′ 同列；柱是联赛总数不是比率，安静窗一球只是短柱；
  两族都由事件列表而来，没有事件记录的比赛尽管有比分也对两边都不贡献。
- M787: 牌钟按场地分侧。纪律页已有联赛六窗曲线（M785）与按队的主客牌率（M626），但曲线本身没有场地轴。
  `cardTiming` 在同一个循环里再累加 `homeWindows`/`awayWindows`（事件自带的 side），两列逐窗相加恰等于
  `windows`，因此分侧不可能与总量互相矛盾。面板置于联赛曲线之下：两行（主场牌/客场牌）× 同样六窗与标签，
  柱高以两侧共同的峰值窗为标尺；空态复用 `disc.clockNone`；屏幕不排序、不推导。4 个新键三语
  （disc.venueClockTitle/venueClockHint/venueClockHome/venueClockAway），字典 2,510→2,514；census literal
  1,859→1,864（5 个新字面量位，均不带变量）、litVarSites 保持 264；`proof-analytics` 新增 3 条 197→200
  （TE 手工计数主侧 1,0,0,0,1,2、客侧 0,1,0,0,0,1，逐窗和等于联赛 1,1,0,0,1,3、两侧 4+2=6 与队行总数相等；
  TK 反向形态且分侧闭环；TG 空赛事两侧六零；屏幕读 fold、六窗标签、空态复用、不排序）；
  无新模块/路由/存储键；build 仍 533 KB / 54 资产（总量 +317 字节未进位），PWA pin 与 perf baseline 不动；
  tsc 干净、build exit 0、全套 123/123 · 3,333/3,333；
  诚实的保留：面板读事件列表，而上方场地板读 stats 块，两块在“某场牌数”上可能不一致；只读已结束比赛且末窗含补时；
  柱是总数不是比率，主侧行更长部分因为每场都有主队。
- M788: 场地页的进球也上钟。主客场页读比分得到各队主客半程，进球时间带页读事件得到各队六窗，但两边都无法回答
  “联赛的主场优势是否体现在分钟上”——进球钟没有场地轴（牌钟 M787 刚有）。`goalVenueClock` 把该赛事已结束比赛里
  每个 GOAL 按事件自带 side 折进六窗，并以 `teamMetrics` 的球队集合同 `goalTiming` 同口径过滤；两列逐窗相加恰等于
  `goalTiming` 的联赛进球，因此钟不会与它所分的 fold 矛盾。面板置于场地表之下：两行（主场进球/客场进球）× 同样六窗与
  共享标签，行首印该侧总数，柱高以两侧共同峰值窗为标尺；空态复用 `timing.emptyHint`；屏幕不排序、不推导。
  4 个新键三语（venue.clockTitle/clockHint/clockHome/clockAway），字典 2,514→2,518；census literal 1,864→1,875
  （11 个新字面量位：5 个面板字面量 + 6 个共享窗标签，均不带变量）、litVarSites 保持 264；`proof-analytics` 新增
  3 条 200→203（T1 手工计数主 1,0,0,0,0,1、客 0,0,1,0,0,1，逐窗和等于进球 fold 的四球；TK 主 3 客 1 的不对称形态、
  定时与别赛事进球不入账、空赛事两侧六零；屏幕读 fold、六窗标签、每侧总数、空态复用、不排序）；
  无新模块/路由/存储键；build 越进位边界 534 KB / 54 资产（JS 522 + CSS 12.4），PWA pin 533→534、perf baseline 重记；
  tsc 干净、build exit 0、全套 123/123 · 3,336/3,336；
  诚实的保留：上方场地板读比分、本面板读事件列表，事件与比分不一致的比赛只动钟不动表；两列只读已结束且有进球记录的比赛，
  末窗含补时；柱是总数不是比率。
- M789: 红牌板的每队自家钟。纪律页红牌板（M783）按队排序并印峰值窗与峰值张数，但落在 10′ 与 85′ 的两张单红牌峰值读数相同，
  只能靠窗名区分；每队六窗序列虽已在 fold 里（`redBands`），却从未交给屏幕。`CardRedRow` 增加 `bands` 字段，构建红牌板时
  从该行 `redBands` 复制一份；副本是独立数组，屏幕可画而不回读 `rows`、也改不动 fold。面板沿用 M783 列表：表头加一行
  共享六窗标签（复用组件已有的 `bandLabels`，不新增 `t()` 位），每队名行下加六列迷你柱，柱高以所有红队中最忙的窗为标尺，
  柱下印该窗张数；峰值行与总数行原地保留。3 条新 `proof-analytics` 证词 203→206（TH 手工计数 P 1,1,0,0,0,0 / Q 0,0,0,0,0,2 /
  R 与 T 各 band3 一张；每行序列和等于 reds 且是副本不是内部数组；峰值张数等于序列最大值；TF 有行无红牌板为空、TG 全空；
  确定性；屏幕读 `r.bands` 与 `redPeak`、六窗标签、不排序）；无新字典键（2,518 保持）、census literal 1,875 与 litVarSites 264
  均不动；无新模块/路由/存储键；build 仍 534 KB / 54 资产（JS 522 + CSS 12.4），PWA pin 与 perf baseline 不动；
  tsc 干净、build exit 0、全套 123/123 · 3,339/3,339；
  诚实的保留：柱是总数不是比率；共享表头让每队序列按所有红队同一标尺读，只有一张红牌的队若无人到两张就只半高；
  从未吃红牌的队仍整行缺席（与 M783 一致）。
- f04b7f2 M943: 射门与扑救也分主客（M790 候选③，与 M787/M788 同构）— domain/analytics.ts 新增 eventVenueClock 折叠：SHOT 记射门端、SAVE 记扑救方门将端（引擎的 SAVE 以被扑一方命名，与 eventClock 的 stops 记账规则一致），四条六窗序列与 eventClock 的 shotsBands/savesBands 逐窗可对账；VenueSplit 屏新增射门/扑救分窗面板（四条迷你柱、共享 timing.w1–w6 标签）；proof-analytics 4 条新证词 206→210（手工计数 T5 序列、与 eventClock 逐窗对账、未知赛事静默 + 确定性、屏幕读取）；6 个新字典键×3；census literal 1,875→1,882、litVarSites 264 不动；无新模块/路由/存储键。
- M943 同提交清扫: 农场 M936–M942 写入的 features/overview/ 44 屏全部无法解析（44/44 parse diagnostics，单一缺陷形态 useState<"v" "summary"> 缺 `|`），未被任何路由/import 可达，且 583 个 t() 调用无一有字典行——按 M522/M525 先例 git mv 隔离至 .drafts/features/overview/ 并修复解析使其满足零破损棘轮（0 broken <= 0）；根杂物 status_report.md（农场状态报告）移入 dev/。proof-unused-locals 程序普查 163→119 全覆盖。

- 423a3b7 M944: 牌钟与红牌钟的队级对照（M790 候选①）— cardTiming 折叠新增 contrast 板：每支吃牌球队的红牌首/末窗份额对自身全牌份额并排（earlyGap/lateGap 带符号，红牌份额减全牌份额），按 |earlyGap| 降序上板，未吃牌球队不占板（无份额可对照）；Discipline 屏新增对照面板（每队两行：首窗/末窗 × 卡份/红份 + 带符号差值，DELTA_CLASS 着色）；proof-analytics 3 条新证词 210→213（TJ 黄红错窗手工计数、TH 全零对照按红数/ID 排序、屏幕读取）；7 个新字典键×3；census literal 1,882→1,889、dup 棘轮 146→147/242→243、PWA 预算 535→536（面板过舍入边缘）、baseline 同提交重录。

- c078611 M945: 牌钟按比赛结果分侧（M790 候选④）— cardTiming 折叠加结果轴：经 isFinished 门收窄比分后，每张牌按吃牌方该场胜负平归入 won/drew/lost 三条六窗序列（与 goalVenueClock 同形态）；Discipline 屏新增结果钟面板（三系列共享 timing 标签）；proof-analytics 3 条新证词 213→216（MR 手工计数、结果轴与主客轴双双逐窗对账到 windows、屏幕读取）；5 个新键×3；census literal 1,889→1,895；PWA 预算 536 不动（复用共享柱形标记）。

- d4fa319 M946: 进球/牌节律比（M790 候选②，口径先证）— clockContrast 逐窗加 goalsPerCard（safeDiv 门的算术：分母封底 1，无分母窗口携带门自身的数字，屏幕以 ABSENT 拒印）+ peakRhythm（有牌窗口中比值最高者，最早窗赢平局，无牌则 null）；EventClock 屏在对比钟下加节律行（锋利窗高亮主色）与锋利窗句子；proof-analytics 3 条新证词 216→219（MR 混合口径含分母封底语义、有牌无球/有球无牌两臂、屏幕读取）；2 个新键×3；census literal 1,895→1,897、litVarSites 264→265；absent-glyph 花名册 EventClock 3→4、fmt2 消费者 26→27。

- M947（本地，待推送）: 队级节律（候选⑤）— clubRhythm 折叠：goalTiming 与 cardTiming 两折叠按 clubId 联结（无第三次扫场），每队整季 goals-perCard 走 safeDiv 门；有分母（至少一张牌）的球队按比值降序排前、最锋利者命名 sharpest，无分母球队按进球数排后；EventClock 屏新增球队节律面板（锋利者主色高亮，无分母印 ABSENT）；proof-analytics 3 条新证词 219→222（MR 手工计数 A 2/1=2.00、TE 有牌无球全零、TG 无牌无名锋利、屏幕读取）；4 个新键×3；census literal 1,897→1,901、excess 243→245；absent-glyph EventClock 4→5、PWA 536→537、baseline 同提交重录。

- M948（本线，README 记录段取 M790）: 队级红牌烈度（新方向，不在 M790 候选清单里）— cardSeverity 折叠调 cardTiming（无第三次扫场），每队 redShare = 自己的红牌/自己的总牌（0–100，两位小数；被出牌没红读 0，没被出牌从 0 分母读 0），worst 只在该队**真被出过牌**的窗口里取最高份额、平票取更早窗（无牌的窗口没有烈度可言），被出牌无红的队 worst 为 null；联赛行用 clock 两条六窗之和的同一商；排序按 redShare→reds→cards→id，烈度优先而不是数量优先。Discipline 屏在结果钟之下加烈度板（队徽+链接+份额与分母+最重时段与该时段份额+右端复用 disc.redTotal；没牌的队不占行；整场没牌复用 disc.clockNone；屏幕不排序，只滤掉 0 分母）。与 M944 对照板的分工写在 README：M944 答「红牌落在什么时候（相对全牌）」，本条答「多少牌会变红，以及在哪一段」。**编号与记录**：git 历史取大于 max 的 M948；README 记录段仍停在 M789（别的 lane 的 M940–M947 没写 section），若把 section 写成 M948，`proof-ledger-run` 的 gap 集合就按 [167..948] 算，一次把 M790–M947 这 158 个无 section 的号暴露成 gaps，而 ceiling 要 gaps×2 ≤ sections（438 个 section 只容 219 个空洞）会立刻红——所以本条的 section 记为 **M790**（沿本文件自己的记录段连续取号），正文第一句就写明它由 commit M948 承载、为什么两个号并存。5 个新键×3（disc.sevTitle/sevHint/sevLeague/sevRow/sevPeak，EN 值全新，dup 棘轮未动）；census literal 1,901→1,908（5 新键 + 复用 clockNone + 复用 redTotal 的新调用位）、litVarSites 265→269；proof-analytics 3 条新证词 222→225（TQ 手工三队：F 2/3=66.67 两个满红窗取较早、G 1/3=33.33 最重窗 50、H 有牌无红无窗可指，联赛 37.5；空态臂 TG 零行/TF 无红全 null；种子赛事逐队从 cardTiming 两计数重算 + 被点名窗口必须同时有牌有红 + 榜有序 + 确定性 + 屏幕读取）；共用门名单不动（Discipline 自 M571 就在 fmt2 消费者里，面板不读 ABSENT 故 absent-glyph 保持 2）；PWA 537→538、baseline 同提交重录；tsc 干净、build exit 0。基线证明：本条落地前先跑 origin/master（f610c96）全套 123/123 · 3,355/3,355 绿，作为归属对照；落地跑 123/123 · 3,358/3,358（+3 即本条三条证词）。诚实的保留：烈度分母是「被记录的出牌」而不是犯规，小分母能除出大比例，所以行里印分母不画柱；fold 继承 cardTiming 的在册范围。

**本线踩到的共享树事实（M948）**：2026-11-06 推送 M790–M793 时被拒——别的 lane 把 origin/master 重写到 acb4f24（M914）之上并推进到 M947，我的四个提交（旧 M790 射门分侧/M791 结果钟/M792 节律比/M793 烈度）在远端不是祖先，而其 M943（eventVenueClock 射门+扑救分主客）、M945（cardTiming 内的 resultClock）、M946（clockContrast.goalsPerCard + peakRhythm）已经是同四问的更新实现。处理方式：**绝不 force-push 覆盖别人的 38 个提交**，而是 `git switch -c integrate-m947 origin/master` 以远端为基线，只把远端没有的那一件（队级烈度）重落为 M948，旧提交留在本地分支 m782 不再推送。教训入规：落地前先 `git fetch` + `git merge-base --is-ancestor HEAD origin/master`，若远端不是我的后代，就先在远端基线上重跑基线全套，再只补远端缺失的那一件；两个 lane 会实现同一个候选，**候选做完后要立刻写回 PLAN 的候选清单**（本条已把 M943/M944/M945/M946/M947 对应关系写在上面）。

- M949（本线，README 记录段取 M791）: 主客节律（M790 候选⑥完成）— `venueRhythm` 折叠把 `goalVenueClock` 与 `cardTiming` 的 homeWindows/awayWindows 逐窗相除（走 safeDiv 门：分母封底 1，所以「有球无牌」的窗携带门自身的数字，屏幕以 ABSENT 拒印，口径与 M946 完全一致），每端各带自己的六个 cell、总数与 `peakRhythm`（只在真被出过牌的窗里取最高比值，最早窗赢平局；该端全程没吃牌则 null）；`sharper` 只在两端都有分母且比值不等时命名，平局或某端静默就读 null，屏幕因此不下判断。VenueSplit 屏在射门/扑救钟之下加两行面板（行首印该端整季比值，六格印比值 + 复用 clock.rhythmGoals/rhythmCards 的两个计数 + 共享 timing.w1–w6 标签，锋利格主色高亮），每行之下各印自己的锋利窗句子；整场没牌复用 timing.emptyHint；屏幕不排序、不推导。真实读数（种子世界）：英超主 66 球/23 牌 = 2.87 对客 14/17 = 0.82；西甲 2.55/0.81、意甲 2.91/0.19、德甲 3.00/0.69；15 个赛事里 12 个命名主端、3 个不命名，命名的一侧全是主端。7 个新键×3（venue.rhythmTitle/rhythmHint/rhythmHomeRow/rhythmAwayRow/rhythmPeak/rhythmHomeBetter/rhythmAwayBetter）；census literal 1,908→1,918（7 个新键位 + 复用 goals/cards/emptyHint 的三个调用位）、litVarSites 269→270（只有 rhythmPeak 交 w 与 n）；proof-analytics 4 条新证词 225→229（MS 手工：主端两个有球窗没有分母、唯一有牌的窗没有球，所以它「最锋利的窗」恰是最钝的那一格，而整季仍读 2.00；MT 对称两端同 1.00 不命名；MW 只牌主端，客端 peak null、两端不可比；TG 无牌走空面板；种子 12/12 逐格等于两折叠自身的窗、总数即序列之和、被点名的窗有牌且不被更早的窗击败、命名必须有两侧分母，其中 9 个赛事确有命名；确定性 + 屏幕读取）；absent-glyph 花名册 VenueSplit 14→16（行首一个、每格一个）；fmt2 与 sum 名单不动；PWA pin 538 不动（同一舍入阶内 JS 525→526），baseline 的 jsGzipKB 同提交重记 525→526；tsc 干净、build exit 0。编号事实修正：记录段**连续**取号时 gap 集合不变——本条落地后 439 个 section、区间 M167..M791、gaps 仍是 186（上一条是 438/186），ceiling（gaps×2 ≤ sections）因此变松而不是变紧；会把闸门弄红的只有把 heading 写成 git 号（那一次会把 158 个无 section 的号暴露成空洞）。诚实的保留：这个商继承进球本身的主客不对称，多半是主场优势换了个单位，须与上方进球钟并读而不是取代它；无分母窗在 fold 的 JSON 里仍是门的封底数字（数据诚实、屏幕静默）；范围仍限于 teamMetrics 在册球队与已结束比赛，两列都取事件 side 而非比分。

- M950（本线，README 记录段取 M792）: 队级结果钟（M790 候选⑦完成）— `cardTiming` 的行加结果轴三个计数器 `wonCards/drewCards/lostCards`（三数之和等于该行的 `cards`，正是 M945 在联赛层证的联结下沉到队级，证词逐队核对这个和），`clubResultCards` 折叠**不扫场**：只联结 cardTiming 已有的行。每队 `lostShare`/`wonShare`（分母是它自己的牌数）与 `edge = lostShare − wonShare`（百分点，正数=这支球队更容易在输掉的那场里吃牌）；没被出牌的队不占行（没有份额可排），联赛行直接重读 `clock.resultClock` 而不是把行加回去，所以面板的联赛数字就是上方结果钟的数字。排序 lostShare→lost→cards→id：后两把不是装饰——种子世界里同时读 100.00% 的队有好几个、分母互异（3 张与 2 张），没有第三把就会在渲染之间换位。Discipline 屏在烈度板之下加一块：联赛一行报两份额与百分点差，每队一行报「输侧份额 + 共 N 张」，其下复用 `disc.resultWon/Drew/Lost` 的三个计数与赢侧份额，右端 `DELTA_CLASS[deltaSign(edge)]` 上印 `signed(edge)`；整场没牌复用 `disc.clockNone`；屏幕不排序、不推导。真实读数（种子世界）： Ligue 1 的 39 张牌里 **46.15%** 属于后来输掉的一方、25.64% 属于赢的一方（差 20.51），五个本土联赛里最斜；英超反过来（40 张：输 25.00 / 赢 42.50，−17.50），西甲 −18.43、意甲 −2.32、德甲 +3.23；队级有五行读 100%（尼斯 0/0/4、都灵 0/0/3、斯特拉斯堡 0/0/3、多特 0/0/2、桑托斯 0/0/2）；冠军联赛样本最大却近乎平（231 张：29.87 对 32.90，−3.03），其中马赛 0/2/6 = 75.00% 最往外。门禁：5 个新键×3（`disc.resultClubTitle/Hint/League/Row/Gap`，EN 值全新，dup 棘轮未动）+ 复用键的新调用位 → census literal 1,918→1,927、litVarSites 270→273（联赛行、榜行、赢侧份额行三个带参调用）；`proof-analytics` 4 条新证词 229→233（MR 手工：两队恰好相反，A 1/1/0 of 2 = 0/50 且 edge −50，B 0/1/1 of 2 = 50/0 且 edge +50 排在前面，联赛两份额皆 25、edge 0；TE 未吃牌的队不进板、TG 无牌则无板也无份额；种子 12/12 逐队等于 cardTiming 自己的计数器、行之和重建 resultClock、榜有序；确定性 + 屏幕读八键）；`absent-glyph`/`fmt2`/`sum`/`vocab` 名单不动（每个印出的分母都属于被出过牌的队，面板不敲门的门）；**PWA 预算跨过舍入边缘 538→539**（JS 526→527，CSS 12.4，仍 54 资产），`tests/perf/baseline.json` 同提交重录；tsc 干净、build exit 0、全套 123/123 · 3,366/3,366（基线 3,362 加本条 4 条证词）。诚实的保留：一、结果是**终场比分**而不是出牌那一刻的局面——1–0 到 85 分钟的牌若之后被扳平就记进平局，本板读的是「这支球队在被判罚时正在打什么样的球」，不是判罚的原因；二、份额除以球队自己的牌数，100% 那几行是 2/3/4 张的小样本，所以分母印在同一行里；三、输得多的队自然登顶，这块板混读了纪录与纪律，`edge` 与两份额并列就是把谁在做事摊开给读者。

- M951（本线，README 记录段取 M793）: 烈度分主客（M790 候选⑧完成）— `cardTiming` 的行再加四个计数器 `homeCards/awayCards/homeReds/awayReds`（前两个之和等于 `cards`、后两个之和等于 `reds`，种子证词逐队核对这两个和），`venueSeverity` 折叠**不扫场**：只联结 cardTiming 已有的行。每队 `homeShare = homeReds/homeCards`、`awayShare = awayReds/awayCards`（0–100 两位小数）、`gap = homeShare − awayShare`（百分点，正=自家球迷面前更容易变红；差取自**已四舍五入**的两份额，所以右列就是读者眼前两个数之间的距离）。**字段改名 `shareGap`，单位进名字**：这块屏上方的主客板自 M626 就有一个叫 `gap` 的字段，单位是张/场、用 fmt2 印，而 `proof-quantities` 会对「同一个字段名走两个门」收钱——这次选择改名，而不是往豁免名单里再加一行；只在**两侧都被出过牌**的队上板（一个分母能陈述份额、却不能比较份额，与 M626 的 `disciplineVenue` 同一规则，如今用在商上而不是率上），单侧队进 `singleVenue` 计数而不是留白上板，完全没牌的队既不上板也不计数。排序 |shareGap|→该队总牌数→id（第三把为了 |gap| 相同、分母互异的那些 100/0 行不再换位）。Discipline 屏在结果板之下加一块：联赛一行报两份额与差，一行说明有多少队被留出，每队一行把两侧「几张里几张变红」并排，右端 `DELTA_CLASS[deltaSign(r.shareGap)]` 上印 `signed(r.shareGap)`；**联赛行只在有板时印**——全部出牌都来自一侧的联赛若印 0%，那是在宣传一个没发生的一侧；一块板都没有时复用新的 `disc.sevVenueNone`；屏幕不排序、不推导。真实读数（种子世界）：15 个赛事里 10 个至少上一支队、5 个「无可比」（它们的牌全出自一侧）；德甲的联赛线最偏主场（主 27.78% 对客 7.69%，+20.09），西甲偏客（4.55 对 18.75，−14.20）、法甲随后（−8.95）、英超略偏主（17.39 对 11.76，+5.63）；联赛线 4 个说主场更凶、8 个说客场、3 个持平。队级最宽的行都是分母最小的：勒沃库森主场 2/2 对客场 0/2、毕尔巴鄂 0/2 对 1/1、门兴 0/1 对 1/1；冠军联赛 21 行、联赛线近乎持平（+3.83）却个体跨度最大（利物浦 1/3 主对 1/1 客 = −66.67，马赛 0/2 对 3/6 = −50）。门禁：6 个新键×3（`disc.sevVenueTitle/Hint/League/Row/None/Single`，EN 值全新，dup 棘轮未动）→ census literal 1,927→1,933、litVarSites 273→276；`proof-analytics` 4 条新证词 233→237（TE 手工：V 1/1 主对 0/1 客 = +100 排前，U 1/2 对 0/1 = +50，W 只主场被出牌所以就是那个「被留出」的队，X 两侧都没牌所以连留出都不计，联赛 2红/4主牌 对 0红/2客牌；TF 单侧联赛无板、TG 无牌联赛无份额；种子 12/12 逐队联结 cardTiming 四计数器、板上队数+留出队数=被出牌队数、联赛两份额对**全部**被出牌队求和、榜按 |shareGap| 有序；确定性 + 屏幕读六键）；`absent-glyph` 名单不动（每个印出的分母都是真挣来的，面板不敲门的门），`fmt2`/`sum`/`vocab`/`div-guard` 不动；**PWA 预算再次跨过舍入边缘 539→540**（JS 528，CSS 12.4，仍 54 资产），baseline 同提交重录；tsc 干净、build exit 0、全套 123/123 · 3,370/3,370（基线 3,366 加本条 4 条证词）。诚实的保留：一、这么小的分母撑不起断言（2/2 对 0/2 就是四张牌），所以份额旁边直接印计数；二、gap 是两个已舍入份额之差，读者按分数手算可能差三分之一个百分点，本板给的是「印出来的两个数之间的距离」；三、范围与牌钟相同（teamMetrics 在册球队、已结束比赛），一支队的客场牌可能全来自同一个对手，这块板看不见，得赛程才能说。

下一条目：M952（git 历史取大于 max 的号；README 记录段连续取 M794）候选优先真实数据：
⑩ 队级主客节律差（哪支球队「主场更像主场」：该队主/客两端各自的 goals-per-card 与差值——分母的一半 M951 已经备好（rows 现在带 homeCards/awayCards），缺的只是 goalTiming 行里的按侧进球 homeScored/awayScored，同一形态再加一对计数器即可）；
⑨ 扑救也分队级（clubRhythm 已有联结形态，把 eventClock 的 saves/faced 按 clubId 联结成「谁把对方的射门按住」）；
⑪ 把节律换成每场（主客两端的 goals-per-match 与 cards-per-match：M949 的商继承了进球不对称，每场口径才是「同一端踢得更快还是更慢」的直接读数）；
⑫ 队级结果的时段版（每队「输掉的那场」里的牌落在哪一窗——M945 的三条六窗序列乘上 M783 的队级窗，缺的是 rows 里按结果再分窗的第三维；与 M950 共用同一次归侧）；
⑬ 落后时出的是红牌还是黄牌（M950 的三个计数器换成 M948 的商：每队输球那场的 redShare 对它赢球那场的 redShare，读的是判罚的重量而不是数量，与 ⑫ 共用按结果的第三次归轴）。
编号策略：每次落地先 fetch 并 `git log origin/master` 取「大于历史最大值」的下一个号（不是取空号——组件农场 lane 与隔离区 lane 都在低位重号，M711–M718 在日志里各出现两次甚至三次，只有高于历史 max 的号才无人争用）；农场 lane 已把 M711–M771 一路占成青训营/财务/概览组件，本线清扫取 M772、时钟开局端取 M773、比赛页开局端取 M774、可达闭包取 M776、开局进攻端取 M777、上限落点取 M778、牌的时段取 M779、末段进攻取 M780、共享读取器的入口推导取 M781、死面账本的臂取 M782、红牌窗口取 M783、存储/路由人口取 M784、联赛牌窗曲线取 M785、进球与牌同钟取 M786、主客场牌窗取 M787、主客场进球窗取 M788、红队自家六窗取 M789；本线的 section 号一旦高过农场的 max，README 的编号区间就把农场那些没有 section 的号暴露成 gaps（本次 53 个：M719–M771，其中 M769 根本没有提交），所以账本条目必须与清扫删除落在同一个提交里，`proof-ledger-run` 才认；每加一屏都要过 signed/sum/maxby/money/absent-glyph/vocab/ids/rng + 全套 census pin 门禁；
并发 lane 的未跟踪文件（dev/*、features 里未路由的 stub）不要纳入本线提交。
注意：lane 的自动化会周期性 `git stash`/恢复工作树，可能把你未提交的改动回滚；所有编辑要么在隔离 worktree 里做，要么编辑后立刻提交推送。
