# Skills 速查表

> 整理时间：2026-08-04。当前 `/` 列表有 **130+ 项**，主要来自 4 个来源，所以显得乱。这份表按"来源 + 用途"分组，方便对号入座。

## 先看懂"乱"在哪

- **本地安装的 skill**：菜单里直接显示名字，如 `user-stories`、`diagnose`。
- **插件里的 skill**：显示成 `插件名:技能名`，如 `agent-skills:code-review-and-quality`、`pua:pua`。
- **同一套东西有重复副本**：OpenSpec 流程有 `openspec-*` 和 `source-command-opsx-*` 两套；PUA 插件里 `pua:mama` 和 `pua:source-command-mama` 是同一功能的两个版本。
- **三个"大块头"**：产品/战略工具包（68 个，3 月 15 日一次性安装）、PUA 插件（约 32 项）、agent-skills 插件（24 个）。

---

## A. 系统自带（建议保留，不用管）

| 菜单名称 | 用途 |
|---|---|
| `imagegen` | 生成 / 编辑图片 |
| `openai-docs` | 查 OpenAI 官方文档 |
| `plugin-creator` | 创建插件骨架 |
| `skill-creator` | 创建规范化的 skill |
| `skill-installer` | 从官方列表 / GitHub 安装 skill |
| `review-agent` | 只读代码审查（内部工具） |

## B. 文档办公（建议保留）

来自 `openai-primary-runtime` 插件：

| 菜单名称 | 用途 |
|---|---|
| `documents` | Word 类文档：创建、编辑、批注 |
| `pdf` | PDF 读取、创建、渲染 |
| `presentations` | PPT 创建、编辑 |
| `spreadsheets` | 表格创建、编辑、分析 |
| `excel-live-control` | 直接控制已打开的 Excel |
| `template-creator` | 制作可复用模板 |

## C. 编码 / 工作流（本地安装，建议按需保留）

| 菜单名称 | 用途 |
|---|---|
| `diagnose` | 系统化排查问题（根因分析循环） |
| `tdd` | 测试驱动开发（红-绿-重构） |
| `prototype` | 快速搭一次性原型验证想法 |
| `triage` | 用状态机梳理 issue 分诊 |
| `handoff` | 压缩上下文、交接给下一位 |
| `impeccable` | 以"想要的结果"反推设计 |
| `improve-codebase-architecture` | 找架构改进点 |
| `to-issues` | 把计划 / 规格拆成 issue |
| `caveman` | 超简洁沟通模式 |
| `grill-me` / `grill-with-docs` | 连环追问式需求澄清 |
| `find-skills` | 找 / 装新 skill |
| `setup-matt-pocock-skills` | 安装另一套技能包 |

OpenSpec 流程（**两套是同一个功能，留一套即可**）：

| 菜单名称 | 用途 |
|---|---|
| `openspec-explore` / `source-command-opsx-explore` | 探索模式：先想清楚再动手 |
| `openspec-propose` / `source-command-opsx-propose` | 提变更提案 |
| `openspec-apply-change` / `source-command-opsx-apply` | 执行提案 |
| `openspec-archive-change` / `source-command-opsx-archive` | 归档已完成变更 |

## D. 编码方法论插件（agent-skills，24 个）

需要时按名字触发即可。分类速记：

| 类别 | 技能 |
|---|---|
| 开发流程 | `test-driven-development`、`spec-driven-development`、`source-driven-development`、`incremental-implementation`、`planning-and-task-breakdown`、`doubt-driven-development`、`idea-refine` |
| 质量 | `code-review-and-quality`、`debugging-and-error-recovery`、`code-simplification`、`security-and-hardening`、`performance-optimization`、`observability-and-instrumentation` |
| 工程实践 | `api-and-interface-design`、`frontend-ui-engineering`、`browser-testing-with-devtools`、`git-workflow-and-versioning`、`ci-cd-and-automation`、`deprecation-and-migration`、`documentation-and-adrs` |
| 其他 | `context-engineering`、`interview-me`、`shipping-and-launch`、`using-agent-skills` |

## E. 产品 / 战略 / 市场大礼包（本地安装，68 个）

2026-03-15 一次性安装的"PM 工具箱"，按用途再分小类：

### E1. 战略与商业模式
| 菜单名称 | 用途 |
|---|---|
| `swot-analysis` | SWOT 优劣势分析 |
| `pestle-analysis` | 宏观环境分析 |
| `porters-five-forces` | 波特五力 |
| `ansoff-matrix` | 安索夫增长矩阵 |
| `business-model` | 商业模式画布 |
| `lean-canvas` | 精益画布 |
| `startup-canvas` | 创业画布（综合版） |
| `stakeholder-map` | 干系人地图 |
| `opportunity-solution-tree` | 机会-解决树 |
| `outcome-roadmap` | 成果导向路线图 |
| `pre-mortem` | 事前失败推演 |

### E2. 市场、竞品与用户
| 菜单名称 | 用途 |
|---|---|
| `market-sizing` | TAM / SAM / SOM 市场规模估算 |
| `market-segments` | 潜在市场细分 |
| `beachhead-segment` | 选择滩头阵地市场 |
| `ideal-customer-profile` | 理想客户画像 ICP |
| `user-personas` | 用户画像 |
| `user-segmentation` | 从反馈数据做用户细分 |
| `competitor-analysis` | 竞品分析 |
| `competitive-battlecard` | 销售用竞品对比卡 |

