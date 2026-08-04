## 1. 逻辑层：心情软优先纯函数（D3/D4/D5）

- [x] 1.1 momentInference.js：新增就地/出门场景派生表（就地 `home/workspace/classroom/transit/driving`，出门 `walking/market/convenience-store/gym/canteen`，覆盖全部非 general 场景枚举；general 条目在派生上视为就地可做）
- [x] 1.2 momentInference.js：新增 `preferMoodCandidates(candidates, mood)` 稳定分层纯函数——mood 取值 `down/restless/bored/energetic`；沮丧/烦躁→`gate0==="A"`且全就地场景；无聊→`gate0==="B"`；活力→~~含出门场景~~ 含出门场景**且无就地锚点**（2026-07-17 真机 3.11 修订：沾边判定让就地感知条目占满活力层，活力层 40→26 条）；无 mood 或无相容条目时原样返回
- [x] 1.4 （2026-07-17 真机 3.11 修订）InstantFlow.pickTask：选「活力」时跳过时刻推断收窄、直接按档案 scene_tags 抽候选——推断偏就地会在获取层挡掉真出门条目，排序层软优先压不过；verify-momentInference 断言组同步（m2 混合打标不再活力相容 + m8 general 非锚点用例）
- [x] 1.3 scripts/verify-momentInference.mjs：补心情断言组（四心情映射、无 mood 原样返回、无相容原样返回、gate0 缺省中性、派生表覆盖全场景枚举防漏归类、与时刻软优先叠加层序）——全部通过

## 2. 内容层：gate0 打标（specs/daily-task-content）

- [x] 2.1 daily_tasks.json：全池 69 条按客观动词法誊写 `gate0`（A 45 / B 20 / 无标 4：dt-013、dt-018、dt-049、push_014 混合不强判）；明细见变更目录 gate0打标明细表.md，**用户复核如有调整在 4.3 验收时改**
- [x] 2.2 content_principles.md §五字段表补 `gate0` 可选字段说明与 gate0 打标准则（客观誊写、动词判据、含糊不判、禁以心情词为依据）+ 变更记录
- [x] 2.3 scripts/verify-library.mjs：补 gate0 取值合法性断言 + 无标集合恰为 4 条的定稿断言——全部通过

## 3. 交互层：心情小窗（D1/D2/D6，specs/instant-task）

- [x] 3.1 InstantFlow.vue：状态机前置 `mood` 步——四 chip 用原词「沮丧/烦躁/无聊/活力」（2026-07-16 用户拍板）+ 同款式同权重跳过项「都不是，随便来一件」；样式 margin 布局不用 flex gap（华为兼容教训）
- [x] 3.2 InstantFlow.vue：pickTask 接入 `preferMoodCandidates`（叠加在 preferMomentCandidates 之外层）；「换一个」经同一 pickTask 沿用本次已选心情
- [x] 3.3 InstantFlow.vue：沮丧/烦躁的呼吸去向——~~二段式小窗过渡~~ **2026-07-17 真机验收反馈"有打断感"，执行 D6 预留降级**：四心情均直抽任务卡，沮丧/烦躁时"做完啦"下方出「或者，先静一下」链接（复用 back-link 样式），点击 emit `breathe`；同次流程内 shownIds 记录已展示条目，「换一个」不回头
- [x] 3.4 index.vue：`onInstantBreathe` 关闭即时流程并打开 `showBreathingOverlay`（"静一下"同一零记录通道）；mood 步「← 返回」走 close 空载荷路径（archiveChatOnExit 对 null 直接 return，安全）
- [x] 3.5 已核查：mood 只存组件 data（v-if 卸载即弃、重进无预选），新增代码路径无任何 storage/analytics 调用，card 步无心情回显

- [x] 3.6 （2026-07-17 验收讨论落定）BasicInfoSettings.vue：三组场景维度前加目的说明小字「小事会照着这些地方来找你——按真实生活勾就好。不选也能用，但是可能会对"来件小事"有点小影响~」（用户两轮定稿：目的式开头+轻巧提及小影响；机制词不进 UI 文案；新增 basic-info-settings delta）

## 4. 验收

- [x] 4.1 manual_acceptance_checklist_v2.md 补心情适配验收节（3.10 小窗形态与跳过等同现状 / 3.11 四心情软优先 / 3.12 呼吸直通不留痕 / 3.13 心情不留痕无预选）
- [x] 4.2 模拟器回归（miniprogram-automator，2026-07-17 全过）：A 小窗形态+跳过等同现状（storage 前后一致）；B/C/D 三心情各 8 轮首抽软优先全命中（8/8；判据 8 轮 ≥6——软优先在 12 条随机候选窗口内生效，窗口恰无相容条目时按设计透传，属统计容差不是缺陷）；E 烦躁→先静一下→呼吸覆盖层打开且 storage 无新增；F 重进无预选、storage 键无 mood 痕迹
- [x] 4.3 真机验收（用户）：小窗手感、chip 文案定稿、~~二段式是否打断感~~ 二段式已反馈"有打断感"并降级为卡内链接（2026-07-17）——3.10/3.12/3.13 真机通过；3.11 活力失灵经两处修复（判定收紧+跳过时刻收窄）后用户拍板归档；gate0 明细表随归档定稿（A45/B20/无标4）
