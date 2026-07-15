// 静默攒额度钩子（openspec subscribe-reminder spec：静默攒额度）。
// 挂在「做完啦」「存日记」的 tap 回调里：仅当用户勾过"总是保持以上选择"且选了允许
// （requestSubscribeMessage 保证不弹窗）时才调用攒额度，否则什么都不做——完成时刻绝不被打断。
//
// 时序约束：requestSubscribeMessage 必须在 tap 的同步调用链里（异步 gap 后调用 iOS 真机会
// fail gesture 错误），而 getSetting 守卫是异步接口——因此守卫结果提前缓存（refreshSubscribeState），
// tap 时同步读缓存决定是否调用。缓存过期风险仅存在于"用户在微信设置里手动撤销了保持选择"的
// 分钟级窗口，且撤销后的调用要么静默 reject 要么直接 fail，均不产生弹窗。
//
// 仅 mp-weixin 有效；H5 下两个导出都是空操作（模块顶层不触碰 wx）。

import { getSubscribeState, requestSubscribe, topupReminder } from '@/api/reminder'

let cachedState = null // 'silent-accept' | 'silent-reject' | 'ask' | null(未查询)

// 异步刷新守卫缓存。NavBar mounted 时打底一次，每次攒额度尝试后再刷。
export function refreshSubscribeState() {
	// #ifdef MP-WEIXIN
	getSubscribeState().then((s) => {
		cachedState = s
	})
	// #endif
}

// 在完成动作的 tap 回调里同步调用。无任何 UI，无返回值可依赖。
export function maybeSilentTopup() {
	// #ifdef MP-WEIXIN
	if (cachedState !== 'silent-accept') {
		refreshSubscribeState() // 为下一次完成时刻更新判断
		return
	}
	// 同步调用链内发起（保证静默）；accept 后异步 +1，服务端 topup 自会拒绝未开启提醒的用户
	requestSubscribe().then((accepted) => {
		if (accepted) topupReminder().catch(() => {})
		refreshSubscribeState()
	})
	// #endif
}
