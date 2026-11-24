# MASTER DIRECTIVE · 项目长期开发总纲（2026-11-22 立）

> 本文件是用户 2026-11-22 下达的《项目长期持续开发总指令》的固化计划。
> 它是本项目当前阶段的最高计划：任何里程碑的选题，优先从下面「执行队列」取；
> 已完成项保留证据，不删除——计划的价值一半在「还剩什么」。

## 〇、大模型 API（真实可用，必须实测跑通）

- Key `sk-BDRT…`（仅服务端 `.env`，永不进浏览器包）；Base `https://api.aizzz.xyz/v1`；模型 `gpt-6.2-sol`。
- 出口默认走正常网络（直连）；`LLM_UPSTREAM_PROXY` 留空。仅在用户明确需要时才填本地 CONNECT 代理，任何环境都不得强制绑定 Clash Verge，否则不开代理会出现 ECONNREFUSED。
- **2026-11-22 实测**：`node scripts/verify-llm-live.mjs --clean` **19/19**——真实作答 200/8530ms、
  grounded（Manchester City / Real Madrid / Inter / 89）、越界问题 GUARDED、缓存二次命中 6ms
  （0 新 token）、4 并发相同请求合并为 1 次真实调用、usage 诚实回显
  prompt_tokens=70067 / cached_tokens=63027（≈90% 命中、7 万 token 上下文）、114 个 JS 资产零 `sk-`。

## 一、总纲与工作模式

- 最终目标：极其庞大的世界——宏观史诗叙事，细节包罗万象。持续演进、不停止。
- 节奏：检查现状 → 列计划 → 逐项执行；有阻塞绕过去、自己拍板、不问用户。
- CI/CD：self-hosted runner 全部允许，可本机 CI。

## 二、分支与代码整合 ✅（2026-11-22 完成）

- 六个分支（fos-m1224-chronicler / fos-m1225-prescription / fos-m1226-ombudsman /
  fos-m1227-scroll / fos-m1228-storm / m1221-cross-exam）经 `git log master..<branch>` 核验
  **独有提交均为 0**，内容已全部并轨 master。
- `fos-m1228-storm` worktree 的未提交成果（proof-storm 13/13 + 证据文档）已接手落地为
  **M1228**（`3d8af05`，已推送）。分支收拢完毕，后续统一在 master 单干。

## 三、后端与架构升级（持续深化）

- 已交付：`services/` Spring Cloud 反应堆（eureka / gateway / config-server / cache /
  discipline / league / messaging 七服务 + docker-compose）、Redis 缓存服务活线、
  AMQP 消息管线（8 分片 + DLQ）、`scripts/llm-proxy.mjs` 同源代理（single-flight + 24h 温道）。
- 已交付：StateGraph 式状态流转——`domain/tracedFsm.ts` 单一 FSM 躯体 + 各「禁闭门」引擎
  （preflight→build→model→precommit→commit + refusal lane），共 15 道门。
- 已交付：RAG 式长上下文——`data/deepDigest.ts` 世界书（235,772 字符，15 联赛全表 +
  73 俱乐部 + 60 强球员属性向量 + 完整赛报带），24h 缓存道稳定命中 ≈90%。
- 后续深化队列：算法/数据结构层面继续优化热点折叠（以 `scripts/perf-baseline.mjs` 守线）；
  数据库性能与缓存分层在 Spring 侧继续（cache-service 命中率观测面板已有）。

## 四、大模型 API 接入与深度运用（重点，持续）

- 已交付：15 道「禁闭门」（chronicler / cartographer / tutor / ombudsman / prescription /
  librarian / ask-desk×4 / scout studio / ops consultation…），每道门：模型只许引用世界书内事实，
  数字过共享校验器，拒绝走诚实折叠臂；全部 `proof-*` 门禁 + 受控活体见证。
- 缓存：M1096 修好调用形状（stream + prompt_cache_key 单温道、无 include_usage）；
  M1189 修并行会话（single-flight 合并）；M1200 24h 温道；实测 ≈90% 命中、7 万上下文。
- 后续深化队列：新门继续从「世界还有哪些问题只能问模型」里找（赛季叙事、训练建议、
  球迷问答升级、管理员趋势解读……）；上下文只增共享前缀、不动动态后缀（温道稳定优先）。

## 五、前端体验与视觉

- 已修复：头像 508×586 边到边不裁边（io 页 + 应用内）；Most Used Languages NaN=0
  （identity-guard 全绿）；原生滚动方向门（M1227 E2E）。
