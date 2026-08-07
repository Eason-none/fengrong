// 重温低语（revisit-whisper）：用户翻开手记某一页时，若册子里存在与这页呼应的过往页，
// 在页脚安静出现一句定性的低语，轻轻鼓励今天再去做类似的小事。
// 红线：无数字与次数、不诊断用户、不出现在分享卡上（与 summaryText 独立存放）；
// 册子足够厚才低语（数据足够）；只缓存命中，无呼应/失败不缓存，册子长出来后自然重试。

import { get, set, KEYS } from "./storage.js";
import { getBookTimeline } from "./diaryNotebook.js";
import { generateWhisperText } from "../api/deepseek.js";

// 数据足够：册子里至少有这么多条"其它"条目才低语（记忆不追人，呼应要攒够了才出现）
const MIN_OTHER_ENTRIES = 3;
// 喂给模型的过往条目上限（控制 prompt 体积）
const PAST_MAX = 8;

function pageKey(page) {
	return `${page.completedAt}:${page.title}`;
}

// 同步判断"这页可能有低语"（有缓存命中，或册子其它条目已够数）——
// TracePage 用它决定开页即预留一行高度，避免低语到达时页脚跳动。
export function whisperPossible(page) {
	if (!page || !page.summaryText) return false;
	const key = pageKey(page);
	const cache = get(KEYS.WHISPERS, {});
	if (cache[key]) return true;
	const timeline = getBookTimeline();
	return timeline.filter((e) => pageKey(e) !== key).length >= MIN_OTHER_ENTRIES;
}

export function getWhisperForPage(page) {
	if (!page || !page.summaryText) return Promise.resolve(null);
	const key = pageKey(page);
	const cache = get(KEYS.WHISPERS, {});
	if (cache[key]) return Promise.resolve(cache[key]);

	const timeline = getBookTimeline();
	const others = timeline.filter((e) => pageKey(e) !== key);
	if (others.length < MIN_OTHER_ENTRIES) return Promise.resolve(null);

	const past = others.slice(-PAST_MAX).map((e) => ({ title: e.title, summaryText: e.summaryText }));
	return generateWhisperText({ title: page.title, summaryText: page.summaryText, past })
		.then((text) => {
			if (!text) return null;
			const c = get(KEYS.WHISPERS, {});
			c[key] = text;
			set(KEYS.WHISPERS, c);
			return text;
		})
		.catch(() => null);
}