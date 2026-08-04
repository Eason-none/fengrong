# daily-task-content Specification

## Purpose
TBD - created by archiving change daily-task-system. Update Purpose after archive.
## Requirements
### Requirement: 每日任务内容条目格式
每条内容 SHALL 包含以下字段：
- `id`：唯一标识符（字符串）
- `title`：任务标题（简短，用于列表展示）
- `hook`：钩子文案（一句话，用于日推卡片候选预览，激发好奇心）
- `time`：预估时长（如"5分钟"、"通勤途中"）
- `instructions`：具体做法（完整说明，进入任务卡片后展示）
- `scene_tags`：场景标签数组，值来自预定义集合（见下方标签体系）

每条内容 MAY 包含以下可选字段（仅供"现在就来一件"即时抽取的软优先使用，日推卡片候选逻辑不读取）：
- `moments`：时段亲和数组，取值 `morning | daytime | evening | late-night`——条目**特别适合**的时段，不是限定；缺省 = 全时段中性
- `weather_affinity`：天气亲和数组，首版取值 `rain | sunny`；缺省 = 与天气无关
- `gate0`：Gate 0 类别标，取值 `A | B`——条目通过内容原则 Gate 0 条件三的路径（A 类感知重定向 / B 类边界内新鲜尝试），供心情软优先读取；缺省 = 中性，不参与心情软优先

#### Scenario: 内容条目加载
- **WHEN** 系统需要为日推卡片抽取候选任务
- **THEN** 从内容文件中读取全部条目，按场景标签过滤后随机抽取

#### Scenario: 可选字段缺省不影响抽取资格
- **WHEN** 某条目无 `moments`、`weather_affinity` 与 `gate0` 字段
- **THEN** 该条目在日推候选与即时抽取中均正常参与，仅不享受软优先

### Requirement: 场景标签体系
场景标签 SHALL 使用以下预定义值集合，与基本信息设置的场景偏好选项一一对应：

| 标签值 | 对应场景偏好 |
|---|---|
| `workspace` | 工位 |
| `classroom` | 教室 |
| `home` | 自己的房间 |
| `transit` | 地铁/公交 |
| `walking` | 步行/骑行 |
| `driving` | 私家车 |
| `convenience-store` | 便利店 |
| `canteen` | 食堂 |
| `gym` | 健身房 |
| `market` | 菜市场 |
| `general` | 通用（无特定场景要求，作为候选池不足时的补充） |

每条内容 SHALL 至少有一个场景标签。

#### Scenario: 标签匹配
- **WHEN** 用户的 scene_tags 集合为 {transit, workspace}，内容条目标签为 {transit}
- **THEN** 该条目进入候选池（任意交集即纳入）

### Requirement: 候选任务抽取规则
系统 SHALL 在展示日推卡片时，从内容池中按以下规则抽取 3 条候选任务：
1. 过滤出与用户 scene_tags 有任意标签交集的所有条目
2. 从过滤结果中随机抽取（排除已在 DailyTaskPool 中的条目）
3. 若过滤结果不足 3 条，用 `general` 标签条目补足
4. 若加上 general 仍不足 3 条，展示实际可用数量（不强制凑满）

#### Scenario: 正常匹配足够候选
- **WHEN** 用户场景标签匹配到 10 条内容，DailyTaskPool 中已有 1 条
- **THEN** 从剩余 9 条中随机抽取 3 条作为候选

#### Scenario: 匹配不足时补通用条目
- **WHEN** 场景匹配仅得到 1 条内容，general 池有 5 条
- **THEN** 从 general 池随机补 2 条，共展示 3 条候选

### Requirement: 每日任务内容池与图鉴层完全独立
每日任务内容 SHALL 存储在独立的内容文件（`src/content/daily_tasks.json`）中，与图鉴条目无任何共享或联动。完成每日任务 SHALL NOT 影响图鉴完成度。原推送层（`content_library_draft_v1.json` 的 `push_content`，38 条）SHALL 按 11 维场景标签体系重新映射 `scene_tags` 后并入本内容池，作为普通每日任务条目参与抽取；并入后代码 SHALL NOT 再读取 `push_content` 字段（该字段仅作运营历史档案保留）。

#### Scenario: 完成每日任务不影响图鉴
- **WHEN** 用户完成一条与图鉴某条目内容相似的每日任务
- **THEN** 图鉴对应条目的完成状态不发生任何变化

#### Scenario: 原推送层条目并入后可被正常抽取
- **WHEN** 用户 scene_tags 与某条原 push_content 条目（重映射后的标签）有交集
- **THEN** 该条目与原生每日任务条目同等参与日推卡片候选与"现在就来一件"抽取

#### Scenario: 历史 push 完成事件仍可反查标题
- **WHEN** 系统需要展示一条历史 `content_type: "push"` 完成事件对应的内容标题
- **THEN** 通过并入后的内容池按 content_id 查到原条目标题，不报错

### Requirement: 时段/天气亲和打标准则
打标语义 SHALL 为"亲和加分"而非"时段限定"：只给**明显更适合特定时刻**的条目打标（如"路灯亮起来的瞬间"→ `evening`；听雨类 → `rain`），普适条目 SHALL 保持无标。错标/漏标的最坏结果 SHALL 仅为"退回无软优先的现行抽取行为"，不得使任何条目因打标而无法被抽中。打标为内容生产工作，SHALL 整表人工复核后落库，时段桶名与亲和标签 SHALL NOT 出现在任何用户可见界面或 analytics 载荷中。

#### Scenario: 打标不缩小可抽池
- **WHEN** 全池仅有 3 条命中当前时段桶的打标条目且均已完成
- **THEN** 即时抽取从其余无标/未命中条目中正常抽出，不出现因打标导致的空态

#### Scenario: 打标对用户不可见
- **WHEN** 用户浏览任务卡、日推候选或任何界面
- **THEN** 不出现"深夜特供""雨天推荐"等时段/天气标签文案


### Requirement: Gate 0 类别标打标准则
`gate0` 打标 SHALL 是对条目已有 Gate 0 分类的客观誊写，不是新的主观判断：内容按条件三 A 类（感知重定向）通过则标 `A`，按 B 类（边界内新鲜尝试）通过则标 `B`；同时兼具两类特征、难以归入单类的条目 SHALL 保持无标（缺省中性），不强判。SHALL NOT 以主观心情词（如"适合沮丧时做"）作为打标依据——心情→类别的映射只存在于抽取层代码，不进入内容 schema。错标/漏标的最坏结果 SHALL 仅为"心情软优先失效、退回时刻软优先行为"，不得使任何条目因打标而无法被抽中。打标为内容生产工作，SHALL 整表人工复核后落库；`gate0` 值 SHALL NOT 出现在任何用户可见界面或 analytics 载荷中。

#### Scenario: 含糊条目不强判
- **WHEN** 某条目既含感知重定向又含新鲜尝试特征，难以归入单类
- **THEN** 该条目保持无 `gate0` 标，在全部心情下中性参与抽取

#### Scenario: 打标不缩小可抽池
- **WHEN** 用户选择「无聊」且全池 `gate0: "B"` 条目均已完成
- **THEN** 即时抽取从其余条目中正常抽出，不出现因打标导致的空态

#### Scenario: 打标对用户不可见
- **WHEN** 用户浏览任务卡、日推候选或任何界面
- **THEN** 不出现 A 类/B 类、"舒缓""新鲜"等类别标签文案
