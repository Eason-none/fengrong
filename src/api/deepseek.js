// DeepSeek摘要生成API封装（product_handoff.md §11.2，对话归档时触发，轻量模型，非流式）
// 摘要是离线批处理性质的单次结果，不需要逐字展示，所以不像Task12那样需要区分H5/mp-weixin的
// 流式实现——用uni.request一次性请求即可，两端行为一致。

import { getMessageImages } from "../state/conversation.js"
// #ifdef MP-WEIXIN
import { callLlmCloud } from "./cloudFn.js"
// #endif

const PROXY_URL = import.meta.env.VITE_API_PROXY_URL || "http://localhost:5555"
const MODEL = import.meta.env.VITE_DEEPSEEK_MODEL
// Supabase部署的代理前面挡着一层网关，没有Authorization头会被网关本身拒绝（跟DeepSeek真实key无关）；
// anon key是设计给客户端公开持有的值，只用来敲开网关，代理内部会覆盖成真正的DeepSeek key再转发。
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// "没聊出内容"的固定输出标记。历史教训：让模型"直接输出空字符串"时，用户只发照片
// 没打字的对话会让模型把「空字符串」四个字当摘要输出，直接落到日记页上——
// 改为让模型输出可识别的标记，由代码剥离成 null（无页）。
const EMPTY_SUMMARY_RE = /^\[?(无内容|空字符串)\]?$/

function buildSummaryPrompt({ contentTitle, instructions, conversation }) {
	// 图片消息在纯文本序列里必须留痕：否则"只发照片没打字"的对话在摘要模型眼里是一段空话
	const conversationText = conversation.messages
		.map((m) => {
			const photoCount = getMessageImages(m).length
			const photoNote = photoCount > 0 ? `[发来了${photoCount}张照片]` : ""
			return `${m.role === "user" ? "用户" : "助手"}：${photoNote}${m.content || ""}`
		})
		.join("\n")

	return `你的任务：把下面这段对话写成手记的一页。用户未来某天翻到这页时，要能重温当时的心情——不超过120字。

这次完成的内容：
标题：${contentTitle}
内容：${instructions}

完整对话：
${conversationText}

写法：
- 找"心动点"：用户在哪一个具体细节上留意了、停下了、动了一下心？以它为主体写这页；其余带一句或舍掉，不按对话顺序逐条罗列
- 用感官写情绪，不用情绪标签：写颜色、温度、声音、手感（"捧手里烫烫的""红晒褪成粉"），不写"开心/治愈/平静/幸福"
- 允许一句轻轻的批注，帮未来的ta认出自己当时的心情，比如"你在这个粉色消防栓面前，好像比平时多站了一会儿"；批注必须落在用户说过的具体细节上，是邀请不是诊断——不编造没说的事，不下"你其实是在…"的结论
- 第二人称"你"，像写给未来自己的一行批注；句子可以有呼吸，不追求电报式简洁
- 保留用户自己的原话措辞和用词（比如用户说"消防栓的红晒褪成粉的了"，就用这句原话或非常接近的说法，不要转述成"注意到消防栓颜色发生了变化"这种第三人称概括）
- 如果用户发了照片（对话里标了"[发来了N张照片]"）但几乎没有打字，就采用助手描述照片时说到的具体内容（颜色、形状、画面里有什么），写成"拍下了……"这样的客观记录——照片本身就是这页的内容，不算"没说什么"
- 如果对话内容很少或很碎片化，这页也可以很短，不需要硬凑满
- 只有当用户既没发照片、也没有说出任何具体的所见/所闻/所感/所说（比如只回复了"还行""嗯""挺好的"这类寒暄）时，不要编造或拔高——只输出这五个字：[无内容]

直接输出摘要文本（或 [无内容]），不要加任何前缀说明。`
}