- **缺口①（M1229 队列）**：主界面按键/操作的教学说明——`TeachHint` 组件 + 主界面关键按键
  全覆盖 + 三语 + 「已读」本地记忆 + E2E 走读。
- **缺口②（M1230 队列）**：新用户快速上手演示——首次进入主界面的分步引导（高亮 + 一句话
  教学 + 可跳过），与 /onboarding、/manual、/grand-tour 串成一条新手路径。
- 持续项：字体变形/重叠/错别字「有则改之」——每次 E2E 走读屏截图人工核查。

## 六、玩法与内容扩展（永不停止）

- 已交付：86+ 屏幕的足球 OS 世界（三模式共一数据集：FAN / PLAYER / MANAGER）。
- 后续队列：新折叠→新面板→新屏幕的流水线（照 `domain/` 纯折叠 + `proof-*` 证词 + 三语 +
  E2E 走读的项目铁律）；开放世界感靠「可探索细节密度」堆，不靠空地标。

## 七、新手教程与说明书（嵌入项目内）

- 已交付：`/manual` 简明说明书（M1130，覆盖每个真实界面，含打印样式，可出书）；
  `/onboarding` 建档引导；`/grand-tour` 世界巡礼。
- 缺口：见第五条缺口②（快速上手演示）。说明书后续随新屏幕同步增补（铁律：新屏幕上手册）。

## 八、中英文全量国际化

- 已交付：en / zh-CN / zh-TW 三语字典（4,481 keys），proof-i18n 453/453 门禁，
  未国际化字符串扫描门（proof-i18n-scan）。新增任何用户可见字符串必须过 `t()` 三语，
  否则不合并。

## 九、真实数据与用户行为分析

- 已交付：`/ops` 管理员页（密码 **123**，所有人可进）——设备回放、脉冲环、行为折叠
  （impatient / lost / faithful 三类队列）、缓存观测、Spring 活线、处方委员会（模型提优化建议）。
- 已交付：`domain/analytics.ts` + `domain/replay.ts` + `domain/pulse.ts` 纯行为折叠；
  `proof-bounceback`（没耐心就关掉）、M1228 512 队列压力折叠。
- 说明：足球世界数据为确定性合成数据（UI 全程 `● DEMO DATA` 标注，诚实不假装真实）；
  「真实数据」诉求落在 io 个人页与活线见证上（语言字节数、资产数、真实 API 用量均为实测）。
- 后续队列：/ops 趋势预测面板继续加深（M1225 处方委员会已开先河）。

## 十、部署、自动同步与个人主页

- 已交付：`.github/workflows/football-os-latest.yml` 每周日 UTC 04:00 重生 `docs/latest.json`，
  个人页 `xiaodernan.github.io`  raw 拉取 + 静态回退——「大提升才动」的低频自动同步已成立。
- 已交付：个人身份信息全部正确并有 `identity-guard.mjs` 门禁把守：
  赵欣曈 / 南方科技大学本科 + 香港中文大学硕士（均为计算机科学与技术）/
  全国中学生物理竞赛铜牌 + 江西省一等奖、二等奖 / 法狗狗实习 / IELTS 6.5 / CET-6 546 /
  项目名「隐盾」（非「隐图」）。
- 后续队列：每次「大提升」（新门、新世界级屏幕）后按惯例同步 io 瓦片与 Profile README。

## 十一、压力测试（持续）

- 已交付：`scripts/load-test.mjs` 四阶段（缓存探针 / LLM 代理 / Spring 探针 / 撞库恶意载荷），
  每阶段 200 并发；M1228 proof-storm 512 队列并发折叠隔离证明。
- 后续队列：每次新增有状态面（新存储键、新缓存道）都补一轮对应压力证明。

## 执行队列（下一批，按序取）

| # | 里程碑 | 内容 | 验收 |
|---|---|---|---|
| 1 | M1229 TeachHint | 主界面按键教学说明系统：`ui` 组件 + 关键按键全覆盖 + 三语 + 已读记忆 + E2E | proof-teachhint 全绿、i18n pin 付清、E2E 走查教学气泡 |
| 2 | M1230 First-Run Guide | 新用户快速上手分步引导，与 onboarding/manual/grand-tour 串联 | 首次进入自动触发、可跳过、可重放；E2E |
| 3 | M1231+ 内容流水线 | 新折叠→新面板→新屏幕（世界细节密度持续+1） | 每轮：纯域 + 证词 + 三语 + E2E |
| 4 | 持续 | LLM 新门、/ops 趋势深化、Spring 侧性能、字体/重叠/错别字巡查 | 各按项目铁律 |

---
维护者：Cline（持续运行中，不停止）
