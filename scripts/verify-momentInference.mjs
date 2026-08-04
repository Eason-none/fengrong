// 断言脚本：时刻推断纯函数（openspec: add-instant-moment-fit tasks 1.2）
// 运行：node scripts/verify-momentInference.mjs
import assert from "node:assert/strict";
import {
	getMomentBucket,
	inferMomentScenes,
	preferMomentCandidates,
	preferMoodCandidates,
	preferNoveltyCandidates,
	IN_PLACE_SCENES,
	OUT_SCENES,
} from "../src/state/momentInference.js";

// 2026-07-08 是周三（工作日），2026-07-11 是周六（周末）
const weekday = (h, m = 0) => new Date(2026, 6, 8, h, m);
const weekend = (h, m = 0) => new Date(2026, 6, 11, h, m);

// ---- 1. 时段桶边界（整点归属 + 跨零点） ----
assert.equal(getMomentBucket(weekday(5, 59)), "late-night");
assert.equal(getMomentBucket(weekday(6, 0)), "morning");
assert.equal(getMomentBucket(weekday(8, 59)), "morning");
assert.equal(getMomentBucket(weekday(9, 0)), "daytime");
assert.equal(getMomentBucket(weekday(17, 59)), "daytime");
assert.equal(getMomentBucket(weekday(18, 0)), "evening");
assert.equal(getMomentBucket(weekday(21, 59)), "evening");
assert.equal(getMomentBucket(weekday(22, 0)), "late-night");
assert.equal(getMomentBucket(weekday(0, 30)), "late-night");
console.log("PASS 时段桶边界");

// ---- 2. 工作日/周末规则表分支 ----
// 工作日白天：workspace 在表内、market 不在
assert.deepEqual(inferMomentScenes(weekday(14), ["workspace", "market"]), ["workspace"]);
// 周末白天：market 在表内、workspace 不在
assert.deepEqual(inferMomentScenes(weekend(14), ["workspace", "market"]), ["market"]);
// 深夜两种日子都只剩 home
assert.deepEqual(inferMomentScenes(weekday(23), ["home", "market", "gym"]), ["home"]);
assert.deepEqual(inferMomentScenes(weekend(2), ["home", "canteen"]), ["home"]);
console.log("PASS 工作日/周末分支");

// ---- 3. 交集为空 / 档案为空 → null（调用方回落） ----
assert.equal(inferMomentScenes(weekday(14), ["driving"]), null); // 工作日白天表内无 driving
assert.equal(inferMomentScenes(weekday(23), ["market", "canteen"]), null);
assert.equal(inferMomentScenes(weekday(14), []), null);
assert.equal(inferMomentScenes(weekday(14), undefined), null);
console.log("PASS 空交集回落");

// ---- 4. general 永不进推断结果（由候选补足机制兜底，不属于推断层） ----
const withGeneral = inferMomentScenes(weekday(23), ["home", "general"]);
assert.deepEqual(withGeneral, ["home"]);
console.log("PASS general 不进推断表");

// ---- 5. 软优先：相容排前、不相容不优先、无标中性、永不丢候选 ----
const cands = [
	{ id: "a" }, // 无标：中性
	{ id: "b", moments: ["evening"] }, // 桶不符
	{ id: "c", moments: ["daytime"] }, // 桶相容 → 优先
	{ id: "d", moments: ["daytime"], weather_affinity: ["rain"] }, // 桶符但天气不符
	{ id: "e", weather_affinity: ["rain"] }, // 纯天气标，雨天时优先
];
// 工作日白天 + 雨：c、d、e 相容（d 桶+雨都符，e 纯雨符）
let ordered = preferMomentCandidates(cands, weekday(14), "雷阵雨转多云");
assert.deepEqual(ordered.map((t) => t.id), ["c", "d", "e", "a", "b"]);
// 无天气缓存：只有 c 优先（d、e 有天气标但无天气可判 → 不相容）
ordered = preferMomentCandidates(cands, weekday(14), null);
assert.deepEqual(ordered.map((t) => t.id), ["c", "a", "b", "d", "e"]);
// 晴天：c 优先，d/e 是 rain 标不相容
ordered = preferMomentCandidates(cands, weekday(14), "晴");
assert.deepEqual(ordered.map((t) => t.id), ["c", "a", "b", "d", "e"]);
// 天气文本匹配不上 rain/sunny → 视为无天气信号
ordered = preferMomentCandidates(cands, weekday(14), "多云");
assert.deepEqual(ordered.map((t) => t.id), ["c", "a", "b", "d", "e"]);
// 无任何相容条目 → 原样返回（引用与顺序都不变）
const neutral = [{ id: "x" }, { id: "y", moments: ["late-night"] }];
assert.deepEqual(preferMomentCandidates(neutral, weekday(14), null).map((t) => t.id), ["x", "y"]);
// 永不丢候选
assert.equal(ordered.length, cands.length);
assert.deepEqual([...ordered].map((t) => t.id).sort(), cands.map((t) => t.id).sort());
console.log("PASS 软优先排序");