### E3. 产品定义与规划
| 菜单名称 | 用途 |
|---|---|
| `product-vision` | 产品愿景 |
| `product-strategy` | 产品战略 |
| `product-name` | 产品命名头脑风暴 |
| `create-prd` | 产品需求文档 PRD |
| `user-stories` | 用户故事 |
| `job-stories` | Job Story |
| `wwas` | Backlog 条目（谁-要什么-为什么） |
| `customer-journey-map` | 端到端客户旅程图 |
| `north-star-metric` | 北极星指标 |
| `metrics-dashboard` | 产品指标看板设计 |

### E4. 价值、定位与定价
| 菜单名称 | 用途 |
|---|---|
| `value-proposition` | 价值主张设计 |
| `value-prop-statements` | 价值主张陈述句 |
| `positioning-ideas` | 定位创意 |
| `pricing-strategy` | 定价策略 |
| `monetization-strategy` | 变现策略 |

### E5. 增长、营销与上市
| 菜单名称 | 用途 |
|---|---|
| `growth-loops` | 增长飞轮 / 循环 |
| `marketing-ideas` | 低成本营销点子 |
| `gtm-motions` | 上市动作识别 |
| `gtm-strategy` | 上市策略 |

### E6. 用户研究与数据分析
| 菜单名称 | 用途 |
|---|---|
| `interview-script` | 客户访谈提纲 |
| `summarize-interview` | 访谈内容总结 |
| `summarize-meeting` | 会议纪要 |
| `sentiment-analysis` | 用户反馈情绪分析 |
| `cohort-analysis` | 用户群组分析 |
| `ab-test-analysis` | A/B 实验结果分析 |
| `sql-queries` | 自然语言转 SQL |
| `dummy-dataset` | 生成逼真模拟数据 |

### E7. 优先级、点子与迭代
| 菜单名称 | 用途 |
|---|---|
| `analyze-feature-requests` | 需求清单分析与排序 |
| `prioritize-features` | 功能优先级 |
| `prioritize-assumptions` | 假设优先级 |
| `prioritization-frameworks` | 9 种优先级框架参考 |
| `identify-assumptions-existing` | 现有产品的风险假设 |
| `identify-assumptions-new` | 新产品的风险假设 |
| `brainstorm-ideas-existing` | 现有产品功能点子 |
| `brainstorm-ideas-new` | 新产品点子 |
| `brainstorm-experiments-existing` | 现有产品实验设计 |
| `brainstorm-experiments-new` | 新产品实验设计 |
| `brainstorm-okrs` | 团队 OKR 头脑风暴 |
| `sprint-plan` | 冲刺规划 |
| `retro` | 冲刺回顾 |
| `release-notes` | 面向用户的发布说明 |

### E8. 杂项
| 菜单名称 | 用途 |
|---|---|
| `draft-nda` | NDA 保密协议草稿 |
| `privacy-policy` | 隐私政策草稿 |
| `grammar-check` | 语法 / 逻辑 / 事实校对 |
| `review-resume` | 简历审阅 |
| `test-scenarios` | 测试场景设计 |

## F. PUA 效率教练插件（pua-skills，约 32 项，一半是重复副本）

| 菜单名称 | 用途 |
|---|---|
| `pua:pua` / `pua-en` / `pua-ja` | 生产力教练模式（中 / 英 / 日） |
| `pua:pua-loop` / `pua:shot` | 迭代辅助循环 / 精简版 |
| `pua:mama` | 妈妈唠叨式提醒 |
| `pua:yes` | 夸夸鼓励模式 |
| `pua:ding` | 钉味（内味）模式 |
| `pua:p10` / `pua:p9` / `pua:p7` | CTO / 技术负责人 / 骨干模式 |
| `pua:pro` | 自进化扩展 |
| `pua:source-command-*` | 上述功能的旧命令副本（可忽略） |
| `pua:source-command-kpi` 等 | 段位报告、证据检查、口味切换、开关、状态等小工具 |

## G. 其他插件

| 菜单名称 | 用途 |
|---|---|
| `frontend-design` | 前端设计规范（来自 claude-plugins-official） |
| `karpathy-guidelines` | Karpathy 行为准则 |

---

## 让 `/` 列表变清爽：建议方案

乱的三巨头：**产品大礼包（68）+ PUA（约 32）+ agent-skills（24）**。建议：

1. **隐藏产品大礼包**：在 `~/.codex/config.toml` 里为每个 skill 加一行"禁用"，文件不删除、随时可开回（也可以直接把整个包移到一个备份文件夹，效果相同且更彻底）。
2. **停用 PUA 插件**：把配置里 `[plugins."pua@pua-skills"]` 的 `enabled` 改成 `false`，一行解决约 32 项。
3. **视情况停用 agent-skills / karpathy / frontend-design 插件**（若基本用不到编码方法论）。
4. **保留**：系统自带、文档办公、编码工作流；OpenSpec 两套命令留一套即可。

改完配置后需要**新开一个线程**（或重启 Codex）才会在 `/` 列表里生效。

### 配置示例（贴到 `~/.codex/config.toml`）

隐藏单个本地 skill（不删除文件）：

```toml
[[skills.config]]
path = "C:\\Users\\yixin\\.codex\\skills\\user-stories\\SKILL.md"
enabled = false
```

停用整个插件：

```toml
[plugins."pua@pua-skills"]
enabled = false
```

想恢复时，把对应 `enabled` 改回 `true`（或删掉这几行）即可。