// 注入到Task9的archiveConversation(conversationId, generateSummaryText)时按
// (conversation) => generateSummaryText({ contentTitle, instructions, conversation }) 包一层闭包——
// archiveConversation只持有conversation，不知道对应内容的标题/正文，所以由调用方（UI层）补上这两项。
export function generateSummaryText({ contentTitle, instructions, conversation }) {
	const messages = [{ role: "user", content: buildSummaryPrompt({ contentTitle, instructions, conversation }) }]
	// "[无内容]"标记（含模型偶发写成"空字符串"的字面量）归一为空——上游会把空摘要置 null、不成页
	const normalize = (text) => (EMPTY_SUMMARY_RE.test(text) ? "" : text)

	// #ifdef MP-WEIXIN
	// 小程序端走微信云开发云函数（真实key藏在云函数环境变量里，微信天然鉴权，无需域名/备案）。
	return callLlmCloud({ target: "deepseek", model: MODEL, messages }).then(({ statusCode, data }) => {
		if (statusCode !== 200) {
			throw new Error(`DeepSeek API请求失败：${statusCode} ${JSON.stringify(data)}`)
		}
		return normalize(data?.choices?.[0]?.message?.content?.trim() ?? "")
	})
	// #endif

	// #ifndef MP-WEIXIN
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${PROXY_URL}/deepseek-proxy/chat/completions`,
			method: "POST",
			header: {
				"Content-Type": "application/json",
				...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
			},
			data: { model: MODEL, messages },
			success: (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`DeepSeek API请求失败：${res.statusCode} ${JSON.stringify(res.data)}`))
					return
				}
				resolve(normalize(res.data?.choices?.[0]?.message?.content?.trim() ?? ""))
			},
			fail: (err) => reject(new Error(`DeepSeek API请求失败：${err.errMsg}`)),
		})
	})
	// #endif
}

// ---- 重温低语（revisit-whisper）----
// 低语是翻手记页时页脚的一行话，翻开当下异步生成（命中缓存），与摘要独立、永不进分享卡。
// 双端（云函数/H5 代理）结构同 generateSummaryText。
const NO_WHISPER_RE = /^\[?(无低语)\]?$/;

function buildWhisperPrompt({ title, summaryText, past }) {
	const pastText = past.map((p) => `- ${p.title}：${p.summaryText}`).join("\n");
	return `你的任务：用户正在翻自己的手记，停在「这页」。读这页与过往手记的呼应，写一句安静的低语，或判定不写。

这页：
标题：${title}
正文：${summaryText}

过往手记（旧→新）：
${pastText}

要求：
- 只有当这页与过往手记存在真实呼应（用户反复留意的那类事物、相似场景、相似的小动作）时才写；没有就只输出这四个字：[无低语]
- 低语是定性的一句话，不出现任何数字与次数（不写"第三次""又一次"），不诊断用户，不下结论
- 前半句轻轻点出这个呼应，落在具体事物上（如"你好像总在路上留意褪色的颜色"），后半句可以是一个具体的小邀请，鼓励今天也去做类似的事（如"今天也留一步给路边？"）；邀请必须具体可感，不写空泛口号
- 不超过36字，口吻安静，像页脚的一行小字
- 直接输出低语（或 [无低语]），不要加任何前缀说明。`;
}

export function generateWhisperText({ title, summaryText, past }) {
	const messages = [{ role: "user", content: buildWhisperPrompt({ title, summaryText, past }) }];
	const normalize = (text) => (NO_WHISPER_RE.test(text) ? "" : text);

	// #ifdef MP-WEIXIN
	return callLlmCloud({ target: "deepseek", model: MODEL, messages }).then(({ statusCode, data }) => {
		if (statusCode !== 200) {
			throw new Error(`DeepSeek API请求失败：${statusCode} ${JSON.stringify(data)}`);
		}
		return normalize(data?.choices?.[0]?.message?.content?.trim() ?? "");
	});
	// #endif

	// #ifndef MP-WEIXIN
	return new Promise((resolve, reject) => {
		uni.request({
			url: `${PROXY_URL}/deepseek-proxy/chat/completions`,
			method: "POST",
			header: {
				"Content-Type": "application/json",
				...(SUPABASE_ANON_KEY ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
			},
			data: { model: MODEL, messages },
			success: (res) => {
				if (res.statusCode !== 200) {
					reject(new Error(`DeepSeek API请求失败：${res.statusCode} ${JSON.stringify(res.data)}`));
					return;
				}
				resolve(normalize(res.data?.choices?.[0]?.message?.content?.trim() ?? ""));
			},
			fail: (err) => reject(new Error(`DeepSeek API请求失败：${err.errMsg}`)),
		});
	});
	// #endif
}
