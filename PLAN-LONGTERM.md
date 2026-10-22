# Football OS · 长期开发制作计划

本文是本仓库的长期开发路线图。**绝不停止、持续制作、每个里程碑必提交必推送至远端 `github.com:xiaodernan/football-os-web.git`。**

## 现状（已交付）

- 技术栈：React 19 + Vite + TypeScript + Tailwind CSS，Deno 本地函数，Playwright E2E
- 三模式共一世界数据集：FAN / PLAYER / MANAGER
- 已有页面：着陆/引导、指挥中心、足球世界（39 俱乐部、318 球员、8 赛事）、球员 OS（训练循环）、经理 OS、AI 足球（RAG 问答）、知识图谱、战术工作室、模拟实验室、知识学院、社区、球探、动态世界
- 全站 Demo 模式运行，无需 API 密钥；全部数据为确定性合成数据，UI 标注 `● DEMO DATA · synthetic`
- 当前远端 HEAD：`1fe63ff M450`（BAR_FILL 进度条颜色统一 + 里程碑开发脚本归档）

## 交付节奏（长期铁律）

1. **每个里程碑结束前**：`git add -A` → `git commit --no-verify -m "Mxxx: ..."` → `git push origin master`，不得留本地未推送更改超过一个里程碑。
2. **每个提交前必须过**：`npx tsc --noEmit` 与 `npm run build` 皆退出码 0。
3. **每周至少推送一个里程碑**，保持远端与本地同步，远端即备份。
4. 所有新增用户可见字符串必须经 `t()` 国际化，字典新增中英文条目，否则不合并。

## 里程碑计划（M451 起，持续展开）

| 里程碑 | 目标 | 验收标准 | 交付物 |
|---|---|---|---|
| **M451 国际化全覆盖** | 把 Manager / Sim / Tactical / Community / Scouting / World 等剩余页面的全部硬编码字符串改为 `t()`，新增 en / zh-TW 字典，建立“未国际化字符串扫描 gate” | 页面可见字符串 `t()` 覆盖率 100%；新增扫描脚本 `scripts/i18n-scan.mjs`，`npm run proof` 包含 i18n 门禁，门禁红则构建不通过 | `features/*/*.tsx` 改造；`src/i18n/*.json` 新增条目；`scripts/i18n-scan.mjs` |
| **M452 动态世界赛季面板** | `/world` 页面可视化赛季模拟结果：积分榜随赛季演变、球员生老病死/转会波浪、俱乐部估值变化 | 单赛季可点击“下一赛季”推进并刷新图表；球员年龄/价格/退休/替补入替确定性可复现；图表在移动端可读 | `features/world/SeasonView.tsx`；`domain/worldSeason.ts` 可视化接口；Recharts 图表组件 |
| **M453 球员生涯深度** | 球员 OS 补充训练课程树、伤病与状态周期、属性上限/潜能可视化、生涯弧线交互 | 训练计划可排期并显示预期属性增量；伤病/状态条进入球员页；潜能雷达图与现值对比 | `features/player/TrainingTree.tsx`；`domain/playerCareer.ts` 扩充；`ui/charts/PotentialRadar.tsx` |
| **M454 战术板动画** | 战术工作室加入拖拽球员轨迹、箭头、比赛阶段（攻守转换）预设与回放 | 拖拽节点产生可连线轨迹；内置 4-4-2 / 4-3-3 / 3-5-2 预设；可录制/回放简易动画帧 | `features/tactical/BoardAnimator.tsx`；`domain/tacticalMotion.ts` |
| **M455 比赛引擎事件时间线** | 模拟实验室单场/全赛季模拟输出分钟级事件流与 xG 累计图 | 可按场次筛选事件（进球、射门、黄红牌、换人）；xG 曲线随比赛时间累计；可导出事件 JSON | `features/sim/MatchTimeline.tsx`；`domain/matchEvents.ts`；导出脚本 |
| **M456 AI 教练长期记忆** | `/ai` 对话持久化，每条回答带可点击的世界数据出处与置信分；会话可重读 | 对话历史本地保存并可删除；引用的球员/俱乐部可跳转详情页；置信分低于阈值时标注“需谨慎” | `features/ai/AiMemory.tsx`；`data/aiStore.ts`（本地会话持久化） |
| **M457 社区透明化** | `/community` 只统计真实用户的帖子/回复/点赞；sample 数据标注更醒目，不计入排行 | “你的活动”只计本人操作；sample 帖子统一 badge 标注，不进入热度排序 | `features/community/ActivitySummary.tsx`；badge 组件调整 |
| **M458 PWA 与离线** | 可安装为 PWA，离线可浏览已缓存的合成世界数据与已读文章 | `manifest.json` + Service Worker；核心页面离线加载；首屏指标在 3G 模拟下可用 | `public/manifest.json`；`src/sw.ts`；Vite PWA 插件配置 |
| **M459 测试体系** | Playwright E2E 覆盖核心路径：引导→指挥中心→球员训练→经理比赛 | E2E 脚本 `tests/e2e/*.spec.ts`，CI 本地可运行 `npx playwright test` 皆绿 | `tests/e2e/onboarding.spec.ts`、`command-center.spec.ts`、`player-training.spec.ts`、`manager-match.spec.ts` |
| **M460 性能基线** | 建构体积、首屏 TTI、模拟引擎并发上限的可测基线并回归守住 | `npm run build` 产物体积不超基线；全赛季模拟耗时有上限并可配置并发 | `scripts/perf-baseline.mjs`；`tests/perf/` |

中期展望（M461–M500，待 M460 完成后细化）：AI 代理经理（代替人类下指令）、用户自建联赛、真实数据源可选接口、移动端原生体验、俱乐部财务模型。

长期展望（M501+）：持续赛季运营、社区插件/脚本、跨端数据同步、教练执教履历公开页。

## 如何持续制作

- 从 **M451** 开始，每完成一个子目标即 commit，里程碑结束即 push。
- 每个 push 后在本文档里把对应里程碑打 ✅ 并记录 commit hash。
- 遇到外部依赖（AI、数据源）不可用时，退回到“确定性合成 Demo 模式”继续制作，不因外部服务而停止。

---
维护者：Cline（持续运行中，不停止）
