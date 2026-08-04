// 即时任务"此刻感"时刻推断（openspec: add-instant-moment-fit）
// + 心情软优先（openspec: add-instant-mood-fit）——心情是"内部时刻"，与时段/天气同属即时抽取软优先域。
// 纯函数无副作用：时段桶 + 「桶 × 工作日/周末 → 合理场景」规则表，与档案 scene_tags 求交。
// general 不进表——由 getDailyTaskCandidates 的补足机制天然兜底。
// 桶名、亲和标签与心情均不进 UI 机制文案、不进 analytics、不落 storage（机制对用户不可见）。

// 四档时段桶：morning 06-09 / daytime 09-18 / evening 18-22 / late-night 22-06（本地时间）
export function getMomentBucket(date) {
	const h = date.getHours();
	if (h >= 6 && h < 9) return "morning";
	if (h >= 9 && h < 18) return "daytime";
	if (h >= 18 && h < 22) return "evening";
	return "late-night";
}

const WEEKDAY_SCENES = {
	morning: ["home", "transit", "walking", "driving", "convenience-store"],
	daytime: ["workspace", "classroom", "canteen", "convenience-store", "walking"],
	evening: ["home", "transit", "walking", "driving", "convenience-store", "gym", "market"],
	"late-night": ["home"],
};

const WEEKEND_SCENES = {
	morning: ["home", "walking", "convenience-store"],
	daytime: ["home", "walking", "market", "convenience-store", "gym", "canteen"],
	evening: WEEKDAY_SCENES.evening,
	"late-night": ["home"],
};

// 此刻合理的场景子集（已与档案求交）。交集为空返回 null——调用方回落到纯档案行为，
// 推断层只做"大概率"不做"断言"（夜班、自由职业作息不在表内也永远抽得出）。
export function inferMomentScenes(date, profileTags) {
	if (!profileTags || !profileTags.length) return null;
	const day = date.getDay();
	const table = day === 0 || day === 6 ? WEEKEND_SCENES : WEEKDAY_SCENES;
	const plausible = table[getMomentBucket(date)];
	const matched = profileTags.filter((t) => plausible.includes(t));
	return matched.length ? matched : null;
}

// 当日缓存天气文本 → 亲和标签值（首版只做 rain/sunny，匹配不上视为无天气信号）
function weatherSignal(weatherText) {
	if (!weatherText) return null;
	if (weatherText.includes("雨")) return "rain";
	if (weatherText.includes("晴")) return "sunny";
	return null;
}

// 软优先：打标条目的全部亲和标均与当前时刻相容时排到前面（相对顺序不变）。
// moments 有标 → 必须含当前桶；weather_affinity 有标 → 必须命中已知天气（无天气可判即不相容）。
// 打标是亲和不是限定——无匹配时原样返回，任何候选都不会被过滤掉。
export function preferMomentCandidates(candidates, date, weatherText) {
	const bucket = getMomentBucket(date);
	const weather = weatherSignal(weatherText);
	const compatible = (t) => {
		const hasMoments = Array.isArray(t.moments) && t.moments.length > 0;
		const hasWeather = Array.isArray(t.weather_affinity) && t.weather_affinity.length > 0;
		if (!hasMoments && !hasWeather) return false; // 无标 = 中性，不享受优先
		if (hasMoments && !t.moments.includes(bucket)) return false;
		if (hasWeather && (!weather || !t.weather_affinity.includes(weather))) return false;
		return true;
	};
	const prefer = candidates.filter(compatible);
	if (!prefer.length) return candidates;
	return [...prefer, ...candidates.filter((t) => !compatible(t))];
}

// 启动成本派生表（add-instant-mood-fit）：不给内容加字段，由 scene_tags 客观派生。
// 就地 = 人已身处其中即可做；出门 = 需要移动到位。两表并集须覆盖全部非 general 场景枚举
// （verify-momentInference.mjs 有断言防新增场景漏归类）。
export const IN_PLACE_SCENES = ["home", "workspace", "classroom", "transit", "driving"];
export const OUT_SCENES = ["walking", "market", "convenience-store", "gym", "canteen"];

// 活力的"出门"必须是真出门：含出门场景**且不含任何就地场景锚点**——就地锚点在场
// 意味着人不用挪地方也能做（如 [walking,home] 的看天空），沾个 walking 标不算出门。
// general 不算就地锚点（[convenience-store,general] 的内容仍要求到店）。
// （2026-07-17 真机验收修订：原"沾一个出门场景即相容"让就地感知条目占满活力层。）
const isOutTask = (t) =>
	Array.isArray(t.scene_tags) &&
	t.scene_tags.some((s) => OUT_SCENES.includes(s)) &&
	!t.scene_tags.some((s) => IN_PLACE_SCENES.includes(s));
const isInPlaceTask = (t) =>
	Array.isArray(t.scene_tags) &&
	t.scene_tags.length > 0 &&
	t.scene_tags.every((s) => !OUT_SCENES.includes(s)); // general 视为就地可做

// 心情 → 客观属性映射（design D4）。心情是主观的，内容只有客观属性，映射只存在于这里。
// 沮丧/烦躁路由一致（chip 分开只为让用户被准确叫出名字）：A 类感知重定向 + 就地低启动。
// 无聊：B 类新鲜尝试（缺的是刺激）。活力：真出门/移动类（趁能量在，gate0 不限）。
const MOOD_COMPATIBLE = {
	down: (t) => t.gate0 === "A" && isInPlaceTask(t),
	restless: (t) => t.gate0 === "A" && isInPlaceTask(t),
	bored: (t) => t.gate0 === "B",
	energetic: isOutTask,
};

// 心情软优先（add-instant-mood-fit）：稳定分层，叠加在 preferMomentCandidates 结果之外层
// （心情是用户显式说出的信号，权重高于系统推断的时刻信号；层内保持时刻优先序）。
// 无 mood / 未知 mood / 无相容条目时原样返回——心情层永不过滤候选、永不引入新空态。
export function preferMoodCandidates(candidates, mood) {
	const compatible = MOOD_COMPATIBLE[mood];
	if (!compatible) return candidates;
	const prefer = candidates.filter(compatible);
	if (!prefer.length) return candidates;
	return [...prefer, ...candidates.filter((t) => !compatible(t))];
}

// 结构软优先（2026-08-04 内容审计）：即时入口优先曝光"换变量级"条目（熟悉载体×陌生变量），
// 降低"感知重定级"占比。稳定分层、永不过滤：无 novelty=variable 候选时原样返回，不引入新空态。
// 叠加位置：时刻推断之后、心情之前——心情是显式信号，权重最高，仍最后生效。
export function preferNoveltyCandidates(candidates) {
	const variable = candidates.filter((x) => x.novelty === "variable");
	if (!variable.length) return candidates;
	return [...variable, ...candidates.filter((x) => x.novelty !== "variable")];
}