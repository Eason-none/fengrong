# daily-task-content Delta: add-instant-mood-fit

> 基线说明：本 delta 以 add-instant-moment-fit 归档后的主 spec 文本为基线（归档顺序：add-instant-moment-fit 在前）。

## MODIFIED Requirements

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

## ADDED Requirements

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