// ---- 6. 心情软优先（add-instant-mood-fit） ----
// 派生表覆盖全场景枚举：就地∪出门 = 全部非 general 场景，且两表不相交（防新增场景漏归类）
const ALL_SCENES = [
	"workspace", "classroom", "home", "transit", "walking",
	"driving", "convenience-store", "canteen", "gym", "market",
];
assert.deepEqual(
	[...IN_PLACE_SCENES, ...OUT_SCENES].sort(),
	[...ALL_SCENES].sort(),
	"就地/出门派生表必须恰好覆盖全部非 general 场景",
);
assert.equal(IN_PLACE_SCENES.filter((s) => OUT_SCENES.includes(s)).length, 0);
console.log("PASS 派生表覆盖全场景");

const moodCands = [
	{ id: "m1", gate0: "A", scene_tags: ["home"] }, // A+就地：沮丧/烦躁相容
	{ id: "m2", gate0: "A", scene_tags: ["walking", "home"] }, // A+混合打标：有就地锚点，活力不相容（2026-07-17 修订）
	{ id: "m3", gate0: "B", scene_tags: ["home"] }, // B：无聊相容
	{ id: "m4", gate0: "B", scene_tags: ["market"] }, // B+纯出门：无聊、活力都相容
	{ id: "m5", scene_tags: ["gym"] }, // 无 gate0：纯出门 → 仅活力相容
	{ id: "m6", scene_tags: ["workspace"] }, // 无 gate0 全就地：全心情中性
	{ id: "m7", gate0: "A", scene_tags: ["general"] }, // A+general（general 视为就地）
	{ id: "m8", scene_tags: ["convenience-store", "general"] }, // 出门+general：general 不算就地锚点 → 活力相容
];
// 沮丧/烦躁：A 且全就地（m1、m7）置前，层内相对顺序不变
assert.deepEqual(preferMoodCandidates(moodCands, "down").map((t) => t.id), ["m1", "m7", "m2", "m3", "m4", "m5", "m6", "m8"]);
assert.deepEqual(preferMoodCandidates(moodCands, "restless").map((t) => t.id), ["m1", "m7", "m2", "m3", "m4", "m5", "m6", "m8"]);
// 无聊：gate0===B（m3、m4）置前
assert.deepEqual(preferMoodCandidates(moodCands, "bored").map((t) => t.id), ["m3", "m4", "m1", "m2", "m5", "m6", "m7", "m8"]);
// 活力：真出门（含出门场景且无就地锚点：m4、m5、m8）置前，不看 gate0；混合打标 m2 不再相容
assert.deepEqual(preferMoodCandidates(moodCands, "energetic").map((t) => t.id), ["m4", "m5", "m8", "m1", "m2", "m3", "m6", "m7"]);
// 无 mood / 未知 mood → 原样返回
assert.deepEqual(preferMoodCandidates(moodCands, null).map((t) => t.id), moodCands.map((t) => t.id));
assert.deepEqual(preferMoodCandidates(moodCands, "开心").map((t) => t.id), moodCands.map((t) => t.id));
// 无相容条目 → 原样返回（gate0 缺省中性不被抬前）
const noFit = [{ id: "n1", scene_tags: ["home"] }, { id: "n2", gate0: "A", scene_tags: ["market"] }];
assert.deepEqual(preferMoodCandidates(noFit, "bored").map((t) => t.id), ["n1", "n2"]);
// 永不丢候选
for (const mood of ["down", "restless", "bored", "energetic"]) {
	const out = preferMoodCandidates(moodCands, mood);
	assert.equal(out.length, moodCands.length);
	assert.deepEqual(out.map((t) => t.id).sort(), moodCands.map((t) => t.id).sort());
}
// 与时刻软优先叠加：mood 分层在外、层内保持传入序
const layered = preferMoodCandidates(
	preferMomentCandidates(
		[
			{ id: "L1", gate0: "B", scene_tags: ["home"] },
			{ id: "L2", gate0: "B", scene_tags: ["home"], moments: ["daytime"] }, // 时刻相容
			{ id: "L3", scene_tags: ["home"] },
		],
		weekday(14),
		null,
	),
	"bored",
);
// 时刻优先后 L2 在 L1 前；无聊层再把 B 类整体置前 → L2、L1、L3
assert.deepEqual(layered.map((t) => t.id), ["L2", "L1", "L3"]);
console.log("PASS 心情软优先");

// 结构软优先（2026-08-04）：novelty=variable 置前；无 variable 原样返回；永不丢候选
const novCands = [
	{ id: "N1", novelty: "variable" },
	{ id: "N2" },
	{ id: "N3", novelty: "first" },
];
assert.deepEqual(preferNoveltyCandidates(novCands).map((t) => t.id), ["N1", "N2", "N3"]);
assert.deepEqual(preferNoveltyCandidates(novCands.slice(1)).map((t) => t.id), ["N2", "N3"]);
console.log("PASS 结构软优先（换变量级）");

console.log("verify-momentInference: 全部通过");
