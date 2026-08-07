// 聊过就顺手归档（原 index.vue 内私有方法，抽出供页面与各任务流组件共享）：
// 用户"‹ 返回"离开而不是"说完了"时，只要发过消息、还没归档，就在后台补一次归档
// 生成日记页——否则这段聊过的内容永远进不了手记册。
// 归档是后台数据操作，失败静默不阻断用户离开。
import { getConversation, archiveConversation, getStrandedConversations } from "@/state/conversation.js";
import { generateSummaryText } from "@/api/deepseek.js";
import { getCompletionEvent } from "@/state/completionEvent.js";
import { getDailyTaskById, getCollectionItemById } from "@/content/library.js";
import {
	THREE_GOOD_THINGS_CONTENT_ID,
	THREE_GOOD_THINGS_TITLE,
	THREE_GOOD_THINGS_SUMMARY_CONTEXT,
} from "@/state/threeGoodThings.js";

export async function archiveChatOnExit(conversationId, contentTitle, instructions) {
	if (!conversationId) return;
	const conv = getConversation(conversationId);
	if (!conv || conv.archived || conv.messages.length === 0) return;
	try {
		await archiveConversation(conv.id, (c) => generateSummaryText({ contentTitle, instructions, conversation: c }));
	} catch (err) {
		console.error("archiveConversation on close failed", err);
	}
}

// 反查孤儿对话的摘要上下文（退出归档闭包收的 contentTitle/instructions 两项）。
// 内容库是内置静态数据，历史上出现过的条目都能反查到；真查不到时退回通用说法——
// 摘要 prompt 里还有完整对话兜底，页照样生成，好过这段对话无声沉底。
function resolveArchiveContext(conversation) {
	const event = getCompletionEvent(conversation.completion_event_id);
	if (!event) return null;
	if (event.content_id === THREE_GOOD_THINGS_CONTENT_ID) {
		return { contentTitle: THREE_GOOD_THINGS_TITLE, instructions: THREE_GOOD_THINGS_SUMMARY_CONTEXT };
	}
	const item = event.content_type === "collection_item" ? getCollectionItemById(event.content_id) : getDailyTaskById(event.content_id);
	if (item) return { contentTitle: item.title, instructions: item.instructions };
	return {
		contentTitle: "一次生活记录",
		instructions: "这段对话的原始上下文没能还原，请只依据对话内容书写这一页",
	};
}

// 启动静默补扫（App.vue onLaunch 调用）：退出归档失败、或 App 在归档跑起来前被杀，
// 都会留下"有消息没归档"的对话——没有任何界面入口能再触达它们，不补就永远进不了手记册。
// 即发即忘：每条独立失败、静默，下次启动自动再试；若用户路径同时在归档同一对话，
// conversation.js 的进行中锁会共享同一次归档，不会生成两页。
export function sweepStrandedArchives() {
	for (const conv of getStrandedConversations()) {
		const context = resolveArchiveContext(conv);
		if (!context) continue;
		archiveConversation(conv.id, (c) => generateSummaryText({ ...context, conversation: c })).catch((err) => {
			console.error("sweepStrandedArchives: archive failed", conv.id, err);
		});
	}
}
